import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const SharpeningTool: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    strength: 50,
    radius: 1,
    threshold: 0
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newImages]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newImages]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(img => img.id !== id));
  };

  // Helper to process a single file for preview
  const processPreview = async (file: UploadedImage) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = document.createElement('img') as HTMLImageElement;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = file.url;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply unsharp mask algorithm
    const strength = settings.strength / 100;
    const radius = settings.radius;
    const threshold = settings.threshold;
    
    // Create a blurred version for comparison
    const blurredData = new Uint8ClampedArray(data);
    
    // Simple box blur for demonstration
    for (let y = radius; y < canvas.height - radius; y++) {
      for (let x = radius; x < canvas.width - radius; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        
        const idx = (y * canvas.width + x) * 4;
        blurredData[idx] = r / count;
        blurredData[idx + 1] = g / count;
        blurredData[idx + 2] = b / count;
      }
    }
    
    // Apply sharpening
    for (let i = 0; i < data.length; i += 4) {
      const originalR = data[i];
      const originalG = data[i + 1];
      const originalB = data[i + 2];
      
      const blurredR = blurredData[i];
      const blurredG = blurredData[i + 1];
      const blurredB = blurredData[i + 2];
      
      const diffR = originalR - blurredR;
      const diffG = originalG - blurredG;
      const diffB = originalB - blurredB;
      
      const magnitude = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
      
      if (magnitude > threshold) {
        data[i] = Math.max(0, Math.min(255, originalR + diffR * strength));
        data[i + 1] = Math.max(0, Math.min(255, originalG + diffG * strength));
        data[i + 2] = Math.max(0, Math.min(255, originalB + diffB * strength));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve(file.url);
        }
      }, 'image/jpeg', 0.9);
    });
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
  }, [files, settings.strength, settings.radius, settings.threshold]);

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
            img.src = file.url;
          });
          
          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for sharpening
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply unsharp mask algorithm
          const strength = settings.strength / 100;
          const radius = settings.radius;
          const threshold = settings.threshold;
          
          // Create a blurred version for comparison
          const blurredData = new Uint8ClampedArray(data);
          
          // Simple box blur for demonstration
          for (let y = radius; y < canvas.height - radius; y++) {
            for (let x = radius; x < canvas.width - radius; x++) {
              let r = 0, g = 0, b = 0, count = 0;
              
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                  r += data[idx];
                  g += data[idx + 1];
                  b += data[idx + 2];
                  count++;
                }
              }
              
              const idx = (y * canvas.width + x) * 4;
              blurredData[idx] = r / count;
              blurredData[idx + 1] = g / count;
              blurredData[idx + 2] = b / count;
            }
          }
          
          // Apply sharpening
          for (let i = 0; i < data.length; i += 4) {
            const originalR = data[i];
            const originalG = data[i + 1];
            const originalB = data[i + 2];
            
            const blurredR = blurredData[i];
            const blurredG = blurredData[i + 1];
            const blurredB = blurredData[i + 2];
            
            // Calculate difference
            const diffR = originalR - blurredR;
            const diffG = originalG - blurredG;
            const diffB = originalB - blurredB;
            
            // Apply threshold
            const magnitude = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
            
            if (magnitude > threshold) {
              // Apply sharpening
              data[i] = Math.max(0, Math.min(255, originalR + diffR * strength));
              data[i + 1] = Math.max(0, Math.min(255, originalG + diffG * strength));
              data[i + 2] = Math.max(0, Math.min(255, originalB + diffB * strength));
            }
          }
          
          // Put the sharpened image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
          });
          
          return {
            name: `sharpened-${file.name}`,
            blob: blob
          };
        })
      );
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert('Image sharpening completed! Your images have been sharpened with advanced algorithms.');
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

    // Create downloadable sharpened files
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
      icon: <Sparkles className="h-6 w-6" />,
      title: "Smart Sharpening",
      description: "Enhance image details with intelligent algorithms"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Multiple Methods",
      description: "Choose from various sharpening techniques"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Detail Preservation",
      description: "Maintain natural image quality while enhancing edges"
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
      title: "Choose Method",
      description: "Select sharpening method and adjust strength and parameters"
    },
    {
      step: "3",
      title: "Sharpen Images",
      description: "Our system intelligently sharpens your images while preserving natural details"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "180K+", label: "Images Sharpened" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Sharpening Tool | Enhance Image Sharpness Online"
        description="Make your photos clearer and crisper with our free online sharpening tool. Quickly improve image details with no downloads or sign-up required."
        canonical="sharpening-tool"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Sharpening Tool</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Sharpen Images with
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Intelligent Precision</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Enhance image details and clarity with advanced sharpening algorithms. Perfect for photography, 
                digital art, and any image that needs enhanced definition and crispness.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here for sharpening
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Choose Images
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
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

              {/* Live Preview */}
              {previewUrl && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Image className="h-5 w-5 text-violet-600" />
                    <span>Live Preview</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full h-auto max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600 text-center mt-2">
                      Real-time preview of sharpening effect
                    </p>
                  </div>
                </div>
              )}

              {/* Sharpening Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Sharpening Settings</span>
                </h3>
                
                {/* Sharpening Strength */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sharpening Strength: {settings.strength}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.strength}
                    onChange={(e) => setSettings(prev => ({ ...prev, strength: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Advanced Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Radius: {settings.radius}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={settings.radius}
                      onChange={(e) => setSettings(prev => ({ ...prev, radius: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Threshold: {settings.threshold}</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={settings.threshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
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
                      <span>Sharpening Images...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Sharpen Images</span>
                    </>
                  )}
                </button>
                
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Sharpened Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Sharpening Tool?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional sharpening with intelligent detail enhancement
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
                  How to Sharpen Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to enhance your image details
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
                    Ready to Enhance Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Sharpen and enhance image details for stunning results. Join thousands of users 
                    who trust our Sharpening Tool for their photography needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Start Sharpening Now</span>
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

export default SharpeningTool; 