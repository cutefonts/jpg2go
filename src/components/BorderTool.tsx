import React, { useState, useRef, useCallback, createContext, useContext } from 'react';
import { Upload, Download, RotateCcw, Settings, Square, Users, Shield, CheckCircle, Palette } from 'lucide-react';
import SEO from './SEO';

// Notification context for in-app messages
const NotificationContext = createContext<(msg: string, type?: 'error' | 'success') => void>(() => {});

export const useNotification = () => useContext(NotificationContext);

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'error' | 'success'>('success');
  React.useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [message]);
  return (
    <NotificationContext.Provider value={(msg, t = 'success') => { setMessage(msg); setType(t); }}>
      {children}
      {message && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          <div className={`px-4 py-2 rounded shadow-lg text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>{message}</div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const BorderTool: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [borderWidth, setBorderWidth] = useState(10);
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
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
    setProcessedFiles([]);
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
    setProcessedFiles([]);
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

  const processImage = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select at least one image to add borders.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const processedResults: { name: string; blob: Blob }[] = [];

      for (const uploadedFile of files) {
        // Create canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        
        // Load the image
        const img = document.createElement('img') as HTMLImageElement;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${uploadedFile.name}`));
          img.src = uploadedFile.url;
        });
        
        // Set canvas size to image size plus border
        const totalBorderWidth = borderWidth * 2;
        canvas.width = img.width + totalBorderWidth;
        canvas.height = img.height + totalBorderWidth;
        
        // Convert hex color to RGB
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 0, g: 0, b: 0 };
        };
        
        const rgbColor = hexToRgb(borderColor);
        
        // Fill background with border color
        ctx.fillStyle = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image in the center
        ctx.drawImage(img, borderWidth, borderWidth);
        
        // Apply border style effects
        if (borderStyle === 'dashed') {
          // Create dashed effect by drawing transparent rectangles
          const dashLength = borderWidth * 2;
          const gapLength = borderWidth;
          
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          
          // Top border dashes
          for (let x = 0; x < canvas.width; x += dashLength + gapLength) {
            ctx.fillRect(x, 0, dashLength, borderWidth);
          }
          
          // Bottom border dashes
          for (let x = 0; x < canvas.width; x += dashLength + gapLength) {
            ctx.fillRect(x, canvas.height - borderWidth, dashLength, borderWidth);
          }
          
          // Left border dashes
          for (let y = 0; y < canvas.height; y += dashLength + gapLength) {
            ctx.fillRect(0, y, borderWidth, dashLength);
          }
          
          // Right border dashes
          for (let y = 0; y < canvas.height; y += dashLength + gapLength) {
            ctx.fillRect(canvas.width - borderWidth, y, borderWidth, dashLength);
          }
          
          ctx.globalCompositeOperation = 'source-over';
        } else if (borderStyle === 'dotted') {
          // Create dotted effect
          const dotSize = borderWidth / 2;
          const spacing = borderWidth * 2;
          
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          
          // Top border dots
          for (let x = spacing; x < canvas.width - spacing; x += spacing) {
            ctx.beginPath();
            ctx.arc(x, borderWidth / 2, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Bottom border dots
          for (let x = spacing; x < canvas.width - spacing; x += spacing) {
            ctx.beginPath();
            ctx.arc(x, canvas.height - borderWidth / 2, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Left border dots
          for (let y = spacing; y < canvas.height - spacing; y += spacing) {
            ctx.beginPath();
            ctx.arc(borderWidth / 2, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Right border dots
          for (let y = spacing; y < canvas.height - spacing; y += spacing) {
            ctx.beginPath();
            ctx.arc(canvas.width - borderWidth / 2, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.globalCompositeOperation = 'source-over';
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
        
        processedResults.push({
          name: uploadedFile.name,
          blob: blob
        });
      }
      
      setProcessedFiles(processedResults);
      setIsProcessing(false);
      setSuccess(`Borders added successfully! ${processedResults.length} image(s) processed.`);
      notify('Borders added successfully!', 'success');
      
    } catch (error) {
      console.error('Error adding borders to images:', error);
      setIsProcessing(false);
      setError(error instanceof Error ? error.message : 'Error adding borders to images. Please try again.');
      notify('Error adding borders to images. Please try again.', 'error');
    }
  }, [files, borderWidth, borderColor, borderStyle, quality, format, notify]);

  const handleDownload = useCallback(() => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }

    try {
      // Create downloadable border-added files
      if (processedFiles.length === 1) {
        // Single file download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(processedFiles[0].blob);
        link.download = `border-${processedFiles[0].name.replace(/\.[^/.]+$/, '')}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        // Multiple files - download each
        processedFiles.forEach((file) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(file.blob);
          link.download = `border-${file.name.replace(/\.[^/.]+$/, '')}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        });
      }
      
      setSuccess(`Downloaded ${processedFiles.length} image(s) with borders!`);
    } catch (error) {
      setError('Error downloading files. Please try again.');
    }
  }, [processedFiles, format]);

  const resetTool = useCallback(() => {
    // Clean up object URLs
    files.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
    
    setFiles([]);
    setProcessedFiles([]);
    setBorderWidth(10);
    setBorderColor('#000000');
    setBorderStyle('solid');
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
      icon: <Square className="h-6 w-6" />,
      title: "Custom Borders",
      description: "Add beautiful borders with customizable width and colors"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Multiple Styles",
      description: "Choose from solid, dashed, and dotted border styles"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain image quality while adding professional borders"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Image",
      description: "Select your image file from your device or drag and drop"
    },
    {
      step: "2",
      title: "Customize Border",
      description: "Set border width, color, and style to your preference"
    },
    {
      step: "3",
      title: "Add & Download",
      description: "Add the border to your image and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "5M+", label: "Images Processed" },
    { icon: <Square className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Palette className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Photo Border | Add Stylish Borders to Photos Online"
        description="Easily add beautiful borders to your photos with our free online photo border tool. Customize styles, colors, and sizes to enhance your images instantly."
        keywords="photo border, add borders to photos, image border tool, photo frame, border styles, online tool, free tool"
        canonical="photo-border"
        ogImage="/images/photo-border-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Square className="h-4 w-4" />
                <span>Photo Border</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Beautiful
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Borders</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add professional borders to your images with customizable width, colors, and styles. 
                Perfect for creating framed photos and enhancing visual appeal.
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

              {/* File List */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h3>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Border Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Border Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Width (px)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="text-center mt-2">
                      <span className="text-sm font-medium text-gray-700">{borderWidth}px</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Style
                    </label>
                    <select
                      value={borderStyle}
                      onChange={(e) => setBorderStyle(e.target.value as 'solid' | 'dashed' | 'dotted')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
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
                  onClick={processImage}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Adding Borders...</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-5 w-5" />
                      <span>Add Borders to {files.length} Image{files.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset All
                </button>
              </div>

              {/* Preview */}
              {files.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div key={file.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-48 object-contain bg-gray-50"
                        />
                        <div className="p-3 bg-gray-50">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Area */}
              {processedFiles.length > 0 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Processing Complete!
                      </h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      {processedFiles.length} image(s) processed successfully with borders.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      Download {processedFiles.length > 1 ? 'All Images' : 'Image'} with Border
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Photo Border Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional photo border tool with customizable options and high-quality output</p>
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
                  How to Add Borders to Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to add beautiful borders to your images
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
                    Ready to Add Beautiful Borders?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your images with professional borders. Join millions of users 
                    who trust our photo border tool for stunning results.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Square className="h-5 w-5" />
                    <span>Start Adding Borders Now</span>
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

// Wrap the main export with NotificationProvider
const BorderToolWithProvider: React.FC = () => (
  <NotificationProvider>
    <BorderTool />
  </NotificationProvider>
);

export default BorderToolWithProvider; 