import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, Scissors } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFExtractPages: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    extractMode: 'range',
    pageRange: '',
    extractFirst: 0,
    extractLast: 0,
    separateFiles: false,
    maintainQuality: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Deduplication helper
  const addFiles = (newFiles: File[]) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== selectedFiles.length) {
      setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
    }
    addFiles(pdfFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== droppedFiles.length) {
      setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
    }
    addFiles(pdfFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'No PDF files selected. Please upload at least one PDF.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setBanner(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const totalPages = pdfDoc.getPageCount();
          const pagesToExtract = new Set<number>();
          if (settings.extractMode === 'range' && settings.pageRange.trim()) {
            const ranges = settings.pageRange.split(',').map(range => range.trim());
            for (const range of ranges) {
              if (range.includes('-')) {
                const [start, end] = range.split('-').map(num => parseInt(num.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                  for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) {
                      pagesToExtract.add(i - 1);
                    }
                  }
                }
              } else {
                const pageNum = parseInt(range);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  pagesToExtract.add(pageNum - 1);
                }
              }
            }
          } else if (settings.extractMode === 'first' && settings.extractFirst > 0) {
            for (let i = 0; i < Math.min(settings.extractFirst, totalPages); i++) {
              pagesToExtract.add(i);
            }
          } else if (settings.extractMode === 'last' && settings.extractLast > 0) {
            for (let i = totalPages - 1; i >= Math.max(0, totalPages - settings.extractLast); i--) {
              pagesToExtract.add(i);
            }
          } else if (settings.extractMode === 'even') {
            for (let i = 1; i < totalPages; i += 2) {
              pagesToExtract.add(i);
            }
          } else if (settings.extractMode === 'odd') {
            for (let i = 0; i < totalPages; i += 2) {
              pagesToExtract.add(i);
            }
          }
          const sortedPages = Array.from(pagesToExtract).sort((a, b) => a - b);
          if (settings.separateFiles) {
            // Output one PDF per extracted page
            for (const pageIndex of sortedPages) {
              const newPdf = await PDFDocument.create();
              const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
              newPdf.addPage(page);
              const pdfBytes = await newPdf.save();
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              processed.push({
                name: file.name.replace(/\.pdf$/i, `_page${pageIndex + 1}.pdf`),
                blob: blob
              });
            }
          } else {
            // Output one PDF with all extracted pages
            const newPdf = await PDFDocument.create();
            for (const pageIndex of sortedPages) {
              const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
              newPdf.addPage(page);
            }
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            processed.push({
              name: file.name.replace(/\.pdf$/i, '_extracted.pdf'),
              blob: blob
            });
          }
        } catch (error) {
          setBanner({ message: `Error processing ${file.name}. Skipping this file.`, type: 'error' });
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setBanner({ message: `PDF page extraction completed! Processed ${processed.length} files.`, type: 'success' });
    } catch (error) {
      setIsProcessing(false);
      setBanner({ message: 'Error extracting PDF pages. Please try again.', type: 'error' });
    }
  };

  const downloadAll = () => {
    processedFiles.forEach((file) => {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  // All Pages Live Preview
  useEffect(() => {
    const genPreviews = async () => {
      if (!files[0]) { setPreviewUrls([]); return; }
      setPreviewLoading(true);
      try {
        const { PDFDocument } = await import('pdf-lib');
        const file = files[0];
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const totalPages = pdfDoc.getPageCount();
        const pagesToExtract = new Set<number>();
        if (settings.extractMode === 'range' && settings.pageRange.trim()) {
          const ranges = settings.pageRange.split(',').map(range => range.trim());
          for (const range of ranges) {
            if (range.includes('-')) {
              const [start, end] = range.split('-').map(num => parseInt(num.trim()));
              if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                  if (i >= 1 && i <= totalPages) {
                    pagesToExtract.add(i - 1);
                  }
                }
              }
            } else {
              const pageNum = parseInt(range);
              if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pagesToExtract.add(pageNum - 1);
              }
            }
          }
        } else if (settings.extractMode === 'first' && settings.extractFirst > 0) {
          for (let i = 0; i < Math.min(settings.extractFirst, totalPages); i++) {
            pagesToExtract.add(i);
          }
        } else if (settings.extractMode === 'last' && settings.extractLast > 0) {
          for (let i = totalPages - 1; i >= Math.max(0, totalPages - settings.extractLast); i--) {
            pagesToExtract.add(i);
          }
        } else if (settings.extractMode === 'even') {
          for (let i = 1; i < totalPages; i += 2) {
            pagesToExtract.add(i);
          }
        } else if (settings.extractMode === 'odd') {
          for (let i = 0; i < totalPages; i += 2) {
            pagesToExtract.add(i);
          }
        }
        const sortedPages = Array.from(pagesToExtract).sort((a, b) => a - b);
        if (sortedPages.length === 0) { setPreviewUrls([]); setPreviewLoading(false); return; }
        const { default: pdfjsLib } = await import('pdfjs-dist');
        const pdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        // Create a new PDF with all extracted pages
        const newPdf = await PDFDocument.create();
        for (const pageIndex of sortedPages) {
          const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
          newPdf.addPage(page);
        }
        const pdfBytes = await newPdf.save();
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const urls: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const previewPage = await pdf.getPage(i);
          const viewport = previewPage.getViewport({ scale: 0.7 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await previewPage.render({ canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL());
        }
        setPreviewUrls(urls);
      } catch (err) {
        setPreviewUrls([]);
        setBanner({ message: 'Failed to generate live previews. See console for details.', type: 'error' });
        console.error('[LivePreview] Error generating previews:', err);
      }
      setPreviewLoading(false);
    };
    genPreviews();
     
  }, [files, settings]);

  // Spinner overlay
  const SpinnerOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      {/* Spinner removed */}
    </div>
  );

  const features = [
    { icon: <Scissors className="h-6 w-6" />, title: 'Page Extraction', description: 'Extract specific pages or ranges from PDFs' },
    { icon: <Shield className="h-6 w-6" />, title: 'Flexible Selection', description: 'Extract first/last pages or custom ranges' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Extract pages from multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to extract from' },
    { step: '2', title: 'Choose Pages', description: 'Select which pages to extract' },
    { step: '3', title: 'Extract & Download', description: 'Download extracted pages' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '120K+', label: 'Pages Extracted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Extract Pages | Extract PDF Pages Online Free"
        description="Easily extract specific pages from any PDF with our free online PDF extract pages tool. Fast, secure, and no downloads required."
        keywords="PDF extract pages, extract pages from PDF, PDF page extractor, online tool, free tool"
        canonical="pdf-extract-pages"
        ogImage="/images/pdf-extract-pages-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Scissors className="h-4 w-4" />
                <span>PDF Extract Pages</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract PDF Pages
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract specific pages from PDF documents with flexible selection options. Perfect for creating focused documents from larger files.
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
                  role="region"
                  aria-label="PDF file upload area"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.pdf)</p>
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
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Selected PDF files">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
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
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[120px]">
                    <span className="text-gray-500">Generating previews...</span>
                  </div>
                ) : previewUrls.length > 0 ? (
                  <div className="flex flex-col gap-6 max-h-[480px] overflow-y-auto px-2" aria-label="Extracted pages preview">
                    {previewUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Preview of extracted page ${idx + 1}`} className="mx-auto rounded shadow bg-white" style={{ maxHeight: 400 }} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                    <p>No live preview available for PDF page extraction.<br/>Extraction will pull out selected pages and generate new PDFs for download.</p>
                  </div>
                )}
              </div>

              {/* Extract Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-violet-600" />
                  <span>Extract Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extract Mode</label>
                    <select
                      value={settings.extractMode}
                      onChange={e => setSettings(prev => ({ ...prev, extractMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="range">Page Range</option>
                      <option value="first">First N Pages</option>
                      <option value="last">Last N Pages</option>
                      <option value="even">Even Pages</option>
                      <option value="odd">Odd Pages</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                    <input
                      type="text"
                      value={settings.pageRange}
                      onChange={e => setSettings(prev => ({ ...prev, pageRange: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 1-5, 8, 10-15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extract First N Pages</label>
                    <input
                      type="number"
                      value={settings.extractFirst}
                      onChange={e => setSettings(prev => ({ ...prev, extractFirst: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extract Last N Pages</label>
                    <input
                      type="number"
                      value={settings.extractLast}
                      onChange={e => setSettings(prev => ({ ...prev, extractLast: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="separateFiles"
                      checked={settings.separateFiles}
                      onChange={e => setSettings(prev => ({ ...prev, separateFiles: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="separateFiles" className="text-sm font-medium text-gray-700">Separate Files</label>
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
                      <span>Extracting Pages...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-5 w-5" />
                      <span>Extract PDF Pages</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Extracted Pages</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Page Extractor?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced page extraction technology for creating focused PDF documents</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Extract PDF Pages</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to extract pages from your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Extract Pages?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF page extractor for focused documents</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Scissors className="h-5 w-5" />
                    <span>Start Extracting Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {banner && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold ${banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        role="alert" aria-live="assertive">
        <div className="flex items-center space-x-3">
          {banner.type === 'success' ? <span>✓</span> : <span>!</span>}
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} className="ml-4 text-white/80 hover:text-white">×</button>
        </div>
      </div>}
      {isProcessing && <SpinnerOverlay />}
    </>
  );
};

export default PDFExtractPages; 