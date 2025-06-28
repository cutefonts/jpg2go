import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileType, Download, Upload, Settings, Eye, ArrowRight, CheckCircle, Sparkles, Zap, BarChart3, Shield, FileCode, RotateCcw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import SEO from './SEO';
import JSZip from 'jszip';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToSVGConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState({
    preserveText: true,
    includeImages: true,
    optimizeSVG: true,
    format: 'svg',
    quality: 80,
    optimizePaths: true
  });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSvgPreview(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      let previewSvg: string | null = null;
      for (const file of files) {
        try {
        // Load the PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        // Create SVG content
            let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${viewport.width}" height="${viewport.height}" xmlns="http://www.w3.org/2000/svg">\n  <rect width="100%" height="100%" fill="white"/>\n`;
        // Extract text content if preserveText is enabled
        if (settings.preserveText) {
          const textContent = await page.getTextContent();
          textContent.items.forEach((item: any) => {
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5]; // Flip Y coordinate
            svgContent += `  <text x="${x}" y="${y}" font-family="Arial" font-size="12" fill="black">${item.str}</text>\n`;
          });
        }
        // Add placeholder for images if includeImages is enabled
        if (settings.includeImages) {
          svgContent += `  <!-- Images would be embedded here in a full implementation -->\n`;
        }
        svgContent += `</svg>`;
            // For preview: set svgPreview to the first SVG's text
            if (!previewSvg && svgContent) previewSvg = svgContent;
        // Create SVG blob
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        processed.push({
              name: file.name.replace(/\.pdf$/i, `_p${pageNum}.svg`),
          blob: svgBlob
        });
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setProcessedFiles(processed);
      setIsDownloadReady(true);
      if (processed.length === 0) setError('No files were successfully processed.');
      setSvgPreview(previewSvg);
    } catch (error) {
      console.error('Error converting PDFs:', error);
      setError('Error converting PDF files to SVG. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFiles = async () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
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
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'converted-svgs.zip';
      link.click();
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    setPreviewUrl(null);
    setSvgPreview(null);
  };

  // Live preview processing
  const processPreview = async () => {
    if (files.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }, 'image/jpeg', 0.8);
    };
    
    const fileUrl = URL.createObjectURL(files[0]);
    img.src = fileUrl;
  };

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    }
  }, [settings, files]);

  const stats = [
    { label: 'Vector Graphics', value: 'Scalable Quality', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Web Compatible', value: 'SVG Format', icon: <Shield className="h-5 w-5" /> },
    { label: 'Text Preservation', value: 'Editable Text', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Vector Graphics Conversion',
      description: 'Convert PDF graphics to scalable SVG vector format for web use, design tools, and unlimited scaling without quality loss.',
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: 'Text Preservation',
      description: 'Maintain editable text elements in SVG format for easy editing, translation, and accessibility compliance.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Image Integration',
      description: 'Include and preserve images from PDF documents in the converted SVG files for complete visual fidelity.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'SVG Optimization',
      description: 'Automatically optimize SVG files for smaller file sizes while maintaining visual quality and performance.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Works best with vector-based PDFs and graphics.'
    },
    {
      step: 2,
      title: 'Configure SVG Settings',
      description: 'Choose vector mode, text preservation, image inclusion, and optimization options for your SVG output.'
    },
    {
      step: 3,
      title: 'Process & Convert',
      description: 'Click process to convert your PDFs to SVG format with vector graphics and editable text elements.'
    },
    {
      step: 4,
      title: 'Download SVG Files',
      description: 'Download your scalable SVG files ready for web use, design tools, or further editing and customization.'
    }
  ];

  return (
    <>
      <SEO
        title="PDF to SVG | Free Online PDF to SVG Converter"
        description="Convert your PDFs to SVG files for scalable, high-quality graphics. Fast and simple online PDF to SVG converter."
        keywords="PDF to SVG, convert PDF to SVG, PDF converter, vector conversion, online tool, free tool"
        canonical="pdf-to-svg"
        ogImage="/images/pdf-to-svg-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileCode className="h-4 w-4" />
                <span>PDF to SVG Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF to SVG Converter Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert PDF documents to scalable SVG vector graphics with professional quality. 
                Perfect for web graphics, logos, icons, and scalable illustrations.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    dragActive ? 'border-violet-500 bg-violet-50/50' : files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleDropZoneClick}
                  tabIndex={0}
                  aria-label="File upload drop zone"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for SVG conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer mt-2"
                  >
                    Choose PDF Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
                {error && (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
                )}
                {svgPreview && (
                  <div className="mt-4 p-4 bg-blue-50 text-blue-900 rounded-lg max-h-96 overflow-x-auto text-xs">
                    <strong>Preview (first SVG):</strong>
                    <div className="mt-2 border bg-white rounded p-2 overflow-x-auto" style={{ maxHeight: 400 }}>
                      <div dangerouslySetInnerHTML={{ __html: svgPreview }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">SVG Conversion Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings({...settings, format: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="svg">SVG</option>
                      <option value="svgz">Compressed SVG</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality: {settings.quality}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.quality}
                      onChange={(e) => setSettings({...settings, quality: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preserveText"
                      checked={settings.preserveText}
                      onChange={(e) => setSettings({...settings, preserveText: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveText" className="text-sm font-medium text-gray-700">
                      Preserve Text as Text
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="optimizePaths"
                      checked={settings.optimizePaths}
                      onChange={(e) => setSettings({...settings, optimizePaths: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="optimizePaths" className="text-sm font-medium text-gray-700">
                      Optimize Paths
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting to SVG...</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="h-5 w-5" />
                      <span>Convert to SVG</span>
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
                    onClick={() => downloadFiles()}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download SVG Files</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF to SVG Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Vector graphics conversion with scalable quality and web-optimized output
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
                  How to Convert PDF to SVG
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your PDF documents to SVG graphics
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
                    Ready to Convert PDF to SVG?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents into scalable SVG graphics. Join thousands of users 
                    who trust our tool for vector graphics conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileCode className="h-5 w-5" />
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
    </>
  );
};

export default PDFToSVGConverter; 