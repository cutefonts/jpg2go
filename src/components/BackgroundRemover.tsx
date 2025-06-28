import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, Wand2, Users, Shield, CheckCircle, Image, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';
import { removeBackground } from '@imgly/background-removal';

const BackgroundRemover: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<Blob[]>([]);
  const [processedUrls, setProcessedUrls] = useState<string[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [removalMode, setRemovalMode] = useState<'auto' | 'manual' | 'smart'>('auto');
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [error, setError] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) {
      setError('Please select image files (max 10MB each).');
      return;
    }
    const newFiles = validFiles.filter(file => !isDuplicate(file, selectedFiles));
    if (newFiles.length === 0) {
      setError('No new images selected (duplicates ignored).');
      return;
    }
    revokeAllPreviewUrls(previewUrls);
    setSelectedFiles([...selectedFiles, ...newFiles]);
    setPreviewUrls([...previewUrls, ...newFiles.map(file => URL.createObjectURL(file))]);
    setProcessedBlobs([]);
    revokeAllProcessedUrls(processedUrls);
    setProcessedUrls([]);
    setError('');
    setProcessingProgress(0);
  }, [selectedFiles, previewUrls, processedUrls]);

  const handleDragDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) {
      setError('Please select image files (max 10MB each).');
      return;
    }
    const newFiles = validFiles.filter(file => !isDuplicate(file, selectedFiles));
    if (newFiles.length === 0) {
      setError('No new images selected (duplicates ignored).');
      return;
    }
    revokeAllPreviewUrls(previewUrls);
    setSelectedFiles([...selectedFiles, ...newFiles]);
    setPreviewUrls([...previewUrls, ...newFiles.map(file => URL.createObjectURL(file))]);
    setProcessedBlobs([]);
    revokeAllProcessedUrls(processedUrls);
    setProcessedUrls([]);
    setError('');
    setProcessingProgress(0);
  }, [selectedFiles, previewUrls, processedUrls]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    setProcessedBlobs([]);
    if (processedUrls[index]) {
      URL.revokeObjectURL(processedUrls[index]);
      const newProcessedUrls = [...processedUrls];
      newProcessedUrls.splice(index, 1);
      setProcessedUrls(newProcessedUrls);
    }
  };

  const processBatch = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setProcessedBlobs([]);
    revokeAllProcessedUrls(processedUrls);
    setProcessedUrls([]);
    setProcessingProgress(0);
    setCurrentBatchIndex(0);
    const blobs: Blob[] = [];
    const urls: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      setCurrentBatchIndex(i);
      const file = selectedFiles[i];
      try {
        const blob = await processSingleImage(file);
        blobs.push(blob);
        urls.push(URL.createObjectURL(blob));
        errors.push('');
        setProcessingProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      } catch (e) {
        blobs.push(new Blob()); // placeholder for failed
        urls.push('');
        errors.push(e instanceof Error ? e.message : 'Failed to process image');
      }
    }
    setProcessedBlobs(blobs);
    setProcessedUrls(urls);
    setBatchErrors(errors);
    setIsProcessing(false);
    setProcessingProgress(100);
  }, [selectedFiles, removalMode, quality, processedUrls]);

  // Helper to resize image to a max dimension (preserving aspect ratio)
  const resizeImage = (file: File, maxDimension: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          // No resizing needed
          resolve(file);
          return;
        }
        const aspect = width / height;
        if (width > height) {
          width = maxDimension;
          height = Math.round(maxDimension / aspect);
        } else {
          height = maxDimension;
          width = Math.round(maxDimension * aspect);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to resize image'));
        }, file.type || 'image/png');
      };
      img.onerror = (e) => reject(new Error('Failed to load image for resizing'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Map removalMode and quality to model, max dimension, and mask threshold
  const getModelAndOptions = (): { model: 'isnet' | 'isnet_fp16' | 'isnet_quint8', maxDimension: number, maskThreshold?: number } => {
    if (removalMode === 'smart') {
      // Smart AI: always use best model, aggressive mask
      switch (quality) {
        case 'standard':
          return { model: 'isnet_fp16', maxDimension: 512, maskThreshold: 0.85 };
        case 'high':
          return { model: 'isnet_fp16', maxDimension: 1024, maskThreshold: 0.8 };
        case 'ultra':
        default:
          return { model: 'isnet_fp16', maxDimension: 2048, maskThreshold: 0.75 };
      }
    } else if (removalMode === 'manual') {
      // Manual: use basic model, conservative mask
      switch (quality) {
        case 'standard':
          return { model: 'isnet', maxDimension: 512, maskThreshold: 0.95 };
        case 'high':
          return { model: 'isnet', maxDimension: 1024, maskThreshold: 0.92 };
        case 'ultra':
        default:
          return { model: 'isnet', maxDimension: 2048, maskThreshold: 0.9 };
      }
    } else {
      // Auto: use best model per quality, default mask
      switch (quality) {
        case 'standard':
          return { model: 'isnet', maxDimension: 512 };
        case 'high':
          return { model: 'isnet_fp16', maxDimension: 1024 };
        case 'ultra':
        default:
          return { model: 'isnet_fp16', maxDimension: 2048 };
      }
    }
  };

  const processSingleImage = async (file: File): Promise<Blob> => {
    // Determine model, max dimension, and mask threshold based on settings
    const { model, maxDimension, maskThreshold } = getModelAndOptions();
    let inputFile: File | Blob = file;
    // Resize if needed (only for standard/high)
    if (quality === 'standard' || quality === 'high') {
      inputFile = await resizeImage(file, maxDimension);
    }
    const output = { format: 'image/png' as const };
    try {
      const resultBlob = await removeBackground(inputFile, {
        output,
        model,
        ...(maskThreshold !== undefined ? { maskThreshold } : {}),
        // device: 'gpu', // Optionally enable GPU for speed
      });
      return resultBlob;
    } catch (err) {
      throw err;
    }
  };

  const processImage = useCallback(async () => {
    if (!selectedFiles.length) return;
    setIsProcessing(true);
    setError('');
    setProcessingProgress(0);
    revokeAllProcessedUrls(processedUrls);
    setProcessedUrls([]);
    setBatchErrors([]);
    try {
      setProcessingProgress(20);
      const blob = await processSingleImage(selectedFiles[0]);
      setProcessingProgress(80);
      setProcessedBlobs([blob]);
      const url = URL.createObjectURL(blob);
      setProcessedUrls([url]);
      setBatchErrors(['']);
      setProcessingProgress(100);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
      setBatchErrors([error instanceof Error ? error.message : 'Failed to process image']);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [selectedFiles, removalMode, quality, processedUrls]);

  const handleDownload = useCallback(() => {
    if (processedBlobs.length > 0) {
      const url = URL.createObjectURL(processedBlobs[0]);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFiles[0]?.name.replace(/\.[^/.]+$/, '') + '-no-background.png' || 'background-removed.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [processedBlobs, selectedFiles]);

  const handleDownloadAll = async () => {
    if (processedBlobs.length === 0) return;
    const zip = new JSZip();
    processedBlobs.forEach((blob, i) => {
      if (blob.size > 0) {
        zip.file(
          (selectedFiles[i]?.name?.replace(/\.[^/.]+$/, '') || `image${i+1}`) + '-no-background.png',
          blob
        );
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'background-removed-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    revokeAllPreviewUrls(previewUrls);
    setPreviewUrls([]);
    setProcessedBlobs([]);
    revokeAllProcessedUrls(processedUrls);
    setProcessedUrls([]);
    setRemovalMode('auto');
    setQuality('high');
    setError('');
    setProcessingProgress(0);
  }, [previewUrls, processedUrls]);

  const features = [
    {
      icon: <Wand2 className="h-6 w-6" />,
      title: "AI Background Removal",
      description: "Advanced algorithms for precise background removal with multiple modes"
    },
    {
      icon: <Image className="h-6 w-6" />,
      title: "Transparent Output",
      description: "Get images with transparent backgrounds in high-quality PNG format"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed locally and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Multiple Modes",
      description: "Auto, manual, and smart removal modes for different image types"
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
      title: "Choose Settings",
      description: "Select removal mode and quality settings for optimal results"
    },
    {
      step: "3",
      title: "Remove & Download",
      description: "AI removes the background and generates transparent image"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "15M+", label: "Images Processed" },
    { icon: <Wand2 className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Image className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  // Helper to check for duplicate files by name and size
  const isDuplicate = (file: File, files: File[]) => {
    return files.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
  };

  // Helper to revoke all preview URLs
  const revokeAllPreviewUrls = (urls: string[]) => {
    urls.forEach(url => URL.revokeObjectURL(url));
  };

  // Helper to revoke all processed URLs
  const revokeAllProcessedUrls = (urls: string[]) => {
    urls.forEach(url => URL.revokeObjectURL(url));
  };

  // Hard image dimension limit
  const MAX_DIMENSION = 4096;

  return (
    <>
      <SEO
        title="Background Remover | Transparent Backgrounds in Seconds"
        description="Create transparent images by removing backgrounds online for free. Simple, quick, and perfect for eCommerce, social media, and design."
        keywords="background remover, remove background, AI background removal, transparent background, image background removal, online tool, free tool"
        canonical="background-remover"
        ogImage="/images/background-remover-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Wand2 className="h-4 w-4" />
                <span>AI Background Remover</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Remove Backgrounds
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> with AI</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Remove backgrounds from images instantly with AI technology. 
                Get transparent PNG images with professional quality and multiple removal modes.
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
              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2" role="alert" aria-live="assertive">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    selectedFiles.length > 0 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDragDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label="Upload images by clicking or dragging and dropping"
                  tabIndex={0}
                  onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-upload')?.click(); }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here for background removal
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer (max 10MB each)
                  </p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); document.getElementById('file-upload')?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose Images
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {selectedFiles.length} images selected</p>
                  </div>
                )}
              </div>

              {/* Show thumbnails for batch */}
              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 border rounded-lg overflow-hidden" role="img" aria-label={`Original Preview ${idx+1}`}> 
                      <img src={url} alt={`Preview ${idx+1}`} className="object-cover w-full h-full" />
                      <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
                      {batchErrors[idx] && batchErrors[idx] !== '' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-xs p-1 text-center" role="alert" aria-live="assertive">
                          {batchErrors[idx]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Live Preview Section */}
              {processedUrls.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Live Preview</h3>
                  <div className="flex flex-wrap gap-4">
                    {processedUrls.map((url, idx) => url ? (
                      <div key={idx} className="relative w-32 h-32 border rounded-lg overflow-hidden" role="img" aria-label={`Processed Preview ${idx+1}`}> 
                        <img src={url} alt={`Processed Preview ${idx+1}`} className="object-cover w-full h-full" />
                        {batchErrors[idx] && batchErrors[idx] !== '' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-xs p-1 text-center" role="alert" aria-live="assertive">
                            {batchErrors[idx]}
                          </div>
                        )}
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Settings Panel - SmartCrop style for Background Remover */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Background Remover Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Removal Mode</label>
                    <select
                      value={removalMode}
                      onChange={(e) => setRemovalMode(e.target.value as 'auto' | 'manual' | 'smart')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="auto">Auto Detection</option>
                      <option value="manual">Manual Selection</option>
                      <option value="smart">Smart AI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Quality</label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as 'standard' | 'high' | 'ultra')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="standard">Standard (512px max)</option>
                      <option value="high">High Quality (1024px max)</option>
                      <option value="ultra">Ultra Quality (2048px max)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useGPU"
                      // onChange handler can be added for GPU toggle if supported
                      disabled
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useGPU" className="text-sm font-medium text-gray-700">
                      Use GPU (if available)
                    </label>
                    <Sparkles className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="keepForeground"
                      // onChange handler can be added for future feature
                      disabled
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="keepForeground" className="text-sm font-medium text-gray-700">
                      Keep Foreground Only
                    </label>
                    <Eye className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="debugMode"
                      // onChange handler can be added for debug mode if needed
                      disabled
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="debugMode" className="text-sm font-medium text-gray-700">
                      Debug Mode
                    </label>
                    <EyeOff className="h-4 w-4 text-violet-600" />
                  </div>
                </div>
              </div>

              {/* Action Buttons - SmartCrop style */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={selectedFiles.length > 1 ? processBatch : processImage}
                  disabled={selectedFiles.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Removing Background...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      <span>Remove Background</span>
                    </>
                  )}
                </button>
                {(processedBlobs.length === 1 && processedUrls.length === 1 && processedUrls[0]) && (
                  <button
                    onClick={() => {
                      const url = processedUrls[0];
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedFiles[0]?.name?.replace(/\.[^/.]+$/, '') + '-no-background.png' || 'background-removed.png';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="bg-green-600 text-white px-12 py-4 rounded-2xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-lg shadow-md"
                    style={{ minWidth: '260px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Download className="h-6 w-6 mr-2" />
                    <span>Download Image</span>
                  </button>
                )}
                {processedBlobs.length === selectedFiles.length && selectedFiles.length > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    className="bg-green-600 text-white px-12 py-4 rounded-2xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-lg shadow-md"
                    style={{ minWidth: '260px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Download className="h-6 w-6 mr-2" />
                    <span>Download Images</span>
                  </button>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={previewCanvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Background Remover?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  AI-powered background removal with multiple modes and high-quality output
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
                  How to Remove Backgrounds
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to remove backgrounds from your images
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
                    Ready to Remove Backgrounds?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your images with AI-powered background removal. Join millions of users 
                    who trust our tool for professional results.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Wand2 className="h-5 w-5" />
                    <span>Start Removing Now</span>
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

export default BackgroundRemover;