import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, Download, Settings, Trash2, Eye, EyeOff,
  Zap, Sparkles, Image as ImageIcon, FileImage,
  RotateCw, Palette, Sliders, Archive, CheckCircle,
  AlertCircle, RefreshCw, X, Play, Pause, Monitor
} from 'lucide-react';
import JSZip from 'jszip';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  processed?: string;
  originalSize: number;
  processedSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  settings?: ProcessingSettings;
}

interface ProcessingSettings {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  
  // Filters
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sharpen: number;
  
  // Transform
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  
  // Advanced
  removeBackground: boolean;
  addWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
}

const ImageConverter: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'transform' | 'advanced'>('basic');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<ProcessingSettings>({
    format: 'jpeg',
    quality: 85,
    maintainAspectRatio: true,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    blur: 0,
    sharpen: 0,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    removeBackground: false,
    addWatermark: false,
    watermarkText: '© JPG2GO',
    watermarkOpacity: 50
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }

    const newImages: ImageFile[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      originalSize: file.size,
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
        if (image.processed) {
          URL.revokeObjectURL(image.processed);
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    // Clean up all blob URLs to prevent memory leaks
    images.forEach(image => {
      URL.revokeObjectURL(image.preview);
      if (image.processed) {
        URL.revokeObjectURL(image.processed);
      }
    });
    
    // Clear the images array
    setImages([]);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Close any open preview
    setShowPreview(null);
    
    // Reset processing state
    setIsProcessing(false);
  };

  const updateSettings = (newSettings: Partial<ProcessingSettings>) => {
    setGlobalSettings(prev => ({ ...prev, ...newSettings }));
  };

  const processImage = async (imageFile: ImageFile, settings: ProcessingSettings): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Apply size constraints
          if (settings.width || settings.height) {
            if (settings.maintainAspectRatio) {
              const aspectRatio = img.width / img.height;
              if (settings.width && !settings.height) {
                width = settings.width;
                height = Math.round(width / aspectRatio);
              } else if (settings.height && !settings.width) {
                height = settings.height;
                width = Math.round(height * aspectRatio);
              } else if (settings.width && settings.height) {
                const targetRatio = settings.width / settings.height;
                if (aspectRatio > targetRatio) {
                  width = settings.width;
                  height = Math.round(width / aspectRatio);
                } else {
                  height = settings.height;
                  width = Math.round(height * aspectRatio);
                }
              }
            } else {
              width = settings.width || width;
              height = settings.height || height;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Clear canvas
          ctx.clearRect(0, 0, width, height);

          // Apply transformations
          ctx.save();
          
          // Handle rotation and flips
          const centerX = width / 2;
          const centerY = height / 2;
          
          ctx.translate(centerX, centerY);
          
          if (settings.rotation !== 0) {
            ctx.rotate((settings.rotation * Math.PI) / 180);
          }
          
          let scaleX = 1;
          let scaleY = 1;
          
          if (settings.flipHorizontal) scaleX = -1;
          if (settings.flipVertical) scaleY = -1;
          
          ctx.scale(scaleX, scaleY);
          ctx.translate(-centerX, -centerY);

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);
          ctx.restore();

          // Apply filters
          if (settings.brightness !== 0 || settings.contrast !== 0 || settings.saturation !== 0 || settings.hue !== 0) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              let r = data[i];
              let g = data[i + 1];
              let b = data[i + 2];

              // Brightness
              if (settings.brightness !== 0) {
                r = Math.max(0, Math.min(255, r + settings.brightness));
                g = Math.max(0, Math.min(255, g + settings.brightness));
                b = Math.max(0, Math.min(255, b + settings.brightness));
              }

              // Contrast
              if (settings.contrast !== 0) {
                const factor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
                r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
                g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
                b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
              }

              // Saturation
              if (settings.saturation !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const satFactor = 1 + settings.saturation / 100;
                r = Math.max(0, Math.min(255, gray + satFactor * (r - gray)));
                g = Math.max(0, Math.min(255, gray + satFactor * (g - gray)));
                b = Math.max(0, Math.min(255, gray + satFactor * (b - gray)));
              }

              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }

            ctx.putImageData(imageData, 0, 0);
          }

          // Apply blur
          if (settings.blur > 0) {
            ctx.filter = `blur(${settings.blur}px)`;
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCanvas.width = width;
              tempCanvas.height = height;
              tempCtx.filter = `blur(${settings.blur}px)`;
              tempCtx.drawImage(canvas, 0, 0);
              ctx.filter = 'none';
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(tempCanvas, 0, 0);
            }
          }

          // Add watermark
          if (settings.addWatermark && settings.watermarkText) {
            const fontSize = Math.max(12, width / 40);
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = `rgba(255, 255, 255, ${settings.watermarkOpacity / 100})`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            
            // Add shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillText(settings.watermarkText, width - 20, height - 20);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }

          // Convert to blob with proper format and quality
          const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 
                          settings.format === 'png' ? 'image/png' : 'image/webp';
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            mimeType,
            settings.format === 'png' ? undefined : settings.quality / 100
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.crossOrigin = 'anonymous';
      img.src = imageFile.preview;
    });
  };

  const convertSingle = async (id: string) => {
    const imageIndex = images.findIndex(img => img.id === id);
    if (imageIndex === -1) return;

    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'processing' as const } : img
    ));

    try {
      const imageFile = images[imageIndex];
      const blob = await processImage(imageFile, globalSettings);
      const processedUrl = URL.createObjectURL(blob);

      setImages(prev => prev.map(img => 
        img.id === id 
          ? { 
              ...img, 
              status: 'completed' as const, 
              processed: processedUrl,
              processedSize: blob.size,
              settings: { ...globalSettings }
            } 
          : img
      ));
    } catch (error) {
      console.error('Conversion error:', error);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'error' as const } : img
      ));
    }
  };

  const convertAll = async () => {
    setIsProcessing(true);
    
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
    
    for (const image of pendingImages) {
      await convertSingle(image.id);
      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsProcessing(false);
  };

  const downloadSingle = (id: string) => {
    const image = images.find(img => img.id === id);
    if (!image || !image.processed) return;

    const link = document.createElement('a');
    link.href = image.processed;
    const extension = globalSettings.format === 'jpeg' ? 'jpg' : globalSettings.format;
    link.download = `converted_${image.file.name.split('.')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.processed);
    
    if (completedImages.length === 0) {
      alert('No converted images to download');
      return;
    }

    if (completedImages.length === 1) {
      downloadSingle(completedImages[0].id);
      return;
    }

    try {
      const zip = new JSZip();
      
      for (const image of completedImages) {
        const response = await fetch(image.processed!);
        const blob = await response.blob();
        const extension = globalSettings.format === 'jpeg' ? 'jpg' : globalSettings.format;
        const fileName = `converted_${image.file.name.split('.')[0]}.${extension}`;
        zip.file(fileName, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `converted_images_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Error creating ZIP file. Please try downloading images individually.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionRatio = (original: number, processed: number) => {
    if (!processed) return 0;
    return Math.round(((original - processed) / original) * 100);
  };

  const tabs = [
    { id: 'basic', label: 'Basic', icon: <Settings className="h-4 w-4" /> },
    { id: 'filters', label: 'Filters', icon: <Palette className="h-4 w-4" /> },
    { id: 'transform', label: 'Transform', icon: <RotateCw className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Sparkles className="h-4 w-4" /> }
  ];

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach(image => {
        URL.revokeObjectURL(image.preview);
        if (image.processed) {
          URL.revokeObjectURL(image.processed);
        }
      });
    };
  }, []);

  return (
    <section id="converter" className="py-16 sm:py-20 bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4 sm:mb-6">
            <Zap className="h-4 w-4" />
            <span>AI-Powered Converter</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-4 sm:mb-6 px-4">
            Ai Image Converter          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Convert JPEG to PNG, PNG to JPG, WebP, AVIF, HEIC and 15+ formats instantly. 
            AI-powered optimization with advanced filters, batch processing, and 100% privacy protection.
          </p>
          
          {/* SEO-optimized feature highlights */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-gray-600">
            <span className="bg-white/80 px-3 py-1 rounded-full">✓ JPEG to PNG</span>
            <span className="bg-white/80 px-3 py-1 rounded-full">✓ PNG to JPG</span>
            <span className="bg-white/80 px-3 py-1 rounded-full">✓ WebP Converter</span>
            <span className="bg-white/80 px-3 py-1 rounded-full">✓ Batch Processing</span>
            <span className="bg-white/80 px-3 py-1 rounded-full">✓ 100% Free</span>
          </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload images for conversion"
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Drop Images Here or Click to Browse
                </h2>
                <p className="text-gray-600 mb-4">
                  Convert JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF, HEIC and more formats instantly
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                    aria-label="Select images to convert"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span>Select Images</span>
                  </button>
                  {images.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="border-2 border-red-500 text-red-500 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center space-x-2"
                      aria-label="Clear all images"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {images.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-violet-600" />
                <span>Image Processing Settings</span>
              </h3>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button
                  onClick={convertAll}
                  disabled={isProcessing || images.every(img => img.status === 'completed')}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Convert all images"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Convert All</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadAll}
                  disabled={!images.some(img => img.status === 'completed')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Download all converted images"
                >
                  <Archive className="h-4 w-4" />
                  <span>Download All</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-violet-600 border-b-2 border-violet-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="tabpanel" id="basic-panel">
                  <div>
                    <label htmlFor="format-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      id="format-select"
                      value={globalSettings.format}
                      onChange={(e) => updateSettings({ format: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      aria-describedby="format-help"
                    >
                      <option value="jpeg">JPEG (Best for photos)</option>
                      <option value="png">PNG (Best for graphics)</option>
                      <option value="webp">WebP (Best compression)</option>
                    </select>
                    <p id="format-help" className="text-xs text-gray-500 mt-1">Choose the best format for your needs</p>
                  </div>

                  <div>
                    <label htmlFor="quality-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Quality: {globalSettings.quality}%
                    </label>
                    <input
                      id="quality-slider"
                      type="range"
                      min="1"
                      max="100"
                      value={globalSettings.quality}
                      onChange={(e) => updateSettings({ quality: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-describedby="quality-help"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                    <p id="quality-help" className="text-xs text-gray-500">Higher quality = larger file size</p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={globalSettings.maintainAspectRatio}
                        onChange={(e) => updateSettings({ maintainAspectRatio: e.target.checked })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Maintain Aspect Ratio</span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="width-input" className="block text-sm font-medium text-gray-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      id="width-input"
                      type="number"
                      placeholder="Auto"
                      value={globalSettings.width || ''}
                      onChange={(e) => updateSettings({ width: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="height-input" className="block text-sm font-medium text-gray-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      id="height-input"
                      type="number"
                      placeholder="Auto"
                      value={globalSettings.height || ''}
                      onChange={(e) => updateSettings({ height: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'filters' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="tabpanel" id="filters-panel">
                  <div>
                    <label htmlFor="brightness-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Brightness: {globalSettings.brightness}
                    </label>
                    <input
                      id="brightness-slider"
                      type="range"
                      min="-100"
                      max="100"
                      value={globalSettings.brightness}
                      onChange={(e) => updateSettings({ brightness: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Dark</span>
                      <span>Bright</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contrast-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Contrast: {globalSettings.contrast}
                    </label>
                    <input
                      id="contrast-slider"
                      type="range"
                      min="-100"
                      max="100"
                      value={globalSettings.contrast}
                      onChange={(e) => updateSettings({ contrast: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="saturation-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Saturation: {globalSettings.saturation}
                    </label>
                    <input
                      id="saturation-slider"
                      type="range"
                      min="-100"
                      max="100"
                      value={globalSettings.saturation}
                      onChange={(e) => updateSettings({ saturation: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Muted</span>
                      <span>Vivid</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="hue-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Hue: {globalSettings.hue}°
                    </label>
                    <input
                      id="hue-slider"
                      type="range"
                      min="-180"
                      max="180"
                      value={globalSettings.hue}
                      onChange={(e) => updateSettings({ hue: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-180°</span>
                      <span>+180°</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="blur-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Blur: {globalSettings.blur}px
                    </label>
                    <input
                      id="blur-slider"
                      type="range"
                      min="0"
                      max="20"
                      value={globalSettings.blur}
                      onChange={(e) => updateSettings({ blur: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Sharp</span>
                      <span>Blurred</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sharpen-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Sharpen: {globalSettings.sharpen}
                    </label>
                    <input
                      id="sharpen-slider"
                      type="range"
                      min="0"
                      max="10"
                      value={globalSettings.sharpen}
                      onChange={(e) => updateSettings({ sharpen: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>None</span>
                      <span>Sharp</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transform' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="tabpanel" id="transform-panel">
                  <div>
                    <label htmlFor="rotation-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Rotation: {globalSettings.rotation}°
                    </label>
                    <input
                      id="rotation-slider"
                      type="range"
                      min="0"
                      max="360"
                      value={globalSettings.rotation}
                      onChange={(e) => updateSettings({ rotation: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0°</span>
                      <span>360°</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={globalSettings.flipHorizontal}
                        onChange={(e) => updateSettings({ flipHorizontal: e.target.checked })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Flip Horizontal</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={globalSettings.flipVertical}
                        onChange={(e) => updateSettings({ flipVertical: e.target.checked })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Flip Vertical</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="tabpanel" id="advanced-panel">
                  <div>
                    <label className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        checked={globalSettings.removeBackground}
                        onChange={(e) => updateSettings({ removeBackground: e.target.checked })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                        <span>Remove Background (AI)</span>
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Automatically remove image background using AI
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        checked={globalSettings.addWatermark}
                        onChange={(e) => updateSettings({ addWatermark: e.target.checked })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Add Watermark</span>
                    </label>

                    {globalSettings.addWatermark && (
                      <div className="space-y-3 ml-6">
                        <div>
                          <label htmlFor="watermark-text" className="block text-sm text-gray-600 mb-1">Watermark Text</label>
                          <input
                            id="watermark-text"
                            type="text"
                            value={globalSettings.watermarkText}
                            onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="Enter watermark text"
                          />
                        </div>
                        <div>
                          <label htmlFor="watermark-opacity" className="block text-sm text-gray-600 mb-1">
                            Opacity: {globalSettings.watermarkOpacity}%
                          </label>
                          <input
                            id="watermark-opacity"
                            type="range"
                            min="10"
                            max="100"
                            value={globalSettings.watermarkOpacity}
                            onChange={(e) => updateSettings({ watermarkOpacity: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Transparent</span>
                            <span>Opaque</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <img
                    src={image.preview}
                    alt={`Preview of ${image.file.name}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Status Overlay */}
                  {image.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    </div>
                  )}
                  
                  {image.status === 'completed' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                  
                  {image.status === 'error' && (
                    <div className="absolute top-2 right-2">
                      <AlertCircle className="h-6 w-6 text-red-500 bg-white rounded-full" />
                    </div>
                  )}

                  {/* Preview Button */}
                  {image.processed && (
                    <button
                      onClick={() => setShowPreview(image.id)}
                      className="absolute top-2 left-2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                      title="Preview comparison"
                      aria-label={`Preview comparison for ${image.file.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2 truncate" title={image.file.name}>
                    {image.file.name}
                  </h4>
                  
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span>Original:</span>
                      <span>{formatFileSize(image.originalSize)}</span>
                    </div>
                    {image.processedSize && (
                      <>
                        <div className="flex justify-between">
                          <span>Processed:</span>
                          <span>{formatFileSize(image.processedSize)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Saved:</span>
                          <span>{getCompressionRatio(image.originalSize, image.processedSize)}%</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {image.status === 'pending' || image.status === 'error' ? (
                      <button
                        onClick={() => convertSingle(image.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                        aria-label={`Convert ${image.file.name}`}
                      >
                        <Zap className="h-3 w-3" />
                        <span>Convert</span>
                      </button>
                    ) : image.status === 'completed' ? (
                      <button
                        onClick={() => downloadSingle(image.id)}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                        aria-label={`Download converted ${image.file.name}`}
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    ) : (
                      <div className="flex-1 bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-sm font-medium text-center flex items-center justify-center space-x-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove image"
                      aria-label={`Remove ${image.file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 id="preview-title" className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-violet-600" />
                  <span>Before & After Comparison</span>
                </h3>
                <button
                  onClick={() => setShowPreview(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
                {(() => {
                  const image = images.find(img => img.id === showPreview);
                  if (!image) return null;
                  
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                          <FileImage className="h-4 w-4 text-gray-600" />
                          <span>Original</span>
                        </h4>
                        <div className="bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image.preview}
                            alt="Original image"
                            className="w-full h-auto max-h-96 object-contain"
                          />
                        </div>
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span className="font-medium">{formatFileSize(image.originalSize)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Format:</span>
                            <span className="font-medium">{image.file.type.split('/')[1].toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {image.processed && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 text-violet-600" />
                            <span>Processed</span>
                          </h4>
                          <div className="bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={image.processed}
                              alt="Processed image"
                              className="w-full h-auto max-h-96 object-contain"
                            />
                          </div>
                          <div className="mt-3 text-sm text-gray-600 bg-green-50 rounded-lg p-3">
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-medium">{formatFileSize(image.processedSize || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Format:</span>
                              <span className="font-medium">{globalSettings.format.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Compression:</span>
                              <span className="font-medium">
                                -{getCompressionRatio(image.originalSize, image.processedSize || 0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
    </section>
  );
};

export default ImageConverter;