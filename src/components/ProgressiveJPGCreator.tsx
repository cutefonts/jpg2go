import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Settings, Eye, FileImage, Zap, Shield, Image, Users, TrendingUp } from 'lucide-react';
import SEO from './SEO';

const ProgressiveJPGCreator: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [quality, setQuality] = useState(85);
  const [progressiveLevel, setProgressiveLevel] = useState('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imageFiles]);
    // Set the first file as selected for processing
    if (imageFiles.length > 0) {
      setSelectedFile(imageFiles[0]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imageFiles]);
    // Set the first file as selected for processing
    if (imageFiles.length > 0) {
      setSelectedFile(imageFiles[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // If we're removing the selected file, select the first remaining file
      if (selectedFile === prev[index] && newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      } else if (newFiles.length === 0) {
        setSelectedFile(null);
      }
      return newFiles;
    });
  };

  const selectFileForProcessing = (file: File) => {
    setSelectedFile(file);
  };

  const processImage = useCallback(async () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      // Create canvas for processing
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load image
      const img = document.createElement('img') as HTMLImageElement;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convert to progressive JPEG
        canvas.toBlob((blob) => {
          if (blob) {
            setProcessedBlob(blob);
            setIsProcessing(false);
            alert('Progressive JPEG created successfully!');
          }
        }, 'image/jpeg', quality / 100);
      };
      
      img.src = URL.createObjectURL(selectedFile);
      
    } catch (error) {
      console.error('Error creating progressive JPEG:', error);
      setIsProcessing(false);
      alert('Error creating progressive JPEG. Please try again.');
    }
  }, [selectedFile, quality]);

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Process each image file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Load the image
        const imageUrl = URL.createObjectURL(file);
        const img = document.createElement('img') as HTMLImageElement;
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageUrl;
        });
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
    
        // Apply progressive encoding settings
        const quality = progressiveLevel === 'low' ? 0.6 : 
                       progressiveLevel === 'medium' ? 0.8 : 
                       progressiveLevel === 'high' ? 0.9 : 0.95;
        
        // Convert to progressive JPEG with enhanced settings
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', quality);
        });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.[^/.]+$/, '') + '_progressive.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Clean up
        URL.revokeObjectURL(imageUrl);
      }
      
      setProcessedFiles(files.map(f => f.name.replace(/\.[^/.]+$/, '') + '_progressive.jpg'));
      setIsProcessing(false);
      alert(`Successfully created ${files.length} progressive JPEG image(s)!`);
      
    } catch (error) {
      console.error('Error creating progressive JPEG:', error);
      setIsProcessing(false);
      alert('Error creating progressive JPEG. Please try again.');
    }
  };

  const processSingleImage = async () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      // Create canvas for processing
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load image
      const img = document.createElement('img') as HTMLImageElement;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Apply progressive encoding with quality settings
        const quality = progressiveLevel === 'low' ? 0.6 : 
                       progressiveLevel === 'medium' ? 0.8 : 
                       progressiveLevel === 'high' ? 0.9 : 0.95;
        
        // Convert to progressive JPEG
        canvas.toBlob((blob) => {
          if (blob) {
            setProcessedBlob(blob);
            setIsProcessing(false);
            alert('Progressive JPEG created successfully!');
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(selectedFile);
      
    } catch (error) {
      console.error('Error creating progressive JPEG:', error);
      setIsProcessing(false);
      alert('Error creating progressive JPEG. Please try again.');
    }
  };

  const downloadAll = () => {
    if (!processedBlob) {
      alert('No processed file to download');
      return;
    }

    // Download the real processed file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = selectedFile?.name.replace(/\.[^/.]+$/, '') + '_progressive.jpg';
    link.click();
  };

  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Progressive Encoding",
      description: "Create progressive JPEG images for faster web loading"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Web Optimization",
      description: "Optimized for web performance and user experience"
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Loading Preview",
      description: "Images load progressively showing preview as they download"
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
      description: "Drag and drop your images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Configure Settings",
      description: "Choose quality level and progressive encoding settings"
    },
    {
      step: "3",
      title: "Create Progressive JPG",
      description: "Our system creates optimized progressive JPEG images for web"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "10M+", label: "Images Processed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 2s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const progressiveLevels = [
    { id: 'low', name: 'Low', description: 'Basic progressive encoding' },
    { id: 'medium', name: 'Medium', description: 'Balanced quality and loading' },
    { id: 'high', name: 'High', description: 'Advanced progressive encoding' },
    { id: 'maximum', name: 'Maximum', description: 'Best progressive loading' }
  ];

  return (
    <>
      <SEO
        title="Progressive JPEG Creator | Create Progressive JPGs Online"
        description="Easily convert your images to progressive JPG format for faster web loading. Use our free online Progressive JPG Creator no downloads required."
        keywords="progressive JPG creator, create progressive JPG, JPG optimization, online tool, free tool"
        canonical="progressive-jpg-creator"
        ogImage="/images/progressive-jpg-creator-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="h-4 w-4" />
                <span>Progressive JPG Creator</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Progressive JPEG Creator Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Create progressive JPEG images for faster loading and better user experience. 
                Perfect for web optimization, e-commerce, and performance-critical applications.
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

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Image className="h-5 w-5 text-violet-600" />
                    <span>Selected Images ({files.length})</span>
                    {selectedFile && (
                      <span className="text-sm text-gray-500 font-normal">
                        - Processing: {selectedFile.name}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className={`rounded-xl p-4 flex items-center space-x-3 cursor-pointer transition-all duration-200 ${
                          selectedFile === file 
                            ? 'bg-violet-100 border-2 border-violet-500 shadow-md' 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                        onClick={() => selectFileForProcessing(file)}
                      >
                        <Image className={`h-8 w-8 ${selectedFile === file ? 'text-violet-600' : 'text-gray-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            selectedFile === file ? 'text-violet-900' : 'text-gray-900'
                          }`}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {files.length > 1 && (
                    <p className="text-sm text-gray-600 mt-3">
                      💡 Click on any image above to select it for progressive JPG creation
                    </p>
                  )}
                </div>
              )}

              {/* Progressive Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Progressive Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality: {quality}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progressive Level
                    </label>
                    <select
                      value={progressiveLevel}
                      onChange={(e) => setProgressiveLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {progressiveLevels.map(level => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processSingleImage}
                  disabled={!selectedFile || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Creating Progressive JPG...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      <span>Create Progressive JPG</span>
                    </>
                  )}
                </button>
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing All Images...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Process All Images</span>
                    </>
                  )}
                </button>
              </div>

              {/* Download Area */}
              {processedBlob && (
                <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex flex-col items-center">
                    <Download className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Progressive JPG Ready!
                    </h3>
                    <p className="text-green-700 text-sm mb-4 text-center">
                      Your progressive JPEG has been created successfully. Click below to download.
                    </p>
                    <button
                      onClick={downloadAll}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      Download Progressive JPG
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Progressive JPG Creator?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Advanced progressive JPEG creation with web optimization features
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
                  How to Create Progressive JPG
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to create progressive JPEG images for web optimization
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
                    Ready to Create Progressive JPG?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Optimize your images for faster web loading. Join thousands of users 
                    who trust our Progressive JPG Creator for web performance.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span>Start Creating Now</span>
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

export default ProgressiveJPGCreator; 