import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Download, Settings, Trash2, Eye, 
  Zap, Sparkles, Image as ImageIcon, FileImage,
  RotateCw, Palette, Archive, CheckCircle,
  AlertCircle, RefreshCw, X, Play, Monitor, FileText, Users, Shield, ArrowRight
} from 'lucide-react';
import JSZip from 'jszip';
import SEO from './SEO';
import ProcessingSettingsPanel from './ProcessingSettingsPanel';

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

interface ImageConverterProps {
  onNavigate?: (page: string) => void;
}

const ImageConverter: React.FC<ImageConverterProps> = ({ onNavigate }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>({
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
  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'transform' | 'advanced'>('basic');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getFileExtension = (format: string): string => {
    switch (format) {
      case 'jpeg': return 'jpg';
      case 'png': return 'png';
      case 'webp': return 'webp';
      case 'avif': return 'avif';
      case 'tiff': return 'tiff';
      case 'bmp': return 'bmp';
      case 'gif': return 'gif';
      case 'ico': return 'ico';
      case 'svg': return 'svg';
      case 'heic': return 'heic';
      case 'tga': return 'tga';
      case 'pdf': return 'pdf';
      case 'eps': return 'eps';
      default: return 'jpg';
    }
  };

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
      // Prevent revoking blob URL if this image is being previewed
      if (showPreview !== id) {
        const image = prev.find(img => img.id === id);
        if (image) {
          URL.revokeObjectURL(image.preview);
          if (image.processed) {
            URL.revokeObjectURL(image.processed);
          }
        }
      }
      return prev.filter(img => img.id !== id);
    });
    // If the removed image was being previewed, close the modal
    if (showPreview === id) {
      setShowPreview(null);
    }
  };

  const clearAll = () => {
    // Only revoke blob URLs for images not being previewed
    images.forEach(image => {
      if (showPreview !== image.id) {
        URL.revokeObjectURL(image.preview);
        if (image.processed) {
          URL.revokeObjectURL(image.processed);
        }
      }
    });
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowPreview(null);
    setIsProcessing(false);
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
          const getMimeType = (format: string): string => {
            switch (format) {
              case 'jpeg': return 'image/jpeg';
              case 'png': return 'image/png';
              case 'webp': return 'image/webp';
              case 'avif': return 'image/avif';
              case 'tiff': return 'image/tiff';
              case 'bmp': return 'image/bmp';
              case 'gif': return 'image/gif';
              case 'ico': return 'image/x-icon';
              case 'svg': return 'image/svg+xml';
              case 'heic': return 'image/heic';
              case 'tga': return 'image/tga';
              case 'pdf': return 'application/pdf';
              case 'eps': return 'application/postscript';
              default: return 'image/jpeg';
            }
          };

          const mimeType = getMimeType(settings.format);
          const useQuality = ['jpeg', 'webp', 'avif', 'tiff'].includes(settings.format);
          const quality = useQuality ? settings.quality / 100 : undefined;
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            mimeType,
            quality
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
      const blob = await processImage(imageFile, settings);
      const processedUrl = URL.createObjectURL(blob);

      setImages(prev => prev.map(img => 
        img.id === id 
          ? { 
              ...img, 
              status: 'completed' as const, 
              processed: processedUrl,
              processedSize: blob.size,
              settings: { ...settings }
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
    
    for (const image of images) {
      if (image.status === 'completed') continue;

      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, status: 'processing' } : img
      ));

      try {
        const processedBlob = await processImage(image, settings);
        const processedUrl = URL.createObjectURL(processedBlob);
        
        setImages(prev => prev.map(img => 
          img.id === image.id 
          ? { 
              ...img, 
              processed: processedUrl,
              processedSize: processedBlob.size,
              status: 'completed' 
            } 
          : img
        ));
      } catch (error) {
        console.error(`Error processing image ${image.file.name}:`, error);
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'error' } : img
        ));
      }
    }
    
    setIsProcessing(false);
  };

  const downloadSingle = (id: string) => {
    const image = images.find(img => img.id === id);
    if (!image || !image.processed) return;

    const link = document.createElement('a');
    link.href = image.processed;
    const extension = getFileExtension(settings.format);
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
        const extension = getFileExtension(settings.format);
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

  return (
    <>
      <SEO
        title="Online Image Converter | Convert Photos in Seconds"
        description=""
        keywords="image converter, convert images, JPG to PNG, PNG to JPG, image format converter, batch conversion, online converter, free tool"
        canonical="home"
        ogImage="/images/image-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section id="converter" className="py-8 sm:py-12 lg:py-16 xl:py-20 bg-gradient-to-br from-white via-blue-50 to-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile-Optimized Header */}
            <div className="text-center mb-8 sm:mb-12 mt-4 sm:mt-8">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-semibold shadow mb-4 sm:mb-6">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Image Converter Online</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-violet-800 mb-3 sm:mb-4 leading-tight">
                Image Converter
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-4">
                Drag, drop, and convert images instantly! Get high-quality results for JPG, PNG, GIF, or WebP files using our free image conversion tool.
              </p>
              
              {/* Mobile-Optimized Feature Tags */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4">
                {[
                  'JPEG to PNG',
                  'PNG to JPG',
                  'WebP Converter',
                  'Batch Processing',
                  '100% Free'
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border border-gray-200 bg-white shadow text-gray-700 font-semibold text-xs sm:text-sm"
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:h-5 sm:w-5 text-violet-500 flex-shrink-0" />
                    <span className="whitespace-nowrap">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile-Optimized Upload Area */}
            <div className="mb-6 sm:mb-8">
              <div
                className={`relative border-2 border-dashed rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-300 ${dragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-4 sm:space-y-6">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                      Drop images here or tap to browse
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">
                      Support for JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF, HEIC and more
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base font-medium transition-colors"
                      >
                        Choose Files
                      </button>
                      {images.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="border-2 border-red-500 text-red-500 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
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

            {/* Mobile-Optimized Settings Panel */}
            {images.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <ProcessingSettingsPanel
                  settings={settings}
                  setSettings={setSettings}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onConvertAll={convertAll}
                  onDownloadAll={downloadAll}
                  disableConvertAll={images.length === 0 || isProcessing}
                  disableDownloadAll={images.filter(img => img.status === 'completed').length === 0}
                />
              </div>
            )}

            {/* Desktop-Optimized Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 xl:gap-8 2xl:gap-10 overflow-x-auto">
                {images.map((image) => (
                  <div key={image.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300 min-w-0">
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Overlay */}
                      {image.status === 'processing' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-white text-center">
                            <span className="text-sm">Processing...</span>
                          </div>
                        </div>
                      )}
                      
                      {image.status === 'completed' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                      
                      {image.status === 'error' && (
                        <div className="absolute top-2 right-2">
                          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 bg-white rounded-full" />
                        </div>
                      )}

                      {/* Preview Button */}
                      {image.processed && (
                        <button
                          onClick={() => setShowPreview(image.id)}
                          className="absolute top-2 left-2 p-1.5 sm:p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors touch-manipulation"
                          title="Preview comparison"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 xl:p-6 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-2 truncate break-words text-sm sm:text-base xl:text-lg" title={image.file.name}>
                        {image.file.name}
                      </h4>
                      
                      <div className="text-xs sm:text-sm xl:text-base text-gray-600 space-y-1 mb-3">
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

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 xl:space-x-4">
                        {image.status === 'pending' || image.status === 'error' ? (
                          <button
                            onClick={() => convertSingle(image.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-violet-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1 touch-manipulation"
                          >
                            <Zap className="h-3 w-3" />
                            <span>Convert</span>
                          </button>
                        ) : image.status === 'completed' ? (
                          <button
                            onClick={() => downloadSingle(image.id)}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-1 touch-manipulation"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <div className="flex-1 bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-center flex items-center justify-center space-x-1">
                            <span>Processing...</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => removeImage(image.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop-Optimized Preview Modal */}
            {showPreview && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4 xl:p-8">
                <div className="bg-white rounded-xl sm:rounded-2xl max-w-full w-full max-h-full overflow-auto xl:max-w-3xl xl:mx-auto xl:my-12 xl:shadow-2xl xl:border xl:border-gray-200">
                  <div className="flex items-center justify-between p-3 sm:p-4 xl:p-6 border-b border-gray-200">
                    <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <Monitor className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6 text-violet-600" />
                      <span>Before & After Comparison</span>
                    </h3>
                    <button
                      onClick={() => setShowPreview(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
                    </button>
                  </div>
                  
                  <div className="p-3 sm:p-4 xl:p-8 max-h-[calc(90vh-80px)] overflow-auto">
                    {(() => {
                      const image = images.find(img => img.id === showPreview);
                      if (!image) return null;
                      
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2 text-sm sm:text-base">
                              <FileImage className="h-4 w-4 text-gray-600" />
                              <span>Original</span>
                            </h4>
                            <div className="bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={image.preview}
                                alt="Original"
                                className="w-full h-auto max-h-64 sm:max-h-96 object-contain max-w-full"
                              />
                            </div>
                            <div className="mt-3 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
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
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2 text-sm sm:text-base">
                                <Sparkles className="h-4 w-4 text-violet-600" />
                                <span>Processed</span>
                              </h4>
                              <div className="bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={image.processed}
                                  alt="Processed"
                                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain max-w-full"
                                />
                              </div>
                              <div className="mt-3 text-xs sm:text-sm text-gray-600 bg-green-50 rounded-lg p-3">
                                <div className="flex justify-between">
                                  <span>Size:</span>
                                  <span className="font-medium">{formatFileSize(image.processedSize || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Format:</span>
                                  <span className="font-medium">{settings.format.toUpperCase()}</span>
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
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </section>
      </div>
    </>
  );
};

export default ImageConverter;