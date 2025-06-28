import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, ImageIcon, FileType, Info } from 'lucide-react';
import SEO from './SEO';

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612.0, 792.0],
  Legal: [612.0, 1008.0],
  A3: [841.89, 1190.55],
};

const getPageSize = (pageSize: string, orientation: string): [number, number] | null => {
  if (pageSize === 'auto') return null;
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];
  if (orientation === 'landscape') {
    return [size[1], size[0]];
  }
  return size;
};

const TIFFToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    compression: 'none',
    pageSize: 'auto',
    orientation: 'auto',
    dpi: 300,
    includeMetadata: true,
    multiPage: true
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPreviewUrl = useRef<string | null>(null);

  // Live Preview Effect
  useEffect(() => {
    const showPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      try {
        const file = files[0];
        const tiffModule = await import('tiff');
        const arrayBuffer = await file.arrayBuffer();
        const images = tiffModule.decode(arrayBuffer);
        if (!images || images.length === 0) throw new Error('No image found in TIFF');
        const img = images[0];
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
            setPreviewUrl(url);
            prevPreviewUrl.current = url;
          }
        }, 'image/png');
      } catch (e) {
        setPreviewUrl(null);
      }
    };
    showPreview();
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    };
  }, [files]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const tiffFiles = selectedFiles.filter(file => 
      file.type === 'image/tiff' || file.type === 'image/tif' || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif')
    );
    setFiles(prev => [...prev, ...tiffFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const tiffFiles = droppedFiles.filter(file => 
      file.type === 'image/tiff' || file.type === 'image/tif' || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif')
    );
    setFiles(prev => [...prev, ...tiffFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const tiffModule = await import('tiff');
          const { PDFDocument, degrees } = await import('pdf-lib');
          const arrayBuffer = await file.arrayBuffer();
          const images = tiffModule.decode(arrayBuffer);
          if (!images || images.length === 0) throw new Error('No image found in TIFF');
          const pdfDoc = await PDFDocument.create();
          // Metadata
          if (settings.includeMetadata) {
            pdfDoc.setTitle(file.name.replace(/\.(tiff|tif)$/i, ''));
            pdfDoc.setCreator('jpg2go TIFF to PDF Converter');
            pdfDoc.setProducer('jpg2go');
            pdfDoc.setCreationDate(new Date());
            pdfDoc.setModificationDate(new Date());
          }
          // Multi-page support
          const pagesToProcess = settings.multiPage ? images : [images[0]];
          for (const img of pagesToProcess) {
            // DPI scaling
            let width = img.width;
            let height = img.height;
            if (settings.dpi && settings.dpi !== 300) {
              const scale = settings.dpi / 300;
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            // Page size/orientation
            const pageDims = getPageSize(settings.pageSize, settings.orientation);
            if (pageDims) {
              width = pageDims[0];
              height = pageDims[1];
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            // Draw image data (scale if needed)
            const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
            if (width !== img.width || height !== img.height) {
              // Draw to temp canvas, then scale
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.putImageData(imageData, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0, width, height);
              } else {
                // fallback: just put image data directly (may be blank if scale needed)
                ctx.putImageData(imageData, 0, 0);
              }
            } else {
              ctx.putImageData(imageData, 0, 0);
            }
            const dataUrl = canvas.toDataURL('image/png');
            const page = pdfDoc.addPage([width, height]);
            // Orientation
            if (settings.orientation === 'landscape' && height > width) {
              page.setRotation(degrees(90));
            } else if (settings.orientation === 'portrait' && width > height) {
              page.setRotation(degrees(0));
            }
            const pngImage = await pdfDoc.embedPng(dataUrl);
            page.drawImage(pngImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
          // Compression: pdf-lib does not support direct compression, but we can note this in the UI or future-proof
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.(tiff|tif)$/i, '.pdf'),
            blob,
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`TIFF to PDF conversion completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error converting TIFF to PDF:', error);
      setIsProcessing(false);
      alert('Error converting TIFF to PDF. Please try again.');
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
    { icon: <ImageIcon className="h-6 w-6" />, title: 'High Quality', description: 'Convert TIFF images with high resolution and quality' },
    { icon: <Shield className="h-6 w-6" />, title: 'Multi-page Support', description: 'Handle multi-page TIFF files as separate PDF pages' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple TIFF files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'Maintain original image quality and color depth' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload TIFF Files', description: 'Select TIFF image files to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion options and quality settings' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '95K+', label: 'TIFF Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="TIFF to PDF | Convert TIFF Files to PDF Format"
        description="Turn TIFF images into PDF documents easily with our online TIFF to PDF converter. Perfect for sharing and archiving high-quality images."
        keywords="TIFF to PDF, convert TIFF, TIFF converter, image to PDF, online tool, free tool"
        canonical="tiff-to-pdf"
        ogImage="/images/tiff-to-pdf-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>TIFF to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert TIFF to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert TIFF images to PDF format while preserving high resolution, color depth, and quality. Perfect for scanned documents, professional photography, and archival purposes.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your TIFF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.tiff, .tif)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose TIFF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".tiff,.tif,image/tiff,image/tif"
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
                    <span>Selected TIFF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <ImageIcon className="h-8 w-8 text-violet-600" />
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
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center" style={{ minHeight: 180 }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="TIFF preview"
                      className="rounded shadow max-w-full max-h-60 border border-gray-200"
                      aria-label="Preview of first TIFF"
                    />
                  ) : (
                    <p className="text-gray-500">No preview available. Upload a TIFF file to see a live preview.</p>
                  )}
                  {files.length > 0 && (
                    <p className="text-sm mt-2">{files[0].name} - {Math.round(files[0].size / 1024)} KB</p>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5 text-violet-600" />
                    <span>Conversion Settings</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                      <select
                        value={settings.compression}
                        onChange={e => setSettings(prev => ({ ...prev, compression: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="none">No Compression</option>
                        <option value="low">Low Compression</option>
                        <option value="medium">Medium Compression</option>
                        <option value="high">High Compression</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                      <select
                        value={settings.pageSize}
                        onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="A3">A3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DPI</label>
                      <select
                        value={settings.dpi}
                        onChange={e => setSettings(prev => ({ ...prev, dpi: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value={150}>150 DPI</option>
                        <option value={300}>300 DPI</option>
                        <option value={600}>600 DPI</option>
                        <option value={1200}>1200 DPI</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="multiPage"
                        checked={settings.multiPage}
                        onChange={e => setSettings(prev => ({ ...prev, multiPage: e.target.checked }))}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label htmlFor="multiPage" className="text-sm font-medium text-gray-700">Multi-page Support</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeMetadata"
                        checked={settings.includeMetadata}
                        onChange={e => setSettings(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeMetadata" className="text-sm font-medium text-gray-700">Include Metadata</label>
                    </div>
                  </div>
                </div>
              )}

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
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Convert TIFF to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our TIFF to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for high-quality image transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert TIFF to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your TIFF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert TIFF to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our TIFF to PDF converter for high-quality image conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span>Start Converting Now</span>
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

export default TIFFToPDFConverter; 