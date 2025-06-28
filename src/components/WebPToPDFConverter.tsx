import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, Image, X, AlertCircle, Info } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
  originalFile: File;
  size: number;
  status: 'success' | 'error';
  error?: string;
}

const WebPToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal' | 'auto'>('auto');
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    const validTypes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
    const validExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      return { 
        isValid: false, 
        error: 'Invalid file type. Please upload WebP, JPEG, PNG, GIF, or BMP images.' 
      };
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return { 
        isValid: false, 
        error: 'File size too large. Maximum size is 50MB.' 
      };
    }
    
    return { isValid: true };
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setProcessedFiles([]);
      
      // Create preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Cleanup preview URL
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getPageSize = (imageWidth: number, imageHeight: number): [number, number] => {
    if (pageSize === 'auto') {
      // Calculate optimal page size based on image dimensions
      const aspectRatio = imageWidth / imageHeight;
      const maxWidth = 595.28; // A4 width
      const maxHeight = 841.89; // A4 height
      
      if (aspectRatio > 1) {
        // Landscape
        return [maxWidth, maxWidth / aspectRatio];
      } else {
        // Portrait
        return [maxHeight * aspectRatio, maxHeight];
      }
    }
    
    const pageSizes = {
      a4: [595.28, 841.89],
      letter: [612, 792],
      legal: [612, 1008],
    };
    
    return pageSizes[pageSize] as [number, number];
  };

  const convertImageToCanvas = (file: File): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    
    // Debug: Log current settings
    console.log('WebP to PDF Conversion Settings:', {
      quality,
      pageSize,
      filesCount: files.length
    });
    
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const processed: ProcessedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingProgress({ current: i + 1, total: files.length });
        
        try {
          // Convert image to canvas
          const canvas = await convertImageToCanvas(file);
          
          // Get image data as base64 with quality setting
          const qualityValue = quality === 'ultra' ? 1.0 : quality === 'high' ? 0.9 : 0.7;
          const imageData = canvas.toDataURL('image/jpeg', qualityValue);
          
          // Debug: Log quality setting being applied
          
          // Create PDF
          const pdfDoc = await PDFDocument.create();
          const [pageWidth, pageHeight] = getPageSize(canvas.width, canvas.height);
          
          // Debug: Log page size being used
          
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Convert base64 to Uint8Array
          const base64Data = imageData.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          // Embed image in PDF
          const image = await pdfDoc.embedJpg(imageBytes);
          
          // Calculate image dimensions to fit page
          const { width: imgWidth, height: imgHeight } = image.scale(1);
          const scaleX = pageWidth / imgWidth;
          const scaleY = pageHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
          
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;
          
          // Center image on page
          const x = (pageWidth - scaledWidth) / 2;
          const y = (pageHeight - scaledHeight) / 2;
          
          // Draw image
          page.drawImage(image, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
          });
          
          // Add metadata
          const fontSize = Math.min(pageWidth, pageHeight) * 0.02;
          page.drawText(`Converted from: ${file.name}`, {
            x: 10,
            y: 10,
            size: fontSize,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          // Save PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.[^/.]+$/, '.pdf'),
            blob,
            originalFile: file,
            size: blob.size,
            status: 'success'
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          processed.push({
            name: file.name.replace(/\.[^/.]+$/, '.pdf'),
            blob: new Blob(),
            originalFile: file,
            size: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      
      const successCount = processed.filter(p => p.status === 'success').length;
      const errorCount = processed.filter(p => p.status === 'error').length;
      
      if (errorCount > 0) {
        alert(`Conversion completed with ${successCount} successful and ${errorCount} failed conversions.`);
      } else {
        alert(`Successfully converted ${successCount} files to PDF!`);
      }
      
    } catch (error) {
      console.error('Error converting files to PDF:', error);
      setIsProcessing(false);
      alert('Error converting files to PDF. Please try again.');
    }
  };

  const downloadAll = () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success');
    
    if (successfulFiles.length === 1) {
      downloadSingle(0);
      return;
    }
    
    // For multiple files, download them one by one
    successfulFiles.forEach((file, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, index * 100); // Small delay between downloads
    });
  };

  const downloadSingle = (index: number) => {
    const file = processedFiles[index];
    if (file && file.status === 'success') {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const resetTool = () => {
    // Cleanup all preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setFiles([]);
    setProcessedFiles([]);
    setPreviewUrls([]);
    setQuality('high');
    setPageSize('auto');
    setProcessingProgress({ current: 0, total: 0 });
  };

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "True WebP to PDF",
      description: "Convert WebP images to PDF with actual image embedding"
    },
    {
      icon: <Image className="h-6 w-6" />,
      title: "Multiple Formats",
      description: "Support for WebP, JPEG, PNG, GIF, and BMP formats"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed locally and never uploaded"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain image quality with multiple quality settings"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Images",
      description: "Drag & drop or click to select WebP, JPEG, PNG, GIF, or BMP files"
    },
    {
      step: "2",
      title: "Choose Settings",
      description: "Select quality and page size for optimal conversion"
    },
    {
      step: "3",
      title: "Convert & Download",
      description: "Convert to PDF and download the results"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "2M+", label: "Files Converted" },
    { icon: <FileText className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="WEBP to PDF | Online Image to PDF Converter"
        description="Convert WebP, JPEG, PNG, GIF, and BMP images to PDF with high quality. Free online tool with drag & drop support and batch processing."
        keywords="WebP to PDF, convert WebP to PDF, image to PDF, WebP converter, online tool, free tool, batch conversion"
        canonical="webp-to-pdf"
        ogImage="/images/webp-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>Image to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Images to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert WebP, JPEG, PNG, GIF, and BMP images to professional PDF documents with high quality. 
                Support for batch processing and multiple page sizes.
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
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    isDragOver
                      ? 'border-violet-500 bg-violet-50/50 scale-105'
                      : files.length > 0
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                    isDragOver ? 'text-violet-600' : 'text-gray-400'
                  }`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragOver ? 'Drop files here' : 'Drop your image files here for conversion'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports: WebP, JPEG, PNG, GIF, BMP (Max 50MB per file)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer inline-block"
                  >
                    Choose Image Files
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Selected Files ({files.length})
                    </h3>
                    <div className="space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            {previewUrls[idx] && (
                              <img
                                src={previewUrls[idx]}
                                alt={file.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Conversion Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as 'standard' | 'high' | 'ultra')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="standard">Standard (70%)</option>
                      <option value="high">High Quality (90%)</option>
                      <option value="ultra">Ultra Quality (100%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Size
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'legal' | 'auto')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="auto">Auto (Fit to Image)</option>
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Spinner removed */}
                    <span className="font-medium text-blue-900">
                      Processing {processingProgress.current} of {processingProgress.total} files...
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    ></div>
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
                      {/* Spinner removed */}
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Results */}
              {processedFiles.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Conversion Results
                  </h3>
                  <div className="space-y-3 mb-4">
                    {processedFiles.map((file, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-4 rounded-lg ${
                        file.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex-shrink-0">
                          {file.status === 'success' ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          {file.status === 'success' ? (
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          ) : (
                            <p className="text-xs text-red-600">{file.error}</p>
                          )}
                        </div>
                        {file.status === 'success' && (
                          <button
                            onClick={() => downloadSingle(idx)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {processedFiles.filter(f => f.status === 'success').length > 1 && (
                    <button
                      onClick={downloadAll}
                      className="w-full bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All PDFs</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Image to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional image to PDF conversion with multiple options and high-quality output
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
                  How to Convert Images to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your images to PDF
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
                    Ready to Convert Images to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your images into professional PDF documents. Join millions of users 
                    who trust our converter for high-quality results.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
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

export default WebPToPDFConverter; 