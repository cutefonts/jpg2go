import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Upload, Download, Settings, FileImage, Zap, Users, Shield, BarChart, CheckCircle2, Target, Sparkles, ArrowRight, Scissors, FileType } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import SEO from './SEO';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import JSZip from 'jszip';
import * as UTIF from 'utif';

// Set the workerSrc for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Notification context for in-app messages
const NotificationContext = createContext<(msg: string, type?: 'error' | 'success') => void>(() => {});

export const useNotification = () => useContext(NotificationContext);

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'error' | 'success'>('success');
  useEffect(() => {
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

// Helper function to detect if a page is a double-page spread
const isDoublePageSpread = (width: number, height: number, threshold: number = 1.7): boolean => {
  const aspectRatio = width / height;
  return aspectRatio > threshold;
};

// Helper function to split a canvas into left and right halves
const splitCanvas = (canvas: HTMLCanvasElement): { left: HTMLCanvasElement, right: HTMLCanvasElement } => {
  const halfWidth = Math.floor(canvas.width / 2);
  
  // Create left canvas
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = halfWidth;
  leftCanvas.height = canvas.height;
  const leftCtx = leftCanvas.getContext('2d');
  if (leftCtx) {
    leftCtx.drawImage(canvas, 0, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);
  }
  
  // Create right canvas
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = halfWidth;
  rightCanvas.height = canvas.height;
  const rightCtx = rightCanvas.getContext('2d');
  if (rightCtx) {
    rightCtx.drawImage(canvas, halfWidth, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);
  }
  
  return { left: leftCanvas, right: rightCanvas };
};

// Helper functions for multi-format support
const getMimeType = (format: string): string => {
  switch (format) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'tiff': return 'image/tiff';
    default: return 'image/jpeg';
  }
};

const getExtension = (format: string): string => {
  switch (format) {
    case 'png': return 'png';
    case 'webp': return 'webp';
    case 'tiff': return 'tiff';
    default: return 'jpg';
  }
};

// Helper function to convert canvas to TIFF using UTIF
const canvasToTIFF = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const rgba = new Uint8Array(imageData.data.buffer);
      const tiffData = UTIF.encodeImage(rgba, canvas.width, canvas.height);
      const blob = new Blob([tiffData], { type: 'image/tiff' });
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
};

const PDFToJPGConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    resolution: 300,
    quality: 90,
    pageRange: 'all',
    includeMetadata: true,
    autoSplitDoublePages: true,
    splitThreshold: 1.7,
    outputFormat: 'jpg' as 'jpg' | 'png' | 'webp' | 'tiff' // New setting for output format
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const prevPreviewUrl = useRef<string | null>(null);
  const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conversionSummary, setConversionSummary] = useState<{ success: number, failed: number, split: number }>({ success: 0, failed: 0, split: 0 });
  const [pageResults, setPageResults] = useState<{ file: string, page: number, status: 'success' | 'fail', message?: string, split?: boolean }[]>([]);
  const notify = useNotification();

  // Enhanced render function with multi-format support
  const renderPageToImage = async (pdf: any, pageNum: number, fileName: string) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: settings.resolution / 72 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    // Check if this is a double-page spread
    const isDoublePage = settings.autoSplitDoublePages && isDoublePageSpread(canvas.width, canvas.height, settings.splitThreshold);
    
    if (isDoublePage) {
      // Split the canvas into left and right halves
      const { left: leftCanvas, right: rightCanvas } = splitCanvas(canvas);
      
      // Create blobs for both halves
      const leftBlob = await createImageBlob(leftCanvas, pageNum, fileName, 'left');
      const rightBlob = await createImageBlob(rightCanvas, pageNum, fileName, 'right');
      
      return [leftBlob, rightBlob];
    } else {
      // Normal single page conversion
      return [await createImageBlob(canvas, pageNum, fileName)];
    }
  };

  // Helper function to create image blob based on selected format
  const createImageBlob = async (canvas: HTMLCanvasElement, pageNum: number, fileName: string, suffix?: string): Promise<{ name: string, blob: Blob }> => {
    const format = settings.outputFormat;
    const ext = getExtension(format);
    const baseName = fileName.replace(/\.pdf$/i, '');
    const suffixPart = suffix ? `_${suffix}` : '';
    
    return new Promise((resolve, reject) => {
      if (format === 'tiff') {
        // Use UTIF for TIFF conversion
        canvasToTIFF(canvas)
          .then(blob => {
            resolve({
              name: `${baseName}_page${pageNum}${suffixPart}.${ext}`,
              blob
            });
          })
          .catch(error => {
            reject(new Error(`Failed to create TIFF blob for page ${pageNum}: ${error.message}`));
          });
      } else {
        // Use native canvas.toBlob for other formats
        const mimeType = getMimeType(format);
        const quality = format === 'jpg' ? settings.quality / 100 : undefined;
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              name: `${baseName}_page${pageNum}${suffixPart}.${ext}`,
              blob
            });
          } else {
            reject(new Error(`Failed to create ${format.toUpperCase()} blob for page ${pageNum}`));
          }
        }, mimeType, quality);
      }
    });
  };

  // Enhanced process function
  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setProgress({ current: 0, total: files.length });
    setConversionSummary({ success: 0, failed: 0, split: 0 });
    setPageResults([]);
    
    try {
      const allProcessed: { name: string, blob: Blob }[] = [];
      let success = 0;
      let failed = 0;
      let split = 0;
      const results: { file: string, page: number, status: 'success' | 'fail', message?: string, split?: boolean }[] = [];
      
      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let pageNums: number[] = [];
          
          if (settings.pageRange === 'all') {
            pageNums = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
          } else {
            const ranges = settings.pageRange.split(',').map(r => r.trim());
            for (const r of ranges) {
              if (r.includes('-')) {
                const [start, end] = r.split('-').map(Number);
                for (let i = start; i <= end; i++) pageNums.push(i);
              } else {
                pageNums.push(Number(r));
              }
            }
            pageNums = pageNums.filter(n => n >= 1 && n <= pdf.numPages);
          }
          
          for (let pageIdx = 0; pageIdx < pageNums.length; pageIdx++) {
            const pageNum = pageNums[pageIdx];
            try {
              const images = await renderPageToImage(pdf, pageNum, file.name);
              allProcessed.push(...images);
              success += images.length;
              
              if (images.length > 1) {
                split++;
                results.push({ 
                  file: file.name, 
                  page: pageNum, 
                  status: 'success', 
                  split: true 
                });
              } else {
                results.push({ 
                  file: file.name, 
                  page: pageNum, 
                  status: 'success', 
                  split: false 
                });
              }
            } catch (pageErr) {
              setErrorMsg(`Failed to process page ${pageNum} of ${file.name}: ${pageErr}`);
              failed++;
              results.push({ file: file.name, page: pageNum, status: 'fail', message: String(pageErr) });
              console.error(`Failed to process page ${pageNum} of ${file.name}:`, pageErr);
            }
            setProgress({ current: fileIdx + (pageIdx + 1) / pageNums.length, total: files.length });
          }
        } catch (fileErr) {
          setErrorMsg(`Failed to process file ${file.name}: ${fileErr}`);
          failed++;
          results.push({ file: file.name, page: -1, status: 'fail', message: String(fileErr) });
          notify(`Failed to process file ${file.name}: ${fileErr}`, 'error');
        }
        setProgress({ current: fileIdx + 1, total: files.length });
      }
      
      setProcessedFiles(allProcessed);
      setIsProcessing(false);
      setIsDownloadReady(allProcessed.length > 0);
      setProgress(null);
      setConversionSummary({ success, failed, split });
      setPageResults(results);
      
      if (allProcessed.length === 0) {
        setErrorMsg('No valid PDF pages were processed. Please check your files.');
        notify('No valid PDF pages were processed. Please check your files.', 'error');
      } else {
        const formatText = settings.outputFormat.toUpperCase();
        const splitMessage = split > 0 ? ` (${split} double-page spreads split)` : '';
        notify(`PDF to ${formatText} conversion completed! ${success} images created${splitMessage}`, 'success');
      }
    } catch (error) {
      setErrorMsg('Error processing files. Please try again.');
      setIsProcessing(false);
      setProgress(null);
      setConversionSummary({ success: 0, failed: files.length, split: 0 });
      setPageResults([]);
      notify('Error processing files. Please try again.', 'error');
    }
  };

  // Enhanced preview function
  const processPreview = useCallback(async () => {
    if (files.length === 0) return;
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: settings.resolution / 72 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
      
      // Check if preview should show split indication
      const isDoublePage = settings.autoSplitDoublePages && isDoublePageSpread(canvas.width, canvas.height, settings.splitThreshold);
      
      if (isDoublePage) {
        // Show split preview (left half)
        const { left: leftCanvas } = splitCanvas(canvas);
        createPreviewBlob(leftCanvas);
      } else {
        // Normal preview
        createPreviewBlob(canvas);
      }
    } catch (e) {
      setPreviewUrl(null);
    }
  }, [files, settings]);

  // Helper function to create preview blob
  const createPreviewBlob = (canvas: HTMLCanvasElement) => {
    const format = settings.outputFormat;
    const mimeType = getMimeType(format);
    const quality = format === 'jpg' ? settings.quality / 100 : undefined;
    
    if (format === 'tiff') {
      // For preview, convert TIFF to PNG for browser compatibility
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
          setPreviewUrl(url);
          prevPreviewUrl.current = url;
        }
      }, 'image/png');
    } else {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
          setPreviewUrl(url);
          prevPreviewUrl.current = url;
        }
      }, mimeType, quality);
    }
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    setFiles(pdfFiles);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    setPreviewUrl(null);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfFiles]);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    setPreviewUrl(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOverFile = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setFiles(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(index, 0, removed);
      return updated;
    });
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  // Download function
  const downloadAll = async () => {
    if (processedFiles.length === 0) {
      notify('No processed files to download', 'error');
      return;
    }
    const nonEmptyFiles = processedFiles.filter(f => f.blob.size > 0);
    if (nonEmptyFiles.length === 0) {
      notify('All output files are empty. Conversion failed.', 'error');
      return;
    }
    if (nonEmptyFiles.length === 1) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(nonEmptyFiles[0].blob);
      link.download = nonEmptyFiles[0].name;
      link.click();
    } else {
      const zip = new JSZip();
      nonEmptyFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      const format = settings.outputFormat.toUpperCase();
      link.href = URL.createObjectURL(zipBlob);
      link.download = `pdf-to-${format.toLowerCase()}-images.zip`;
      link.click();
    }
    setFiles([]);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    setPreviewUrl(null);
  };

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    }
  }, [processPreview]);

  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    };
  }, []);

  const features = [
    {
      icon: <FileImage className="h-6 w-6" />,
      title: "Multi-Format Conversion",
      description: "Convert PDF pages to JPG, PNG, WebP, or TIFF formats with high quality"
    },
    {
      icon: <Scissors className="h-6 w-6" />,
      title: "Auto-Split Double Pages",
      description: "Automatically detect and split double-page spreads into separate images"
    },
    {
      icon: <FileType className="h-6 w-6" />,
      title: "Format Flexibility",
      description: "Choose the perfect format for your needs - lossy or lossless compression"
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "High Resolution Output",
      description: "Convert PDF pages to crisp, high-resolution images up to 300 DPI"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "Batch Processing",
      description: "Convert multiple PDF pages or entire documents in one operation"
    }
  ];

  const formatInfo = {
    jpg: { name: 'JPG', description: 'Lossy compression, smaller file size', quality: true },
    png: { name: 'PNG', description: 'Lossless compression, supports transparency', quality: false },
    webp: { name: 'WebP', description: 'Modern format, excellent compression', quality: true },
    tiff: { name: 'TIFF', description: 'High quality, professional format', quality: false }
  };

  return (
    <>
      <SEO
        title="PDF to Image Converter | Multi-Format Export (JPG, PNG, WebP, TIFF)"
        description="Convert your PDF to multiple image formats: JPG, PNG, WebP, and TIFF. Extract pages with automatic double-page splitting. No registration, no watermarks."
        keywords="PDF to JPG, PDF to PNG, PDF to WebP, PDF to TIFF, PDF to image converter, PDF converter, multi-format converter"
        canonical="pdf-to-image"
        ogImage="/images/pdf-to-image-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>Multi-Format PDF to Image Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF to Image Converter
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your PDF documents to JPG, PNG, WebP, or TIFF formats with automatic double-page splitting, 
                precise page rendering, and batch processing capabilities.
              </p>

              {/* Stats Bar (Crop-Image Style) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <BarChart className="h-5 w-5 text-violet-600" />
                    <span className="text-2xl font-bold text-gray-900">300 DPI</span>
                  </div>
                  <div className="text-sm text-gray-600">Max Resolution</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-violet-600" />
                    <span className="text-2xl font-bold text-gray-900">1-100%</span>
                  </div>
                  <div className="text-sm text-gray-600">Quality Range</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Zap className="h-5 w-5 text-violet-600" />
                    <span className="text-2xl font-bold text-gray-900">Unlimited</span>
                  </div>
                  <div className="text-sm text-gray-600">Batch Support</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <span className="text-2xl font-bold text-gray-900">&lt; 30s</span>
                  </div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
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
                  <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF file here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Live Preview Section */}
              {previewUrl && (
                <div className="mb-8 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Preview</h3>
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="PDF to Image Preview"
                      className="rounded-xl shadow-lg max-w-xs max-h-80 border border-violet-200"
                      style={{ background: '#f3f4f6' }}
                    />
                    {settings.autoSplitDoublePages && (
                      <div className="absolute top-2 right-2 bg-violet-600 text-white px-2 py-1 rounded text-xs">
                        Auto-Split Enabled
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      {formatInfo[settings.outputFormat].name}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Preview updates instantly as you change settings</p>
                </div>
              )}

              {/* Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      value={settings.outputFormat}
                      onChange={(e) => setSettings(prev => ({ ...prev, outputFormat: e.target.value as 'jpg' | 'png' | 'webp' | 'tiff' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="jpg">JPG - Lossy compression, smaller files</option>
                      <option value="png">PNG - Lossless, supports transparency</option>
                      <option value="webp">WebP - Modern format, excellent compression</option>
                      <option value="tiff">TIFF - High quality, professional format</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatInfo[settings.outputFormat].description}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution (DPI)
                    </label>
                    <select
                      value={settings.resolution}
                      onChange={(e) => setSettings(prev => ({ ...prev, resolution: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={72}>72 DPI (Web)</option>
                      <option value={150}>150 DPI (Print)</option>
                      <option value={300}>300 DPI (High Quality)</option>
                      <option value={600}>600 DPI (Ultra High)</option>
                    </select>
                  </div>
                </div>
                
                {/* Quality slider (only for formats that support it) */}
                {(formatInfo[settings.outputFormat].quality) && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality (%)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600 mt-1">{settings.quality}%</div>
                  </div>
                )}
                
                {/* Auto-Split Double Pages Setting */}
                <div className="mt-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoSplit"
                      checked={settings.autoSplitDoublePages}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoSplitDoublePages: e.target.checked }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoSplit" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <Scissors className="h-4 w-4 text-violet-600" />
                      <span>Auto-split double-page spreads</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Automatically detect and split wide pages (like book spreads) into two separate images
                  </p>
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
                    <span>Converting...</span>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5" />
                      <span>Convert to {formatInfo[settings.outputFormat].name}</span>
                    </>
                  )}
                </button>
                
                {isDownloadReady && (
                  <button
                    onClick={downloadAll}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <div className="text-violet-600 mb-4">
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

            {/* How to Convert Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PDF to Images</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Follow these simple steps to convert your PDF documents to high-quality images in multiple formats
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload PDF</h3>
                  <p className="text-gray-600">
                    Drag and drop your PDF file or click to browse and select from your computer
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Choose Settings</h3>
                  <p className="text-gray-600">
                    Select your preferred format (JPG, PNG, WebP, TIFF), resolution, and quality settings
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Download Images</h3>
                  <p className="text-gray-600">
                    Click convert and download your images as individual files or a ZIP archive
                  </p>
                </div>
              </div>
            </div>

            {/* Format Comparison Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose the Right Format</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Each format has its advantages. Select the one that best fits your needs
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                  <div className="text-center mb-4">
                    <div className="bg-yellow-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      JPG
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">JPEG Format</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Smaller file sizes</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Wide compatibility</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Adjustable quality</span>
                    </li>
                    <li className="flex items-start text-red-600">
                      <span className="mr-2">⚠</span>
                      <span>Lossy compression</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="text-center mb-4">
                    <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      PNG
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">PNG Format</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Lossless quality</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Transparency support</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Perfect for graphics</span>
                    </li>
                    <li className="flex items-start text-red-600">
                      <span className="mr-2">⚠</span>
                      <span>Larger file sizes</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <div className="text-center mb-4">
                    <div className="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      WebP
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">WebP Format</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Excellent compression</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Modern web standard</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Transparency support</span>
                    </li>
                    <li className="flex items-start text-red-600">
                      <span className="mr-2">⚠</span>
                      <span>Limited browser support</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
                  <div className="text-center mb-4">
                    <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                      TIFF
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">TIFF Format</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Professional quality</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Print-ready format</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>High color depth</span>
                    </li>
                    <li className="flex items-start text-red-600">
                      <span className="mr-2">⚠</span>
                      <span>Very large files</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 mb-16 text-white">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Trusted by Millions</h2>
                <p className="text-xl opacity-90">
                  Join thousands of users who convert PDFs to images daily
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold mb-2">10M+</div>
                  <div className="text-lg opacity-90">Files Converted</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">500K+</div>
                  <div className="text-lg opacity-90">Happy Users</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">99.9%</div>
                  <div className="text-lg opacity-90">Success Rate</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">24/7</div>
                  <div className="text-lg opacity-90">Available</div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white text-center mb-16 shadow-lg">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert Your PDFs?</h2>
              <p className="text-lg sm:text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
                Convert your PDF documents to high-quality images in seconds. Join thousands of users who trust our PDF to Image tool for perfect results every time.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-violet-600 border-2 border-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-violet-50 transition-all duration-200 shadow flex items-center justify-center space-x-2 mx-auto text-lg"
              >
                <FileImage className="h-5 w-5" />
                <span>Start Converting Now</span>
              </button>
            </div>

            {/* Progress and Results */}
            {progress && (
              <div className="mb-4 w-full">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-2 bg-violet-500" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">Processing {progress.current} of {progress.total} files...</div>
              </div>
            )}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}
            {conversionSummary.success + conversionSummary.failed > 0 && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                Conversion summary: {conversionSummary.success} image(s) created, {conversionSummary.failed} failed.
                {conversionSummary.split > 0 && <span className="text-violet-600 ml-2">{conversionSummary.split} double-page spreads were split.</span>}
                {conversionSummary.failed > 0 && <span className="text-red-600 ml-2">Some pages could not be processed.</span>}
              </div>
            )}
            {pageResults.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 text-gray-800 rounded-lg border border-gray-200 max-h-60 overflow-y-auto text-xs">
                <div className="font-bold mb-1">Per-page results:</div>
                <ul>
                  {pageResults.map((res, idx) => (
                    <li key={idx} className={res.status === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {res.status === 'success'
                        ? `✔️ ${res.file} - page ${res.page} converted successfully${res.split ? ' (split into 2 images)' : ''}.`
                        : `❌ ${res.file} - page ${res.page > 0 ? res.page : ''} failed: ${res.message}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

// Wrap the main export with NotificationProvider
const PDFToJPGConverterWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFToJPGConverter />
  </NotificationProvider>
);

export default PDFToJPGConverterWithProvider;
