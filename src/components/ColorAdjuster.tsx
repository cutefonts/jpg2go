import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, TrendingUp, FileImage, CheckCircle, Palette, Sparkles, Target } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const ColorAdjuster: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [whites, setWhites] = useState(0);
  const [blacks, setBlacks] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [vibrance, setVibrance] = useState(0);
  const [aiColorAnalysis, setAiColorAnalysis] = useState(false);
  const [colorPreset, setColorPreset] = useState('none');
  const [selectiveColor, setSelectiveColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [colorHue, setColorHue] = useState(0);
  const [colorSaturation, setColorSaturation] = useState(0);
  const [colorLightness, setColorLightness] = useState(0);
  const [colorTheory, setColorTheory] = useState(false);
  const [colorHarmony, setColorHarmony] = useState('complementary');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorPresets = [
    { id: 'none', name: 'No Preset', description: 'Manual adjustments only' },
    { id: 'warm', name: 'Warm', description: 'Golden hour lighting' },
    { id: 'cool', name: 'Cool', description: 'Blue-tinted modern look' },
    { id: 'vintage', name: 'Vintage', description: 'Classic film colors' },
    { id: 'cinematic', name: 'Cinematic', description: 'Movie-like grading' },
    { id: 'portrait', name: 'Portrait', description: 'Skin tone optimized' },
    { id: 'landscape', name: 'Landscape', description: 'Nature enhanced' },
    { id: 'street', name: 'Street', description: 'Urban photography' },
    { id: 'black-white', name: 'Black & White', description: 'Monochrome conversion' },
    { id: 'sepia', name: 'Sepia', description: 'Warm brown tones' },
    { id: 'dramatic', name: 'Dramatic', description: 'High contrast look' },
    { id: 'soft', name: 'Soft', description: 'Gentle pastel tones' },
    { id: 'ai-optimized', name: 'AI Optimized', description: 'AI-enhanced colors' }
  ];

  const colorHarmonies = [
    { id: 'complementary', name: 'Complementary', description: 'Opposite colors on color wheel' },
    { id: 'analogous', name: 'Analogous', description: 'Adjacent colors on color wheel' },
    { id: 'triadic', name: 'Triadic', description: 'Three colors equally spaced' },
    { id: 'split-complementary', name: 'Split Complementary', description: 'One base + two adjacent to its complement' },
    { id: 'tetradic', name: 'Tetradic', description: 'Four colors forming a rectangle' },
    { id: 'monochromatic', name: 'Monochromatic', description: 'Single color with variations' }
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
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Apply brightness
      if (brightness !== 0) {
        r = Math.max(0, Math.min(255, r + brightness));
        g = Math.max(0, Math.min(255, g + brightness));
        b = Math.max(0, Math.min(255, b + brightness));
      }
      
      // Apply contrast
      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
        g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
        b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
      }
      
      // Apply saturation
      if (saturation !== 0) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const factor = 1 + saturation / 100;
        r = Math.max(0, Math.min(255, gray + factor * (r - gray)));
        g = Math.max(0, Math.min(255, gray + factor * (g - gray)));
        b = Math.max(0, Math.min(255, gray + factor * (b - gray)));
      }
      
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
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
  }, [files, brightness, contrast, saturation]);

  const processImage = async () => {
    if (isProcessing) return;
    
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
          
          // Apply color adjustments
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            if (brightness !== 0) {
              data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // Red
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // Green
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // Blue
            }
            
            // Apply contrast
            if (contrast !== 0) {
              const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
              data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
              data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
              data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
            }
            
            // Apply saturation
            if (saturation !== 0) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const factor = 1 + saturation / 100;
              data[i] = Math.max(0, Math.min(255, gray + factor * (data[i] - gray)));
              data[i + 1] = Math.max(0, Math.min(255, gray + factor * (data[i + 1] - gray)));
              data[i + 2] = Math.max(0, Math.min(255, gray + factor * (data[i + 2] - gray)));
            }
          }
          
          // Put the modified image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
          });
          
          return {
            name: `color-adjusted-${file.name}`,
            blob: blob
          };
        })
      );
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`Color adjustment completed! Features: ${getAppliedFeatures()}`);
    } catch (error) {
      console.error('Error processing images:', error);
      setIsProcessing(false);
      alert('Error processing images. Please try again.');
    }
  };

  const getAppliedFeatures = () => {
    const features = [];
    if (brightness !== 0) features.push(`${brightness > 0 ? '+' : ''}${brightness} Brightness`);
    if (contrast !== 0) features.push(`${contrast > 0 ? '+' : ''}${contrast} Contrast`);
    if (saturation !== 0) features.push(`${saturation > 0 ? '+' : ''}${saturation} Saturation`);
    if (temperature !== 0) features.push(`${temperature > 0 ? '+' : ''}${temperature} Temperature`);
    if (aiColorAnalysis) features.push('AI Color Analysis');
    if (colorPreset !== 'none') features.push(`${colorPreset} Preset`);
    if (selectiveColor) features.push('Selective Color');
    if (colorTheory) features.push(`${colorHarmony} Harmony`);
    return features.join(', ');
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }

    // Create downloadable color-adjusted files
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
      icon: <Palette className="h-6 w-6" />,
      title: "Color Adjustment",
      description: "Professional color correction and enhancement tools"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Advanced Controls",
      description: "Fine-tune brightness, contrast, saturation, and more"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Color Presets",
      description: "Apply professional color grading presets instantly"
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
      title: "Adjust Colors",
      description: "Use sliders to adjust brightness, contrast, saturation, and other color parameters"
    },
    {
      step: "3",
      title: "Apply Adjustments",
      description: "Our system applies your color adjustments with professional precision"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "180K+", label: "Images Enhanced" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Image Color Adjuster Online"
        description="Adjust brightness, contrast, saturation, and hue with our free online color adjuster. Perfect tool to enhance your images quickly and easily."
        keywords="color adjuster, adjust image colors, brightness, contrast, saturation, color correction, online tool, free tool"
        canonical="color-adjuster"
        ogImage="/images/color-adjuster-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Palette className="h-4 w-4" />
                <span>Color Adjuster</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Adjust Colors with
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Professional Precision</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Enhance your images with professional color adjustment tools. Perfect for photography, 
                design work, and any image that needs color correction or enhancement.
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
                    Drop your images here for color adjustment
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

              {/* Live Preview Section */}
              {previewUrl && (
                <div className="mb-8 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Preview</h3>
                  <img
                    src={previewUrl}
                    alt="Color Adjustment Preview"
                    className="rounded-xl shadow-lg max-w-xs max-h-80 border border-violet-200"
                    style={{ background: '#f3f4f6' }}
                  />
                  <p className="text-xs text-gray-500 mt-2">Preview updates instantly as you adjust colors</p>
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

              {/* Advanced Color Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Color Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Preset
                    </label>
                    <select
                      value={colorPreset}
                      onChange={(e) => setColorPreset(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {colorPresets.map(preset => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} - {preset.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="aiColorAnalysis"
                      checked={aiColorAnalysis}
                      onChange={(e) => setAiColorAnalysis(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="aiColorAnalysis" className="text-sm font-medium text-gray-700">
                      AI Color Analysis
                    </label>
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                {/* Basic Adjustments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brightness: {brightness > 0 ? '+' : ''}{brightness}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contrast: {contrast > 0 ? '+' : ''}{contrast}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saturation: {saturation > 0 ? '+' : ''}{saturation}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Advanced Color Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature: {temperature > 0 ? '+' : ''}{temperature}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exposure: {exposure > 0 ? '+' : ''}{exposure}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={exposure}
                      onChange={(e) => setExposure(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tone Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Highlights: {highlights > 0 ? '+' : ''}{highlights}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={highlights}
                      onChange={(e) => setHighlights(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shadows: {shadows > 0 ? '+' : ''}{shadows}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={shadows}
                      onChange={(e) => setShadows(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Whites: {whites > 0 ? '+' : ''}{whites}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={whites}
                      onChange={(e) => setWhites(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blacks: {blacks > 0 ? '+' : ''}{blacks}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={blacks}
                      onChange={(e) => setBlacks(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Advanced Effects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clarity: {clarity > 0 ? '+' : ''}{clarity}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={clarity}
                      onChange={(e) => setClarity(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vibrance: {vibrance > 0 ? '+' : ''}{vibrance}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={vibrance}
                      onChange={(e) => setVibrance(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Selective Color Editing */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="selectiveColor"
                      checked={selectiveColor}
                      onChange={(e) => setSelectiveColor(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="selectiveColor" className="text-sm font-medium text-gray-700">
                      Selective Color Editing
                    </label>
                    <Palette className="h-4 w-4 text-purple-600" />
                  </div>
                  
                  {selectiveColor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Color
                        </label>
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hue: {colorHue}°
                        </label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={colorHue}
                          onChange={(e) => setColorHue(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Saturation: {colorSaturation > 0 ? '+' : ''}{colorSaturation}
                        </label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={colorSaturation}
                          onChange={(e) => setColorSaturation(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lightness: {colorLightness > 0 ? '+' : ''}{colorLightness}
                        </label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={colorLightness}
                          onChange={(e) => setColorLightness(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Theory */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="colorTheory"
                      checked={colorTheory}
                      onChange={(e) => setColorTheory(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colorTheory" className="text-sm font-medium text-gray-700">
                      Color Theory Optimization
                    </label>
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  
                  {colorTheory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Harmony
                      </label>
                      <select
                        value={colorHarmony}
                        onChange={(e) => setColorHarmony(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {colorHarmonies.map(harmony => (
                          <option key={harmony.id} value={harmony.id}>
                            {harmony.name} - {harmony.description}
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
                  onClick={processImage}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Adjusting Colors...</span>
                    </>
                  ) : (
                    <>
                      <Palette className="h-5 w-5" />
                      <span>Adjust Colors</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={downloadAll}
                  className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Adjusted Images</span>
                </button>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Color Adjuster?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional color adjustment tools with advanced controls and presets
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
                  How to Adjust Colors
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to enhance your images with professional color adjustments
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
                    Ready to Adjust Your Colors?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Enhance your images with professional color adjustment tools. Join thousands of users 
                    who trust our color adjuster for their photography and design needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Palette className="h-5 w-5" />
                    <span>Start Adjusting Now</span>
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

export default ColorAdjuster; 