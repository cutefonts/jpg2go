import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, PenTool, FileType } from 'lucide-react';
import SEO from './SEO';
import { useNotification } from './NotificationProvider';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/web/pdf_viewer.css';
import { NotificationProvider } from './NotificationProvider';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const PDFSign: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    signatureType: 'draw',
    signatureText: '',
    signatureImage: null as File | null,
    position: 'bottom-right',
    size: 'medium',
    opacity: 100
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [signatureOverlay, setSignatureOverlay] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [applyToAllPages, setApplyToAllPages] = useState(true);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);

  const addFiles = (newFiles: File[]) => {
    setFiles(prev => {
      const deduped = [...prev];
      for (const file of newFiles) {
        if (file.type === 'application/pdf' && !deduped.some(f => f.name === file.name && f.size === file.size)) {
          deduped.push(file);
        }
      }
      return deduped;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setSettings(prev => ({ ...prev, signatureImage: selectedFiles[0] }));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startDrawing = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor] = useState('#000');
  const [drawWidth] = useState(2);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing.current = true;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      }
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!startDrawing.current) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  };
  const handleCanvasMouseUp = () => {
    startDrawing.current = false;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnSignature(canvas.toDataURL('image/png'));
    }
  };
  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setDrawnSignature(null);
  };

  const getSignatureScale = () => {
    if (settings.size === 'small') return 0.15;
    if (settings.size === 'large') return 0.35;
    return 0.25;
  };

  // Phase 1: Generate preview PDF bytes (or just the first page image)
  useEffect(() => {
    const generatePreview = async () => {
      if (files.length === 0) {
        setPreviewPdfBytes(null);
        setPreviewUrl(null);
        setPreviewError(null);
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        setPreviewPdfBytes(new Uint8Array(arrayBuffer));
      } catch (err: any) {
        setPreviewLoading(false);
        setPreviewError('Live preview rendering failed: ' + err.message);
        setPreviewPdfBytes(null);
      }
    };
    generatePreview();
  }, [files]);

  // Helper to get default overlay for a given width/height
  function getDefaultOverlay(width: number, height: number, scale: number) {
    const w = 160 * scale;
    const h = 60 * scale;
    return {
      x: width - w - 40,
      y: 40,
      width: w,
      height: h
    };
  }

  // Synchronize overlay reset and canvas rendering
  useEffect(() => {
    if (!previewPdfBytes || !previewCanvasRef.current) return;
    (async () => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const loadingTask = pdfjsLib.getDocument({ data: previewPdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        setSignatureOverlay(getDefaultOverlay(viewport.width, viewport.height, getSignatureScale()));
      } catch (err) {
        console.error('[PDFSign] Error resetting overlay:', err);
      }
    })();
    // eslint-disable-next-line
  }, [previewPdfBytes, settings.size, previewCanvasRef.current]);

  // Clamp overlay to canvas bounds
  function clampOverlay(overlay: { x: number, y: number, width: number, height: number }, canvas: HTMLCanvasElement) {
    const maxX = canvas.width - overlay.width;
    const maxY = canvas.height - overlay.height;
    return {
      x: Math.max(0, Math.min(overlay.x, maxX)),
      y: Math.max(0, Math.min(overlay.y, maxY)),
      width: Math.max(30, Math.min(overlay.width, canvas.width)),
      height: Math.max(20, Math.min(overlay.height, canvas.height))
    };
  }

  // Phase 2: Render preview to canvas when both are available
  useEffect(() => {
    const renderToCanvas = async () => {
      if (!previewPdfBytes || !previewCanvasRef.current) return;
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const loadingTask = pdfjsLib.getDocument({ data: previewPdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = previewCanvasRef.current;
        if (!canvas) throw new Error('Preview canvas not available');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Preview canvas context not available');
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Draw signature overlay (same as before)
        let sigImg: HTMLImageElement | null = null;
        let sigText: string | null = null;
        const sigType = settings.signatureType;
        if (sigType === 'image' && settings.signatureImage) {
          if (lastImageUrl.current) URL.revokeObjectURL(lastImageUrl.current);
          lastImageUrl.current = URL.createObjectURL(settings.signatureImage);
          sigImg = new window.Image();
          sigImg.src = lastImageUrl.current;
          await new Promise(res => { sigImg!.onload = res; });
        } else if (sigType === 'draw' && drawnSignature) {
          sigImg = new window.Image();
          sigImg.src = drawnSignature;
          await new Promise(res => { sigImg!.onload = res; });
        } else if (sigType === 'type' && settings.signatureText) {
          sigText = settings.signatureText;
        }
        let overlay = signatureOverlay;
        if (!overlay) {
          overlay = getDefaultOverlay(viewport.width, viewport.height, getSignatureScale());
          setSignatureOverlay(overlay);
        }
        if (sigImg) {
          ctx.globalAlpha = settings.opacity / 100;
          ctx.drawImage(sigImg, overlay.x, overlay.y, overlay.width, overlay.height);
          ctx.globalAlpha = 1;
        } else if (sigText) {
          ctx.globalAlpha = settings.opacity / 100;
          ctx.font = `${24 * getSignatureScale()}px Helvetica, Arial, sans-serif`;
          ctx.fillStyle = '#222';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(sigText, overlay.x + overlay.width / 2, overlay.y + overlay.height / 2);
          ctx.globalAlpha = 1;
        }
        setPreviewLoading(false);
        setPreviewUrl(canvas.toDataURL('image/png'));
      } catch (err: any) {
        setPreviewLoading(false);
        setPreviewError('Live preview rendering failed: ' + err.message);
        console.error('[PDFSign] Live preview rendering failed:', err);
      }
    };
    renderToCanvas();
    // eslint-disable-next-line
  }, [previewPdfBytes, settings, drawnSignature, signatureOverlay, previewCanvasRef.current]);

  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signatureOverlay) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (
      x > signatureOverlay.x + signatureOverlay.width - 20 &&
      x < signatureOverlay.x + signatureOverlay.width + 10 &&
      y > signatureOverlay.y + signatureOverlay.height - 20 &&
      y < signatureOverlay.y + signatureOverlay.height + 10
    ) {
      setResizing(true);
      setDragOffset({ x: x - signatureOverlay.x, y: y - signatureOverlay.y });
    } else if (
      x > signatureOverlay.x && x < signatureOverlay.x + signatureOverlay.width &&
      y > signatureOverlay.y && y < signatureOverlay.y + signatureOverlay.height
    ) {
      setDragging(true);
      setDragOffset({ x: x - signatureOverlay.x, y: y - signatureOverlay.y });
    }
  };
  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signatureOverlay || (!dragging && !resizing)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newOverlay = { ...signatureOverlay };
    if (dragging) {
      newOverlay.x = x - dragOffset.x;
      newOverlay.y = y - dragOffset.y;
    } else if (resizing) {
      newOverlay.width = Math.max(30, x - signatureOverlay.x);
      newOverlay.height = Math.max(20, y - signatureOverlay.y);
    }
    setSignatureOverlay(clampOverlay(newOverlay, e.currentTarget));
  };
  const handlePreviewMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  const processFiles = async () => {
    if (files.length === 0) {
      notify('Please upload at least one PDF file.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();
          let font;
          try { font = await pdfDoc.embedFont(StandardFonts.Helvetica); } catch { font = await pdfDoc.embedFont(StandardFonts.TimesRoman); }
          let signatureImageEmbed = null;
          let signatureImageDims = { width: 0, height: 0 };
          if (settings.signatureType === 'image' && settings.signatureImage) {
            const imgBytes = await settings.signatureImage.arrayBuffer();
            if (settings.signatureImage.type === 'image/png') {
              signatureImageEmbed = await pdfDoc.embedPng(imgBytes);
            } else {
              signatureImageEmbed = await pdfDoc.embedJpg(imgBytes);
            }
            signatureImageDims = signatureImageEmbed.scale(0.25);
          } else if (settings.signatureType === 'draw' && drawnSignature) {
            const res = await fetch(drawnSignature);
            const imgBytes = await res.arrayBuffer();
            signatureImageEmbed = await pdfDoc.embedPng(imgBytes);
            signatureImageDims = signatureImageEmbed.scale(0.25);
          }
          pages.forEach((page, pageIdx) => {
            const { width, height } = page.getSize();
            let overlay = signatureOverlay;
            if (!overlay) {
              const scale = getSignatureScale();
              overlay = {
                x: width - 160 * scale - 40,
                y: 40,
                width: 160 * scale,
                height: 60 * scale
              };
            }
            const x = overlay.x, y = overlay.y, w = overlay.width, h = overlay.height;
            if (!applyToAllPages && pageIdx > 0) return;
            if (settings.signatureType === 'type' && settings.signatureText && settings.signatureText.trim()) {
              page.drawText(settings.signatureText, {
                x: x + w / 2 - 60,
                y: y + h / 2 - 8,
                size: settings.size === 'medium' ? 12 : settings.size === 'large' ? 16 : 10,
                font: font,
                color: rgb(0, 0, 0),
                opacity: settings.opacity / 100
              });
              page.drawLine({
                start: { x: x + w / 2 - 60, y: y + h / 2 - 13 },
                end: { x: x + w / 2 + 60, y: y + h / 2 - 13 },
                thickness: 1,
                color: rgb(0, 0, 0),
                opacity: settings.opacity / 100
              });
            }
            if ((settings.signatureType === 'image' && signatureImageEmbed) || (settings.signatureType === 'draw' && signatureImageEmbed)) {
              page.drawImage(signatureImageEmbed, {
                x: x,
                y: y,
                width: w,
                height: h,
                opacity: settings.opacity / 100
              });
            }
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '_signed.pdf'), blob });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          notify(`Error processing ${file.name}. Skipping this file.`, 'error');
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      notify(`PDF signing completed! Processed ${processed.length} files.`, 'success');
    } catch (error) {
      console.error('Error signing PDFs:', error);
      setIsProcessing(false);
      notify('Error signing PDFs. Please try again.', 'error');
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
    { icon: <PenTool className="h-6 w-6" />, title: 'Digital Signatures', description: 'Add secure digital signatures to PDF documents' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Multiple Options', description: 'Draw, type, or upload signature images' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Signing', description: 'Sign multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag and drop or browse to select your PDF documents' },
    { step: '2', title: 'Create Signature', description: 'Draw, type, or upload your signature' },
    { step: '3', title: 'Sign & Download', description: 'Download your signed PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '400K+', label: 'PDFs Signed' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Revoke object URLs for signature images after use
  const lastImageUrl = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (lastImageUrl.current) URL.revokeObjectURL(lastImageUrl.current);
    };
  }, []);

  return (
    <>
      <SEO 
        title="PDF Sign | Sign PDF Documents Online Free"
        description="Sign PDF documents electronically with our easy-to-use PDF sign tool. Perfect for contracts, forms, and official documents—no printing needed."
        keywords="PDF sign, digital signatures, electronic signatures, sign PDF, secure signing, online tool, free tool"
        canonical="pdf-sign"
        ogImage="/images/pdf-sign-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <PenTool className="h-4 w-4" />
                <span>PDF Sign</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Sign PDF Documents Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add secure digital signatures to your PDF documents. Draw, type, or upload your signature with customizable positioning and styling.
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
                  tabIndex={0}
                  role="button"
                  aria-label="Upload PDF files by clicking or dragging and dropping"
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
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
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
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
                  <PenTool className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 flex flex-col items-center">
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div><span>Rendering preview...</span></div>
                  ) : previewError ? (
                    <div className="text-red-500">{previewError}</div>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <canvas
                        ref={previewCanvasRef}
                        style={{ border: '1px solid #ccc', borderRadius: 8, cursor: dragging ? 'move' : resizing ? 'nwse-resize' : 'pointer' }}
                        width={previewUrl ? undefined : 400}
                        height={previewUrl ? undefined : 300}
                        onMouseDown={handlePreviewMouseDown}
                        onMouseMove={handlePreviewMouseMove}
                        onMouseUp={handlePreviewMouseUp}
                        aria-label="PDF preview with signature overlay"
                      />
                      {/* Resize handle visual */}
                      {signatureOverlay && (
                        <div
                          style={{
                            position: 'absolute',
                            left: signatureOverlay.x + signatureOverlay.width - 10,
                            top: signatureOverlay.y + signatureOverlay.height - 10,
                            width: 20,
                            height: 20,
                            background: '#fff',
                            border: '2px solid #888',
                            borderRadius: '50%',
                            cursor: 'nwse-resize',
                            zIndex: 10
                          }}
                          onMouseDown={e => { e.stopPropagation(); setResizing(true); }}
                          aria-label="Resize signature overlay"
                        />
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={applyToAllPages} onChange={e => setApplyToAllPages(e.target.checked)} />
                      <span>Apply to all pages</span>
                    </label>
                  </div>
                </div>
                {previewUrl && (
                  <div className="mt-4">
                    <img src={previewUrl} alt="PDF signature preview" className="mx-auto max-h-96 w-auto object-contain border shadow" />
                  </div>
                )}
              </div>

              {/* Signature Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <PenTool className="h-5 w-5 text-violet-600" />
                  <span>Signature Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Signature Type</label>
                    <select
                      value={settings.signatureType}
                      onChange={e => setSettings(prev => ({ ...prev, signatureType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="draw">Draw Signature</option>
                      <option value="type">Type Signature</option>
                      <option value="image">Upload Image</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <select
                      value={settings.position}
                      onChange={e => setSettings(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                    <select
                      value={settings.size}
                      onChange={e => setSettings(prev => ({ ...prev, size: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  {settings.signatureType === 'type' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Signature Text</label>
                      <input
                        type="text"
                        value={settings.signatureText}
                        onChange={e => setSettings(prev => ({ ...prev, signatureText: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="Enter your signature text"
                      />
                    </div>
                  )}
                  {settings.signatureType === 'image' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Signature Image</label>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Choose Image
                        </button>
                        {settings.signatureImage && (
                          <span className="text-sm text-gray-600">{settings.signatureImage.name}</span>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                  {settings.signatureType === 'draw' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Draw Your Signature</label>
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={120}
                        className="border rounded-lg bg-white shadow"
                        style={{ touchAction: 'none' }}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        aria-label="Draw your signature here"
                      />
                      <button onClick={handleClearCanvas} className="mt-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Clear</button>
                      {drawnSignature && (
                        <div className="mt-2"><img src={drawnSignature} alt="Signature preview" className="h-12" /></div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opacity ({settings.opacity}%)</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.opacity}
                      onChange={e => setSettings(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
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
                      <span>Signing PDFs...</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="h-5 w-5" />
                      <span>Sign PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Signed Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Sign Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Secure digital signatures with multiple signature options and customization</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Sign PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to add digital signatures</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Sign Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF sign tool for secure document signing</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <PenTool className="h-5 w-5" />
                    <span>Start Signing Now</span>
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

const PDFSignWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFSign />
  </NotificationProvider>
);

export default PDFSignWithProvider; 