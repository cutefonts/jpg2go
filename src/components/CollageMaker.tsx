import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Grid3X3, Image } from 'lucide-react';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const CollageMaker: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'masonry' | 'polaroid' | 'story'>('grid');
  const [spacing, setSpacing] = useState(10);
  const [quality, setQuality] = useState('high');
  const [format, setFormat] = useState('png');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
    
    const newFiles: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedBlob(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
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
    
    const newFiles: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedBlob(null);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one image to create a collage.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // Load all images
      const images = await Promise.all(
        files.map(async (file) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = document.createElement('img') as HTMLImageElement;
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
            img.src = file.url;
          });
        })
      );

      // Calculate collage dimensions and layout
      const collageConfig = calculateCollageLayout(images, layout, spacing);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size
      canvas.width = collageConfig.width;
      canvas.height = collageConfig.height;

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw images according to layout
      if (layout === 'grid') {
        drawGridLayout(ctx, images, collageConfig);
      } else if (layout === 'masonry') {
        drawMasonryLayout(ctx, images, collageConfig);
      } else if (layout === 'polaroid') {
        drawPolaroidLayout(ctx, images, collageConfig);
      } else if (layout === 'story') {
        drawStoryLayout(ctx, images, collageConfig);
      }

      // Convert to blob with quality settings
      const outputQuality = quality === 'high' ? 0.9 : 
                           quality === 'medium' ? 0.7 : 0.5;
      
      const mimeType = format === 'png' ? 'image/png' : 
                      format === 'jpg' ? 'image/jpeg' : 'image/webp';
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob([''], { type: mimeType }));
        }, mimeType, outputQuality);
      });

      setProcessedBlob(blob);
      setIsProcessing(false);
      setSuccess(`Collage created successfully! ${files.length} images combined.`);
      notify('Collage successfully created!', 'success');
      
    } catch (error) {
      console.error('Error creating collage:', error);
      setIsProcessing(false);
      setError(error instanceof Error ? error.message : 'Error creating collage. Please try again.');
      notify('Error creating collage. Please try again.', 'error');
    }
  };

  // Helper function to calculate collage layout
  const calculateCollageLayout = (images: HTMLImageElement[], layout: string, spacing: number) => {
    const maxWidth = 1200;
    const maxHeight = 800;
    
    if (layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(images.length));
      const rows = Math.ceil(images.length / cols);
      const cellWidth = (maxWidth - (cols + 1) * spacing) / cols;
      const cellHeight = (maxHeight - (rows + 1) * spacing) / rows;
      
      return {
        width: maxWidth,
        height: maxHeight,
        cellWidth,
        cellHeight,
        cols,
        rows,
        spacing
      };
    } else if (layout === 'masonry') {
      const cols = 3;
      const cellWidth = (maxWidth - (cols + 1) * spacing) / cols;
      
      return {
        width: maxWidth,
        height: maxHeight,
        cellWidth,
        cols,
        spacing
      };
    } else if (layout === 'polaroid') {
      const cols = Math.ceil(Math.sqrt(images.length));
      const rows = Math.ceil(images.length / cols);
      const cellWidth = 200;
      const cellHeight = 250;
      
      return {
        width: cols * cellWidth + (cols + 1) * spacing,
        height: rows * cellHeight + (rows + 1) * spacing,
        cellWidth,
        cellHeight,
        cols,
        rows,
        spacing
      };
    } else { // story
      const cellWidth = maxWidth - 2 * spacing;
      const cellHeight = 200;
      
      return {
        width: maxWidth,
        height: images.length * cellHeight + (images.length + 1) * spacing,
        cellWidth,
        cellHeight,
        spacing
      };
    }
  };

  // Layout drawing functions
  const drawGridLayout = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], config: any) => {
    images.forEach((img, index) => {
      const col = index % config.cols;
      const row = Math.floor(index / config.cols);
      const x = col * config.cellWidth + (col + 1) * config.spacing;
      const y = row * config.cellHeight + (row + 1) * config.spacing;
      
      // Calculate aspect ratio to fit image in cell
      const imgAspect = img.width / img.height;
      const cellAspect = config.cellWidth / config.cellHeight;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > cellAspect) {
        drawWidth = config.cellWidth;
        drawHeight = config.cellWidth / imgAspect;
        offsetX = 0;
        offsetY = (config.cellHeight - drawHeight) / 2;
      } else {
        drawHeight = config.cellHeight;
        drawWidth = config.cellHeight * imgAspect;
        offsetX = (config.cellWidth - drawWidth) / 2;
        offsetY = 0;
      }
      
      ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
    });
  };

  const drawMasonryLayout = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], config: any) => {
    const columnHeights = new Array(config.cols).fill(0);
    
    images.forEach((img, index) => {
      const col = index % config.cols;
      const x = col * config.cellWidth + (col + 1) * config.spacing;
      const y = columnHeights[col] + config.spacing;
      
      const aspectRatio = img.width / img.height;
      const drawHeight = config.cellWidth / aspectRatio;
      const drawWidth = config.cellWidth;
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      columnHeights[col] += drawHeight + config.spacing;
    });
  };

  const drawPolaroidLayout = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], config: any) => {
    images.forEach((img, index) => {
      const col = index % config.cols;
      const row = Math.floor(index / config.cols);
      const x = col * config.cellWidth + (col + 1) * config.spacing;
      const y = row * config.cellHeight + (row + 1) * config.spacing;
      
      // Draw polaroid background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, config.cellWidth, config.cellHeight);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, config.cellWidth, config.cellHeight);
      
      // Draw image with padding
      const padding = 20;
      const imgWidth = config.cellWidth - 2 * padding;
      const imgHeight = config.cellHeight - 2 * padding - 40; // Space for text
      
      const aspectRatio = img.width / img.height;
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (aspectRatio > imgWidth / imgHeight) {
        drawWidth = imgWidth;
        drawHeight = imgWidth / aspectRatio;
        offsetX = 0;
        offsetY = (imgHeight - drawHeight) / 2;
      } else {
        drawHeight = imgHeight;
        drawWidth = imgHeight * aspectRatio;
        offsetX = (imgWidth - drawWidth) / 2;
        offsetY = 0;
      }
      
      ctx.drawImage(img, x + padding + offsetX, y + padding + offsetY, drawWidth, drawHeight);
      
      // Add polaroid text
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Polaroid', x + config.cellWidth / 2, y + config.cellHeight - 15);
    });
  };

  const drawStoryLayout = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], config: any) => {
    images.forEach((img, index) => {
      const y = index * config.cellHeight + (index + 1) * config.spacing;
      const x = config.spacing;
      
      const aspectRatio = img.width / img.height;
      const drawHeight = config.cellHeight;
      const drawWidth = config.cellHeight * aspectRatio;
      
      let finalDrawWidth = drawWidth;
      let finalDrawX = x;
      
      if (drawWidth > config.cellWidth) {
        finalDrawWidth = config.cellWidth;
        finalDrawX = x;
      } else {
        finalDrawX = x + (config.cellWidth - drawWidth) / 2;
      }
      
      ctx.drawImage(img, finalDrawX, y, finalDrawWidth, drawHeight);
    });
  };

  const handleDownload = useCallback(() => {
    if (!processedBlob) {
      setError('No collage to download');
      return;
    }

    try {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collage-${layout}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Collage downloaded successfully!');
    } catch (error) {
      setError('Error downloading collage. Please try again.');
    }
  }, [processedBlob, layout, format]);

  const resetTool = useCallback(() => {
    // Clean up object URLs
    files.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
    
    setFiles([]);
    setProcessedBlob(null);
    setLayout('grid');
    setSpacing(10);
    setQuality('high');
    setFormat('png');
    setError(null);
    setSuccess(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files]);

  // Cleanup object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [files]);

  const features = [
    {
      icon: <Grid3X3 className="h-6 w-6" />,
      title: "Multiple Layouts",
      description: "Choose from grid, masonry, polaroid, and story layouts"
    },
    {
      icon: <Image className="h-6 w-6" />,
      title: "Custom Spacing",
      description: "Adjust spacing between images for perfect composition"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Create beautiful collages with professional quality output"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Images",
      description: "Select multiple image files from your device or drag and drop"
    },
    {
      step: "2",
      title: "Choose Layout",
      description: "Select collage layout and adjust spacing settings"
    },
    {
      step: "3",
      title: "Create & Download",
      description: "Generate your collage and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "8M+", label: "Collages Created" },
    { icon: <Grid3X3 className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="Collage Maker | Create Photo Collages Online"
        description="Design beautiful photo collages easily with our free online collage maker. Choose templates, add photos, and customize your collage in minutes."
        keywords="collage maker, photo collage, image collage, photo layout, social media collage, online tool, free tool"
        canonical="collage-maker"
        ogImage="/images/collage-maker-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Grid3X3 className="h-4 w-4" />
                <span>Collage Maker</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Collage Maker Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform multiple images into stunning collages with various layouts and styles. 
                Perfect for social media, memories, and creative projects.
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
                    {files.length > 0 ? 'Files Selected' : 'Drop your images here'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}
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
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                {/* Error and Success Messages */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <div className="text-red-600">⚠️</div>
                      <p className="text-red-700">{error}</p>
                    </div>
                  </div>
                )}
                
                {success && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <div className="text-green-600">✅</div>
                      <p className="text-green-700">{success}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Collage Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Collage Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Layout Style
                    </label>
                    <select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as 'grid' | 'masonry' | 'polaroid' | 'story')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="grid">Grid Layout</option>
                      <option value="masonry">Masonry Layout</option>
                      <option value="polaroid">Polaroid Style</option>
                      <option value="story">Story Layout</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spacing (px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={spacing}
                      onChange={(e) => setSpacing(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="text-center mt-2">
                      <span className="text-sm font-medium text-gray-700">{spacing}px</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Quality
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High Quality</option>
                      <option value="medium">Medium Quality</option>
                      <option value="low">Low Quality</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
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
                      {/* Spinner removed */}
                      <span>Creating Collage...</span>
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="h-5 w-5" />
                      <span>Create Collage</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-8">
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

              {/* Download Area */}
              {processedBlob && (
                <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">
                        Collage Created!
                      </h3>
                    </div>
                    <p className="text-green-700 mb-4">
                      Your collage has been created successfully. Click below to download.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      Download Collage
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Collage Maker?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional collage creation with multiple layouts and customization options
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
                  How to Create Beautiful Collages
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to create stunning collages from your images
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
                    Ready to Create Beautiful Collages?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your images into stunning collages. Join millions of users 
                    who trust our collage maker for creative results.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Grid3X3 className="h-5 w-5" />
                    <span>Start Creating Now</span>
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

const CollageMakerWithProvider: React.FC = () => (
  <NotificationProvider>
    <CollageMaker />
  </NotificationProvider>
);

export default CollageMakerWithProvider; 