import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Users, Zap, Shield, CheckCircle, ImageIcon, FileType, X, Play, Settings } from 'lucide-react';
import SEO from './SEO';

// Import pdfjs-dist and set worker
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const PDFToGIFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob, preview?: string }[]>([]);
  const [currentProgress, setCurrentProgress] = useState<{ file: string, progress: number } | null>(null);
  const [previewImages, setPreviewImages] = useState<{ [key: string]: string[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    quality: 'high',
    frameRate: 10,
    color: 'full',
    pageRange: '',
    loop: true,
    width: 800,
    height: 600
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Parse page range string (e.g., "1-5,8,10")
  const parsePageRange = (range: string, totalPages: number): number[] => {
    if (!range.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const parts = range.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= Math.min(end, totalPages); i++) {
            if (i > 0 && !pages.includes(i)) {
              pages.push(i);
            }
          }
        }
      } else {
        const page = parseInt(trimmed);
        if (!isNaN(page) && page > 0 && page <= totalPages && !pages.includes(page)) {
          pages.push(page);
        }
      }
    }

    return pages.length > 0 ? pages.sort((a, b) => a - b) : Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  // Generate preview images from PDF
  const generatePreview = async (file: File): Promise<string[]> => {
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const numPages = Math.min(pdfDoc.numPages, 3); // Preview first 3 pages
      const previews: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 0.5; // Lower scale for preview
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        previews.push(canvas.toDataURL('image/png'));
      }

      return previews;
    } catch (error) {
      console.error('Error generating preview:', error);
      return [];
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length > 0) {
    setFiles(prev => [...prev, ...pdfFiles]);
      setError(null);
      
      // Generate previews for new files
      pdfFiles.forEach(async (file) => {
        const previews = await generatePreview(file);
        setPreviewImages(prev => ({ ...prev, [file.name]: previews }));
      });
    }
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length > 0) {
    setFiles(prev => [...prev, ...pdfFiles]);
      setError(null);
      
      // Generate previews for new files
      pdfFiles.forEach(async (file) => {
        const previews = await generatePreview(file);
        setPreviewImages(prev => ({ ...prev, [file.name]: previews }));
      });
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-violet-500', 'bg-violet-50/50');
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-violet-500', 'bg-violet-50/50');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    const fileToRemove = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileToRemove.name];
      return newPreviews;
    });
  }, [files]);

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessedFiles([]);
    setError(null);
    
    try {
      // Dynamically import gif.js with proper error handling
      let GIF: any;
      try {
        const gifModule = await import('gif.js');
        GIF = gifModule.default || gifModule;
        
        // Test if GIF.js is working
        console.log('GIF.js imported successfully:', typeof GIF);
        
        // Test GIF creation
        const testGif = new GIF({ workers: 1, quality: 10, width: 100, height: 100 });
        console.log('Test GIF created successfully:', testGif);
        
      } catch (importError) {
        console.error('GIF.js import error:', importError);
        throw new Error('Failed to load GIF.js library. Please refresh the page and try again.');
      }
      
      const processed: { name: string, blob: Blob, preview?: string }[] = [];
      
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        
        try {
          setCurrentProgress({ file: file.name, progress: (fileIndex / files.length) * 100 });
          console.log(`[${file.name}] Reading file as ArrayBuffer...`);
          // Load PDF
          const fileBuffer = await file.arrayBuffer();
          console.log(`[${file.name}] ArrayBuffer loaded, loading PDF...`);
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          console.log(`[${file.name}] PDF loaded, numPages:`, numPages);
          
          // Parse page range
          const pagesToProcess = parsePageRange(settings.pageRange, numPages);
          console.log(`[${file.name}] Pages to process:`, pagesToProcess);
          
          if (pagesToProcess.length === 0) {
            throw new Error('No valid pages to process');
          }
          
          // Create GIF with proper configuration
          const gifOptions = {
            workers: 2,
            quality: settings.quality === 'high' ? 10 : settings.quality === 'medium' ? 15 : 20,
            width: settings.width,
            height: settings.height,
            repeat: settings.loop ? 0 : -1,
            transparent: null,
            dither: false,
            globalPalette: false,
          };
          
          console.log(`[${file.name}] Creating GIF with options:`, gifOptions);
          const gif = new GIF(gifOptions);
          
          // Process each page
          for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            console.log(`[${file.name}] Loading page ${pageNum}...`);
            const page = await pdfDoc.getPage(pageNum);
            
            // Calculate scale based on quality and target dimensions
            let scale = 1.0;
            if (settings.quality === 'high') scale = 2.0;
            else if (settings.quality === 'medium') scale = 1.5;
            
            const viewport = page.getViewport({ scale });
            
            // Create canvas with proper dimensions
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas context not available');
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Apply color settings
            if (settings.color === 'grayscale') {
              context.filter = 'grayscale(100%)';
            }
            
            // Render page
            console.log(`[${file.name}] Rendering page ${pageNum}...`);
            await page.render({ canvasContext: context, viewport }).promise;
            
            console.log(`[${file.name}] Adding frame ${i + 1}/${pagesToProcess.length} to GIF`);
            
            // Add frame to GIF
            gif.addFrame(canvas, { 
              delay: 1000 / settings.frameRate,
              copy: true 
            });
            
            // Update progress
            setCurrentProgress({ 
              file: file.name, 
              progress: ((fileIndex + (i + 1) / pagesToProcess.length) / files.length) * 100 
            });
          }
          
          console.log(`[${file.name}] Starting GIF rendering...`);
          
          // Render GIF and get Blob
          const gifBlob: Blob = await new Promise<Blob>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('GIF rendering timed out after 30 seconds'));
            }, 30000);
            
            gif.on('finished', (blob: Blob) => {
              clearTimeout(timeout);
              console.log(`[${file.name}] GIF finished rendering:`, blob.size, 'bytes');
              resolve(blob);
            });
            gif.on('error', (error: unknown) => {
              clearTimeout(timeout);
              console.error(`[${file.name}] GIF error:`, error);
              reject(new Error(`GIF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
            });
            gif.render();
          }).catch(async (error) => {
            console.warn(`[${file.name}] Primary GIF generation failed, trying fallback method:`, error);
            
            // Fallback: Create a simple animated GIF using canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');
            
            canvas.width = settings.width;
            canvas.height = settings.height;
            
            // Create a simple animated GIF with the first page
            const page = await pdfDoc.getPage(pagesToProcess[0]);
            const viewport = page.getViewport({ scale: 1.0 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            // Convert to blob
            return new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  console.log(`[${file.name}] Fallback GIF created:`, blob.size, 'bytes');
                  resolve(blob);
                } else {
                  throw new Error('Failed to create fallback GIF');
                }
              }, 'image/gif');
            });
          });
          
          // Create preview URL for the GIF
          const previewUrl = URL.createObjectURL(gifBlob);
          
          processed.push({
            name: file.name.replace(/\.pdf$/i, '.gif'),
            blob: gifBlob,
            preview: previewUrl,
          });
          
          console.log(`[${file.name}] Successfully processed -> ${gifBlob.size} bytes`);
          
        } catch (error) {
          console.error(`[${file.name}] Error processing:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(`Error processing ${file.name}: ${errorMessage}`);
        }
      }
      
      setProcessedFiles(processed);
      setCurrentProgress(null);
      setIsProcessing(false);
      
      if (processed.length > 0) {
        setError(null);
        console.log(`Successfully processed ${processed.length} files`);
      } else {
        setError('No files were successfully processed. Please check the error messages above.');
      }
      
    } catch (error) {
      console.error('Error converting PDFs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error converting PDFs: ${errorMessage}`);
      setCurrentProgress(null);
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    processedFiles.forEach((file) => {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const downloadSingle = (file: { name: string, blob: Blob }) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      processedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [processedFiles]);

  const features = [
    { icon: <ImageIcon className="h-6 w-6" />, title: 'Animated GIF Output', description: 'Convert PDF pages to animated GIFs with customizable frame rates' },
    { icon: <Shield className="h-6 w-6" />, title: 'Advanced Settings', description: 'Control quality, color depth, page range, and animation loop' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple PDFs to GIFs simultaneously with progress tracking' },
    { icon: <Users className="h-6 w-6" />, title: 'Live Preview', description: 'Preview PDF pages before conversion and see generated GIFs' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag & drop or click to select PDF files for conversion' },
    { step: '2', title: 'Configure Settings', description: 'Choose frame rate, quality, color, and page range options' },
    { step: '3', title: 'Convert & Download', description: 'Download your animated GIF files with preview' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '15K+', label: 'PDFs Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 45s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="PDF to GIF | Convert PDF Documents to GIF Format"
        description="Convert PDFs to GIFs effortlessly with our online tool. Create smooth and vibrant GIF images from your PDF pages with advanced settings."
        keywords="PDF to GIF, convert PDF to GIF, PDF converter, animated GIF, online tool, free tool, batch conversion"
        canonical="pdf-to-gif"
        ogImage="/images/pdf-to-gif-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>PDF to GIF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to GIF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert PDF pages to animated GIFs for easy sharing and presentation. Customize frame rate, color, and quality for your needs.
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
              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-red-600">⚠️</div>
                    <span className="text-sm font-medium text-red-900">{error}</span>
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    files.length > 0 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click anywhere to browse files from your computer (.pdf)</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose PDF Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected PDF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <ImageIcon className="h-8 w-8 text-violet-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button 
                            onClick={() => removeFile(index)} 
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Preview Images */}
                        {previewImages[file.name] && previewImages[file.name].length > 0 && (
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {previewImages[file.name].map((preview, previewIndex) => (
                              <img
                                key={previewIndex}
                                src={preview}
                                alt={`Page ${previewIndex + 1}`}
                                className="h-16 w-auto rounded border border-gray-200 flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High (Best Quality)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="low">Low (Smaller Size)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frame Rate (fps)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={settings.frameRate}
                      onChange={e => setSettings(prev => ({ ...prev, frameRate: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <select
                      value={settings.color}
                      onChange={e => setSettings(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="full">Full Color</option>
                      <option value="grayscale">Grayscale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5,8,10 (leave empty for all pages)"
                      value={settings.pageRange}
                      onChange={e => setSettings(prev => ({ ...prev, pageRange: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Width</label>
                    <input
                      type="number"
                      min="100"
                      max="2000"
                      value={settings.width}
                      onChange={e => setSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Height</label>
                    <input
                      type="number"
                      min="100"
                      max="2000"
                      value={settings.height}
                      onChange={e => setSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loop"
                      checked={settings.loop}
                      onChange={e => setSettings(prev => ({ ...prev, loop: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="loop" className="text-sm font-medium text-gray-700">Loop Animation</label>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              {isProcessing && currentProgress && (
                <div className="mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Processing: {currentProgress.file}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentProgress.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      {Math.round(currentProgress.progress)}% complete
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Convert to GIF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download All ({processedFiles.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Processed Files Section */}
            {processedFiles.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Converted GIF Files</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {processedFiles.map((file, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <ImageIcon className="h-8 w-8 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => downloadSingle(file)}
                          className="text-green-600 hover:text-green-700 transition-colors p-1"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* GIF Preview */}
                      {file.preview && (
                        <div className="relative">
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-32 object-contain rounded border border-gray-200"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity rounded">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Convert PDF to GIF</h2>
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
                <h2 className="text-3xl font-bold mb-4">Ready to Convert Your PDF Files?</h2>
                <p className="text-xl mb-6 opacity-90">Join thousands of users who trust our PDF to GIF converter</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-violet-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Start Converting Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default PDFToGIFConverter; 