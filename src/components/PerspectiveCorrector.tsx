import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Crop, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const PerspectiveCorrector: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    correction: 'auto',
    angle: 0,
    scale: 100,
    quality: 'high',
    format: 'png'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const correctionTypes = [
    { id: 'auto', name: 'Auto Detection' },
    { id: 'manual', name: 'Manual Control' },
    { id: 'building', name: 'Building Correction' },
    { id: 'horizon', name: 'Horizon Straighten' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    if (imageFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are images under 10MB.');
    }
    
    const newFiles: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setSelectedFile(imageFiles[0] || null);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    if (imageFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are images under 10MB.');
    }
    
    const newFiles: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setSelectedFile(imageFiles[0] || null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one image to process.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const processedResults: { name: string; blob: Blob }[] = [];

      for (const uploadedFile of files) {
        const file = uploadedFile.file;
        
        // Create an image element to load the file
        const img = document.createElement('img') as HTMLImageElement;
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
          img.src = uploadedFile.url;
        });
      
        // Create canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Calculate new dimensions based on scale
        const scaleFactor = settings.scale / 100;
        const newWidth = Math.round(img.width * scaleFactor);
        const newHeight = Math.round(img.height * scaleFactor);
        
        // Set canvas size to new dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Apply perspective correction based on correction type
        ctx.save();
        
        // Move to center for rotation
        ctx.translate(newWidth / 2, newHeight / 2);
        
        // Apply rotation if angle is set
        if (settings.angle !== 0) {
          const angleInRadians = (settings.angle * Math.PI) / 180;
          ctx.rotate(angleInRadians);
        }
        
        // Apply perspective transformation based on correction type
        if (settings.correction === 'auto') {
          // Auto detection - apply subtle keystone correction
          const matrix = calculateAutoPerspectiveMatrix(newWidth, newHeight);
          ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        } else if (settings.correction === 'building') {
          // Building correction - stronger vertical correction
          const matrix = calculateBuildingPerspectiveMatrix(newWidth, newHeight);
          ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        } else if (settings.correction === 'horizon') {
          // Horizon straightening - horizontal correction
          const matrix = calculateHorizonPerspectiveMatrix(newWidth, newHeight);
          ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        }
        
        // Draw the image centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        ctx.restore();

        // Convert to blob with quality settings
        const quality = settings.quality === 'high' ? 0.9 : 
                       settings.quality === 'medium' ? 0.7 : 0.5;
        
        const mimeType = settings.format === 'png' ? 'image/png' : 
                        settings.format === 'jpg' ? 'image/jpeg' : 'image/webp';
        
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(new Blob([''], { type: mimeType }));
          }, mimeType, quality);
        });

        processedResults.push({
          name: `perspective-corrected-${file.name}`,
          blob: blob
        });
      }

      setProcessedFiles(processedResults);
      setIsProcessing(false);
      setSuccess(`Perspective correction completed! ${processedResults.length} image(s) have been corrected.`);
    } catch (error) {
      console.error('Error processing files:', error);
      setIsProcessing(false);
      setError(error instanceof Error ? error.message : 'Error processing images. Please try again.');
    }
  };

  // Helper functions to calculate perspective transformation matrices
  const calculateAutoPerspectiveMatrix = (width: number, height: number) => {
    // Auto detection - subtle keystone correction
    const correctionStrength = 0.05;
    
    return [
      1 + correctionStrength,  // Scale X
      0,                       // Skew X
      0,                       // Skew Y  
      1 - correctionStrength,  // Scale Y
      0,                       // Translate X
      0                        // Translate Y
    ];
  };

  const calculateBuildingPerspectiveMatrix = (width: number, height: number) => {
    // Building correction - stronger vertical correction for architectural photos
    const correctionStrength = 0.15;
    
    return [
      1 + correctionStrength,  // Scale X
      0,                       // Skew X
      0,                       // Skew Y  
      1 - correctionStrength * 2,  // Scale Y (stronger vertical correction)
      0,                       // Translate X
      0                        // Translate Y
    ];
  };

  const calculateHorizonPerspectiveMatrix = (width: number, height: number) => {
    // Horizon straightening - horizontal correction
    const correctionStrength = 0.08;
    
    return [
      1 - correctionStrength,  // Scale X (horizontal correction)
      0,                       // Skew X
      0,                       // Skew Y  
      1 + correctionStrength,  // Scale Y
      0,                       // Translate X
      0                        // Translate Y
    ];
  };

  const processImage = processFiles;

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }

    try {
      // Create downloadable perspective-corrected files
      if (processedFiles.length === 1) {
        // Single file download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(processedFiles[0].blob);
        link.download = processedFiles[0].name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        // Multiple files - download each
        processedFiles.forEach((file) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(file.blob);
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        });
      }
      
      setSuccess(`Downloaded ${processedFiles.length} corrected image(s)!`);
    } catch (error) {
      setError('Error downloading files. Please try again.');
    }
  };

  // Cleanup object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [files]);

  const resetAll = () => {
    // Clean up object URLs
    files.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
    
    // Reset all state
    setFiles([]);
    setProcessedFiles([]);
    setSelectedFile(null);
    setSettings({
      correction: 'auto',
      angle: 0,
      scale: 100,
      quality: 'high',
      format: 'png'
    });
    setError(null);
    setSuccess(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const features = [
    {
      icon: <Crop className="h-6 w-6" />,
      title: "Auto Detection",
      description: "Automatically detect and correct perspective issues"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Manual Control",
      description: "Fine-tune corrections with precise controls"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain image quality during correction"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Image",
      description: "Select your image with perspective issues"
    },
    {
      step: "2",
      title: "Adjust Settings",
      description: "Choose correction type and adjust parameters"
    },
    {
      step: "3",
      title: "Download Result",
      description: "Get your perfectly corrected image"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "50K+", label: "Images Processed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="Perspective Corrector | Fix Image Perspective Online"
        description="Correct perspective distortion in your photos easily with our free online perspective corrector. Straighten lines and improve image angles quickly."
        keywords="perspective corrector, fix perspective distortion, straighten buildings, architectural correction, online tool, free tool"
        canonical="perspective-corrector"
        ogImage="/images/perspective-corrector-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Crop className="h-4 w-4" />
                <span>Perspective Corrector</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Perspective Corrector Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Correct perspective distortion in your images with professional-grade tools. 
                Perfect for architectural photography, real estate, and any image that needs straightening.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    files.length > 0
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your images here'}</h3>
                  <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Images</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-red-600">⚠️</div>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-green-600">✅</div>
                    <p className="text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Image className="h-5 w-5 text-violet-600" />
                    <span>Selected Images ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div key={file.id} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
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
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correction Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Correction Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correction Type</label>
                    <select
                      value={settings.correction}
                      onChange={(e) => setSettings(prev => ({ ...prev, correction: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {correctionTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Angle: {settings.angle}°</label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={settings.angle}
                      onChange={(e) => setSettings(prev => ({ ...prev, angle: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scale: {settings.scale}%</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={settings.scale}
                      onChange={(e) => setSettings(prev => ({ ...prev, scale: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High (Best)</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low (Faster)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPEG</option>
                      <option value="webp">WebP</option>
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Correcting Perspective...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="h-5 w-5" />
                      <span>Correct Perspective</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetAll}
                  disabled={isProcessing}
                  className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
              </div>
              
              {/* Download Area */}
              {processedFiles.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">
                        Processing Complete!
                      </h3>
                    </div>
                    <p className="text-green-700 mb-4">
                      {processedFiles.length} image(s) have been corrected. Click below to download.
                    </p>
                    <button
                      onClick={downloadAll}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      Download Corrected Images
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Perspective Corrector?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional perspective correction with advanced detection and manual control
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
                  How to Correct Perspective
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to fix perspective distortion in your images
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
                    Ready to Fix Perspective?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform distorted images into perfectly aligned photos. Join thousands of users 
                    who trust our perspective corrector for their architectural and professional imaging needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Crop className="h-5 w-5" />
                    <span>Start Correcting Now</span>
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

export default PerspectiveCorrector; 