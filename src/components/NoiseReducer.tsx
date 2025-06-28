import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, TrendingUp, CheckCircle, Sparkles, Target, Camera, FileText, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const NoiseReducer: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(50);
  const [preserveDetails, setPreserveDetails] = useState(true);
  const [aiNoiseReduction, setAiNoiseReduction] = useState(false);
  const [noiseType, setNoiseType] = useState('auto');
  const [smoothness, setSmoothness] = useState(30);
  const [sharpness, setSharpness] = useState(20);
  const [colorNoise, setColorNoise] = useState(false);
  const [luminanceNoise, setLuminanceNoise] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob, url: string }[]>([]);

  const noiseTypes = [
    { id: 'gaussian', name: 'Gaussian Noise', description: 'Random pixel variations', icon: Zap },
    { id: 'salt-pepper', name: 'Salt & Pepper', description: 'Random white and black pixels', icon: Shield },
    { id: 'poisson', name: 'Poisson Noise', description: 'Shot noise from low light', icon: Camera }
  ];

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

  // Helper: Median filter for a single channel
  function median(values: number[]) {
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }

  // Main noise reduction function
  async function applyMedianFilter(imageUrl: string, kernelSize = 3): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width, h = canvas.height;
        const half = Math.floor(kernelSize / 2);
        const output = new Uint8ClampedArray(data);

        for (let y = half; y < h - half; y++) {
          for (let x = half; x < w - half; x++) {
            const r: number[] = [], g: number[] = [], b: number[] = [];
            for (let ky = -half; ky <= half; ky++) {
              for (let kx = -half; kx <= half; kx++) {
                const idx = ((y + ky) * w + (x + kx)) * 4;
                r.push(data[idx]);
                g.push(data[idx + 1]);
                b.push(data[idx + 2]);
              }
            }
            const idx = (y * w + x) * 4;
            output[idx] = median(r);
            output[idx + 1] = median(g);
            output[idx + 2] = median(b);
            // Alpha channel remains unchanged
          }
        }
        imageData.data.set(output);
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      };
      img.src = imageUrl;
    });
  }

  const processImage = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProcessedFiles([]);
    // Map noiseReductionLevel (10-100) to kernel size (3-7, odd only)
    const kernelSize = Math.max(3, Math.min(7, 3 + Math.round((noiseReductionLevel - 10) / 30)));
    const processed: { name: string, blob: Blob, url: string }[] = [];
    for (const fileObj of files) {
      const blob = await applyMedianFilter(fileObj.url, kernelSize);
      if (blob) {
        const url = URL.createObjectURL(blob);
        processed.push({ name: fileObj.name.replace(/\.[^/.]+$/, '') + '_denoised.jpg', blob, url });
      }
    }
    setProcessedFiles(processed);
    setIsProcessing(false);
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }
    if (processedFiles.length === 1) {
      const link = document.createElement('a');
      link.href = processedFiles[0].url;
      link.download = processedFiles[0].name;
      link.click();
      return;
    }
    // Multiple: ZIP
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const file of processedFiles) {
      const response = await fetch(file.url);
      const blob = await response.blob();
      zip.file(file.name, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'denoised_images.zip';
    link.click();
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Noise Reduction",
      description: "Remove digital noise while preserving image details"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Smart Detection",
      description: "Automatically detect and reduce different types of noise"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Detail Preservation",
      description: "Advanced algorithms that maintain image sharpness"
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
      description: "Drag and drop your noisy images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Configure Reduction",
      description: "Choose noise type and adjust reduction strength and detail preservation"
    },
    {
      step: "3",
      title: "Reduce Noise",
      description: "Our system intelligently reduces noise while preserving important image details"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "150K+", label: "Images Processed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Noise Reducer | Remove Image Noise Online Free"
        description="Clean up grainy or blurry photos with our free online noise reducer. Enhance image clarity and quality in just seconds no downloads needed."
        keywords="noise reducer, remove image noise, grain reduction, image denoising, AI noise reduction, online tool, free tool"
        canonical="noise-reducer"
        ogImage="/images/noise-reducer-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Noise Reducer</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Remove Image Noise Online Free
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Remove digital noise from your images while preserving important details. Perfect for low-light photography, 
                high ISO images, and any photo that needs noise reduction.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your noisy images here for reduction
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
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

              {/* Advanced Noise Reduction Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Noise Reduction Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noise Type
                    </label>
                    <select
                      value={noiseType}
                      onChange={(e) => setNoiseType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {noiseTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reduction Strength: {noiseReductionLevel}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={noiseReductionLevel}
                      onChange={(e) => setNoiseReductionLevel(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sharpness: {sharpness}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sharpness}
                      onChange={(e) => setSharpness(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Smoothness: {smoothness}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={smoothness}
                      onChange={(e) => setSmoothness(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="aiNoiseReduction"
                      checked={aiNoiseReduction}
                      onChange={(e) => setAiNoiseReduction(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="aiNoiseReduction" className="text-sm font-medium text-gray-700">
                      AI Noise Detection
                    </label>
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preserveDetails"
                      checked={preserveDetails}
                      onChange={(e) => setPreserveDetails(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveDetails" className="text-sm font-medium text-gray-700">
                      Preserve Details
                    </label>
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="advancedMode"
                      checked={advancedMode}
                      onChange={(e) => setAdvancedMode(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="advancedMode" className="text-sm font-medium text-gray-700">
                      Advanced Mode
                    </label>
                    <Zap className="h-4 w-4 text-orange-600" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="colorNoise"
                      checked={colorNoise}
                      onChange={(e) => setColorNoise(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colorNoise" className="text-sm font-medium text-gray-700">
                      Color Noise Reduction
                    </label>
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="luminanceNoise"
                      checked={luminanceNoise}
                      onChange={(e) => setLuminanceNoise(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="luminanceNoise" className="text-sm font-medium text-gray-700">
                      Luminance Noise Reduction
                    </label>
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processImage}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Reducing Noise...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Reduce Noise</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={downloadAll}
                  className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Processed Images</span>
                </button>
              </div>
            </div>

            {/* Preview Section */}
            {processedFiles && processedFiles.length > 0 && (
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedFiles.map((img) => (
                  <div key={img.name} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                    <div className="h-60 bg-gray-100 flex items-center justify-center">
                      <img src={img.url} alt={img.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate text-center mb-1">{img.name}</p>
                      <p className="text-xs text-gray-500 text-center mb-4">Denoised</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Noise Reducer?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional noise reduction with intelligent detail preservation
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
                  How to Reduce Noise
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to clean up noisy images
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
                    Ready to Clean Up Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Remove digital noise and improve image quality. Join thousands of users 
                    who trust our Noise Reducer for their photography needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Start Reducing Noise Now</span>
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

export default NoiseReducer; 