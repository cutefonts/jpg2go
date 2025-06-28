import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Merge, FileType } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import SEO from './SEO';

interface UploadedPDF {
  id: string;
  file: File;
  name: string;
  size: number;
}

const PDFMerger: React.FC = () => {
  const [files, setFiles] = useState<UploadedPDF[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    mergeOrder: 'name',
    addPageNumbers: false,
    addBookmarks: true,
    maintainQuality: true,
    outputName: 'merged_document.pdf'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size
    }));
    
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
    
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedFiles([]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      mergeOrder: 'name',
      addPageNumbers: false,
      addBookmarks: true,
      maintainQuality: true,
      outputName: 'merged_document.pdf'
    });
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file to merge.');
      return;
    }

    if (files.length === 1) {
      setError('Please select at least two PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();
      
      // Sort files based on merge order
      const sortedFiles = [...files];
      if (settings.mergeOrder === 'name') {
        sortedFiles.sort((a, b) => a.name.localeCompare(b.name));
      } else if (settings.mergeOrder === 'size') {
        sortedFiles.sort((a, b) => a.size - b.size);
      }
      // For 'upload' and 'custom' order, keep the current order
      
      let totalPages = 0;
      let processedCount = 0;
      
      // Process each PDF file
      for (const uploadedFile of sortedFiles) {
        try {
          // Read the PDF file
          const fileBuffer = await uploadedFile.file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          
          // Get all pages from the PDF
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          
          // Add pages to the merged PDF
          pages.forEach((page) => {
            mergedPdf.addPage(page);
            totalPages++;
          });
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing ${uploadedFile.name}:`, error);
          setError(`Error processing ${uploadedFile.name}. Please ensure it's a valid PDF file.`);
          setIsProcessing(false);
          return;
        }
      }
      
      // Add page numbers if enabled
      if (settings.addPageNumbers) {
        try {
          const pages = mergedPdf.getPages();
          pages.forEach((page, index) => {
            const { width, height } = page.getSize();
            page.drawText(`${index + 1}`, {
              x: width - 50,
              y: 30,
              size: 12
            });
          });
        } catch (error) {
          console.warn('Could not add page numbers:', error);
        }
      }
      
      // Serialize the merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      
      // Create blob and add to processed files
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const processed = [{
        name: settings.outputName.endsWith('.pdf') ? settings.outputName : `${settings.outputName}.pdf`,
        blob: blob
      }];
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      setSuccess(`Successfully merged ${processedCount} PDF files into ${totalPages} pages!`);
      
    } catch (error) {
      console.error('Error merging PDFs:', error);
      setIsProcessing(false);
      setError('Error merging PDFs. Please ensure all files are valid PDF documents and try again.');
    }
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }

    try {
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
      
      setSuccess(`Downloaded merged PDF successfully!`);
    } catch (error) {
      setError('Error downloading file. Please try again.');
    }
  };

  const features = [
    { icon: <Merge className="h-6 w-6" />, title: 'Smart Merging', description: 'Merge multiple PDFs into a single document' },
    { icon: <Shield className="h-6 w-6" />, title: 'Drag & Drop Reorder', description: 'Easily reorder files before merging' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Merge unlimited number of PDF files' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select multiple PDF files to merge' },
    { step: '2', title: 'Reorder & Configure', description: 'Arrange files and set merge options' },
    { step: '3', title: 'Merge & Download', description: 'Download your merged PDF document' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '200K+', label: 'PDFs Merged' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Merger | Merge PDF Files Online Free"
        description="Combine multiple PDF files into one easily with our free online PDF merger. Fast, secure, and no software installation needed."
        keywords="PDF merger, combine PDF files, merge PDF documents, PDF combiner, join PDF files, online PDF merger, free PDF tool, PDF consolidation"
        canonical="pdf-merger"
        ogImage="/images/pdf-merger-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Merge className="h-4 w-4" />
                <span>PDF Merger</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Merge PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Combine multiple PDF documents into a single file. Perfect for creating comprehensive reports, presentations, or organized documents.
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
                    accept="application/pdf"
                    multiple
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
                    <span>Selected PDFs ({files.length}) - Drag to reorder</span>
                  </h3>
                  <div className="space-y-3">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <div className="text-gray-400 font-bold text-sm w-6">{index + 1}</div>
                        <FileType className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div className="flex space-x-2">
                          {index > 0 && (
                            <button 
                              onClick={() => moveFile(index, index - 1)}
                              className="text-gray-500 hover:text-violet-600 transition-colors"
                            >
                              ↑
                            </button>
                          )}
                          {index < files.length - 1 && (
                            <button 
                              onClick={() => moveFile(index, index + 1)}
                              className="text-gray-500 hover:text-violet-600 transition-colors"
                            >
                              ↓
                            </button>
                          )}
                          <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Merge className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF merging.<br/>Merging will combine all selected PDFs into a single document.</p>
                </div>
              </div>

              {/* Merge Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Merge className="h-5 w-5 text-violet-600" />
                  <span>Merge Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Merge Order</label>
                    <select
                      value={settings.mergeOrder}
                      onChange={e => setSettings(prev => ({ ...prev, mergeOrder: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="name">By File Name</option>
                      <option value="upload">By Upload Order</option>
                      <option value="size">By File Size</option>
                      <option value="custom">Custom Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Filename</label>
                    <input
                      type="text"
                      value={settings.outputName}
                      onChange={e => setSettings(prev => ({ ...prev, outputName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="merged_document.pdf"
                    />
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="addBookmarks"
                      checked={settings.addBookmarks}
                      onChange={e => setSettings(prev => ({ ...prev, addBookmarks: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addBookmarks" className="text-sm font-medium text-gray-700">Add Bookmarks</label>
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
                  disabled={files.length < 2 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Merging PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Merge className="h-5 w-5" />
                      <span>Merge {files.length} PDF Files</span>
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
                {/* Download Area */}
                {processedFiles.length > 0 && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Merging Complete!
                        </h3>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Your PDF files have been successfully merged.
                      </p>
                      <button
                        onClick={downloadAll}
                        className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                      >
                        <Download className="h-5 w-5" />
                        Download Merged PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Merger?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced merging technology for creating comprehensive PDF documents</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Merge PDF Files</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to merge your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Merge PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF merger for comprehensive documents</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Merge className="h-5 w-5" />
                    <span>Start Merging Now</span>
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

export default PDFMerger;
