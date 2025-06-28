import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle } from 'lucide-react';
import SEO from './SEO';

const ImageToPDFCreator: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'portrait',
    quality: 'high',
    compression: 'balanced',
    margin: 40,
    dpi: 300,
    fitMode: 'fit-to-page'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to convert any image file to JPEG/PNG blob with quality
  const convertImageToBlob = (file: File, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Clear canvas with white background for formats that don't support transparency
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0);
        
        // Determine output format based on input format
        let outputFormat = 'image/jpeg';
        let outputQuality = quality;
        
        // For formats that support transparency, use PNG
        if (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif') {
          outputFormat = 'image/png';
          outputQuality = 1.0; // PNG is lossless
        }
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to convert image'));
          },
          outputFormat,
          outputQuality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert('Please select at least one image to convert.');
      return;
    }
    setIsProcessing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      
      // Quality settings based on user selection
      let quality = 0.92;
      if (settings.quality === 'medium') quality = 0.7;
      if (settings.quality === 'low') quality = 0.5;
      
      // Apply compression settings
      if (settings.compression === 'minimal') quality = Math.max(quality, 0.9);
      if (settings.compression === 'maximum') quality = Math.min(quality, 0.5);

      for (const file of files) {
        let imgBlob: File | Blob = file;
        // Convert to appropriate format with quality
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
          imgBlob = await convertImageToBlob(file, quality);
        }
        const arrayBuffer = await (imgBlob as Blob).arrayBuffer();
        
        // Determine if we should embed as JPEG or PNG
        let embeddedImage;
        if (imgBlob.type === 'image/png' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif') {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        }
        
        const imgDims = embeddedImage.scale(1);

        // Default to A4 size (portrait or landscape)
        let pageWidth = 595.28, pageHeight = 841.89;
        if (settings.pageSize === 'Letter') {
          pageWidth = 612; pageHeight = 792;
        } else if (settings.pageSize === 'Legal') {
          pageWidth = 612; pageHeight = 1008;
        } else if (settings.pageSize === 'A3') {
          pageWidth = 841.89; pageHeight = 1190.55;
        }
        if (settings.orientation === 'landscape') {
          [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }

        // Use user-defined margin
        const margin = settings.margin;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        let drawWidth = imgDims.width;
        let drawHeight = imgDims.height;
        
        // Apply fit mode logic
        let scale = 1;
        if (settings.fitMode === 'fit-to-page') {
          const widthRatio = maxWidth / drawWidth;
          const heightRatio = maxHeight / drawHeight;
          scale = Math.min(widthRatio, heightRatio, 1);
        } else if (settings.fitMode === 'stretch-to-fill') {
          const widthRatio = maxWidth / drawWidth;
          const heightRatio = maxHeight / drawHeight;
          scale = Math.max(widthRatio, heightRatio);
        } else if (settings.fitMode === 'actual-size') {
          // Keep original size, but ensure it fits within page bounds
          const widthRatio = maxWidth / drawWidth;
          const heightRatio = maxHeight / drawHeight;
          scale = Math.min(widthRatio, heightRatio, 1);
        }
        
        drawWidth *= scale;
        drawHeight *= scale;
        
        // Center the image on the page
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setIsProcessing(false);
      alert('JPG images converted to PDF successfully!');
    } catch (error) {
      console.error('Error converting JPG to PDF:', error);
      setIsProcessing(false);
      alert('Error converting JPG to PDF. Please try again.');
    }
  };

  const downloadAll = () => {
    if (!processedBlob) {
      alert('No processed file to download');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = 'converted-images.pdf';
    link.click();
    // Reset after download
    setFiles([]);
    setProcessedBlob(null);
  };

  const features = [
    {
      icon: <FileImage className="h-6 w-6" />,
      title: "Multi-Format Support",
      description: "Convert JPG, PNG, GIF, BMP, TIFF, and WebP images into professional PDF documents"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Advanced Settings",
      description: "Customize page size, orientation, quality, compression, margins, and fit modes"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Format Preservation",
      description: "Maintain transparency and quality for PNG, WebP, and GIF formats"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored permanently"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Images",
      description: "Drag and drop your images (JPG, PNG, GIF, BMP, TIFF, WebP) or click to browse and select files"
    },
    {
      step: "2", 
      title: "Configure Settings",
      description: "Choose page size, orientation, quality, compression, margins, and fit mode for your PDF"
    },
    {
      step: "3",
      title: "Convert to PDF",
      description: "Our system processes your images and creates a professional PDF document"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "1M+", label: "PDFs Created" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  // Live preview effect: updates when files or settings change
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      return;
    }
    const file = files[0];
    const img = new window.Image();
    img.onload = () => {
      // Calculate page size
      let pageWidth = 595.28, pageHeight = 841.89;
      if (settings.pageSize === 'Letter') {
        pageWidth = 612; pageHeight = 792;
      } else if (settings.pageSize === 'Legal') {
        pageWidth = 612; pageHeight = 1008;
      } else if (settings.pageSize === 'A3') {
        pageWidth = 841.89; pageHeight = 1190.55;
      }
      if (settings.orientation === 'landscape') {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }
      
      // Use user-defined margin
      const margin = settings.margin;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      let drawWidth = img.width;
      let drawHeight = img.height;
      
      // Apply fit mode logic
      let scale = 1;
      if (settings.fitMode === 'fit-to-page') {
        const widthRatio = maxWidth / drawWidth;
        const heightRatio = maxHeight / drawHeight;
        scale = Math.min(widthRatio, heightRatio, 1);
      } else if (settings.fitMode === 'stretch-to-fill') {
        const widthRatio = maxWidth / drawWidth;
        const heightRatio = maxHeight / drawHeight;
        scale = Math.max(widthRatio, heightRatio);
      } else if (settings.fitMode === 'actual-size') {
        // Keep original size, but ensure it fits within page bounds
        const widthRatio = maxWidth / drawWidth;
        const heightRatio = maxHeight / drawHeight;
        scale = Math.min(widthRatio, heightRatio, 1);
      }
      
      drawWidth *= scale;
      drawHeight *= scale;
      
      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = pageWidth;
      canvas.height = pageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#f3f4f6'; // match bg
      ctx.fillRect(0, 0, pageWidth, pageHeight);
      ctx.drawImage(
        img,
        (pageWidth - drawWidth) / 2,
        (pageHeight - drawHeight) / 2,
        drawWidth,
        drawHeight
      );
      
      // Apply quality and compression settings to preview
      let previewQuality = settings.quality === 'high' ? 0.92 : settings.quality === 'medium' ? 0.7 : 0.5;
      if (settings.compression === 'minimal') previewQuality = Math.max(previewQuality, 0.9);
      if (settings.compression === 'maximum') previewQuality = Math.min(previewQuality, 0.5);
      
      canvas.toBlob(
        (blob) => {
          if (blob) setPreviewUrl(URL.createObjectURL(blob));
        },
        'image/jpeg',
        previewQuality
      );
    };
    img.src = URL.createObjectURL(file);
    // Cleanup
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [files, settings.pageSize, settings.orientation, settings.quality, settings.compression, settings.margin, settings.fitMode]);

  return (
    <>
      <SEO
        title="Convert JPG to PDF Instantly | No Signup Needed"
        description="Convert JPG to PDF online for free in seconds. No registration, no watermark – just fast, high-quality image to PDF conversion. Try it now!"
        keywords="JPG to PDF, image to PDF converter, JPG converter, photo to PDF, image PDF converter, online JPG to PDF, free converter"
        canonical="jpg-to-pdf"
        ogImage="/images/jpg-to-pdf-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>Image to PDF Converter</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Images to PDF Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform your images (JPG, PNG, GIF, BMP, TIFF, WebP) into professional PDF documents. Perfect for creating 
                portfolios, presentations, and sharing multiple images in a single file.
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
                  <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your images here for PDF conversion</h3>
                  <p className="text-gray-600 mb-6">Supports JPG, PNG, GIF, BMP, TIFF, and WebP formats</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Images</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,.jpg,.jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management, Preview, Settings, and Actions only after upload */}
              {files.length > 0 && (
                <>
                  {/* File Management */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Image className="h-5 w-5 text-violet-600" />
                      <span>Selected Images ({files.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {files.map((file, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                          <Image className="h-8 w-8 text-violet-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview */}
                  {previewUrl && (
                    <div className="mb-8 flex flex-col items-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <Image className="h-5 w-5 text-violet-600" />
                        <span>Live PDF Page Preview</span>
                      </h3>
                      <div className="bg-gray-100 rounded-lg overflow-hidden border p-4">
                        <img
                          src={previewUrl}
                          alt="PDF Preview"
                          className="max-h-96 w-auto object-contain"
                          style={{ background: '#f3f4f6' }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {files[0].name} (Page: {settings.pageSize}, {settings.orientation}, Margin: {settings.margin}px, Fit: {settings.fitMode.replace('-', ' ')})
                      </div>
                    </div>
                  )}

                  {/* PDF Settings */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-violet-600" />
                      <span>PDF Settings</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                        <select
                          value={settings.pageSize}
                          onChange={(e) => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="A4">A4 (Default)</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                          <option value="A3">A3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                        <select
                          value={settings.orientation}
                          onChange={(e) => setSettings(prev => ({ ...prev, orientation: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                        <select
                          value={settings.quality}
                          onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                        <select
                          value={settings.compression}
                          onChange={(e) => setSettings(prev => ({ ...prev, compression: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="balanced">Balanced</option>
                          <option value="minimal">Minimal</option>
                          <option value="maximum">Maximum</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Margin (px)</label>
                        <select
                          value={settings.margin}
                          onChange={(e) => setSettings(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value={20}>20px (Minimal)</option>
                          <option value={40}>40px (Default)</option>
                          <option value={60}>60px (Wide)</option>
                          <option value={80}>80px (Extra Wide)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fit Mode</label>
                        <select
                          value={settings.fitMode}
                          onChange={(e) => setSettings(prev => ({ ...prev, fitMode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="fit-to-page">Fit to Page</option>
                          <option value="stretch-to-fill">Stretch to Fill</option>
                          <option value="actual-size">Actual Size</option>
                        </select>
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
                          <span>Converting to PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5" />
                          <span>Convert to PDF</span>
                        </>
                      )}
                    </button>
                    {processedBlob && (
                      <button
                        onClick={downloadAll}
                        className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Download className="h-5 w-5" />
                        <span>Download PDF</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our JPG to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF creation with advanced features and optimal quality
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
                  How to Convert JPG to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to create professional PDFs from your images
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
                    Ready to Convert Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your JPG images into professional PDF documents. Join thousands of users 
                    who trust our converter for their document needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
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
    </>
  );
};

export default ImageToPDFCreator; 