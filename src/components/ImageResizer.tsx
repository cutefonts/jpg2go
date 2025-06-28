import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Download, 
  Settings, 
  FileImage, 
  Target, 
  Zap, 
  Maximize2, 
  Users,
  Shield,
  CheckCircle,
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

const ImageResizer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizeMode, setResizeMode] = useState<'percentage' | 'pixels' | 'preset'>('percentage');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [percentage, setPercentage] = useState(50);
  const [preset, setPreset] = useState('hd');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState<{width: number, height: number} | null>(null);
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkFontSize, setWatermarkFontSize] = useState(24);
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [applyGrayscale, setApplyGrayscale] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [blur, setBlur] = useState(0);
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const [applySepia, setApplySepia] = useState(false);
  const [applyInvert, setApplyInvert] = useState(false);
  const [saturation, setSaturation] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = useMemo(() => ({
    hd: { width: 1920, height: 1080, name: 'HD (1920x1080)' },
    fullhd: { width: 1920, height: 1080, name: 'Full HD (1920x1080)' },
    qhd: { width: 2560, height: 1440, name: 'QHD (2560x1440)' },
    mobile: { width: 375, height: 667, name: 'Mobile (375x667)' },
    tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
    instagram: { width: 1080, height: 1080, name: 'Instagram Square (1080x1080)' },
    facebook: { width: 1200, height: 630, name: 'Facebook (1200x630)' },
    twitter: { width: 1200, height: 675, name: 'Twitter (1200x675)' }
  }), []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imageFiles]);
    setPreviews(prev => [
      ...prev,
      ...imageFiles.map(file => URL.createObjectURL(file))
    ]);
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...imageFiles]);
    setPreviews(prev => [
      ...prev,
      ...imageFiles.map(file => URL.createObjectURL(file))
    ]);
  };

  const processImages = useCallback(async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        let newWidth, newHeight;
        if (resizeMode === 'percentage') {
          newWidth = Math.round(img.width * (percentage / 100));
          newHeight = Math.round(img.height * (percentage / 100));
        } else if (resizeMode === 'pixels') {
          if (maintainAspectRatio) {
            const ratio = Math.min(width / img.width, height / img.height);
            newWidth = Math.round(img.width * ratio);
            newHeight = Math.round(img.height * ratio);
          } else {
            newWidth = width;
            newHeight = height;
          }
        } else {
          const presetData = presets[preset as keyof typeof presets];
          if (maintainAspectRatio) {
            const ratio = Math.min(presetData.width / img.width, presetData.height / img.height);
            newWidth = Math.round(img.width * ratio);
            newHeight = Math.round(img.height * ratio);
          } else {
            newWidth = presetData.width;
            newHeight = presetData.height;
          }
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // --- FILTERS ---
        if (
          applyGrayscale || brightness !== 100 || contrast !== 100 || blur > 0 ||
          applySepia || applyInvert || saturation !== 100
        ) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          // Grayscale
          if (applyGrayscale) {
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = data[i + 1] = data[i + 2] = avg;
            }
          }
          // Sepia
          if (applySepia) {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
              data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
              data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
            }
          }
          // Invert
          if (applyInvert) {
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255 - data[i];
              data[i + 1] = 255 - data[i + 1];
              data[i + 2] = 255 - data[i + 2];
            }
          }
          // Brightness
          if (brightness !== 100) {
            const b = brightness / 100;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, data[i] * b);
              data[i + 1] = Math.min(255, data[i + 1] * b);
              data[i + 2] = Math.min(255, data[i + 2] * b);
            }
          }
          // Contrast
          if (contrast !== 100) {
            const c = contrast / 100;
            const intercept = 128 * (1 - c);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, data[i] * c + intercept);
              data[i + 1] = Math.min(255, data[i + 1] * c + intercept);
              data[i + 2] = Math.min(255, data[i + 2] * c + intercept);
            }
          }
          // Saturation
          if (saturation !== 100) {
            const s = saturation / 100;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              const avg = 0.299 * r + 0.587 * g + 0.114 * b;
              data[i] = Math.min(255, avg + s * (r - avg));
              data[i + 1] = Math.min(255, avg + s * (g - avg));
              data[i + 2] = Math.min(255, avg + s * (b - avg));
            }
          }
          ctx.putImageData(imageData, 0, 0);
          // Blur (simple box blur)
          if (blur > 0) {
            ctx.filter = `blur(${blur}px)`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';
          }
        }

        // --- WATERMARK ---
        if (watermarkText) {
          ctx.save();
          ctx.font = `${watermarkFontSize}px sans-serif`;
          ctx.fillStyle = watermarkColor;
          ctx.textBaseline = 'bottom';
          ctx.textAlign = 'right';
          ctx.globalAlpha = 0.7;
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 2;
          // Calculate position
          let x = canvas.width - 16;
          let y = canvas.height - 16;
          if (watermarkPosition === 'bottom-left') {
            x = 16;
            y = canvas.height - 16;
            ctx.textAlign = 'left';
          } else if (watermarkPosition === 'top-right') {
            x = canvas.width - 16;
            y = watermarkFontSize + 16;
          } else if (watermarkPosition === 'top-left') {
            x = 16;
            y = watermarkFontSize + 16;
            ctx.textAlign = 'left';
          } else if (watermarkPosition === 'center') {
            x = canvas.width / 2;
            y = canvas.height / 2 + watermarkFontSize / 2;
            ctx.textAlign = 'center';
          }
          ctx.fillText(watermarkText, x, y);
          ctx.restore();
        }

        // --- FORMAT ---
        let mimeType = 'image/jpeg';
        let ext = 'jpg';
        let quality = 0.9;
        if (outputFormat === 'png') {
          mimeType = 'image/png';
          ext = 'png';
          quality = 1.0;
        } else if (outputFormat === 'webp') {
          mimeType = 'image/webp';
          ext = 'webp';
          quality = 0.9;
        }
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, mimeType, quality);
        });
        processed.push({ name: `resized_${file.name.replace(/\.[^.]+$/, '')}.${ext}`, blob });
      }
      setProcessedFiles(processed);
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [files, resizeMode, percentage, width, height, preset, maintainAspectRatio, presets, outputFormat, watermarkText, watermarkFontSize, watermarkColor, applyGrayscale, brightness, contrast, blur, watermarkPosition, applySepia, applyInvert, saturation]);

  const handleDownload = () => {
    if (processedFiles.length > 0) {
      const zip = new JSZip();
      processedFiles.forEach(({ name, blob }) => {
        zip.file(name, blob);
      });
      zip.generateAsync({ type: 'blob' }).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resized_images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  };

  const features = [
    {
      icon: <Maximize2 className="h-6 w-6" />,
      title: "Smart Resizing",
      description: "Intelligent resizing with aspect ratio preservation and quality optimization"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Multiple Modes",
      description: "Percentage, pixel-based, and preset sizing options for all needs"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Quality Preserved",
      description: "High-quality image processing with advanced smoothing algorithms"
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
      title: "Upload Image",
      description: "Drag and drop your image or click to browse and select from your computer"
    },
    {
      step: "2", 
      title: "Choose Settings",
      description: "Select resize mode, dimensions, and quality preferences"
    },
    {
      step: "3",
      title: "Resize & Download",
      description: "Process your image and download the resized version instantly"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "50M+", label: "Images Resized" },
    { icon: <Zap className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <>
      <SEO
        title="Image Resizer | Resize Images Online for Free"
        description="Quickly resize images online without losing quality. Free, easy-to-use image resizer for JPG, PNG, and more. No sign-up required."
        canonical="image-resizer"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Maximize2 className="h-4 w-4" />
                <span>Smart Resize</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Image Resizer Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Intelligent image resizing with multiple modes, aspect ratio preservation, and quality optimization. 
                Perfect for social media, web design, and professional projects.
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
              {/* File Upload */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your images here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Images</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    id="file-upload"
                  />
                </div>
              </div>

              {/* Settings */}
              {files.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Resize & Edit Settings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resize Mode
                      </label>
                      <select
                        value={resizeMode}
                        onChange={(e) => setResizeMode(e.target.value as 'percentage' | 'pixels' | 'preset')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="pixels">Pixels</option>
                        <option value="preset">Preset</option>
                      </select>
                    </div>
                    
                    {resizeMode === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Percentage ({percentage}%)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="200"
                          value={percentage}
                          onChange={(e) => setPercentage(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    )}
                    
                    {resizeMode === 'pixels' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Width (px)
                          </label>
                          <input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Height (px)
                          </label>
                          <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                    
                    {resizeMode === 'preset' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preset Size
                        </label>
                        <select
                          value={preset}
                          onChange={(e) => setPreset(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          {Object.entries(presets).map(([key, preset]) => (
                            <option key={key} value={key}>
                              {preset.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                      <select
                        value={outputFormat}
                        onChange={e => setOutputFormat(e.target.value as 'jpg' | 'png' | 'webp')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Text</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={e => setWatermarkText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="Enter watermark text (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Font Size</label>
                      <input
                        type="number"
                        min={8}
                        max={128}
                        value={watermarkFontSize}
                        onChange={e => setWatermarkFontSize(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Color</label>
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={e => setWatermarkColor(e.target.value)}
                        className="w-12 h-10 border-2 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="grayscale"
                        checked={applyGrayscale}
                        onChange={e => setApplyGrayscale(e.target.checked)}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label htmlFor="grayscale" className="text-sm font-medium text-gray-700">Grayscale</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brightness</label>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        value={brightness}
                        onChange={e => setBrightness(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500">{brightness}%</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contrast</label>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        value={contrast}
                        onChange={e => setContrast(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500">{contrast}%</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Blur</label>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={blur}
                        onChange={e => setBlur(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500">{blur}px</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Position</label>
                      <select
                        value={watermarkPosition}
                        onChange={e => setWatermarkPosition(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                        <option value="center">Center</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sepia"
                        checked={applySepia}
                        onChange={e => setApplySepia(e.target.checked)}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label htmlFor="sepia" className="text-sm font-medium text-gray-700">Sepia</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="invert"
                        checked={applyInvert}
                        onChange={e => setApplyInvert(e.target.checked)}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <label htmlFor="invert" className="text-sm font-medium text-gray-700">Invert</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Saturation</label>
                      <input
                        type="range"
                        min={0}
                        max={300}
                        value={saturation}
                        onChange={e => setSaturation(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500">{saturation}%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="maintainAspectRatio"
                      checked={maintainAspectRatio}
                      onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainAspectRatio" className="text-sm font-medium text-gray-700">
                      Maintain Aspect Ratio
                    </label>
                  </div>
                </div>
              )}

              {/* Preview */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileImage className="h-5 w-5 text-violet-600" />
                    <span>Preview</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-x-auto">
                    {files.map((file, idx) => {
                      const isProcessed = processedFiles[idx];
                      const imgSrc = isProcessed ? URL.createObjectURL(processedFiles[idx].blob) : previews[idx];
                      const name = isProcessed ? processedFiles[idx].name : file.name;
                      return (
                        <div key={file.name} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300 min-w-0 flex flex-col items-center">
                          <div className="aspect-square relative overflow-hidden bg-gray-100 w-full">
                            <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col items-center p-3">
                            <span className="text-xs text-gray-700 mb-1 text-center break-all">{name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processImages}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-5 w-5" />
                      <span>Resize Images</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Resized Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Image Resizer?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Advanced image resizing with multiple modes and quality preservation
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
                  How to Resize Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to resize your images with perfect quality
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
                    Ready to Resize Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your photos with our intelligent image resizer. Join millions of users 
                    who trust our resizer for perfect quality and professional results.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Maximize2 className="h-5 w-5" />
                    <span>Start Resizing Now</span>
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

export default ImageResizer; 