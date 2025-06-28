import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const PNGSpriteGenerator: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    layout: 'horizontal',
    spacing: 0,
    quality: 'high',
    format: 'png'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pngFiles = selectedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    const newImages: UploadedImage[] = pngFiles.map(file => ({
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
    const pngFiles = droppedFiles.filter(file => {
      // Validate file type and size
      const isValidType = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    
    const newImages: UploadedImage[] = pngFiles.map(file => ({
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

  const moveImage = (from: number, to: number) => {
    setFiles(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const processImage = useCallback(async () => {
    if (files.length === 0 || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      // Create canvas for processing
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load all images first
      const imagePromises = files.map(file => {
        return new Promise<{ img: HTMLImageElement; file: UploadedImage }>((resolve, reject) => {
          const img = document.createElement('img') as HTMLImageElement;
          img.onload = () => resolve({ img, file });
          img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
          img.src = file.url;
        });
      });

      const loadedImages = await Promise.all(imagePromises);
      
      // Calculate sprite sheet dimensions based on layout
      let totalWidth = 0;
      let totalHeight = 0;
      let maxWidth = 0;
      let maxHeight = 0;
      
      // Find maximum dimensions
      loadedImages.forEach(({ img }) => {
        maxWidth = Math.max(maxWidth, img.width);
        maxHeight = Math.max(maxHeight, img.height);
      });
      
      // Calculate layout
      if (settings.layout === 'horizontal') {
        totalWidth = loadedImages.reduce((sum, { img }) => sum + img.width + settings.spacing, 0) - settings.spacing;
        totalHeight = maxHeight;
      } else if (settings.layout === 'vertical') {
        totalWidth = maxWidth;
        totalHeight = loadedImages.reduce((sum, { img }) => sum + img.height + settings.spacing, 0) - settings.spacing;
      } else { // grid
        const cols = Math.ceil(Math.sqrt(loadedImages.length));
        const rows = Math.ceil(loadedImages.length / cols);
        totalWidth = cols * maxWidth + (cols - 1) * settings.spacing;
        totalHeight = rows * maxHeight + (rows - 1) * settings.spacing;
      }
      
      // Set canvas size
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, totalWidth, totalHeight);
      
      // Draw images based on layout
      let currentX = 0;
      let currentY = 0;
      const col = 0;
      const cols = settings.layout === 'grid' ? Math.ceil(Math.sqrt(loadedImages.length)) : 1;
      
      for (let i = 0; i < loadedImages.length; i++) {
        const { img } = loadedImages[i];
        
        if (settings.layout === 'horizontal') {
          ctx.drawImage(img, currentX, 0);
          currentX += img.width + settings.spacing;
        } else if (settings.layout === 'vertical') {
          ctx.drawImage(img, 0, currentY);
          currentY += img.height + settings.spacing;
        } else { // grid
          const row = Math.floor(i / cols);
          const col = i % cols;
          const x = col * maxWidth + col * settings.spacing;
          const y = row * maxHeight + row * settings.spacing;
          ctx.drawImage(img, x, y);
        }
      }
      
      // Convert to blob with quality settings
      const quality = settings.quality === 'high' ? 1.0 : 
                     settings.quality === 'medium' ? 0.8 : 0.6;
      
      const mimeType = settings.format === 'png' ? 'image/png' : 
                      settings.format === 'jpg' ? 'image/jpeg' : 'image/webp';
      
      canvas.toBlob((blob) => {
        if (blob) {
          setProcessedBlob(blob);
          setIsProcessing(false);
          alert('PNG sprite sheet generated successfully!');
        } else {
          throw new Error('Failed to create sprite sheet');
        }
      }, mimeType, quality);
      
    } catch (error) {
      console.error('Error generating PNG sprite:', error);
      setIsProcessing(false);
      alert(error instanceof Error ? error.message : 'Error generating PNG sprite. Please try again.');
    }
  }, [files, settings]);

  const downloadAll = () => {
    if (!processedBlob) {
      alert('No processed file to download');
      return;
    }

    try {
      // Download the real processed file
      const link = document.createElement('a');
      const downloadUrl = URL.createObjectURL(processedBlob);
      link.href = downloadUrl;
      
      // Generate filename based on settings
      const timestamp = new Date().toISOString().slice(0, 10);
      const layoutName = settings.layout.charAt(0).toUpperCase() + settings.layout.slice(1);
      const format = settings.format.toUpperCase();
      link.download = `sprite-sheet-${layoutName}-${timestamp}.${settings.format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download sprite sheet. Please try again.');
    }
  };

  const features = [
    {
      icon: <Image className="h-6 w-6" />,
      title: "PNG Sprite Generation",
      description: "Combine multiple PNG images into optimized sprite sheets for web development"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Multiple Layouts",
      description: "Choose from horizontal, vertical, or grid layouts for your sprite sheets"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Custom Spacing",
      description: "Adjust spacing between images for perfect sprite sheet optimization"
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
      title: "Upload PNG Images",
      description: "Drag and drop your PNG images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Configure Settings",
      description: "Choose layout style, spacing, quality, and output format for your sprite sheet"
    },
    {
      step: "3",
      title: "Generate Sprite",
      description: "Our system combines your PNG images into an optimized sprite sheet"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "200K+", label: "Sprites Generated" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PNG Sprite Generator | Create PNG Sprites Online"
        description="Generate PNG image sprites quickly and easily with our free online PNG Sprite Generator. Optimize your website by combining multiple images into one."
        canonical="png-sprite-generator"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Image className="h-4 w-4" />
                <span>PNG Sprite Generator</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PNG Sprite Generator Online
              </h1>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-800 mb-4">
                Create PNG Sprite Sheets with Perfect Precision
              </h2>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Combine multiple PNG images into optimized sprite sheets for web development. 
                Perfect for game development, UI design, and performance optimization.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your PNG images here'}</h3>
                  <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PNG Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
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
                    {files.map((file, index) => (
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
                        <div className="flex space-x-1">
                          <button
                            disabled={index === 0}
                            onClick={() => moveImage(index, index - 1)}
                            className="text-xs text-gray-600 disabled:opacity-30 hover:text-violet-600"
                          >
                            ↑
                          </button>
                          <button
                            disabled={index === files.length - 1}
                            onClick={() => moveImage(index, index + 1)}
                            className="text-xs text-gray-600 disabled:opacity-30 hover:text-violet-600"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sprite Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Sprite Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                    <select
                      value={settings.layout}
                      onChange={(e) => setSettings(prev => ({ ...prev, layout: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                      <option value="grid">Grid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Spacing: {settings.spacing}px</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={settings.spacing}
                      onChange={(e) => setSettings(prev => ({ ...prev, spacing: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High (Best)</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low (Smaller)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                      <option value="webp">WebP</option>
                    </select>
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
                      {/* Spinner removed */}
                      <span>Generating Sprite...</span>
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5" />
                      <span>Generate Sprite Sheet</span>
                    </>
                  )}
                </button>
                
                {/* Download Area */}
                {processedBlob && (
                  <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex flex-col items-center">
                      <Download className="h-8 w-8 text-green-600 mb-3" />
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Sprite Sheet Generated!
                      </h3>
                      <p className="text-green-700 text-sm mb-4 text-center">
                        Your sprite sheet has been created successfully. Click below to download.
                      </p>
                      
                      {/* Preview */}
                      <div className="mb-4 bg-white rounded-lg p-2 border border-green-200">
                        <img 
                          src={URL.createObjectURL(processedBlob)} 
                          alt="Sprite Sheet Preview" 
                          className="max-w-full max-h-48 rounded-lg"
                        />
                      </div>
                      
                      <button
                        onClick={downloadAll}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <Download className="h-5 w-5" />
                        Download Sprite Sheet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden canvas for sprite generation */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PNG Sprite Generator?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional sprite sheet generation with advanced features and optimization
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
                  How to Generate PNG Sprite Sheets
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to create optimized sprite sheets from your PNG images
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
                    Ready to Create PNG Sprite Sheets?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Generate optimized sprite sheets for your web development projects. Join thousands of users 
                    who trust our generator for their sprite sheet needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Image className="h-5 w-5" />
                    <span>Start Generating Now</span>
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

export default PNGSpriteGenerator; 