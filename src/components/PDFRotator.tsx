import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFRotator: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    rotationAngle: 90,
    rotateAllPages: true,
    specificPages: '',
    maintainQuality: true,
    autoDetectOrientation: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [numPreviewPages, setNumPreviewPages] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Validate page range input
  const validatePageRange = (input: string): string => {
    if (!input.trim()) return '';
    
    const parts = input.split(',').map(part => part.trim());
    const validParts = parts.filter(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        return !isNaN(start) && !isNaN(end) && start > 0 && end >= start;
      } else {
        const num = Number(part);
        return !isNaN(num) && num > 0;
      }
    });
    
    return validParts.join(', ');
  };

  // Parse page range string (e.g., "1-5, 8, 10-15")
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= totalPages) {
              pages.add(i);
            }
          }
        }
      } else {
        const pageNum = Number(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Load the PDF file
          const fileBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          const pageCount = pdf.getPageCount();
          
          // Parse specific pages if provided
          let pagesToRotate: number[] = [];
          if (!settings.rotateAllPages && settings.specificPages.trim()) {
            const parsedPages = parsePageRange(settings.specificPages, pageCount);
            pagesToRotate = parsedPages.map(pageNum => pageNum - 1); // Convert to 0-based index
          } else if (settings.rotateAllPages) {
            // Rotate all pages
            pagesToRotate = Array.from({ length: pageCount }, (_, i) => i);
          }
          
          if (pagesToRotate.length === 0) {
            console.warn(`No valid pages found for rotation in ${file.name}`);
            continue;
          }
          
          // Apply rotation to specified pages
          for (const pageIndex of pagesToRotate) {
            const page = pdf.getPage(pageIndex);
            
            if (settings.autoDetectOrientation) {
              // Auto-detect orientation based on page dimensions
              const { width, height } = page.getSize();
              const currentRotation = page.getRotation().angle;
              
              // If page is wider than tall and rotated 0° or 180°, rotate 90° clockwise
              // If page is taller than wide and rotated 90° or 270°, rotate 90° clockwise
              if ((width > height && (currentRotation === 0 || currentRotation === 180)) ||
                  (height > width && (currentRotation === 90 || currentRotation === 270))) {
                const newRotation = (currentRotation + 90) % 360;
                page.setRotation({ angle: newRotation, type: 'degrees' as any });
              }
            } else {
              // Manual rotation
              const currentRotation = page.getRotation().angle;
              const newRotation = (currentRotation + settings.rotationAngle) % 360;
              page.setRotation({ angle: newRotation, type: 'degrees' as any });
            }
          }
          
          // Save the rotated PDF with quality settings
          const saveOptions = settings.maintainQuality ? {
            useObjectStreams: false,
            addDefaultPage: false,
            objectsPerTick: 20
          } : {
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
          };
          
          const rotatedPdfBytes = await pdf.save(saveOptions);
          const blob = new Blob([rotatedPdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: `rotated_${file.name}`,
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      
      if (processed.length > 0) {
        alert(`PDF rotation completed! Processed ${processed.length} files.`);
      } else {
        alert('No files were successfully processed. Please check your settings and try again.');
      }
      
    } catch (error) {
      console.error('Error rotating PDFs:', error);
      setIsProcessing(false);
      alert('Error rotating PDFs. Please try again.');
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

  const features = [
    { icon: <RotateCcw className="h-6 w-6" />, title: 'Smart Rotation', description: 'Rotate PDFs by 90°, 180°, or 270°' },
    { icon: <Shield className="h-6 w-6" />, title: 'Selective Rotation', description: 'Rotate specific pages or all pages' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Rotate multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to rotate' },
    { step: '2', title: 'Choose Rotation', description: 'Select rotation angle and pages' },
    { step: '3', title: 'Rotate & Download', description: 'Download your rotated PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '180K+', label: 'PDFs Rotated' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const renderPreview = async () => {
      if (files.length === 0) {
        setPreviewImage(null);
        setNumPreviewPages(1);
        return;
      }
      setPreviewLoading(true);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setNumPreviewPages(pdf.numPages);
        let pageNum = previewPage;
        if (pageNum < 1) pageNum = 1;
        if (pageNum > pdf.numPages) pageNum = pdf.numPages;
        const page = await pdf.getPage(pageNum);
        // Calculate scale for preview
        const scale = 1.2;
        const viewport = page.getViewport({ scale });
        // Render to canvas
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Render PDF page
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Apply rotation (manual or auto-detect)
        let rotation = 0;
        if (settings.autoDetectOrientation) {
          const { width, height } = viewport;
          // Simulate auto-detect logic
          if ((width > height && (rotation === 0 || rotation === 180)) ||
              (height > width && (rotation === 90 || rotation === 270))) {
            rotation = 90;
          }
        } else {
          rotation = settings.rotationAngle;
        }
        if (rotation !== 0) {
          // Copy canvas to temp, rotate, and draw back
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
          // Resize canvas for rotation
          if (rotation === 90 || rotation === 270) {
            canvas.width = viewport.height;
            canvas.height = viewport.width;
          }
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Move to center and rotate
          if (rotation === 90) {
            ctx.translate(canvas.width, 0);
            ctx.rotate((Math.PI / 180) * 90);
          } else if (rotation === 180) {
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
          } else if (rotation === 270) {
            ctx.translate(0, canvas.height);
            ctx.rotate((Math.PI / 180) * 270);
          }
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.restore();
        }
        // Set preview image (for fallback)
        setPreviewImage(canvas.toDataURL('image/png'));
      } catch (err) {
        setPreviewImage(null);
      }
      setPreviewLoading(false);
    };
    renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, previewPage, settings.rotationAngle, settings.autoDetectOrientation]);

  return (
    <>
      <SEO 
        title="PDF Rotator | Rotate PDF Pages Online Free"
        description="Quickly rotate PDF pages online with our free PDF rotator tool. Easily fix page orientation issues—no downloads or sign-up required."
        keywords="PDF rotator, rotate PDF pages, fix orientation, turn pages, PDF rotation, online tool, free tool"
        canonical="pdf-rotator"
        ogImage="/images/pdf-rotator-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <RotateCcw className="h-4 w-4" />
                <span>PDF Rotator</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Rotate PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Rotate PDF documents to the correct orientation. Perfect for fixing scanned documents, adjusting page layouts, or preparing files for printing.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {files.length === 0 ? (
                    <p className="text-gray-500">Upload a PDF to preview rotation.</p>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="mb-2 flex items-center space-x-2">
                        <label htmlFor="previewPage" className="text-sm text-gray-700">Page:</label>
                        <input
                          id="previewPage"
                          type="number"
                          min={1}
                          max={numPreviewPages}
                          value={previewPage}
                          onChange={e => setPreviewPage(Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded"
                          disabled={previewLoading}
                        />
                        <span className="text-xs text-gray-500">/ {numPreviewPages}</span>
                      </div>
                      <div style={{ position: 'relative', minHeight: 300 }}>
                        <canvas ref={previewCanvasRef} style={{ maxWidth: 400, maxHeight: 500, border: '1px solid #ddd', background: '#fff' }} />
                        {previewLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                            <span className="text-violet-600 animate-pulse">Loading preview...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rotation Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Rotation Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rotation Angle</label>
                    <select
                      value={settings.rotationAngle}
                      onChange={e => setSettings(prev => ({ ...prev, rotationAngle: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      disabled={settings.autoDetectOrientation}
                    >
                      <option value={90}>90° Clockwise</option>
                      <option value={180}>180° (Upside Down)</option>
                      <option value={270}>90° Counter-clockwise</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Choose rotation direction</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specific Pages</label>
                    <input
                      type="text"
                      value={settings.specificPages}
                      onChange={e => setSettings(prev => ({ ...prev, specificPages: validatePageRange(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 1, 3-5, 7"
                      disabled={settings.rotateAllPages}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to rotate all pages</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="rotateAllPages"
                      checked={settings.rotateAllPages}
                      onChange={e => setSettings(prev => ({ ...prev, rotateAllPages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rotateAllPages" className="text-sm font-medium text-gray-700">Rotate All Pages</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoDetectOrientation"
                      checked={settings.autoDetectOrientation}
                      onChange={e => setSettings(prev => ({ ...prev, autoDetectOrientation: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoDetectOrientation" className="text-sm font-medium text-gray-700">Auto-detect Orientation</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainQuality"
                      checked={settings.maintainQuality}
                      onChange={e => setSettings(prev => ({ ...prev, maintainQuality: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainQuality" className="text-sm font-medium text-gray-700">Maintain Quality</label>
                  </div>
                </div>
                
                {/* Settings Help */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Rotation Guide</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p><strong>Manual Rotation:</strong> Choose specific angle (90°, 180°, 270°)</p>
                    <p><strong>Auto-detect:</strong> Automatically corrects page orientation based on dimensions</p>
                    <p><strong>Page Range:</strong> Use formats like "1-5" (pages 1 to 5), "1,3,5" (specific pages), or "1-3,7-9" (mixed ranges)</p>
                    <p><strong>Maintain Quality:</strong> Preserves original PDF quality (larger file size)</p>
                    <p><strong>All Pages:</strong> Rotates every page in the document</p>
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Rotating PDFs...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5" />
                      <span>Rotate PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Rotated PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Rotator?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced rotation technology for perfect page orientation</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                    <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Rotate PDF Files</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to rotate your PDF files</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-xl">{step.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Rotate PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF rotator for perfect page orientation</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Start Rotating Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default PDFRotator; 