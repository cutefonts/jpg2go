import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Scissors, FileType } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import SEO from './SEO';
import JSZip from 'jszip';

interface UploadedPDF {
  id: string;
  file: File;
  name: string;
  size: number;
}

const PDFSplitter: React.FC = () => {
  const [files, setFiles] = useState<UploadedPDF[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    splitMode: 'every',
    pagesPerFile: 1,
    splitAtPages: '',
    customSplit: '',
    maintainQuality: true,
    addPageNumbers: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size }));
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedFiles([]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size }));
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedFiles([]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      splitMode: 'every',
      pagesPerFile: 1,
      splitAtPages: '',
      customSplit: '',
      maintainQuality: true,
      addPageNumbers: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file to split.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const fileBuffer = await file.file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          const pageCount = pdf.getPageCount();
          if (settings.splitMode === 'every') {
            // Split every N pages
            const pagesPerFile = Math.max(1, settings.pagesPerFile);
            const numFiles = Math.ceil(pageCount / pagesPerFile);
            for (let i = 0; i < numFiles; i++) {
              const newPdf = await PDFDocument.create();
              const startPage = i * pagesPerFile;
              const endPage = Math.min((i + 1) * pagesPerFile, pageCount);
              const pages = await newPdf.copyPages(pdf, Array.from({ length: endPage - startPage }, (_, j) => startPage + j));
              pages.forEach(page => newPdf.addPage(page));
              // Add page numbers if enabled
              if (settings.addPageNumbers) {
                const npages = newPdf.getPageCount();
                newPdf.getPages().forEach((page, idx) => {
                  const { width, height } = page.getSize();
                  page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                });
              }
              const pdfBytes = await newPdf.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const fileName = file.name.replace('.pdf', '');
              processed.push({ name: `${fileName}_part${i + 1}.pdf`, blob });
            }
          } else if (settings.splitMode === 'at') {
            // Split at specific pages
            const splitPages = settings.splitAtPages.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0 && p < pageCount);
            if (splitPages.length === 0) {
              const newPdf = await PDFDocument.create();
              const pages = await newPdf.copyPages(pdf, pdf.getPageIndices());
              pages.forEach(page => newPdf.addPage(page));
              if (settings.addPageNumbers) {
                newPdf.getPages().forEach((page, idx) => {
                  const { width, height } = page.getSize();
                  page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                });
              }
              const pdfBytes = await newPdf.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              processed.push({ name: file.name, blob });
            } else {
              let startPage = 0;
              for (let i = 0; i <= splitPages.length; i++) {
                const endPage = i < splitPages.length ? splitPages[i] : pageCount;
                if (endPage > startPage) {
                  const newPdf = await PDFDocument.create();
                  const pages = await newPdf.copyPages(pdf, Array.from({ length: endPage - startPage }, (_, j) => startPage + j));
                  pages.forEach(page => newPdf.addPage(page));
                  if (settings.addPageNumbers) {
                    newPdf.getPages().forEach((page, idx) => {
                      const { width, height } = page.getSize();
                      page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                    });
                  }
                  const pdfBytes = await newPdf.save();
                  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                  const fileName = file.name.replace('.pdf', '');
                  processed.push({ name: `${fileName}_part${i + 1}.pdf`, blob });
                }
                startPage = endPage;
              }
            }
          } else if (settings.splitMode === 'custom') {
            // Custom split: e.g., 1-3,4-7,8-10
            const ranges = settings.customSplit.split(',').map(r => r.trim()).filter(Boolean);
            for (let i = 0; i < ranges.length; i++) {
              const [start, end] = ranges[i].split('-').map(n => parseInt(n.trim()));
              if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && end <= pageCount) {
                const newPdf = await PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, Array.from({ length: end - start + 1 }, (_, j) => start - 1 + j));
                pages.forEach(page => newPdf.addPage(page));
                if (settings.addPageNumbers) {
                  newPdf.getPages().forEach((page, idx) => {
                    const { width, height } = page.getSize();
                    page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                  });
                }
                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const fileName = file.name.replace('.pdf', '');
                processed.push({ name: `${fileName}_part${i + 1}.pdf`, blob });
              }
            }
          } else if (settings.splitMode === 'size') {
            // Split by file size (approximate, by page count)
            const maxSizeMB = parseInt(settings.customSplit) || 1; // Use customSplit as MB input
            const currentPdf = await PDFDocument.create();
            let currentPages: number[] = [];
            let part = 1;
            for (let i = 0; i < pageCount; i++) {
              currentPages.push(i);
              const tempPdf = await PDFDocument.create();
              const tempPages = await tempPdf.copyPages(pdf, currentPages);
              tempPages.forEach(page => tempPdf.addPage(page));
              const tempBytes = await tempPdf.save();
              if (tempBytes.byteLength / (1024 * 1024) > maxSizeMB && currentPages.length > 1) {
                // Save previous part
                currentPages.pop();
                const newPdf = await PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, currentPages);
                pages.forEach(page => newPdf.addPage(page));
                if (settings.addPageNumbers) {
                  newPdf.getPages().forEach((page, idx) => {
                    const { width, height } = page.getSize();
                    page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                  });
                }
                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const fileName = file.name.replace('.pdf', '');
                processed.push({ name: `${fileName}_part${part}.pdf`, blob });
                part++;
                currentPages = [i];
              }
            }
            // Save last part
            if (currentPages.length > 0) {
              const newPdf = await PDFDocument.create();
              const pages = await newPdf.copyPages(pdf, currentPages);
              pages.forEach(page => newPdf.addPage(page));
              if (settings.addPageNumbers) {
                newPdf.getPages().forEach((page, idx) => {
                  const { width, height } = page.getSize();
                  page.drawText(`${idx + 1}`, { x: width - 50, y: 30, size: 12 });
                });
              }
              const pdfBytes = await newPdf.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const fileName = file.name.replace('.pdf', '');
              processed.push({ name: `${fileName}_part${part}.pdf`, blob });
            }
          } else {
            // Default: split into individual pages
            for (let i = 0; i < pageCount; i++) {
              const newPdf = await PDFDocument.create();
              const [page] = await newPdf.copyPages(pdf, [i]);
              newPdf.addPage(page);
              if (settings.addPageNumbers) {
                const { width, height } = page.getSize();
                page.drawText(`1`, { x: width - 50, y: 30, size: 12 });
              }
              const pdfBytes = await newPdf.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const fileName = file.name.replace('.pdf', '');
              processed.push({ name: `${fileName}_page${i + 1}.pdf`, blob });
            }
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setSuccess(`PDF splitting completed! Created ${processed.length} files.`);
    } catch (error) {
      console.error('Error splitting PDFs:', error);
      setIsProcessing(false);
      setError('Error splitting PDFs. Please try again.');
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }
    // Only download non-empty blobs
    const validFiles = processedFiles.filter(f => f.blob && f.blob.size > 0);
    if (validFiles.length === 0) {
      setError('All output files are empty. Splitting may have failed.');
      return;
    }
    setIsDownloading(true);
    try {
      if (validFiles.length > 5) {
        // Use ZIP for many files
        const zip = new JSZip();
        validFiles.forEach((file) => {
          zip.file(file.name, file.blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'split_pdfs.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccess('Downloaded all split files as ZIP!');
      } else {
        // Direct download for few files
        for (const file of validFiles) {
          const url = URL.createObjectURL(file.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        setSuccess('Downloaded all split files!');
      }
    } catch (error) {
      setError('Error downloading files. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const features = [
    { icon: <Scissors className="h-6 w-6" />, title: 'Smart Splitting', description: 'Split PDFs by pages, size, or custom criteria' },
    { icon: <Shield className="h-6 w-6" />, title: 'Batch Processing', description: 'Split multiple PDFs simultaneously' },
    { icon: <Zap className="h-6 w-6" />, title: 'Flexible Options', description: 'Choose how to split your documents' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to split' },
    { step: '2', title: 'Choose Split Method', description: 'Select how to split your PDFs' },
    { step: '3', title: 'Split & Download', description: 'Download individual PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '150K+', label: 'PDFs Split' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  React.useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.name));
    };
  }, [files]);

  return (
    <>
      <SEO 
        title="PDF Splitter | Split PDF Files Online Free"
        description="Easily split large PDF files into smaller parts with our free online PDF splitter. Fast, secure, and no software installation required."
        keywords="PDF splitter, split PDF files, divide PDF, PDF separator, split PDF by pages, PDF file splitter, online PDF tool, free splitter"
        canonical="pdf-splitter"
        ogImage="/images/pdf-splitter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Scissors className="h-4 w-4" />
                <span>PDF Splitter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Split PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Split large PDF documents into smaller, manageable files. Perfect for sharing specific sections or creating focused documents.
              </p>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="text-violet-600">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Tool Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your PDF files here'}</h3>
                  <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {/* Error and Success Messages */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <div className="text-red-600">⚠️</div>
                      <p className="text-red-700">{error}</p>
                    </div>
                  </div>
                )}
                {success && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <div className="text-green-600">✅</div>
                      <p className="text-green-700">{success}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF splitting.<br/>Splitting will create separate PDF files for each section.</p>
                </div>
              </div>

              {/* Split Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-violet-600" />
                  <span>Split Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Split Mode</label>
                    <select
                      value={settings.splitMode}
                      onChange={e => setSettings(prev => ({ ...prev, splitMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="every">Every N Pages</option>
                      <option value="at">Split at Specific Pages</option>
                      <option value="custom">Custom Split</option>
                      <option value="size">Split by File Size</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pages Per File</label>
                    <input
                      type="number"
                      value={settings.pagesPerFile}
                      onChange={e => setSettings(prev => ({ ...prev, pagesPerFile: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Split at Pages</label>
                    <input
                      type="text"
                      value={settings.splitAtPages}
                      onChange={e => setSettings(prev => ({ ...prev, splitAtPages: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 5, 10, 15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Split</label>
                    <input
                      type="text"
                      value={settings.customSplit}
                      onChange={e => setSettings(prev => ({ ...prev, customSplit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 1-3, 4-7, 8-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainQuality"
                      checked={settings.maintainQuality}
                      onChange={e => setSettings(prev => ({ ...prev, maintainQuality: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainQuality" className="text-sm font-medium text-gray-700">Maintain Quality</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="addPageNumbers"
                      checked={settings.addPageNumbers}
                      onChange={e => setSettings(prev => ({ ...prev, addPageNumbers: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addPageNumbers" className="text-sm font-medium text-gray-700">Add Page Numbers</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Scissors className="h-5 w-5" />
                      <span>Splitting PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-5 w-5" />
                      <span>Split PDF Files</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset All
                </button>
              </div>

              {processedFiles.length > 0 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Splitting Complete!</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Your PDF files have been successfully split.</p>
                    <button
                      type="button"
                      onClick={downloadAll}
                      disabled={isDownloading}
                      className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <span>Preparing Download...</span>
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      {isDownloading ? 'Preparing Download...' : (processedFiles.length > 5 ? 'Download All as ZIP' : 'Download Split Files')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Splitter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced splitting technology for creating focused PDF documents</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Split PDF Files</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to split your PDF files</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-xl">{step.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Split PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF splitter for focused documents</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Scissors className="h-5 w-5" />
                    <span>Start Splitting Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default PDFSplitter; 