import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, TrendingUp, CheckCircle, Sparkles, Target, Layers } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const WatermarkTool: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [processedFiles, setProcessedFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [watermarkText, setWatermarkText] = useState('© JPG2GO');
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [position, setPosition] = useState('bottom-right');
  const [opacity, setOpacity] = useState(50);
  const [size, setSize] = useState(24);
  const [rotation, setRotation] = useState(0);
  const [color, setColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState('normal');
  const [watermarkStyle, setWatermarkStyle] = useState('solid');
  const [aiPositioning, setAiPositioning] = useState(false);
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(5);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const selectedFile = files[0];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/') && file.type !== 'image/gif'
    );
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
    const imageFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/') && file.type !== 'image/gif'
    );
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

  const handleWatermarkImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setWatermarkImage(files[0]);
    }
  };

  const processImages = useCallback(async () => {
    if (files.length === 0 || !canvasRef.current) return;
    setIsProcessing(true);
    const newProcessed: UploadedImage[] = [];
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
      ctx.save();
      // Watermark logic
      if (watermarkType === 'text') {
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
        ctx.globalAlpha = opacity / 100;
        ctx.fillStyle = color;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        // Shadow
        if (shadowEnabled) {
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.shadowOffsetX = shadowOffsetX;
          ctx.shadowOffsetY = shadowOffsetY;
        }
        // Position
        let x = 20, y = size + 20;
        if (position === 'top-left') { x = 20; y = size + 20; }
        else if (position === 'top-right') { x = canvas.width - ctx.measureText(watermarkText).width - 20; y = size + 20; }
        else if (position === 'bottom-left') { x = 20; y = canvas.height - 20; }
        else if (position === 'bottom-right') { x = canvas.width - ctx.measureText(watermarkText).width - 20; y = canvas.height - 20; }
        else if (position === 'center') { x = (canvas.width - ctx.measureText(watermarkText).width) / 2; y = canvas.height / 2; }
        ctx.fillText(watermarkText, x, y);
      } else if (watermarkType === 'image' && watermarkImage) {
        // Draw watermark image
        const wmImg = await new Promise<HTMLImageElement>((resolve) => {
          const i = new window.Image();
          i.onload = () => resolve(i);
          i.src = URL.createObjectURL(watermarkImage);
        });
        const wmWidth = Math.max(canvas.width * 0.2, 50);
        const wmHeight = (wmImg.height / wmImg.width) * wmWidth;
        let x = 20, y = 20;
        if (position === 'top-left') { x = 20; y = 20; }
        else if (position === 'top-right') { x = canvas.width - wmWidth - 20; y = 20; }
        else if (position === 'bottom-left') { x = 20; y = canvas.height - wmHeight - 20; }
        else if (position === 'bottom-right') { x = canvas.width - wmWidth - 20; y = canvas.height - wmHeight - 20; }
        else if (position === 'center') { x = (canvas.width - wmWidth) / 2; y = (canvas.height - wmHeight) / 2; }
        ctx.globalAlpha = opacity / 100;
        ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
      }
      ctx.restore();
      // Convert to blob and preview
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (blob) {
        const url = URL.createObjectURL(blob);
        newProcessed.push({ ...fileObj, url, file: new File([blob], fileObj.name.replace(/\.[^/.]+$/, '') + '_watermarked.jpg', { type: 'image/jpeg' }) });
      }
    }
    setProcessedFiles(newProcessed);
    setIsProcessing(false);
  }, [files, watermarkType, watermarkText, size, color, position, opacity, fontFamily, fontWeight, rotation, shadowEnabled, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, watermarkImage]);

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
    link.download = 'watermarked_images.zip';
    link.click();
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Watermark Tool",
      description: "Add text or image watermarks to protect your images"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Multiple Options",
      description: "Choose from text or image watermarks with full customization"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Flexible Positioning",
      description: "Position watermarks anywhere on your images"
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
      title: "Configure Watermark",
      description: "Choose watermark type, text, position, and styling options"
    },
    {
      step: "3",
      title: "Apply Watermark",
      description: "Our system adds watermarks to your images with perfect precision"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "120K+", label: "Images Watermarked" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const positions = [
    { id: 'top-left', name: 'Top Left' },
    { id: 'top-center', name: 'Top Center' },
    { id: 'top-right', name: 'Top Right' },
    { id: 'center-left', name: 'Center Left' },
    { id: 'center', name: 'Center' },
    { id: 'center-right', name: 'Center Right' },
    { id: 'bottom-left', name: 'Bottom Left' },
    { id: 'bottom-center', name: 'Bottom Center' },
    { id: 'bottom-right', name: 'Bottom Right' },
    { id: 'ai', name: 'AI Smart Position' }
  ];

  const fontFamilies = [
    { id: 'Arial', name: 'Arial' },
    { id: 'Helvetica', name: 'Helvetica' },
    { id: 'Times New Roman', name: 'Times New Roman' },
    { id: 'Georgia', name: 'Georgia' },
    { id: 'Verdana', name: 'Verdana' },
    { id: 'Courier New', name: 'Courier New' },
    { id: 'Impact', name: 'Impact' },
    { id: 'Comic Sans MS', name: 'Comic Sans MS' }
  ];

  const watermarkStyles = [
    { id: 'solid', name: 'Solid' },
    { id: 'outline', name: 'Outline' },
    { id: 'gradient', name: 'Gradient' },
    { id: 'emboss', name: 'Emboss' },
    { id: 'glow', name: 'Glow' },
    { id: 'neon', name: 'Neon' }
  ];

  return (
    <>
      <SEO
        title="Watermark Tool | Secure Your Photos with Watermarks"
        description="Easily add watermarks to your photos online to prevent unauthorized use. Fast, free, and simple watermark tool for images and PDFs."
        keywords="watermark tool, add watermark, image watermark, text watermark, copyright protection, branding, online tool, free tool"
        canonical="watermark-tool"
        ogImage="/images/watermark-tool-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Watermark Tool</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Watermark to Image
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Protect your images with custom watermarks. Add text or image watermarks with full control over 
                positioning, styling, and appearance for professional branding and copyright protection.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${selectedFile ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your image here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Image</button>
                  <input
                    ref={fileInputRef}
                    type="file"
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

              {/* Advanced Watermark Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Watermark Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Watermark Type
                    </label>
                    <select
                      value={watermarkType}
                      onChange={(e) => setWatermarkType(e.target.value as 'text' | 'image')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {['text', 'image'].map(type => (
                        <option key={type} value={type}>
                          {type === 'text' ? 'Text Watermark' : 'Image Watermark'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {positions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {watermarkType === 'text' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Watermark Text
                        </label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter watermark text"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Family
                        </label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {fontFamilies.map(font => (
                            <option key={font.id} value={font.id}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Weight
                        </label>
                        <select
                          value={fontWeight}
                          onChange={(e) => setFontWeight(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="lighter">Light</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size: {size}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="72"
                          value={size}
                          onChange={(e) => setSize(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color
                        </label>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opacity: {opacity}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={opacity}
                          onChange={(e) => setOpacity(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rotation: {rotation}°
                        </label>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          value={rotation}
                          onChange={(e) => setRotation(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Style
                        </label>
                        <select
                          value={watermarkStyle}
                          onChange={(e) => setWatermarkStyle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="solid">Solid</option>
                          <option value="outline">Outline</option>
                          <option value="shadow">Shadow</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {watermarkType === 'image' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Watermark Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWatermarkImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {watermarkImage && (
                      <p className="text-sm text-green-600 mt-2">✓ {watermarkImage.name} selected</p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="aiPositioning"
                    checked={aiPositioning}
                    onChange={(e) => setAiPositioning(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="aiPositioning" className="text-sm font-medium text-gray-700">
                    AI-Powered Positioning
                  </label>
                  <Target className="h-4 w-4 text-purple-600" />
                </div>

                {/* Shadow Settings */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="shadowEnabled"
                      checked={shadowEnabled}
                      onChange={(e) => setShadowEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shadowEnabled" className="text-sm font-medium text-gray-700">
                      Enable Shadow Effect
                    </label>
                    <Layers className="h-4 w-4 text-purple-600" />
                  </div>
                  
                  {shadowEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Shadow Color
                        </label>
                        <input
                          type="color"
                          value={shadowColor}
                          onChange={(e) => setShadowColor(e.target.value)}
                          className="w-full h-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Blur: {shadowBlur}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={shadowBlur}
                          onChange={(e) => setShadowBlur(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Offset X: {shadowOffsetX}px
                        </label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          value={shadowOffsetX}
                          onChange={(e) => setShadowOffsetX(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Offset Y: {shadowOffsetY}px
                        </label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          value={shadowOffsetY}
                          onChange={(e) => setShadowOffsetY(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Watermarks...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Add Watermarks</span>
                    </>
                  )}
                </button>
                
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Watermarked Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Preview Section */}
            {processedFiles.length > 0 && (
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedFiles.map((img) => (
                  <div key={img.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                    <div className="h-60 bg-gray-100 flex items-center justify-center">
                      <img src={img.url} alt={img.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate text-center mb-1">{img.name}</p>
                      <p className="text-xs text-gray-500 text-center mb-4">Watermarked</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Watermark Tool?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional watermarking with full customization and control
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
                  How to Add Watermarks
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to protect your images with watermarks
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
                    Ready to Protect Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Add professional watermarks to protect your work. Join thousands of users 
                    who trust our Watermark Tool for their image protection needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Start Watermarking Now</span>
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

export default WatermarkTool; 