import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFPageNumbers: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    pageNumberStyle: 'arabic',
    position: 'bottom-center',
    startNumber: 1,
    fontSize: 12,
    includeTotal: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    // Prevent duplicates
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      pageNumberStyle: 'arabic',
      position: 'bottom-center',
      startNumber: 1,
      fontSize: 12,
      includeTotal: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setShowSpinner(true);
    setError(null);
    setSuccess(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          let font;
          try { font = await pdfDoc.embedFont(StandardFonts.Helvetica); } catch { font = await pdfDoc.embedFont(StandardFonts.TimesRoman); }
          const pages = pdfDoc.getPages();
          pages.forEach((page, pageIndex) => {
            const { width, height } = page.getSize();
            const pageNumber = pageIndex + settings.startNumber;
            let pageNumberText = pageNumber.toString();
            if (settings.pageNumberStyle === 'roman') pageNumberText = toRoman(pageNumber);
            else if (settings.pageNumberStyle === 'letters') pageNumberText = toLetters(pageNumber);
            if (settings.includeTotal) pageNumberText += ` / ${pages.length}`;
            let x = width / 2, y = settings.fontSize + 20;
            if (settings.position.includes('top')) y = height - 20;
            if (settings.position.includes('left')) x = 50;
            else if (settings.position.includes('right')) x = width - 50;
            page.drawText(pageNumberText, { x, y, size: settings.fontSize, font, color: rgb(0, 0, 0) });
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: `numbered_${file.name}`, blob });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setShowSpinner(false);
      if (processed.length > 0) {
        setSuccess(`PDF page numbering completed! Processed ${processed.length} files.`);
      } else {
        setError('No files were processed. Please check your files and try again.');
      }
    } catch (error) {
      console.error('Error numbering PDFs:', error);
      setIsProcessing(false);
      setShowSpinner(false);
      setError('Error numbering PDFs. Please try again.');
    }
  };
  
  // Helper function to convert number to Roman numerals
  const toRoman = (num: number): string => {
    const romanNumerals = [
      { value: 1000, numeral: 'M' },
      { value: 900, numeral: 'CM' },
      { value: 500, numeral: 'D' },
      { value: 400, numeral: 'CD' },
      { value: 100, numeral: 'C' },
      { value: 90, numeral: 'XC' },
      { value: 50, numeral: 'L' },
      { value: 40, numeral: 'XL' },
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ];
    
    let result = '';
    for (const { value, numeral } of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  };
  
  // Helper function to convert number to letters (A, B, C, ...)
  const toLetters = (num: number): string => {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result || 'A';
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

  const features = [
    { icon: <CheckCircle className="h-6 w-6" />, title: 'Multiple Styles', description: 'Arabic, Roman, and custom page number formats' },
    { icon: <Shield className="h-6 w-6" />, title: 'Flexible Positioning', description: 'Add numbers to top, bottom, or custom positions' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Add page numbers to multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Custom Formatting', description: 'Customize font, size, and numbering style' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to number' },
    { step: '2', title: 'Configure Numbers', description: 'Choose numbering style and position' },
    { step: '3', title: 'Process & Download', description: 'Download numbered PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '85K+', label: 'PDFs Numbered' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const renderPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      try {
        const file = files[0];
        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setPreviewUrl(null);
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Overlay page number
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.font = `${settings.fontSize}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = '#000';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const pageNumber = settings.startNumber;
        let pageNumberText = pageNumber.toString();
        if (settings.pageNumberStyle === 'roman') {
          const toRoman = (num: number) => { const romanNumerals = [ { value: 1000, numeral: 'M' }, { value: 900, numeral: 'CM' }, { value: 500, numeral: 'D' }, { value: 400, numeral: 'CD' }, { value: 100, numeral: 'C' }, { value: 90, numeral: 'XC' }, { value: 50, numeral: 'L' }, { value: 40, numeral: 'XL' }, { value: 10, numeral: 'X' }, { value: 9, numeral: 'IX' }, { value: 5, numeral: 'V' }, { value: 4, numeral: 'IV' }, { value: 1, numeral: 'I' } ]; let result = ''; for (const { value, numeral } of romanNumerals) { while (num >= value) { result += numeral; num -= value; } } return result; };
          pageNumberText = toRoman(pageNumber);
        } else if (settings.pageNumberStyle === 'letters') {
          const toLetters = (num: number) => { let result = ''; while (num > 0) { num--; result = String.fromCharCode(65 + (num % 26)) + result; num = Math.floor(num / 26); } return result || 'A'; };
          pageNumberText = toLetters(pageNumber);
        }
        if (settings.includeTotal) pageNumberText += ' / ?';
        let x = canvas.width / 2, y = settings.fontSize + 20;
        if (settings.position.includes('top')) y = 40;
        if (settings.position.includes('left')) x = 50;
        else if (settings.position.includes('right')) x = canvas.width - 50;
        ctx.fillText(pageNumberText, x, y);
        ctx.restore();
        canvas.toBlob(blob => {
          if (blob) setPreviewUrl(URL.createObjectURL(blob));
        }, 'image/png');
      } catch (e) {
        setPreviewUrl(null);
      }
    };
    renderPreview();
    // Cleanup old preview URLs
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [files, settings]);

  return (
    <>
      <SEO 
        title="PDF Page Numbers | Customize & Add Numbers to PDFs"
        description="Add and customize page numbers on your PDFs online. Fast, free, and easy-to-use PDF page numbers tool for professional-looking documents."
        keywords="PDF page numbers, add page numbers to PDF, PDF pagination, online tool, free tool"
        canonical="pdf-page-numbers"
        ogImage="/images/pdf-page-numbers-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <CheckCircle className="h-4 w-4" />
                <span>PDF Page Numbers</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Page Numbers
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> to PDFs</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add professional page numbers to your PDF documents with customizable styles and positioning. Perfect for reports, books, and presentations.
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
                  tabIndex={0}
                  aria-label="Upload PDF files by clicking or dragging and dropping"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
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
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
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

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="PDF page number preview" className="mx-auto max-h-96 w-auto object-contain border shadow" />
                  ) : (
                    <p className="text-gray-500">No preview available. Upload a PDF to see a live preview of the page number on the first page.</p>
                  )}
                </div>
              </div>

              {/* Page Number Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-violet-600" />
                  <span>Page Number Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number Style</label>
                    <select
                      value={settings.pageNumberStyle}
                      onChange={e => setSettings(prev => ({ ...prev, pageNumberStyle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="arabic">1, 2, 3...</option>
                      <option value="roman">i, ii, iii...</option>
                      <option value="letters">a, b, c...</option>
                      <option value="custom">Custom Format</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <select
                      value={settings.position}
                      onChange={e => setSettings(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Number</label>
                    <input
                      type="number"
                      value={settings.startNumber}
                      onChange={e => setSettings(prev => ({ ...prev, startNumber: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="1"
                      max="9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <input
                      type="number"
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="8"
                      max="72"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeTotal"
                      checked={settings.includeTotal}
                      onChange={e => setSettings(prev => ({ ...prev, includeTotal: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeTotal" className="text-sm font-medium text-gray-700">Include Total Pages</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Add Page Numbers"
                  type="button"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Page Numbers...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Add Page Numbers</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center space-x-2"
                  aria-label="Reset Tool"
                  type="button"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    aria-label="Download Numbered PDFs"
                    type="button"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Numbered PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Page Numbers Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional page numbering technology for polished PDF documents</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Add Page Numbers to PDFs</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to add page numbers to your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Add Page Numbers?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF page numbers tool for professional documents</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Start Adding Numbers Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {showSpinner && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mb-4"></div>
            <span className="text-white text-lg font-semibold">Processing...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
    </>
  );
};

export default PDFPageNumbers; 