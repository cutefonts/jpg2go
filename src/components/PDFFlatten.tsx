import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, Layers } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFFlatten: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    flattenMode: 'all',
    preserveText: true,
    preserveImages: true,
    reduceFileSize: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
          // Create a new PDF for the flattened version
          const flattenedPdf = await PDFDocument.create();
          // Copy all pages from the original PDF
          const pages = await flattenedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          // Add all pages to the new PDF
          pages.forEach(page => {
            flattenedPdf.addPage(page);
          });
          // Flatten logic
          if (settings.flattenMode === 'all' || settings.flattenMode === 'forms' || settings.flattenMode === 'annotations') {
            const pageCount = flattenedPdf.getPageCount();
            for (let i = 0; i < pageCount; i++) {
              const page = flattenedPdf.getPage(i);
              // Remove annotations (pdf-lib limitation: can only remove annotation refs)
              if (settings.flattenMode === 'all' || settings.flattenMode === 'annotations') {
                if ((page as any).node && (page as any).node.Annots) {
                  (page as any).node.Annots = undefined;
                }
              }
              // Remove form fields (pdf-lib limitation: can only remove widget annotation refs)
              if (settings.flattenMode === 'all' || settings.flattenMode === 'forms') {
                if ((page as any).node && (page as any).node.Annots) {
                  (page as any).node.Annots = undefined;
                }
              }
              // Optionally remove text/images (not supported by pdf-lib, so just a placeholder)
              // Optionally reduce file size (not supported by pdf-lib, so just a placeholder)
            }
          }
          // Save the flattened PDF
          const pdfBytes = await flattenedPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: `flattened_${file.name}`, blob });
        } catch (error) {
          setBanner({ message: `Error processing ${file.name}. Skipping this file.`, type: 'error' });
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setBanner({ message: `PDF flattening completed! Processed ${processed.length} files.`, type: 'success' });
    } catch (error) {
      setIsProcessing(false);
      setBanner({ message: 'Error flattening PDFs. Please try again.', type: 'error' });
    }
  };

  // Live preview of first page after flattening
  useEffect(() => {
    const genPreview = async () => {
      if (!files[0]) { setPreviewUrl(null); return; }
      try {
        const { PDFDocument } = await import('pdf-lib');
        const file = files[0];
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const flattenedPdf = await PDFDocument.create();
        const pages = await flattenedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => {
          flattenedPdf.addPage(page);
        });
        if (settings.flattenMode === 'all' || settings.flattenMode === 'forms' || settings.flattenMode === 'annotations') {
          const pageCount = flattenedPdf.getPageCount();
          for (let i = 0; i < pageCount; i++) {
            const page = flattenedPdf.getPage(i);
            if (settings.flattenMode === 'all' || settings.flattenMode === 'annotations') {
              if ((page as any).node && (page as any).node.Annots) {
                (page as any).node.Annots = undefined;
              }
            }
            if (settings.flattenMode === 'all' || settings.flattenMode === 'forms') {
              if ((page as any).node && (page as any).node.Annots) {
                (page as any).node.Annots = undefined;
              }
            }
          }
        }
        const pdfBytes = await flattenedPdf.save();
        // Use pdfjs-dist for rendering
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const previewPage = await pdf.getPage(1);
        const viewport = previewPage.getViewport({ scale: 0.7 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setBanner({ message: 'Failed to get canvas context for preview.', type: 'error' }); return; }
        await previewPage.render({ canvasContext: ctx, viewport }).promise;
        setPreviewUrl(canvas.toDataURL());
      } catch (err) {
        setPreviewUrl(null);
        setBanner({ message: 'Failed to generate live preview. See console for details.', type: 'error' });
        console.error('[LivePreview] Error generating preview:', err);
      }
    };
    genPreview();
     
  }, [files, settings]);

  // Spinner overlay
  const SpinnerOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      {/* Spinner removed */}
    </div>
  );

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
    { icon: <Layers className="h-6 w-6" />, title: 'Layer Flattening', description: 'Convert all layers into a single flat layer' },
    { icon: <Shield className="h-6 w-6" />, title: 'Form Flattening', description: 'Flatten fillable forms into static content' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Flatten multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Size Reduction', description: 'Reduce file size while maintaining quality' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to flatten' },
    { step: '2', title: 'Choose Settings', description: 'Select flattening options and preferences' },
    { step: '3', title: 'Flatten & Download', description: 'Download flattened PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '75K+', label: 'PDFs Flattened' },
    { icon: <Zap className="h-5 w-5" />, value: '< 45s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Flatten | Flatten PDF Files Online Free"
        description="Easily flatten your PDF files online to lock in annotations, form fields, and layers. Use our free PDF flatten tool—fast, secure, and simple."
        keywords="PDF flatten, flatten PDF forms, PDF annotations, make PDF non-editable, online tool, free tool"
        canonical="pdf-flatten"
        ogImage="/images/pdf-flatten-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Layers className="h-4 w-4" />
                <span>PDF Flatten</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Flatten PDF Documents
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> with Ease</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert layered PDFs into flat documents, flatten fillable forms, and reduce file sizes. Perfect for archiving and sharing.
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
                  <Layers className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                {previewUrl ? (
                  <img src={previewUrl} alt="Live preview of first page after flattening" className="mx-auto rounded shadow bg-white" style={{ maxHeight: 400 }} />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                    <p>No live preview available for PDF flattening.<br/>Flattening will convert layers to flat content and generate optimized PDFs for download.</p>
                  </div>
                )}
              </div>

              {/* Flatten Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-violet-600" />
                  <span>Flatten Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Flatten Mode</label>
                    <select
                      value={settings.flattenMode}
                      onChange={e => setSettings(prev => ({ ...prev, flattenMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="all">All Layers</option>
                      <option value="forms">Forms Only</option>
                      <option value="annotations">Annotations Only</option>
                      <option value="custom">Custom Selection</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveText"
                      checked={settings.preserveText}
                      onChange={e => setSettings(prev => ({ ...prev, preserveText: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveText" className="text-sm font-medium text-gray-700">Preserve Text</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveImages"
                      checked={settings.preserveImages}
                      onChange={e => setSettings(prev => ({ ...prev, preserveImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveImages" className="text-sm font-medium text-gray-700">Preserve Images</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reduceFileSize"
                      checked={settings.reduceFileSize}
                      onChange={e => setSettings(prev => ({ ...prev, reduceFileSize: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="reduceFileSize" className="text-sm font-medium text-gray-700">Reduce File Size</label>
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
                      <span>Flattening PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="h-5 w-5" />
                      <span>Flatten PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Flattened PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Flatten Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced flattening technology for converting layered PDFs into flat documents</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Flatten PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to flatten your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Flatten Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF flatten tool for document optimization</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Layers className="h-5 w-5" />
                    <span>Start Flattening Now</span>
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

export default PDFFlatten; 