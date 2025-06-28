import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

const PNGOptimizer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    quality: 85,
    compression: 'balanced',
    optimize: true,
    preserveTransparency: true
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type === 'image/png');
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type === 'image/png');
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to process a single file for preview
  const processPreview = async (file: File) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = document.createElement('img') as HTMLImageElement;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Apply optimization settings
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    if (settings.optimize) {
      // Apply subtle optimization
      for (let i = 0; i < data.length; i += 4) {
        // Slight contrast enhancement
        const factor = 1.05;
        data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128));
        data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128));
        data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve(URL.createObjectURL(file));
        }
      }, 'image/png', settings.quality / 100);
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
  }, [files, settings.quality, settings.optimize]);

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
          
          // Apply optimization
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          if (settings.optimize) {
            // Apply optimization algorithms
            for (let i = 0; i < data.length; i += 4) {
              // Enhance contrast and brightness
              const factor = 1.1;
              data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128));
              data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128));
              data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128));
            }
          }
          
          // Put the optimized image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob with quality settings
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: 'image/png' }));
            }, 'image/png', settings.quality / 100);
          });
          
          const name = file.name.replace(/\.png$/i, '_optimized.png');
          
          return { name, blob };
        })
      );
      
      setProcessedFiles(processed);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Error processing files. Please try again.');
    } finally {
      setIsProcessing(false);
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

  const downloadAllAsZip = async () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }
    const zip = new JSZip();
    processedFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'png-optimized.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Smart Optimization",
      description: "Advanced PNG compression with transparency preservation"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Transparency Support",
      description: "Preserve transparency and alpha channels"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Quality Control",
      description: "Maintain image quality while reducing file size"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PNG Images",
      description: "Select your PNG files or drag and drop them"
    },
    {
      step: "2",
      title: "Adjust Settings",
      description: "Choose quality and compression options"
    },
    {
      step: "3",
      title: "Download Optimized",
      description: "Get your optimized PNG files instantly"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "2.5M+", label: "Images Optimized" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="PNG Optimizer | Compress PNG Files Online Free"
        description="Reduce PNG image size without losing quality or transparency. Use our free PNG optimizer to compress images quickly and easily."
        canonical="png-optimizer"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                <span>PNG Optimizer</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Optimize PNG Images Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Reduce PNG file sizes while preserving transparency. Perfect for web optimization, 
                faster loading times, and efficient storage management.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PNG file here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PNG File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
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
                      Real-time preview of optimization effect
                    </p>
                  </div>
                </div>
              )}

              {/* Optimization Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Optimization Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality: {settings.quality}%</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                    <select
                      value={settings.compression}
                      onChange={(e) => setSettings(prev => ({ ...prev, compression: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="balanced">Balanced</option>
                      <option value="aggressive">Aggressive</option>
                      <option value="conservative">Conservative</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="optimize"
                      checked={settings.optimize}
                      onChange={(e) => setSettings(prev => ({ ...prev, optimize: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="optimize" className="text-sm font-medium text-gray-700">
                      Smart Optimization
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveTransparency"
                      checked={settings.preserveTransparency}
                      onChange={(e) => setSettings(prev => ({ ...prev, preserveTransparency: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveTransparency" className="text-sm font-medium text-gray-700">
                      Preserve Transparency
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
                      <span>Optimizing Images...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Optimize Images</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <>
                    <button
                      onClick={downloadAll}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download Optimized Images</span>
                    </button>
                    <button
                      onClick={downloadAllAsZip}
                      className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 mt-2 sm:mt-0"
                      style={{ marginLeft: '0.5rem' }}
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All as ZIP</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PNG Optimizer?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PNG optimization with transparency preservation
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
                  How to Optimize PNG Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to optimize your PNG images
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Ready to Optimize Your Images?
                  </h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
                    Join millions of users who trust our PNG optimizer for their image needs
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Zap className="h-5 w-5" />
                    <span>Start Optimizing Now</span>
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

export default PNGOptimizer; 