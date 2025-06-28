import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Crop, FileType, XCircle } from 'lucide-react';
import SEO from './SEO';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const presetMargins = {
  none: { marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 },
  small: { marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10 },
  medium: { marginTop: 25, marginBottom: 25, marginLeft: 25, marginRight: 25 },
  large: { marginTop: 50, marginBottom: 50, marginLeft: 50, marginRight: 50 }
};

const PDFCrop: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    cropMode: 'manual',
    cropAllPages: true,
    specificPages: '',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    maintainQuality: true,
    autoDetectMargins: false,
    preset: 'none'
  });
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    let errorMsg = '';
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        errorMsg = 'Only PDF files are allowed.';
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errorMsg = 'Duplicate file skipped: ' + file.name;
        continue;
      }
      deduped.push(file);
    }
    setFiles(deduped);
    if (errorMsg) setError(errorMsg);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Parse specific pages string (e.g., '1,3-5,7') into array of page indices (0-based)
  const parsePages = (str: string, total: number) => {
    const result: number[] = [];
    str.split(',').forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) if (i > 0 && i <= total) result.push(i - 1);
      } else {
        const n = Number(part);
        if (n > 0 && n <= total) result.push(n - 1);
      }
    });
    return Array.from(new Set(result));
  };

  // Helper to convert mm to points
  const mmToPt = (mm: number) => mm * 2.83465;

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();
          let cropSettings = { ...settings };
          // Apply preset if selected
          if (settings.cropMode === 'preset' && settings.preset in presetMargins) {
            cropSettings = { ...cropSettings, ...presetMargins[settings.preset as keyof typeof presetMargins] };
          }
          // Auto-detect margins (simple: use 5% of width/height as margin)
          if (settings.cropMode === 'auto' || settings.autoDetectMargins) {
            const { width, height } = pages[0].getSize();
            cropSettings.marginTop = cropSettings.marginBottom = Math.round((height * 0.05) / 2.83465); // convert to mm
            cropSettings.marginLeft = cropSettings.marginRight = Math.round((width * 0.05) / 2.83465);
          }
          // Determine which pages to crop
          let pageIndices: number[] = [];
          if (settings.cropAllPages) {
            pageIndices = pages.map((_, i) => i);
          } else {
            pageIndices = parsePages(settings.specificPages, pages.length);
          }
          if (pageIndices.length === 0) {
            setError('No valid pages selected for cropping. Please check your page range.');
            setIsProcessing(false);
            return;
          }
          // Apply cropping
          let anyCropped = false;
          pages.forEach((page, pageIndex) => {
            if (!pageIndices.includes(pageIndex)) return;
            const { width, height } = page.getSize();
            let cropX = mmToPt(cropSettings.marginLeft || 0);
            let cropY = mmToPt(cropSettings.marginBottom || 0);
            let cropWidth = width - mmToPt((cropSettings.marginLeft || 0) + (cropSettings.marginRight || 0));
            let cropHeight = height - mmToPt((cropSettings.marginTop || 0) + (cropSettings.marginBottom || 0));
            cropX = Math.max(0, Math.min(cropX, width));
            cropY = Math.max(0, Math.min(cropY, height));
            cropWidth = Math.max(1, Math.min(cropWidth, width - cropX));
            cropHeight = Math.max(1, Math.min(cropHeight, height - cropY));
            page.setCropBox(cropX, cropY, cropWidth, cropHeight);
            anyCropped = true;
          });
          if (!anyCropped) {
            setError('No pages were cropped. Please check your settings.');
            setIsProcessing(false);
            return;
          }
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '_cropped.pdf'), blob });
        } catch (error) {
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setSuccess(`PDF cropping completed! Processed ${processed.length} files.`);
    } catch (error) {
      setError('Error cropping PDFs. Please try again.');
      setIsProcessing(false);
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
    { icon: <Crop className="h-6 w-6" />, title: 'Smart Cropping', description: 'Crop PDFs with precise margin control' },
    { icon: <Shield className="h-6 w-6" />, title: 'Selective Cropping', description: 'Crop specific pages or all pages' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Crop multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to crop' },
    { step: '2', title: 'Set Crop Margins', description: 'Configure cropping margins and settings' },
    { step: '3', title: 'Crop & Download', description: 'Download your cropped PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '160K+', label: 'PDFs Cropped' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const renderPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        // Determine preview page
        let previewPageNum = 1;
        if (!settings.cropAllPages && settings.specificPages) {
          const indices = parsePages(settings.specificPages, pdf.numPages);
          if (indices.length > 0) previewPageNum = indices[0] + 1;
        }
        const page = await pdf.getPage(previewPageNum);
        const viewport = page.getViewport({ scale: 1 });
        // Render to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Draw crop rectangle overlay
        let cropSettings = { ...settings };
        if (settings.cropMode === 'preset' && settings.preset in presetMargins) {
          cropSettings = { ...cropSettings, ...presetMargins[settings.preset as keyof typeof presetMargins] };
        }
        if (settings.cropMode === 'auto' || settings.autoDetectMargins) {
          cropSettings.marginTop = cropSettings.marginBottom = Math.round(viewport.height * 0.05 / 2.83465);
          cropSettings.marginLeft = cropSettings.marginRight = Math.round(viewport.width * 0.05 / 2.83465);
        }
        const cropX = mmToPt(cropSettings.marginLeft || 0);
        const cropY = mmToPt(cropSettings.marginBottom || 0);
        const cropWidth = viewport.width - mmToPt((cropSettings.marginLeft || 0) + (cropSettings.marginRight || 0));
        const cropHeight = viewport.height - mmToPt((cropSettings.marginTop || 0) + (cropSettings.marginBottom || 0));
        ctx.save();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
        ctx.restore();
        setPreviewUrl('canvas');
      } catch (e) {
        setPreviewUrl(null);
      }
      setPreviewLoading(false);
    };
    renderPreview();
     
  }, [files, settings]);

  return (
    <>
      <SEO 
        title="PDF Crop | Crop PDF Pages Online Free"
        description="Crop and resize PDF pages effortlessly with our online PDF crop tool. Perfect for removing borders and adjusting page size."
        keywords="PDF crop, crop PDF, PDF cropper, online tool, free tool"
        canonical="pdf-crop"
        ogImage="/images/pdf-crop-og.jpg"
      />
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Crop className="h-4 w-4" />
                <span>PDF Crop</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Crop PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Crop PDF documents to remove unwanted margins, white space, or specific areas. Perfect for cleaning up scanned documents or adjusting page layouts.
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
                  role="button"
                  aria-label="Drop PDF files here or click to browse"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Crop className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 flex flex-col items-center">
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mb-4"></div>Loading preview...</div>
                  ) : previewUrl === 'canvas' ? (
                    <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 2px 8px #0001' }} />
                  ) : (
                    <p>No live preview available for PDF cropping.<br/>Cropping will remove specified margins from all pages.</p>
                  )}
                </div>
              </div>

              {/* Crop Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Crop className="h-5 w-5 text-violet-600" />
                  <span>Crop Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Crop Mode</label>
                    <select
                      value={settings.cropMode}
                      onChange={e => setSettings(prev => ({ ...prev, cropMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="manual">Manual Margins</option>
                      <option value="auto">Auto-detect Margins</option>
                      <option value="preset">Preset Margins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specific Pages</label>
                    <input
                      type="text"
                      value={settings.specificPages}
                      onChange={e => setSettings(prev => ({ ...prev, specificPages: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 1, 3-5, 7"
                      disabled={settings.cropAllPages}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="cropAllPages"
                      checked={settings.cropAllPages}
                      onChange={e => setSettings(prev => ({ ...prev, cropAllPages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="cropAllPages" className="text-sm font-medium text-gray-700">Crop All Pages</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Margin (mm)</label>
                    <input
                      type="number"
                      value={settings.marginTop}
                      onChange={e => setSettings(prev => ({ ...prev, marginTop: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bottom Margin (mm)</label>
                    <input
                      type="number"
                      value={settings.marginBottom}
                      onChange={e => setSettings(prev => ({ ...prev, marginBottom: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Left Margin (mm)</label>
                    <input
                      type="number"
                      value={settings.marginLeft}
                      onChange={e => setSettings(prev => ({ ...prev, marginLeft: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Right Margin (mm)</label>
                    <input
                      type="number"
                      value={settings.marginRight}
                      onChange={e => setSettings(prev => ({ ...prev, marginRight: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoDetectMargins"
                      checked={settings.autoDetectMargins}
                      onChange={e => setSettings(prev => ({ ...prev, autoDetectMargins: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoDetectMargins" className="text-sm font-medium text-gray-700">Auto-detect Margins</label>
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Cropping PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="h-5 w-5" />
                      <span>Crop PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Cropped PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Cropper?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced cropping technology for perfect page margins</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Crop PDF Files</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to crop your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Crop PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF cropper for perfect page margins</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Crop className="h-5 w-5" />
                    <span>Start Cropping Now</span>
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

export default PDFCrop; 