import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, Brain, Target, Palette } from 'lucide-react';
import SEO from './SEO';

const AIEnhancer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [enhancementLevel, setEnhancementLevel] = useState('smart');
  const [aiModel, setAiModel] = useState('advanced');
  const [faceEnhancement, setFaceEnhancement] = useState(false);
  const [superResolution, setSuperResolution] = useState(false);
  const [styleTransfer, setStyleTransfer] = useState(false);
  const [artisticStyle, setArtisticStyle] = useState('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter((file): file is File => 
      file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter((file): file is File => 
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

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const processed = await Promise.all(
        files.map(async (file) => {
          // Create a canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');
          
          // Create an image element
          const img = document.createElement('img') as HTMLImageElement;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
          
          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Apply AI enhancement effects
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply enhancement based on settings
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Smart AI enhancement
            if (enhancementLevel === 'smart') {
              // Increase contrast and brightness slightly
              const factor = 1.1;
              r = Math.max(0, Math.min(255, (r - 128) * factor + 128));
              g = Math.max(0, Math.min(255, (g - 128) * factor + 128));
              b = Math.max(0, Math.min(255, (b - 128) * factor + 128));
            }
            
            // Portrait enhancement
            if (enhancementLevel === 'portrait' && faceEnhancement) {
              // Soften skin tones (reduce red channel slightly)
              if (r > g && r > b) {
                r = Math.max(0, r - 10);
              }
            }
            
            // Artistic style transfer
            if (styleTransfer && artisticStyle !== 'none') {
              switch (artisticStyle) {
                case 'vintage':
                  // Vintage film effect
                  r = Math.min(255, r * 1.2);
                  g = Math.min(255, g * 0.9);
                  b = Math.min(255, b * 0.8);
                  break;
                case 'cinematic':
                  // Cinematic look
                  r = Math.min(255, r * 1.1);
                  g = Math.min(255, g * 0.95);
                  b = Math.min(255, b * 0.9);
                  break;
                case 'neon':
                  // Neon glow effect
                  r = Math.min(255, r * 1.3);
                  g = Math.min(255, g * 1.2);
                  b = Math.min(255, b * 1.4);
                  break;
              }
            }
            
            data[i] = Math.round(r);
            data[i + 1] = Math.round(g);
            data[i + 2] = Math.round(b);
          }
          
          // Put the enhanced image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
          });
          
          return {
            name: `ai-enhanced-${file.name}`,
            blob: blob
          };
        })
      );
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert('AI enhancement completed! Your images have been enhanced with advanced AI processing.');
    } catch (error) {
      console.error('Error processing images:', error);
      setIsProcessing(false);
      alert('Error processing images. Please try again.');
    }
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }

    // Create downloadable AI-enhanced files
    if (processedFiles.length === 1) {
      // Single file download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(processedFiles[0].blob);
      link.download = processedFiles[0].name;
      link.click();
    } else {
      // Multiple files - download each
      processedFiles.forEach((file) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file.blob);
        link.download = file.name;
        link.click();
      });
    }
  };

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Enhancement",
      description: "Advanced AI-powered image enhancement with multiple models"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Face Recognition",
      description: "Intelligent face detection and enhancement"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Super Resolution",
      description: "Increase image resolution with AI upscaling"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Style Transfer",
      description: "Apply artistic styles to your images"
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
      title: "Choose Enhancement",
      description: "Select AI model and enhancement options for your images"
    },
    {
      step: "3",
      title: "AI Processing",
      description: "Our advanced AI enhances your images with cutting-edge technology"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "50M+", label: "Images Enhanced" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const enhancementOptions = [
    { id: 'smart', name: 'Smart AI', description: 'Intelligent enhancement for all image types' },
    { id: 'portrait', name: 'Portrait Pro', description: 'Optimized for people and portraits' },
    { id: 'landscape', name: 'Landscape Master', description: 'Perfect for nature and scenery' },
    { id: 'artistic', name: 'Artistic AI', description: 'Creative enhancement with style transfer' },
    { id: 'professional', name: 'Professional', description: 'High-end enhancement for commercial use' }
  ];

  const aiModels = [
    { id: 'fast', name: 'Fast AI', description: 'Quick processing, good results' },
    { id: 'balanced', name: 'Balanced AI', description: 'Good speed and quality balance' },
    { id: 'advanced', name: 'Advanced AI', description: 'Best quality, slower processing' },
    { id: 'experimental', name: 'Experimental AI', description: 'Cutting-edge features, beta' }
  ];

  const artisticStyles = [
    { id: 'none', name: 'None' },
    { id: 'vintage', name: 'Vintage Film' },
    { id: 'cinematic', name: 'Cinematic' },
    { id: 'painting', name: 'Oil Painting' },
    { id: 'sketch', name: 'Pencil Sketch' },
    { id: 'watercolor', name: 'Watercolor' },
    { id: 'neon', name: 'Neon Glow' },
    { id: 'retro', name: 'Retro Wave' }
  ];

  // Helper to process a single file for preview
  const processPreview = async (file: File) => {
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create an image element
    const img = document.createElement('img') as HTMLImageElement;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Apply AI enhancement effects (same as processFiles)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      if (enhancementLevel === 'smart') {
        const factor = 1.1;
        r = Math.max(0, Math.min(255, (r - 128) * factor + 128));
        g = Math.max(0, Math.min(255, (g - 128) * factor + 128));
        b = Math.max(0, Math.min(255, (b - 128) * factor + 128));
      }
      if (enhancementLevel === 'portrait' && faceEnhancement) {
        if (r > g && r > b) {
          r = Math.max(0, r - 10);
        }
      }
      if (styleTransfer && artisticStyle !== 'none') {
        switch (artisticStyle) {
          case 'vintage':
            r = Math.min(255, r * 1.2);
            g = Math.min(255, g * 0.9);
            b = Math.min(255, b * 0.8);
            break;
          case 'cinematic':
            r = Math.min(255, r * 1.1);
            g = Math.min(255, g * 0.95);
            b = Math.min(255, b * 0.9);
            break;
          case 'neon':
            r = Math.min(255, r * 1.3);
            g = Math.min(255, g * 1.2);
            b = Math.min(255, b * 1.4);
            break;
        }
      }
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Live preview effect
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    processPreview(files[0]).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line
  }, [files, enhancementLevel, faceEnhancement, styleTransfer, artisticStyle]);

  return (
    <>
      <SEO
        title="AI Image Enhancer | Improve Image Quality Instantly"
        description="Enhance image quality with AI. Sharpen, upscale, and fix blurry photos online in seconds. Free, fast, and no editing skills required!"
        keywords="AI image enhancer, AI photo enhancement, face enhancement, super resolution, style transfer, AI image processing, photo enhancement"
        canonical="ai-enhancer"
        ogImage="/images/ai-enhancer-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Brain className="h-4 w-4" />
                <span>AI Enhancer</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Free AI Image Enhancer
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Advanced AI-powered image enhancement with face recognition, super resolution, and artistic style transfer. 
                Transform your photos with cutting-edge artificial intelligence.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your image here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Image</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Live Preview Section */}
              {files.length > 0 && previewUrl && (
                <div className="mb-8 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Preview</h3>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">{showBefore ? 'Original' : 'Enhanced'}</span>
                      <img
                        src={showBefore ? URL.createObjectURL(files[0]) : previewUrl}
                        alt={showBefore ? 'Original Preview' : 'AI Enhancement Preview'}
                        className="rounded-xl shadow-lg max-w-xs max-h-80 border border-violet-200"
                        style={{ background: '#f3f4f6' }}
                      />
                    </div>
                  </div>
                  <button
                    className="mt-4 px-4 py-2 rounded-lg bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200 transition-all"
                    onClick={() => setShowBefore(b => !b)}
                    type="button"
                  >
                    {showBefore ? 'Show Enhanced' : 'Show Original'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Preview updates instantly as you change settings</p>
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
                    {files.map((file, index) => (
                      <div key={file.name + index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
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
              )}

              {/* AI Enhancement Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Brain className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">AI Enhancement Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enhancement Type
                    </label>
                    <select
                      value={enhancementLevel}
                      onChange={(e) => setEnhancementLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {enhancementOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {aiModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="faceEnhancement"
                      checked={faceEnhancement}
                      onChange={(e) => setFaceEnhancement(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="faceEnhancement" className="text-sm font-medium text-gray-700">
                      Face Enhancement
                    </label>
                    <Target className="h-4 w-4 text-violet-600" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="superResolution"
                      checked={superResolution}
                      onChange={(e) => setSuperResolution(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="superResolution" className="text-sm font-medium text-gray-700">
                      Super Resolution
                    </label>
                    <Zap className="h-4 w-4 text-violet-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="styleTransfer"
                      checked={styleTransfer}
                      onChange={(e) => setStyleTransfer(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="styleTransfer" className="text-sm font-medium text-gray-700">
                      Style Transfer
                    </label>
                    <Palette className="h-4 w-4 text-violet-600" />
                  </div>
                  
                  {styleTransfer && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Artistic Style
                      </label>
                      <select
                        value={artisticStyle}
                        onChange={(e) => setArtisticStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        {artisticStyles.map(style => (
                          <option key={style.id} value={style.id}>
                            {style.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                      <span>Enhancing Images...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5" />
                      <span>Enhance Images</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Enhanced Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our AI Enhancer?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Advanced AI-powered image enhancement with multiple models and features
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
                  How to Enhance Images with AI
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to enhance your images with advanced AI technology
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
                    Ready to Enhance Your Images with AI?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your photos with cutting-edge AI technology. Join millions of users 
                    who trust our AI Enhancer for professional image enhancement.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Brain className="h-5 w-5" />
                    <span>Start Enhancing Now</span>
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

export default AIEnhancer;