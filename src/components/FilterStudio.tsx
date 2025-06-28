import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, TrendingUp, CheckCircle, Filter, Sparkles, Target, Palette } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const FilterStudio: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [filterIntensity, setFilterIntensity] = useState(50);
  const [customFilter, setCustomFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [warmth, setWarmth] = useState(0);
  const [tint, setTint] = useState(0);
  const [grain, setGrain] = useState(0);
  const [vignette, setVignette] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob, url: string }[]>([]);
  const selectedFile = files[0];

  const filterPresets = [
    { id: 'none', name: 'No Filter', description: 'Original image without filters' },
    { id: 'vintage', name: 'Vintage', description: 'Classic film look with warm tones' },
    { id: 'modern', name: 'Modern', description: 'Clean and contemporary style' },
    { id: 'dramatic', name: 'Dramatic', description: 'High contrast and bold colors' },
    { id: 'soft', name: 'Soft', description: 'Gentle and dreamy appearance' },
    { id: 'monochrome', name: 'Monochrome', description: 'Black and white conversion' },
    { id: 'sepia', name: 'Sepia', description: 'Warm brown tones' },
    { id: 'cool', name: 'Cool', description: 'Blue-tinted modern look' },
    { id: 'warm', name: 'Warm', description: 'Golden hour lighting' },
    { id: 'cinematic', name: 'Cinematic', description: 'Movie-like color grading' },
    { id: 'retro', name: 'Retro', description: '80s and 90s aesthetic' },
    { id: 'hdr', name: 'HDR', description: 'High dynamic range effect' },
    { id: 'fade', name: 'Fade', description: 'Subtle color desaturation' },
    { id: 'ai-portrait', name: 'AI Portrait', description: 'AI-optimized for portraits' },
    { id: 'ai-landscape', name: 'AI Landscape', description: 'AI-optimized for landscapes' },
    { id: 'ai-street', name: 'AI Street', description: 'AI-optimized for street photography' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
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
      id: Math.random().toString(36).substring(2, 11),
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

  const processImages = useCallback(async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    const processed: { name: string, blob: Blob, url: string }[] = [];
    for (const fileObj of files) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      // Load image
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.src = fileObj.url;
      });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      // Apply selected filter (reuse existing logic for each filter)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      if (selectedFilter === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      } else if (selectedFilter === 'sepia') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
      } else if (selectedFilter === 'invert') {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      } else if (selectedFilter === 'blur') {
        // Simple blur filter
        const tempData = new Uint8ClampedArray(data);
        const radius = 2;
        
        for (let y = radius; y < canvas.height - radius; y++) {
          for (let x = radius; x < canvas.width - radius; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                r += tempData[idx];
                g += tempData[idx + 1];
                b += tempData[idx + 2];
                count++;
              }
            }
            
            const idx = (y * canvas.width + x) * 4;
            data[idx] = r / count;     // R
            data[idx + 1] = g / count; // G
            data[idx + 2] = b / count; // B
          }
        }
      } else if (selectedFilter === 'sharpen') {
        // Sharpen filter
        const tempData = new Uint8ClampedArray(data);
        const kernel = [
          [0, -1, 0],
          [-1, 5, -1],
          [0, -1, 0]
        ];
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            let r = 0, g = 0, b = 0;
            
            for (let ky = 0; ky < 3; ky++) {
              for (let kx = 0; kx < 3; kx++) {
                const idx = ((y + ky - 1) * canvas.width + (x + kx - 1)) * 4;
                const weight = kernel[ky][kx];
                r += tempData[idx] * weight;
                g += tempData[idx + 1] * weight;
                b += tempData[idx + 2] * weight;
              }
            }
            
            const idx = (y * canvas.width + x) * 4;
            data[idx] = Math.max(0, Math.min(255, r));     // R
            data[idx + 1] = Math.max(0, Math.min(255, g)); // G
            data[idx + 2] = Math.max(0, Math.min(255, b)); // B
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) {
        const url = URL.createObjectURL(blob);
        processed.push({ name: fileObj.name.replace(/\.[^/.]+$/, '') + '_filtered.jpg', blob, url });
      }
    }
    setProcessedFiles(processed);
    setIsProcessing(false);
  }, [files, selectedFilter]);

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
    const zip = new JSZip();
    for (const file of processedFiles) {
      const response = await fetch(file.url);
      const blob = await response.blob();
      zip.file(file.name, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'filtered_images.zip';
    link.click();
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Filter Studio",
      description: "Apply professional filters and effects to your images"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Multiple Presets",
      description: "Choose from a variety of pre-designed filter presets"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Custom Adjustments",
      description: "Fine-tune filter intensity and additional parameters"
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
      title: "Choose Filter",
      description: "Select from our collection of professional filter presets and adjust intensity"
    },
    {
      step: "3",
      title: "Apply Filter",
      description: "Our system applies the selected filter with perfect precision to your images"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "220K+", label: "Images Filtered" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const filterCategories = [
    { id: 'all', name: 'All Filters' },
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'portrait', name: 'Portrait' },
    { id: 'artistic', name: 'Artistic' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'ai', name: 'AI-Powered' }
  ];

  return (
    <>
      <SEO
        title="Filter Studio | Apply Stunning Photo Filters Online"
        description="Enhance your photos with beautiful filters using Filter Studio. Easy, free, and online — perfect for quick photo editing and sharing."
        keywords="filter studio, image filters, photo effects, vintage filters, artistic filters, online tool, free tool"
        canonical="filter-studio"
        ogImage="/images/filter-studio-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Filter Studio</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Apply Filters to Images
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform your images with professional filters and effects. Perfect for photography, 
                social media, and creative projects with a wide range of artistic styles.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here for filtering
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
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

              {/* Filter Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-violet-600" />
                  <span>Filter Settings</span>
                </h3>
                
                {/* Filter Preset Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter Preset</label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    {filterPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Intensity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter Intensity: {filterIntensity}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Additional Adjustments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brightness: {warmth}</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={warmth}
                      onChange={(e) => setWarmth(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tint: {tint}</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={tint}
                      onChange={(e) => setTint(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Effects */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blur: {vignette}px</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={vignette}
                      onChange={(e) => setVignette(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sharpen: {grain}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={grain}
                      onChange={(e) => setGrain(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Filter Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Filter Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Category
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {filterCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Intensity: {filterIntensity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterIntensity}
                      onChange={(e) => setFilterIntensity(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Basic Adjustments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brightness: {warmth > 0 ? '+' : ''}{warmth}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={warmth}
                      onChange={(e) => setWarmth(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tint: {tint > 0 ? '+' : ''}{tint}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={tint}
                      onChange={(e) => setTint(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Special Effects */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Special Effects</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="vignette"
                        checked={vignette > 0}
                        onChange={(e) => setVignette(e.target.checked ? 20 : 0)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="vignette" className="text-sm font-medium text-gray-700">
                        Vignette Effect
                      </label>
                      <Target className="h-4 w-4 text-purple-600" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="grain"
                        checked={grain > 0}
                        onChange={(e) => setGrain(e.target.checked ? 10 : 0)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="grain" className="text-sm font-medium text-gray-700">
                        Film Grain
                      </label>
                      <Sparkles className="h-4 w-4 text-green-600" />
                    </div>
                  </div>

                  {vignette > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vignette Intensity: {vignette}%
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={vignette}
                        onChange={(e) => setVignette(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  {grain > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grain Intensity: {grain}%
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={grain}
                        onChange={(e) => setGrain(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Custom Filter Creation */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="customFilter"
                      checked={customFilter}
                      onChange={(e) => setCustomFilter(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="customFilter" className="text-sm font-medium text-gray-700">
                      Create Custom Filter
                    </label>
                    <Palette className="h-4 w-4 text-orange-600" />
                  </div>
                  
                  {customFilter && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter Name
                        </label>
                        <input
                          type="text"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter filter name"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Save Custom Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processImages}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <span>Applying Filter...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Apply Filter</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={downloadAll}
                  className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Filtered Images</span>
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
                      <p className="text-xs text-gray-500 text-center mb-4">Filtered</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Filter Studio?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional filter effects with creative freedom and customization options
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
                  How to Apply Filters
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to transform your images with professional filters
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
                    Ready to Transform Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Apply professional filters and effects to create stunning visuals. Join thousands of users 
                    who trust our Filter Studio for their creative projects.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Start Filtering Now</span>
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

export default FilterStudio; 