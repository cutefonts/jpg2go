import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, CheckCircle, Target, RotateCcw, Settings, Eye, Camera, FileType } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
}

type OperationType = 'resize' | 'compress' | 'convert' | 'optimize';
type FormatType = 'png' | 'jpg' | 'pdf';

interface BatchSettings {
  format: FormatType;
  quality: number;
  resize: boolean;
  width: number;
  height: number;
  watermark: boolean;
  watermarkText: string;
  watermarkPosition: string;
}

const BatchProcessor: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [operation, setOperation] = useState<OperationType>('convert');
  const [settings, setSettings] = useState<BatchSettings>({
    format: 'pdf',
    quality: 85,
    resize: false,
    width: 1920,
    height: 1080,
    watermark: false,
    watermarkText: '',
    watermarkPosition: 'bottom-right'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(imageFiles);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(imageFiles);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Helper to process a single image file asynchronously
  const processImageFile = (file: File, operation: OperationType, settings: BatchSettings): Promise<ProcessedFile | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        if (operation === 'resize') {
          canvas.width = settings.width;
          canvas.height = settings.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                name: file.name.replace(/\.[^/.]+$/, '') + '_resized.jpg',
                blob
              });
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        } else if (operation === 'convert') {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const extension = settings.format === 'png' ? '.png' : '.jpg';
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                name: file.name.replace(/\.[^/.]+$/, '') + extension,
                blob
              });
            } else {
              resolve(null);
            }
          }, settings.format === 'png' ? 'image/png' : 'image/jpeg', 0.9);
        } else if (operation === 'compress') {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                name: file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg',
                blob
              });
            } else {
              resolve(null);
            }
          }, 'image/jpeg', settings.quality / 100);
        } else if (operation === 'optimize') {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          let qualityLevel = 0.8;
          if (settings.quality >= 90) qualityLevel = 0.95;
          else if (settings.quality >= 80) qualityLevel = 0.9;
          else if (settings.quality >= 60) qualityLevel = 0.7;
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                name: file.name.replace(/\.[^/.]+$/, '') + '_optimized.jpg',
                blob
              });
            } else {
              resolve(null);
            }
          }, 'image/jpeg', qualityLevel);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: ProcessedFile[] = [];
      for (const file of selectedFiles) {
        // Only allow PNG/JPG for now (no PDF)
        if (settings.format === 'pdf') continue;
        const result = await processImageFile(file, operation, settings);
        if (result) processed.push(result);
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`Batch processing completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error in batch processing:', error);
      setIsProcessing(false);
      alert('Error in batch processing. Please try again.');
    }
  };

  const handleDownload = useCallback(() => {
    if (processedFiles.length === 0) return;

    if (processedFiles.length === 1) {
      // Single file download
      const url = URL.createObjectURL(processedFiles[0].blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFiles[0]?.name.replace(/\.[^/.]+$/, '') + `-${operation}.${settings.format}` || `processed-${operation}.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Multiple files - download each
      processedFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFiles[index]?.name.replace(/\.[^/.]+$/, '') + `-${operation}.${settings.format}` || `processed-${index}-${operation}.${settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }, [processedFiles, selectedFiles, operation, settings.format]);

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setProcessedFiles([]);
    setOperation('convert');
    setSettings({
      format: 'pdf',
      quality: 85,
      resize: false,
      width: 1920,
      height: 1080,
      watermark: false,
      watermarkText: '',
      watermarkPosition: 'bottom-right'
    });
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Batch Processing",
      description: "Process multiple images simultaneously with consistent settings"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast Operations",
      description: "Efficient processing with optimized algorithms for speed"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Multiple Operations",
      description: "Resize, compress, convert, and optimize images in batch"
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
      title: "Choose Operation",
      description: "Select the batch operation and quality settings"
    },
    {
      step: "3",
      title: "Process & Download",
      description: "Process all images and download the results"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "10M+", label: "Images Processed" },
    { icon: <FileText className="h-5 w-5" />, value: "100+", label: "Batch Size" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Zap className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Batch Processor | Process Multiple Files Online"
        description="Save time by processing multiple images or documents at once. Use our free online batch processor for resizing, converting, and editing files fast."
        keywords="batch processor, process multiple files, batch conversion, file processing, bulk operations, online tool, free tool"
        canonical="batch-processor"
        ogImage="/images/batch-processor-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>Batch Processor</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Process Images
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> in Batch</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Process multiple images simultaneously with consistent settings. 
                Resize, compress, convert, and optimize images efficiently in batch operations.
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
                    selectedFiles.length > 0
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
                    Drop your images here for batch processing
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Choose Images
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {selectedFiles.length} image(s) selected</p>
                  </div>
                )}
              </div>

              {/* Batch Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Batch Processing Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operation
                    </label>
                    <select
                      value={operation}
                      onChange={(e) => setOperation(e.target.value as OperationType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="resize">Resize Images</option>
                      <option value="compress">Compress Images</option>
                      <option value="convert">Convert Format</option>
                      <option value="optimize">Optimize Images</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality
                    </label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={80}>Standard (80%)</option>
                      <option value={90}>High Quality (90%)</option>
                      <option value={100}>Ultra Quality (100%)</option>
                    </select>
                  </div>

                  {/* Resize Settings */}
                  {operation === 'resize' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={settings.width}
                          onChange={(e) => setSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 1920 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          min="1"
                          max="4000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          value={settings.height}
                          onChange={(e) => setSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 1080 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          min="1"
                          max="4000"
                        />
                      </div>
                    </>
                  )}

                  {/* Convert Settings */}
                  {operation === 'convert' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Format
                      </label>
                      <select
                        value={settings.format}
                        onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value as FormatType }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="pdf" disabled>PDF (coming soon)</option>
                      </select>
                    </div>
                  )}

                  {/* Compress Settings */}
                  {operation === 'compress' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compression Level ({settings.quality}%)
                      </label>
                      <input
                        type="range"
                        value={settings.quality}
                        onChange={(e) => setSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        min="10"
                        max="100"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={selectedFiles.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Process Images</span>
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
              {selectedFiles.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Files ({selectedFiles.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-violet-100 rounded flex items-center justify-center">
                          <span className="text-violet-600 text-xs font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Area */}
              {processedFiles.length > 0 && (
                <div
                  className="mb-8 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all duration-300"
                  onClick={handleDownload}
                >
                  <Download className="h-10 w-10 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Processed Files</h3>
                  <p className="text-gray-600 mb-4">Click anywhere in this box or the button below to download your processed images.</p>
                  <button
                    onClick={e => { e.stopPropagation(); handleDownload(); }}
                    className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Download
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Batch Processor?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Efficient batch processing with multiple operations and consistent quality
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
                  How to Process Images in Batch
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to process multiple images efficiently
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
                    Ready to Process Images in Batch?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Process multiple images efficiently with consistent settings. Join millions of users 
                    who trust our batch processor for professional results.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Processing Now</span>
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

export default BatchProcessor; 