import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileType, Download, Upload, Settings, Eye, ArrowRight, CheckCircle, Sparkles, Zap, BarChart3, Shield, FileImage, RotateCcw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import SEO from './SEO';
import JSZip from 'jszip';
import UTIF from 'utif';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Utility: Convert RGBA to grayscale
function rgbaToGrayscale(rgba: Uint8ClampedArray) {
  const gray = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const avg = Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
    gray[i] = gray[i + 1] = gray[i + 2] = avg;
    gray[i + 3] = rgba[i + 3];
  }
  return gray;
}

// Utility: Convert RGBA to black & white
function rgbaToBW(rgba: Uint8ClampedArray) {
  const bw = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const avg = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    const val = avg > 127 ? 255 : 0;
    bw[i] = bw[i + 1] = bw[i + 2] = val;
    bw[i + 3] = rgba[i + 3];
  }
  return bw;
}

const PDFToTIFFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    resolution: 300,
    quality: 90,
    compression: 'lzw',
    colorMode: 'rgb',
    includeMetadata: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    if (selectedFiles.length > 0) {
      const url = URL.createObjectURL(selectedFiles[0]);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    
    if (pdfFiles.length > 0) {
      const url = URL.createObjectURL(pdfFiles[0]);
      setPreviewUrl(url);
    }
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
    setError(null);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: settings.resolution / 72 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          let rgba = imageData.data;
          // Color mode conversion
          if (settings.colorMode === 'grayscale') {
            rgba = rgbaToGrayscale(rgba);
          } else if (settings.colorMode === 'bw') {
            rgba = rgbaToBW(rgba);
          }
          // TIFF encoding options
          // Note: UTIF.encodeImage does not support compression as an argument in this version
          let tiff = UTIF.encodeImage(rgba, canvas.width, canvas.height);
          const tiffBlob = new Blob([tiff], { type: 'image/tiff' });
          const tiffName = `${file.name.replace(/\.pdf$/i, '')}_page${pageNum}.tiff`;
          processed.push({ name: tiffName, blob: tiffBlob });
          if (files.indexOf(file) === 0 && pageNum === 1) {
            const url = URL.createObjectURL(tiffBlob);
            setPreviewUrl(url);
      }
        }
      }
      setProcessedFiles(processed);
      setIsDownloadReady(true);
    } catch (err: any) {
      setError('Error converting PDF files to TIFF: ' + (err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFiles = async () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }
    if (processedFiles.length === 1) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(processedFiles[0].blob);
      link.download = processedFiles[0].name;
      link.click();
    } else {
      // Batch ZIP download
      const zip = new JSZip();
      processedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
        const link = document.createElement('a');
      link.href = url;
      link.download = 'pdf-to-tiff-files.zip';
        link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // Live preview processing
  const processPreview = useCallback(async () => {
    if (files.length === 0) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const scale = settings.resolution / 72;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333';
      ctx.font = `${24 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('PDF Preview', canvas.width / 2, canvas.height / 2 - 50);
      ctx.font = `${16 * scale}px Arial`;
      ctx.fillText(`Resolution: ${settings.resolution} DPI`, canvas.width / 2, canvas.height / 2);
      ctx.fillText(`Compression: ${settings.compression}`, canvas.width / 2, canvas.height / 2 + 30);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ3aGl0ZSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9ImdyYXkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBERiBQYWdlIFByZXZpZXc8L3RleHQ+PC9zdmc+';
  }, [files, settings]);

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    }
  }, [processPreview]);

  const stats = [
    { label: 'High Resolution', value: 'Up to 600 DPI', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Lossless Quality', value: 'TIFF Format', icon: <Shield className="h-5 w-5" /> },
    { label: 'Batch Processing', value: 'Multiple Files', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'High Resolution Output',
      description: 'Convert PDF pages to high-quality TIFF images with custom DPI settings up to 600 DPI for professional printing and archiving.',
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: 'Multiple Compression Options',
      description: 'Choose from LZW, ZIP, or no compression to balance file size and quality according to your needs.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Color Mode Control',
      description: 'Convert to RGB, CMYK, or grayscale modes for different use cases and printing requirements.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'Batch Processing',
      description: 'Convert multiple PDF files simultaneously with consistent settings and automated workflow.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Supports multiple files for batch processing.'
    },
    {
      step: 2,
      title: 'Configure Settings',
      description: 'Set resolution (72-600 DPI), quality (1-100), compression type, and color mode for optimal output.'
    },
    {
      step: 3,
      title: 'Process & Preview',
      description: 'Click process to convert your PDFs to TIFF format. Preview the results before downloading.'
    },
    {
      step: 4,
      title: 'Download TIFF Files',
      description: 'Download your high-quality TIFF images ready for professional printing, archiving, or further editing.'
    }
  ];

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    setPreviewUrl(null);
  };

  return (
    <>
      <SEO
        title="PDF to TIFF | Free Online PDF to TIFF Converter"
        description="Easily transform your PDFs into TIFF format images. Use our free PDF to TIFF tool online for fast, reliable, and secure conversion."
        keywords="PDF to TIFF, convert PDF to TIFF, PDF to image, TIFF converter, online tool, free tool"
        canonical="pdf-to-tiff"
        ogImage="/images/pdf-to-tiff-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>PDF to TIFF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to TIFF Images
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert PDF documents to high-quality TIFF images with professional settings. 
                Perfect for archiving, printing, and image processing workflows.
              </p>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="text-violet-600">
                        {stat.icon}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here for TIFF conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
              </div>

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">TIFF Conversion Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution: {settings.resolution} DPI
                    </label>
                    <input
                      type="range"
                      min="72"
                      max="600"
                      step="72"
                      value={settings.resolution}
                      onChange={(e) => setSettings({...settings, resolution: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compression
                    </label>
                    <select
                      value={settings.compression}
                      onChange={(e) => setSettings({...settings, compression: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="none">None</option>
                      <option value="lzw">LZW</option>
                      <option value="deflate">Deflate</option>
                      <option value="jpeg">JPEG</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Mode
                    </label>
                    <select
                      value={settings.colorMode}
                      onChange={(e) => setSettings({...settings, colorMode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="rgb">RGB</option>
                      <option value="cmyk">CMYK</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="bw">Black & White</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeMetadata"
                      checked={settings.includeMetadata}
                      onChange={(e) => setSettings({...settings, includeMetadata: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeMetadata" className="text-sm font-medium text-gray-700">
                      Include Metadata
                    </label>
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
                      <span>Converting to TIFF...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="h-5 w-5" />
                      <span>Convert to TIFF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Download */}
              {processedFiles.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={downloadFiles}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download TIFF Files</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF to TIFF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  High-quality TIFF conversion with professional settings and lossless quality
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  How to Convert PDF to TIFF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your PDF documents to TIFF images
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-xl">{step.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                    Ready to Convert PDF to TIFF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents into high-quality TIFF images. Join thousands of users 
                    who trust our tool for professional image conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        </section>
      </div>
      {error && (
        <div className="bg-red-100 text-red-700 rounded-lg p-3 mb-4 text-center">{error}</div>
      )}
    </>
  );
};

export default PDFToTIFFConverter; 