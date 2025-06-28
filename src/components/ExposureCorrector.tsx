import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Sun, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const ExposureCorrector: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    correctionMode: 'auto',
    exposure: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    quality: 'high',
    format: 'png'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const correctionModes = [
    { id: 'auto', name: 'Auto Correct', description: 'Automatically adjust exposure' },
    { id: 'manual', name: 'Manual Adjust', description: 'Fine-tune exposure manually' },
    { id: 'hdr', name: 'HDR Effect', description: 'High dynamic range enhancement' },
    { id: 'lowlight', name: 'Low Light', description: 'Optimize for dark images' },
    { id: 'overexposed', name: 'Overexposed', description: 'Fix bright, washed-out images' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    if (imageFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are images under 10MB.');
    }
    
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
    setError(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    if (imageFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are images under 10MB.');
    }
    
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

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one image to process.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
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
            img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
            img.src = file.url;
          });
          
          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Apply exposure correction
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Auto correction analysis
          let autoExposure = 0;
          let autoBrightness = 0;
          let autoContrast = 0;
          
          if (settings.correctionMode === 'auto') {
            // Analyze image for auto correction
            let totalBrightness = 0;
            let minBrightness = 255;
            let maxBrightness = 0;
            
            for (let i = 0; i < data.length; i += 4) {
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              totalBrightness += brightness;
              minBrightness = Math.min(minBrightness, brightness);
              maxBrightness = Math.max(maxBrightness, brightness);
            }
            
            const avgBrightness = totalBrightness / (data.length / 4);
            const contrast = maxBrightness - minBrightness;
            
            // Auto adjustments based on analysis
            if (avgBrightness < 100) {
              autoBrightness = Math.min(50, (100 - avgBrightness) / 2);
            } else if (avgBrightness > 155) {
              autoBrightness = Math.max(-50, (100 - avgBrightness) / 2);
            }
            
            if (contrast < 100) {
              autoContrast = Math.min(50, (100 - contrast) / 2);
            }
            
            if (avgBrightness < 80) {
              autoExposure = Math.min(30, (80 - avgBrightness) / 3);
            } else if (avgBrightness > 175) {
              autoExposure = Math.max(-30, (80 - avgBrightness) / 3);
            }
          }
          
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Apply brightness (manual + auto)
            const brightnessAdjustment = settings.brightness + autoBrightness;
            if (brightnessAdjustment !== 0) {
              const brightnessFactor = 1 + (brightnessAdjustment / 100);
              r = Math.max(0, Math.min(255, r * brightnessFactor));
              g = Math.max(0, Math.min(255, g * brightnessFactor));
              b = Math.max(0, Math.min(255, b * brightnessFactor));
            }
            
            // Apply contrast (manual + auto)
            const contrastAdjustment = settings.contrast + autoContrast;
            if (contrastAdjustment !== 0) {
              const contrastFactor = 1 + (contrastAdjustment / 100);
              const midPoint = 128;
              r = Math.max(0, Math.min(255, (r - midPoint) * contrastFactor + midPoint));
              g = Math.max(0, Math.min(255, (g - midPoint) * contrastFactor + midPoint));
              b = Math.max(0, Math.min(255, (b - midPoint) * contrastFactor + midPoint));
            }
            
            // Apply exposure adjustment (manual + auto)
            const exposureAdjustment = settings.exposure + autoExposure;
            if (exposureAdjustment !== 0) {
              const exposureFactor = Math.pow(2, exposureAdjustment / 100);
              r = Math.max(0, Math.min(255, r * exposureFactor));
              g = Math.max(0, Math.min(255, g * exposureFactor));
              b = Math.max(0, Math.min(255, b * exposureFactor));
            }
            
            // Apply highlights adjustment
            if (settings.highlights !== 0) {
              const highlightFactor = 1 + (settings.highlights / 100);
              if (r > 128) r = Math.max(128, Math.min(255, r * highlightFactor));
              if (g > 128) g = Math.max(128, Math.min(255, g * highlightFactor));
              if (b > 128) b = Math.max(128, Math.min(255, b * highlightFactor));
            }
            
            // Apply shadows adjustment
            if (settings.shadows !== 0) {
              const shadowFactor = 1 + (settings.shadows / 100);
              if (r < 128) r = Math.max(0, Math.min(128, r * shadowFactor));
              if (g < 128) g = Math.max(0, Math.min(128, g * shadowFactor));
              if (b < 128) b = Math.max(0, Math.min(128, b * shadowFactor));
            }
            
            // Apply HDR effect if selected
            if (settings.correctionMode === 'hdr') {
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              const hdrFactor = 1 + (luminance / 255) * 0.3;
              r = Math.max(0, Math.min(255, r * hdrFactor));
              g = Math.max(0, Math.min(255, g * hdrFactor));
              b = Math.max(0, Math.min(255, b * hdrFactor));
            }
            
            // Apply low light optimization
            if (settings.correctionMode === 'lowlight') {
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              if (luminance < 100) {
                const boostFactor = 1 + (100 - luminance) / 100;
                r = Math.max(0, Math.min(255, r * boostFactor));
                g = Math.max(0, Math.min(255, g * boostFactor));
                b = Math.max(0, Math.min(255, b * boostFactor));
              }
            }
            
            // Apply overexposed correction
            if (settings.correctionMode === 'overexposed') {
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              if (luminance > 200) {
                const reduceFactor = 0.7;
                r = Math.max(0, Math.min(255, r * reduceFactor));
                g = Math.max(0, Math.min(255, g * reduceFactor));
                b = Math.max(0, Math.min(255, b * reduceFactor));
              }
            }
            
            data[i] = Math.round(r);
            data[i + 1] = Math.round(g);
            data[i + 2] = Math.round(b);
          }
          
          // Put the corrected image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob with quality settings
          const quality = settings.quality === 'high' ? 0.9 : 
                         settings.quality === 'medium' ? 0.7 : 0.5;
          
          const mimeType = settings.format === 'png' ? 'image/png' : 
                          settings.format === 'jpg' ? 'image/jpeg' : 'image/webp';
          
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: mimeType }));
            }, mimeType, quality);
          });
          
          return {
            name: `exposure-corrected-${file.name}`,
            blob: blob
          };
        })
      );
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      setSuccess(`Exposure correction completed! ${processed.length} image(s) have been corrected.`);
    } catch (error) {
      console.error('Error processing images:', error);
      setIsProcessing(false);
      setError(error instanceof Error ? error.message : 'Error processing images. Please try again.');
    }
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }

    try {
      // Create downloadable exposure-corrected files
      if (processedFiles.length === 1) {
        // Single file download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(processedFiles[0].blob);
        link.download = processedFiles[0].name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        // Multiple files - download each
        processedFiles.forEach((file) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(file.blob);
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        });
      }
      
      setSuccess(`Downloaded ${processedFiles.length} corrected image(s)!`);
    } catch (error) {
      setError('Error downloading files. Please try again.');
    }
  };

  // Cleanup object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [files]);

  const resetAll = () => {
    // Clean up object URLs
    files.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
    
    // Reset all state
    setFiles([]);
    setProcessedFiles([]);
    setSettings({
      correctionMode: 'auto',
      exposure: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      quality: 'high',
      format: 'png'
    });
    setError(null);
    setSuccess(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const features = [
    {
      icon: <Sun className="h-6 w-6" />,
      title: "Exposure Correction",
      description: "Fix overexposed and underexposed images with precision"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Auto Detection",
      description: "Automatically detect and correct exposure issues in images"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Fine Control",
      description: "Manually adjust brightness, contrast, highlights, and shadows"
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
      title: "Adjust Exposure",
      description: "Choose auto correction or manually adjust exposure, brightness, and contrast"
    },
    {
      step: "3",
      title: "Correct Exposure",
      description: "Our system fixes exposure issues and enhances image quality perfectly"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "110K+", label: "Images Enhanced" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="Exposure Corrector | Fix Image Exposure Online"
        description="Correct underexposed or overexposed photos easily with our free online exposure corrector. Improve brightness and contrast instantly no software needed."
        canonical="exposure-corrector"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sun className="h-4 w-4" />
                <span>Exposure Corrector</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Fix Image Exposure Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Correct overexposed and underexposed images with professional precision. 
                Perfect for photography, real estate, and any image that needs exposure adjustment.
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

              {/* Error and Success Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-red-600">⚠️</div>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-green-600">✅</div>
                    <p className="text-green-700">{success}</p>
                  </div>
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

              {/* Exposure Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Exposure Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correction Mode</label>
                    <select
                      value={settings.correctionMode}
                      onChange={(e) => setSettings(prev => ({ ...prev, correctionMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {correctionModes.map(mode => (
                        <option key={mode.id} value={mode.id}>
                          {mode.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brightness: {settings.brightness}</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={settings.brightness}
                      onChange={(e) => setSettings(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contrast: {settings.contrast}</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={settings.contrast}
                      onChange={(e) => setSettings(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Highlights: {settings.highlights}</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={settings.highlights}
                      onChange={(e) => setSettings(prev => ({ ...prev, highlights: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shadows: {settings.shadows}</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={settings.shadows}
                    onChange={(e) => setSettings(prev => ({ ...prev, shadows: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Quality and Format Settings */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High Quality</option>
                      <option value="medium">Medium Quality</option>
                      <option value="low">Low Quality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPEG</option>
                      <option value="webp">WebP</option>
                    </select>
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
                      <span>Correcting Exposure...</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-5 w-5" />
                      <span>Correct Exposure</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetAll}
                  disabled={isProcessing}
                  className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
              </div>
              
              {/* Download Area */}
              {processedFiles.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">
                        Processing Complete!
                      </h3>
                    </div>
                    <p className="text-green-700 mb-4">
                      {processedFiles.length} image(s) have been corrected. Click below to download.
                    </p>
                    <button
                      onClick={downloadAll}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      Download Corrected Images
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Exposure Corrector?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional exposure correction with advanced detection and manual control
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
                  How to Correct Exposure
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to fix exposure issues in your images
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
                    Ready to Fix Exposure?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform poorly exposed images into perfectly balanced photos. Join thousands of users 
                    who trust our exposure corrector for their photography and imaging needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Sun className="h-5 w-5" />
                    <span>Start Correcting Now</span>
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

export default ExposureCorrector; 