import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Palette, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const VintageEffects: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    effect: 'sepia',
    intensity: 50,
    grain: 20,
    vignette: 30
  });

  const vintageEffects = [
    { id: 'sepia', name: 'Sepia Tone' },
    { id: 'blackwhite', name: 'Black & White' },
    { id: 'faded', name: 'Faded Look' },
    { id: 'vintage', name: 'Vintage Film' },
    { id: 'retro', name: 'Retro Style' },
    { id: 'classic', name: 'Classic Film' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: UploadedImage[] = Array.from(selectedFiles).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const newFiles: UploadedImage[] = Array.from(droppedFiles).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const processedResults: { name: string; blob: Blob }[] = [];

      for (const uploadedFile of files) {
        const file = uploadedFile.file;
      
        // Create an image element to load the file
        const img = document.createElement('img') as HTMLImageElement;
        img.crossOrigin = 'anonymous';
        img.src = uploadedFile.url;
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
        });

        // Create canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply vintage effects
        applyVintageEffects(data, canvas.width, canvas.height);

        // Put the processed image data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(new Blob());
          }, 'image/png', 0.9);
        });

        processedResults.push({
          name: `vintage-${file.name}`,
          blob: blob
        });
      }
      
      setProcessedFiles(processedResults);
      setIsProcessing(false);
      
      if (processedResults.length > 0) {
        alert('Vintage effects applied! Your images have been transformed.');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setIsProcessing(false);
      alert('Error processing images. Please try again.');
    }
  };

  // Apply vintage effects to image data
  const applyVintageEffects = (data: Uint8ClampedArray, width: number, height: number) => {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Apply sepia effect
      const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));

      // Add vintage color tint (slight yellow/brown overlay)
      const vintageR = Math.min(255, sepiaR * 1.1);
      const vintageG = Math.min(255, sepiaG * 1.05);
      const vintageB = Math.min(255, sepiaB * 0.9);

      // Add slight contrast adjustment
      const contrast = 1.2;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const finalR = Math.min(255, Math.max(0, factor * (vintageR - 128) + 128));
      const finalG = Math.min(255, Math.max(0, factor * (vintageG - 128) + 128));
      const finalB = Math.min(255, Math.max(0, factor * (vintageB - 128) + 128));

      // Add film grain effect
      const grain = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, finalR + grain));
      data[i + 1] = Math.min(255, Math.max(0, finalG + grain));
      data[i + 2] = Math.min(255, Math.max(0, finalB + grain));
      data[i + 3] = a; // Keep original alpha
    }
  };

  const downloadAll = () => {
    processedFiles.forEach(({ name, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const features = [
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Authentic Effects",
      description: "Realistic vintage and retro photo effects"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Customizable",
      description: "Adjust intensity, grain, and vignette"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain image quality with effects"
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
      title: "Upload Images",
      description: "Select your photos for vintage effects"
    },
    {
      step: "2",
      title: "Choose Effect",
      description: "Pick from various vintage styles"
    },
    {
      step: "3",
      title: "Download Results",
      description: "Get your vintage-styled images"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "25K+", label: "Images Processed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 3s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="Vintage Effects | Apply Retro Photo Effects"
        description="Transform your photos with beautiful vintage effects. Apply classic retro filters online for free and give your images a timeless look instantly."
        keywords="vintage effects, retro photo effects, classic film looks, sepia tones, nostalgic filters, online tool, free tool"
        canonical="vintage-effects"
        ogImage="/images/vintage-effects-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Palette className="h-4 w-4" />
                <span>Vintage Effects</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Vintage Charm with
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Classic Effects</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform your photos with beautiful vintage effects including sepia, black & white, 
                faded looks, and authentic film grain. Perfect for creating timeless, nostalgic images.
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

              {/* Vintage Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Vintage Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Effect Style</label>
                    <select
                      value={settings.effect}
                      onChange={(e) => setSettings(prev => ({ ...prev, effect: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {vintageEffects.map(effect => (
                        <option key={effect.id} value={effect.id}>
                          {effect.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intensity: {settings.intensity}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.intensity}
                      onChange={(e) => setSettings(prev => ({ ...prev, intensity: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grain: {settings.grain}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.grain}
                      onChange={(e) => setSettings(prev => ({ ...prev, grain: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vignette: {settings.vignette}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.vignette}
                      onChange={(e) => setSettings(prev => ({ ...prev, vignette: Number(e.target.value) }))}
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
                      {/* Spinner removed */}
                      <span>Applying Effects...</span>
                    </>
                  ) : (
                    <>
                      <Palette className="h-5 w-5" />
                      <span>Apply Vintage Effects</span>
                    </>
                  )}
                </button>
                
                {/* Download Area */}
                {processedFiles.length > 0 && (
                  <div
                    className="mt-8 flex flex-col items-center cursor-pointer"
                    onClick={downloadAll}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); downloadAll(); }}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      Download Vintage Images
                    </button>
                    <p className="text-gray-500 text-sm mt-2">Click anywhere in this box to download</p>
                  </div>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Vintage Effects?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional vintage effect application with authentic film photography looks
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
                  How to Apply Vintage Effects
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to add beautiful vintage effects to your images
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
                    Ready to Add Vintage Charm?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your photos with beautiful vintage effects. Join thousands of users 
                    who trust our vintage tool for their nostalgic image enhancement needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Palette className="h-5 w-5" />
                    <span>Start Vintage Effects</span>
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

export default VintageEffects; 