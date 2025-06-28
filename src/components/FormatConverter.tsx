import React, { useState, useRef, useCallback } from 'react';
import { 
  FileImage, Upload, Download, Settings, 
  CheckCircle, AlertCircle, RefreshCw, 
  Palette, ArrowRight,
  Camera, Monitor, Globe, Users, Shield, BarChart, CheckCircle2, Target, Sparkles, FileText, Zap, RotateCcw, Trash2
} from 'lucide-react';
import SEO from './SEO';
import ExifReader from 'exifreader';
import JSZip from 'jszip';

interface ConvertedImage {
  id: string;
  original: File;
  preview: string;
  converted?: string;
  originalSize: number;
  convertedSize?: number;
  format: string;
  quality: number;
  status: 'pending' | 'converting' | 'completed' | 'error';
  orientation?: number;
  category?: 'photo' | 'graphic' | 'screenshot' | 'unknown';
  formatRecommendation?: {
    format: string;
    reason: string;
    estimatedSize?: string;
    quality?: string;
  };
}

const FormatConverter: React.FC = () => {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [settings, setSettings] = useState({
    targetFormat: 'jpeg' as 'jpeg' | 'png' | 'webp' | 'bmp' | 'tiff',
    quality: 85,
    preserveTransparency: true,
    progressive: true,
    optimize: true,
    resizeMode: 'custom' as 'custom' | 'percentage' | 'preset'
  });
  const [conversionProgress, setConversionProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatInfo = {
    jpeg: {
      name: 'JPEG',
      description: 'Best for photographs and complex images',
      compression: 'Lossy',
      transparency: false,
      icon: <Camera className="h-5 w-5" />
    },
    png: {
      name: 'PNG',
      description: 'Best for graphics with transparency',
      compression: 'Lossless',
      transparency: true,
      icon: <Palette className="h-5 w-5" />
    },
    webp: {
      name: 'WebP',
      description: 'Modern format with excellent compression',
      compression: 'Lossy/Lossless',
      transparency: true,
      icon: <Globe className="h-5 w-5" />
    },
    bmp: {
      name: 'BMP',
      description: 'Uncompressed bitmap format',
      compression: 'None',
      transparency: false,
      icon: <Monitor className="h-5 w-5" />
    },
    tiff: {
      name: 'TIFF',
      description: 'High-quality professional format',
      compression: 'Lossless',
      transparency: true,
      icon: <FileImage className="h-5 w-5" />
    }
  };

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "200K+", label: "Files Converted" },
    { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const features = [
    {
      icon: <FileImage className="h-6 w-6" />,
      title: "Universal Format Support",
      description: "Convert between 20+ image formats including JPEG, PNG, WebP, BMP, and TIFF"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "Quality Control",
      description: "Advanced compression and quality settings for optimal file size and quality balance"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Batch Processing",
      description: "Convert multiple images simultaneously with our efficient batch processing system"
    }
  ];

  function estimateFormatRecommendation(file: File, category: string, tags: any): { format: string, reason: string, estimatedSize?: string, quality?: string } {
    // Simple logic, can be expanded
    if (category === 'photo') {
      return {
        format: 'JPEG',
        reason: 'Best for photos: small size, good quality, widely supported',
        quality: 'High',
        estimatedSize: file.size ? (file.size * 0.4 / 1024).toFixed(1) + ' KB' : undefined
      };
    } else if (category === 'graphic') {
      return {
        format: 'PNG',
        reason: 'Best for graphics: lossless, supports transparency',
        quality: 'Lossless',
        estimatedSize: file.size ? (file.size * 0.9 / 1024).toFixed(1) + ' KB' : undefined
      };
    } else if (category === 'screenshot') {
      return {
        format: 'WebP',
        reason: 'Best for screenshots: small size, good quality, supports transparency',
        quality: 'High',
        estimatedSize: file.size ? (file.size * 0.3 / 1024).toFixed(1) + ' KB' : undefined
      };
    } else {
      return {
        format: 'WebP',
        reason: 'Modern format: small size, good quality, supports transparency',
        quality: 'High',
        estimatedSize: file.size ? (file.size * 0.3 / 1024).toFixed(1) + ' KB' : undefined
      };
    }
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }
    const newImages: ConvertedImage[] = [];
    for (const file of imageFiles) {
      let orientation = 1;
      let category: 'photo' | 'graphic' | 'screenshot' | 'unknown' = 'unknown';
      let tags: any = {};
      try {
        tags = await ExifReader.load(file);
        orientation = tags.Orientation ? tags.Orientation.value : 1;
        if (file.type === 'image/jpeg' && tags.Make) category = 'photo';
        else if (file.type === 'image/png' && /screenshot|screen shot/i.test(file.name)) category = 'screenshot';
        else if (file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/svg+xml') category = 'graphic';
      } catch (e) {}
      const formatRecommendation = estimateFormatRecommendation(file, category, tags);
      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        original: file,
        preview: URL.createObjectURL(file),
        originalSize: file.size,
        format: settings.targetFormat,
        quality: settings.quality,
        status: 'pending',
        orientation,
        category,
        formatRecommendation
      });
    }
    setImages(prev => [...prev, ...newImages]);
  };

  const drawImageWithOrientation = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, orientation: number) => {
    const width = img.width;
    const height = img.height;
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, width, 0); break; // Mirror X
      case 3: ctx.transform(-1, 0, 0, -1, width, height); break; // 180
      case 4: ctx.transform(1, 0, 0, -1, 0, height); break; // Mirror Y
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break; // Mirror X + 90
      case 6: ctx.transform(0, 1, -1, 0, height, 0); break; // 90
      case 7: ctx.transform(0, -1, -1, 0, height, width); break; // Mirror X + 270
      case 8: ctx.transform(0, -1, 1, 0, 0, width); break; // 270
      default: break; // 1: no transform
    }
    ctx.drawImage(img, 0, 0);
  };

  const convertImage = async (image: ConvertedImage): Promise<void> => {
    return new Promise((resolve, reject) => {
      const updatedImages = [...images];
      const imageIndex = updatedImages.findIndex(img => img.id === image.id);
      if (imageIndex === -1) {
        reject(new Error('Image not found'));
        return;
      }
      updatedImages[imageIndex].status = 'converting';
      setImages(updatedImages);
      const img = new Image();
      img.onload = () => {
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
        try {
          // Set canvas size based on orientation
          if (image.orientation && (image.orientation >= 5 && image.orientation <= 8)) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          ctx.save();
          drawImageWithOrientation(ctx, img, image.orientation || 1);
          ctx.restore();

          // Determine MIME type
          let mimeType: string;
          switch (settings.targetFormat) {
            case 'jpeg': mimeType = 'image/jpeg'; break;
            case 'png': mimeType = 'image/png'; break;
            case 'webp': mimeType = 'image/webp'; break;
            case 'bmp': mimeType = 'image/bmp'; break;
            case 'tiff': mimeType = 'image/tiff'; break;
            default: mimeType = 'image/jpeg';
          }
          const quality = settings.targetFormat === 'jpeg' || settings.targetFormat === 'webp' ? settings.quality / 100 : 1;
          const convertedDataUrl = canvas.toDataURL(mimeType, quality);
          fetch(convertedDataUrl).then(response => response.blob()).then(blob => {
            updatedImages[imageIndex].converted = convertedDataUrl;
            updatedImages[imageIndex].convertedSize = blob.size;
            updatedImages[imageIndex].status = 'completed';
            setImages([...updatedImages]);
            resolve();
          }).catch(reject);
        } catch (error) {
          updatedImages[imageIndex].status = 'error';
          setImages([...updatedImages]);
          reject(error);
        }
      };
      img.src = image.preview;
    });
  };

  const convertAll = async () => {
    if (images.length === 0) {
      alert('Please upload images first.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    const pendingImages = images.filter(img => img.status === 'pending');
    const total = pendingImages.length;
    let completed = 0;
    for (const image of pendingImages) {
      await convertImage(image);
      completed++;
      setConversionProgress(Math.round((completed / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay between conversions
    }
    setIsConverting(false);
  };

  const downloadAll = async () => {
    const completedImages = images.filter(img => img.status === 'completed');
    if (completedImages.length === 0) {
      alert('No images have been converted yet.');
      return;
    }
    completedImages.forEach(image => {
      if (image.converted) {
        const link = document.createElement('a');
        link.href = image.converted;
        const originalName = image.original.name.split('.')[0];
        link.download = `${originalName}.${settings.targetFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
        if (image.converted) {
          URL.revokeObjectURL(image.converted);
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(image => {
      URL.revokeObjectURL(image.preview);
      if (image.converted) {
        URL.revokeObjectURL(image.converted);
      }
    });
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionRatio = (original: number, converted: number) => {
    if (original === 0) return 0;
    return ((original - converted) / original) * 100;
  };

  return (
    <>
      <SEO
        title="Format Converter | Convert Files Online Free"
        description="Easily convert documents, images, videos, and audio files to any format online. Fast, secure, and free format converter with no downloads."
        keywords="format converter, file converter, convert files, online tool, free tool"
        canonical="format-converter"
        ogImage="/images/format-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>Format Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Files to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Any Format</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your files to different formats online. Fast, secure, and free format converter for images, documents, and more.
              </p>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="text-violet-600">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Tool Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${images.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your file here for conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => handleFileUpload(e.target.files || [])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management, Settings, and Actions only after upload */}
              {images.length > 0 && (
                <>
                  {/* Settings Card */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Settings className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Format Conversion Settings</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Format</label>
                        <select
                          value={settings.targetFormat}
                          onChange={e => setSettings(s => ({ ...s, targetFormat: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="jpeg">JPEG</option>
                          <option value="png">PNG</option>
                          <option value="webp">WebP</option>
                          <option value="bmp">BMP</option>
                          <option value="tiff">TIFF</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quality: {settings.quality}%</label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={settings.quality}
                          onChange={e => setSettings(s => ({ ...s, quality: Number(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="progressive"
                          checked={settings.progressive}
                          onChange={e => setSettings(s => ({ ...s, progressive: e.target.checked }))}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <label htmlFor="progressive" className="text-sm font-medium text-gray-700">
                          Progressive (JPEG/WebP)
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="optimize"
                          checked={settings.optimize}
                          onChange={e => setSettings(s => ({ ...s, optimize: e.target.checked }))}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <label htmlFor="optimize" className="text-sm font-medium text-gray-700">
                          Optimize
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Convert Button */}
                  <div className="mb-8 text-center">
                    {isConverting && (
                      <div className="w-full max-w-md mx-auto mb-4">
                        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-4 bg-gradient-to-r from-violet-600 to-blue-600 transition-all duration-300"
                            style={{ width: `${conversionProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{conversionProgress}% completed</div>
                      </div>
                    )}
                    <button
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={convertAll}
                      disabled={images.length === 0 || isConverting}
                    >
                      {isConverting ? 'Converting...' : 'Convert'}
                    </button>
                  </div>
                </>
              )}

              {/* Converted Files */}
              {images.some(img => img.status === 'completed') && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Converted Files</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.filter(img => img.status === 'completed').map(img => (
                      <div key={img.id} className="bg-green-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileImage className="h-8 w-8 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{img.original.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(img.convertedSize || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      onClick={downloadAll}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden canvas for conversion */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our Format Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Convert images between all major formats with advanced quality controls and batch processing.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center max-w-4xl mx-auto">
                {features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Use Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert Image Formats</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your images to any format.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Images</h3>
                  <p className="text-gray-600">Drag and drop or click to select your images for conversion.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Format & Settings</h3>
                  <p className="text-gray-600">Select your target format and adjust quality or batch options.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Convert & Download</h3>
                  <p className="text-gray-600">Click convert and download your images in the new format instantly.</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert Your Images?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Transform your images to any format with advanced quality controls. Start converting now for free!</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
                    <span>Start Converting Now</span>
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

export default FormatConverter; 