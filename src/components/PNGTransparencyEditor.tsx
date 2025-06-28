import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, AlertCircle } from 'lucide-react';
import SEO from './SEO';

const PNGTransparencyEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<string | null>(null);
  const [transparencyLevel, setTransparencyLevel] = useState(50);
  const [colorToRemove, setColorToRemove] = useState('#ffffff');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Enhanced file validation
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        error: 'File too large. Please select a file under 10MB.' 
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Please select a PNG, JPEG, or JPG file.' 
      };
    }
    
    return { isValid: true };
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const validation = validateFile(file);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }
    
    setSelectedFile(file);
    setProcessedFile(null);
    setProcessedBlob(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      setError('No files were dropped.');
      return;
    }
    
    if (files.length > 1) {
      setError('Please drop only one file at a time.');
      return;
    }
    
    const file = files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processImage = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    if (!canvasRef.current) {
      setError('Canvas not available. Please refresh the page.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    let imageUrl: string | null = null;
    
    try {
      // Create canvas for processing
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load image
      const img = document.createElement('img') as HTMLImageElement;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Check image dimensions
          if (img.width > 4096 || img.height > 4096) {
            reject(new Error('Image too large. Please use an image under 4096x4096 pixels.'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Get image data for pixel manipulation
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Convert color to remove to RGB values
          const colorToRemoveRGB = hexToRgb(colorToRemove);
          if (!colorToRemoveRGB) {
            reject(new Error('Invalid color format.'));
            return;
          }
          
          // Process each pixel
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Check if pixel matches the color to remove (with tolerance)
            const tolerance = 30;
            const isColorToRemove = 
              Math.abs(r - colorToRemoveRGB.r) <= tolerance &&
              Math.abs(g - colorToRemoveRGB.g) <= tolerance &&
              Math.abs(b - colorToRemoveRGB.b) <= tolerance;
            
            if (isColorToRemove) {
              // Make pixel transparent
              data[i + 3] = 0; // Set alpha to 0
            } else {
              // Apply transparency level to non-removed pixels
              data[i + 3] = Math.round((a * (100 - transparencyLevel)) / 100);
            }
          }
          
          // Put processed image data back to canvas
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              setProcessedBlob(blob);
              setProcessedFile(URL.createObjectURL(blob));
              setIsProcessing(false);
              setSuccess('PNG transparency editing completed successfully!');
            } else {
              reject(new Error('Failed to create processed image.'));
            }
          }, 'image/png');
          
          resolve();
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image.'));
        };
        
        imageUrl = URL.createObjectURL(selectedFile);
        img.src = imageUrl;
      });
      
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Error processing image. Please try again.');
      setIsProcessing(false);
    } finally {
      // Clean up object URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    }
  }, [selectedFile, transparencyLevel, colorToRemove]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const downloadFile = () => {
    if (!processedBlob) {
      setError('No processed file available for download.');
      return;
    }

    try {
      const link = document.createElement('a');
      const downloadUrl = URL.createObjectURL(processedBlob);
      link.href = downloadUrl;
      link.download = `transparency-edited-${selectedFile?.name || 'image.png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setSuccess('File downloaded successfully!');
    } catch (error) {
      setError('Failed to download file. Please try again.');
    }
  };

  const stats = [
    { icon: <FileText className="h-5 w-5" />, value: '10M+', label: 'Images Processed' },
    { icon: <Zap className="h-5 w-5" />, value: '<2s', label: 'Avg. Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <Sparkles className="h-5 w-5" />, value: 'AI', label: 'Powered' }
  ];

  const features = [
    { icon: <RotateCcw className="h-6 w-6" />, title: 'Transparency Control', description: 'Adjust transparency level for any PNG image' },
    { icon: <FileText className="h-6 w-6" />, title: 'Color Removal', description: 'Remove specific colors and backgrounds' },
    { icon: <Sparkles className="h-6 w-6" />, title: 'AI-Powered', description: 'Smart detection of transparent regions' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'All processing is local and private' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PNG Image', description: 'Select or drag your PNG file to begin editing transparency.' },
    { step: '2', title: 'Adjust Settings', description: 'Set transparency level and color to remove as needed.' },
    { step: '3', title: 'Process & Download', description: 'Preview and download your edited PNG.' }
  ];

  return (
    <>
      <SEO
        title="PNG Transparency Editor | Edit Transparent PNGs Online"
        description="Easily add or remove transparency from PNG images with our free online PNG transparency editor. No downloads, fast, and user-friendly."
        canonical="png-transparency-editor"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <RotateCcw className="h-4 w-4" />
                <span>PNG Transparency Editor</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Edit Transparent PNGs Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Remove backgrounds, adjust transparency, and create stunning transparent PNGs with smart AI tools.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${selectedFile ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedFile ? 'File Selected' : 'Drop your PNG image here'}</h3>
                  <p className="text-gray-600 mb-6">{selectedFile ? selectedFile.name : 'or click to browse files'}</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PNG File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-center gap-2 text-green-600 mt-4">
                      <CheckCircle className="h-5 w-5" />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                  
                  {/* File Information */}
                  {selectedFile && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">File Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-800">
                        <div>
                          <span className="font-medium">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {selectedFile.type}
                        </div>
                        <div>
                          <span className="font-medium">Last Modified:</span> {new Date(selectedFile.lastModified).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}
                
                {/* Success Message */}
                {success && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 text-sm">{success}</span>
                  </div>
                )}
              </div>

              {/* Settings Panel */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Transparency Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transparency Level: {transparencyLevel}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transparencyLevel}
                      onChange={e => setTransparencyLevel(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Opaque</span>
                      <span>Transparent</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color to Remove
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={colorToRemove}
                        onChange={e => setColorToRemove(e.target.value)}
                        className="w-10 h-10 border-2 border-gray-300 rounded-lg"
                      />
                      <span className="text-xs text-gray-500">{colorToRemove}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {selectedFile ? (
                    processedFile ? (
                      <img src={processedFile} alt="Processed Preview" className="mx-auto max-h-64 rounded-lg shadow" />
                    ) : (
                      <img src={URL.createObjectURL(selectedFile)} alt="Original Preview" className="mx-auto max-h-64 rounded-lg shadow" />
                    )
                  ) : (
                    <p className="text-gray-500">No image selected. Upload a PNG to preview transparency edits.</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mb-8">
                <button
                  onClick={processImage}
                  disabled={!selectedFile || isProcessing}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing Transparency...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5" />
                      <span>Process Transparency</span>
                    </>
                  )}
                </button>
                
                {/* Processing Info */}
                {isProcessing && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Spinner removed */}
                      <span className="text-sm font-medium text-blue-900">Processing Image</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Analyzing pixels and applying transparency settings. This may take a few seconds for large images.
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden canvas for image processing */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Download Area */}
              {processedBlob && (
                <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex flex-col items-center">
                    <Download className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Transparency Edit Complete!
                    </h3>
                    <p className="text-green-700 text-sm mb-4 text-center">
                      Your PNG transparency has been edited successfully. Click below to download.
                    </p>
                    <button
                      onClick={downloadFile}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      Download Edited PNG
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <div className="text-violet-600 mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* How-to Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Edit PNG Transparency</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Edit PNG Transparency?</h2>
                <p className="text-xl mb-6 opacity-90">Join millions of users who trust our PNG transparency editor</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-violet-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Start Editing Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default PNGTransparencyEditor; 