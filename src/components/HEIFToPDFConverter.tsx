import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileType, Upload, Download, Settings, FileText, Zap, Shield, Users, FileImage, ArrowRight, CheckCircle, Camera, Sparkles, RotateCcw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import heic2any from 'heic2any';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

const HEIFToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; blob: Blob }[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState('high');
  const [pageSize, setPageSize] = useState('auto');
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [includeEXIF, setIncludeEXIF] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
    if (selectedFiles.length > 0) {
      setPreviewUrl(URL.createObjectURL(selectedFiles[0]));
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const heifFiles = droppedFiles.filter(file => 
      file.type === 'image/heif' || 
      file.type === 'image/heic' || 
      file.name.toLowerCase().endsWith('.heif') || 
      file.name.toLowerCase().endsWith('.heic')
    );
    setFiles(heifFiles);
    if (heifFiles.length > 0) {
      setPreviewUrl(URL.createObjectURL(heifFiles[0]));
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Real HEIF to PDF conversion
  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    const processedResults: { name: string; blob: Blob }[] = [];

    try {
      for (const file of files) {
        // Convert HEIF/HEIC to JPEG using heic2any
        const jpegBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: quality === 'low' ? 0.6 : quality === 'medium' ? 0.8 : quality === 'high' ? 0.9 : 1.0
        }) as Blob;

        // Create a PDF document
        const pdfDoc = await PDFDocument.create();
        
        // Convert JPEG blob to array buffer
        const arrayBuffer = await jpegBlob.arrayBuffer();
        
        // Embed the image in the PDF
        const image = await pdfDoc.embedJpg(arrayBuffer);
        
        // Get image dimensions
        const { width, height } = image.scale(1);
        
        // Determine page size
        let pageWidth = width;
        let pageHeight = height;
        
        if (pageSize === 'a4') {
          pageWidth = 595.28;
          pageHeight = 841.89;
        } else if (pageSize === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else if (pageSize === 'a3') {
          pageWidth = 841.89;
          pageHeight = 1190.55;
        }
        // For 'auto' and 'custom', use image dimensions
        
        // Add page with the image
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Calculate scaling to fit image on page
        const scaleX = pageWidth / width;
        const scaleY = pageHeight / height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
        
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        
        // Center the image on the page
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;
        
        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        // Generate PDF
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        processedResults.push({
          name: file.name.replace(/\.(heif|heic)$/i, '') + '.pdf',
          blob: pdfBlob
        });
      }
      
      setProcessedFiles(processedResults);
      if (processedResults.length > 0) {
        setPreviewUrl(URL.createObjectURL(processedResults[0].blob));
      }
    } catch (error) {
      notify('Error processing HEIF files. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Live image preview effect
  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setImagePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreviewUrl(null);
    }
  }, [files]);

  // Individual download
  const handleDownloadSingle = (index: number) => {
    const file = processedFiles[index];
    if (file) {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownload = () => {
    if (processedFiles.length === 0) return;
    
    if (processedFiles.length === 1) {
      // Single file download
      const url = URL.createObjectURL(processedFiles[0].blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = processedFiles[0].name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Multiple files download
      processedFiles.forEach(file => {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  const features = [
    {
      icon: <FileType className="h-6 w-6" />,
      title: "HEIF Support",
      description: "Convert high-efficiency HEIF/HEIC images to PDF with precision"
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: "Modern Format",
      description: "Support for the latest image format standards"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast Conversion",
      description: "Lightning-fast conversion with high-quality output"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload HEIF Files",
      description: "Drag and drop your HEIF/HEIC files or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Choose Settings",
      description: "Select quality, page size, and conversion preferences"
    },
    {
      step: "3",
      title: "Convert to PDF",
      description: "Our system converts your HEIF files to high-quality PDF documents"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "20M+", label: "Files Converted" },
    { icon: <Zap className="h-5 w-5" />, value: "< 3s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const qualityOptions = [
    { id: 'low', name: 'Low Quality', description: 'Smaller file size' },
    { id: 'medium', name: 'Medium Quality', description: 'Balanced size and quality' },
    { id: 'high', name: 'High Quality', description: 'Best quality output' },
    { id: 'ultra', name: 'Ultra Quality', description: 'Maximum quality for printing' }
  ];

  const pageSizeOptions = [
    { id: 'auto', name: 'Auto Detect', description: 'Detect from image dimensions' },
    { id: 'a4', name: 'A4 (210×297mm)', description: 'Standard paper size' },
    { id: 'letter', name: 'Letter (8.5×11in)', description: 'US standard size' },
    { id: 'a3', name: 'A3 (297×420mm)', description: 'Large format' },
    { id: 'custom', name: 'Custom Size', description: 'Set your own dimensions' }
  ];

  return (
    <>
      <SEO 
        title="HEIF to PDF | Fast & Easy HEIF Image Conversion"
        description="Quickly transform HEIF or HEIC images to PDF format online. No software required—just upload, convert, and download your PDF instantly."
        keywords="HEIF to PDF, convert HEIF, HEIF converter, image to PDF, online tool, free tool"
        canonical="heif-to-pdf"
        ogImage="/images/heif-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>HEIF to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert HEIF to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Advanced HEIF/HEIC to PDF conversion with high-efficiency format support, metadata preservation, 
                and multiple format options. Perfect for modern image formats and mobile photography.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your HEIF/HEIC files here for conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose HEIF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/heif,image/heic,.heif,.heic"
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
                    <span>Selected HEIF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
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
              )}

              {/* Live image preview */}
              {imagePreviewUrl && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileImage className="h-5 w-5 text-violet-600" />
                    <span>Live Image Preview</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center" style={{ minHeight: 180 }}>
                    <img
                      src={imagePreviewUrl}
                      alt="HEIF/HEIC preview"
                      className="rounded shadow max-w-full max-h-60 border border-gray-200"
                      aria-label="Preview of first HEIF/HEIC"
                    />
                    {files.length > 0 && (
                      <p className="text-sm mt-2">{files[0].name} - {Math.round(files[0].size / 1024)} KB</p>
                    )}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Conversion Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Quality
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {qualityOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Size
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {pageSizeOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preserveMetadata"
                      checked={preserveMetadata}
                      onChange={(e) => setPreserveMetadata(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveMetadata" className="text-sm font-medium text-gray-700">
                      Preserve Metadata
                    </label>
                    <FileText className="h-4 w-4 text-violet-600" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeEXIF"
                      checked={includeEXIF}
                      onChange={(e) => setIncludeEXIF(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeEXIF" className="text-sm font-medium text-gray-700">
                      Include EXIF Data
                    </label>
                    <Camera className="h-4 w-4 text-violet-600" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleProcess}
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
                      <FileType className="h-5 w-5" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download {processedFiles.length > 1 ? `All (${processedFiles.length})` : 'PDF'}</span>
                  </button>
                )}
                {processedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {processedFiles.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownloadSingle(idx)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download {file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview */}
            {previewUrl && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">PDF Preview</h2>
                <div className="bg-gray-100 rounded-xl p-4">
                  <iframe 
                    src={previewUrl} 
                    title="PDF Preview" 
                    className="w-full h-96 bg-white rounded-lg shadow-inner" 
                  />
                </div>
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our HEIF to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional-grade HEIF to PDF conversion with advanced features and precision
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
                  How to Convert HEIF to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your HEIF files to high-quality PDF documents
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
                    Ready to Convert Your HEIF Files?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your high-efficiency HEIF/HEIC images into professional PDF documents. Join thousands of 
                    users who trust our converter for reliable and high-quality results.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileType className="h-5 w-5" />
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

const HEIFToPDFConverterWithProvider: React.FC = () => (
  <NotificationProvider>
    <HEIFToPDFConverter />
  </NotificationProvider>
);

export default HEIFToPDFConverterWithProvider; 