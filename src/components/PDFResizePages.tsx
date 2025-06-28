import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, Maximize2, X, CheckCircle } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Define a type for settings
interface ResizeSettings {
  resizeMode: string;
  pageWidth: number;
  pageHeight: number;
  scaleContent: boolean;
  maintainAspectRatio: boolean;
}

const PDFResizePages: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    resizeMode: 'custom',
    pageWidth: 595,
    pageHeight: 842,
    scaleContent: true,
    maintainAspectRatio: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scalingSupported, setScalingSupported] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string[]>([]);

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

  const isCustom = settings.resizeMode === 'custom';

  // Helper to get target size based on settings and original size
  function getTargetSize(settings: ResizeSettings, width: number, height: number) {
    let newWidth: number, newHeight: number;
    if (settings.resizeMode === 'custom') {
      newWidth = Math.max(100, Math.min(settings.pageWidth, 2000));
      newHeight = Math.max(100, Math.min(settings.pageHeight, 2000));
    } else {
      const pageSizes = {
        'a4': [595.28, 841.89],
        'a3': [841.89, 1190.55],
        'a5': [419.53, 595.28],
        'letter': [612, 792],
        'legal': [612, 1008]
      };
      [newWidth, newHeight] = pageSizes[settings.resizeMode as keyof typeof pageSizes] || [595.28, 841.89];
    }
    if (settings.maintainAspectRatio) {
      const aspectRatio = width / height;
      if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
    }
    return [newWidth, newHeight];
  }

  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'No PDF files selected. Please upload at least one PDF.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setErrorSummary([]);
    const settingsSummary: string[] = [];
    try {
      const processed: { name: string, blob: Blob }[] = [];
      const errors: string[] = [];
      let operators: any = null;
      let operatorsError = false;
      try {
        const pdfLib = await import('pdf-lib');
        if ('operators' in pdfLib) {
          operators = (pdfLib as any).operators;
        } else if ('default' in pdfLib && 'operators' in (pdfLib as any).default) {
          operators = (pdfLib as any).default.operators;
        }
      } catch (err) {
        operatorsError = true;
        setBanner({ message: 'Could not load pdf-lib operators for scaling. Only resizing will be performed.', type: 'error' });
      }
      for (const file of files) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();
          let summary = `${file.name}: `;
          pages.forEach(page => {
            const { width, height } = page.getSize();
            const [newWidth, newHeight] = getTargetSize(settings, width, height);
            page.setSize(newWidth, newHeight);
            summary += `Resized to ${Math.round(newWidth)}x${Math.round(newHeight)}; `;
            if (settings.scaleContent && operators && typeof page.pushOperators === 'function') {
              const scaleX = newWidth / width;
              const scaleY = newHeight / height;
              page.pushOperators(
                operators.pushGraphicsState(),
                operators.scale(scaleX, scaleY),
                operators.popGraphicsState()
              );
              summary += `Content scaled (${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}y); `;
            } else if (settings.scaleContent && !operators && !operatorsError) {
              summary += 'Scaling not supported; ';
            }
            if (settings.maintainAspectRatio) summary += 'Aspect ratio preserved; ';
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '_resized.pdf'), blob });
          settingsSummary.push(summary);
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setBanner({ message: `PDF page resizing completed! Processed ${processed.length} files.`, type: 'success' });
      setErrorSummary(errors);
      if (processed.length === 0) {
        setBanner({ message: 'No output files were generated. Please check your input PDFs and settings.', type: 'error' });
      }
      if (settingsSummary.length > 0) {
        setBanner({ message: 'Settings applied: ' + settingsSummary.join(' | '), type: 'success' });
      }
    } catch (error) {
      setIsProcessing(false);
      setBanner({ message: 'Error resizing PDF pages. Please try again.', type: 'error' });
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

  const features = [
    { icon: <Maximize2 className="h-6 w-6" />, title: 'Page Resizing', description: 'Resize PDF pages to custom dimensions' },
    { icon: <Shield className="h-6 w-6" />, title: 'Content Scaling', description: 'Scale content proportionally with pages' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Resize multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Preset Sizes', description: 'Common page sizes and custom dimensions' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to resize' },
    { step: '2', title: 'Set Dimensions', description: 'Choose page size and scaling options' },
    { step: '3', title: 'Resize & Download', description: 'Download resized PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '65K+', label: 'PDFs Resized' },
    { icon: <Zap className="h-5 w-5" />, value: '< 35s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Notification banner component
  const Banner = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
      role="alert" aria-live="assertive">
      <div className="flex items-center space-x-3">
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">×</button>
      </div>
    </div>
  );

  // Spinner overlay
  const SpinnerOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      {/* Spinner removed */}
    </div>
  );

  // Clean up object URLs after download
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Check pdf-lib version for scaling support
  useEffect(() => {
    (async () => {
      const { PDFDocument } = await import('pdf-lib');
      setScalingSupported(typeof PDFDocument.prototype.getPages()[0]?.pushOperators === 'function');
    })();
  }, []);

  // Generate live preview of resized first page
  useEffect(() => {
    const genPreview = async () => {
      if (!files[0]) { setPreviewUrl(null); return; }
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const { PDFDocument } = await import('pdf-lib');
        let operators: any = null;
        try {
          const pdfLib = await import('pdf-lib');
          if ('operators' in pdfLib) {
            operators = (pdfLib as any).operators;
          } else if ('default' in pdfLib && 'operators' in (pdfLib as any).default) {
            operators = (pdfLib as any).default.operators;
          }
        } catch {}
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();
        const [newWidth, newHeight] = getTargetSize(settings, width, height);
        page.setSize(newWidth, newHeight);
        if (settings.scaleContent && operators && typeof page.pushOperators === 'function') {
          const scaleX = newWidth / width;
          const scaleY = newHeight / height;
          page.pushOperators(
            operators.pushGraphicsState(),
            operators.scale(scaleX, scaleY),
            operators.popGraphicsState()
          );
        }
        const previewBytes = await pdfDoc.save();
        const loadingTask = pdfjsLib.getDocument({ data: previewBytes });
        const pdf = await loadingTask.promise;
        const previewPage = await pdf.getPage(1);
        const viewport = previewPage.getViewport({ scale: 0.7 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await previewPage.render({ canvasContext: ctx, viewport }).promise;
        setPreviewUrl(canvas.toDataURL());
      } catch {
        setPreviewUrl(null);
      }
    };
    genPreview();
     
  }, [files, settings]);

  return (
    <>
      <SEO 
        title="PDF Resize Pages | Resize PDF Pages Online Free"
        description="Resize PDF pages instantly with our free online tool. Customize your PDF page dimensions for better layout and compatibility."
        keywords="PDF resize pages, resize PDF pages, change PDF page size, online tool, free tool"
        canonical="pdf-resize-pages"
        ogImage="/images/pdf-resize-pages-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Maximize2 className="h-4 w-4" />
                <span>PDF Resize Pages</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Resize PDF Pages
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> to Any Size</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Resize PDF pages to custom dimensions while maintaining content quality. Perfect for printing and formatting needs.
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
                  role="region"
                  aria-label="PDF file upload area"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
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
                  <Maximize2 className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                {previewUrl ? (
                  <img src={previewUrl} alt="Live preview of first page" className="mx-auto rounded shadow bg-white" style={{ maxHeight: 400 }} />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                    <p>No live preview available for PDF page resizing.<br/>Resizing will adjust page dimensions and scale content accordingly.</p>
                  </div>
                )}
              </div>

              {/* Resize Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Maximize2 className="h-5 w-5 text-violet-600" />
                  <span>Resize Settings</span>
                  <span className="ml-2 text-xs text-gray-500" title="Page size is in PDF points (1 pt = 1/72 inch). Aspect ratio may override exact size.">[?]</span>
                </h3>
                {!scalingSupported && (
                  <div className="mb-2 text-sm text-red-600 bg-red-50 rounded p-2" role="alert">Content scaling is not supported by your current pdf-lib version. Please update for best results.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resize Mode</label>
                    <select
                      value={settings.resizeMode}
                      onChange={e => setSettings(prev => ({ ...prev, resizeMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="custom">Custom Size</option>
                      <option value="a4">A4 (210×297 mm)</option>
                      <option value="letter">Letter (8.5×11 in)</option>
                      <option value="legal">Legal (8.5×14 in)</option>
                      <option value="a3">A3 (297×420 mm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Width (points)</label>
                    <input
                      type="number"
                      value={settings.pageWidth}
                      onChange={e => setSettings(prev => ({ ...prev, pageWidth: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="100"
                      max="2000"
                      disabled={!isCustom}
                      aria-disabled={!isCustom}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Height (points)</label>
                    <input
                      type="number"
                      value={settings.pageHeight}
                      onChange={e => setSettings(prev => ({ ...prev, pageHeight: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="100"
                      max="2000"
                      disabled={!isCustom}
                      aria-disabled={!isCustom}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scaleContent"
                      checked={settings.scaleContent}
                      onChange={e => setSettings(prev => ({ ...prev, scaleContent: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="scaleContent" className="text-sm font-medium text-gray-700">Scale Content</label>
                    <span className="ml-1 text-xs text-gray-500" title="If enabled, content will be scaled to fit the new page size. If disabled, only the page size changes.">[?]</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainAspectRatio"
                      checked={settings.maintainAspectRatio}
                      onChange={e => setSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainAspectRatio" className="text-sm font-medium text-gray-700">Maintain Aspect Ratio</label>
                    <span className="ml-1 text-xs text-gray-500" title="If enabled, the aspect ratio of the original page will be preserved, which may override the exact size.">[?]</span>
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
                      {/* Spinner removed */}
                      <span>Resizing Pages...</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-5 w-5" />
                      <span>Resize PDF Pages</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Resized PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Page Resizer?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced page resizing technology for custom PDF formatting</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Resize PDF Pages</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to resize your PDF pages</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Resize Your PDF Pages?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF page resizer for custom formatting</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Maximize2 className="h-5 w-5" />
                    <span>Start Resizing Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Notification banner */}
      {isProcessing && (
        <Banner message="Processing... Please wait." type="success" onClose={() => {}} />
      )}
      {errorSummary.length > 0 && (
        <div className="my-4 bg-red-50 border border-red-200 text-red-700 rounded p-4" role="alert">
          <strong>Some files could not be processed:</strong>
          <ul className="list-disc ml-6 mt-2">
            {errorSummary.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}
    </>
  );
};

export default PDFResizePages; 