import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Upload, Download, Settings, FileImage, Zap, Users, Shield, BarChart, CheckCircle2, Target, Sparkles, ArrowRight, Scissors } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import SEO from './SEO';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import JSZip from 'jszip';

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

const PDFToJPGConverterEnhanced: React.FC = () => {
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
    autoSplitDoublePages: true, // New setting for auto-splitting
    splitThreshold: 1.7 // Aspect ratio threshold for detecting double pages
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const prevPreviewUrl = useRef<string | null>(null);
  const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conversionSummary, setConversionSummary] = useState<{ success: number, failed: number, split: number }>({ success: 0, failed: 0, split: 0 });
  const [pageResults, setPageResults] = useState<{ file: string, page: number, status: 'success' | 'fail', message?: string, split?: boolean }[]>([]);
  const notify = useNotification();

  // Enhanced render function with auto-split capability
  const renderPageToJPG = async (pdf: any, pageNum: number, fileName: string) => {
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
      const leftBlob = await new Promise<Blob>((resolve, reject) => {
        leftCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`Failed to create left JPG blob for page ${pageNum}`));
        }, 'image/jpeg', settings.quality / 100);
      });
      
      const rightBlob = await new Promise<Blob>((resolve, reject) => {
        rightCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`Failed to create right JPG blob for page ${pageNum}`));
        }, 'image/jpeg', settings.quality / 100);
      });
      
      return [
        {
          name: `${fileName.replace(/\.pdf$/i, '')}_page${pageNum}_left.jpg`,
          blob: leftBlob
        },
        {
          name: `${fileName.replace(/\.pdf$/i, '')}_page${pageNum}_right.jpg`,
          blob: rightBlob
        }
      ];
    } else {
      // Normal single page conversion
      return [await new Promise<{ name: string, blob: Blob }>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              name: `${fileName.replace(/\.pdf$/i, '')}_page${pageNum}.jpg`,
              blob
            });
          } else {
            reject(new Error(`Failed to create JPG blob for page ${pageNum}`));
          }
        }, 'image/jpeg', settings.quality / 100);
      })];
    }
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
              const jpgs = await renderPageToJPG(pdf, pageNum, file.name);
              allProcessed.push(...jpgs);
              success += jpgs.length;
              
              if (jpgs.length > 1) {
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
        const splitMessage = split > 0 ? ` (${split} double-page spreads split)` : '';
        notify(`PDF to JPG conversion completed! ${success} images created${splitMessage}`, 'success');
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
        leftCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
            setPreviewUrl(url);
            prevPreviewUrl.current = url;
          }
        }, 'image/jpeg', settings.quality / 100);
      } else {
        // Normal preview
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
            setPreviewUrl(url);
            prevPreviewUrl.current = url;
          }
        }, 'image/jpeg', settings.quality / 100);
      }
    } catch (e) {
      setPreviewUrl(null);
    }
  }, [files, settings]);

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
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'pdf-to-jpg-images.zip';
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
      title: "PDF to Image Conversion",
      description: "Extract high-quality images from PDF documents with precise page rendering"
    },
    {
      icon: <Scissors className="h-6 w-6" />,
      title: "Auto-Split Double Pages",
      description: "Automatically detect and split double-page spreads into separate images"
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "High Resolution Output",
      description: "Convert PDF pages to crisp, high-resolution JPG images up to 300 DPI"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: "Batch Processing",
      description: "Convert multiple PDF pages or entire documents in one operation"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    }
  ];

  return (
    <>
      <SEO
        title="PDF to JPG Converter | Save PDF as Images with Auto-Split"
        description="Easily convert your PDF to JPG format with automatic double-page splitting. Extract pages or images in seconds. No registration, no watermarks just fast, free conversion."
        keywords="PDF to JPG, PDF to image converter, PDF converter, PDF to photo, PDF page to image, online PDF converter, free converter, double page split"
        canonical="pdf-to-jpg"
        ogImage="/images/pdf-to-jpg-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>Enhanced PDF to JPG Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF to JPG Converter with Auto-Split
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract high-quality JPG images from PDF documents with automatic double-page splitting, 
                precise page rendering, and batch processing capabilities.
              </p>
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
                      alt="PDF to JPG Preview"
                      className="rounded-xl shadow-lg max-w-xs max-h-80 border border-violet-200"
                      style={{ background: '#f3f4f6' }}
                    />
                    {settings.autoSplitDoublePages && (
                      <div className="absolute top-2 right-2 bg-violet-600 text-white px-2 py-1 rounded text-xs">
                        Auto-Split Enabled
                      </div>
                    )}
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
                  <div>
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
                </div>
                
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
                      <span>Convert to JPG</span>
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
const PDFToJPGConverterEnhancedWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFToJPGConverterEnhanced />
  </NotificationProvider>
);

export default PDFToJPGConverterEnhancedWithProvider; 