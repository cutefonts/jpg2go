import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Settings, Eye, ArrowRight, CheckCircle, Sparkles, Zap, Shield, Type, RotateCcw, XCircle, AlertTriangle } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import SEO from './SEO';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_FONTS = [
  { label: 'Helvetica', value: 'Helvetica', pdfFont: StandardFonts.Helvetica },
  { label: 'Courier', value: 'Courier', pdfFont: StandardFonts.Courier },
  { label: 'Times Roman', value: 'Times Roman', pdfFont: StandardFonts.TimesRoman },
];

const PDFAddText: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [errorSummary, setErrorSummary] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState({
    text: '',
    fontFamily: SUPPORTED_FONTS[0].value,
    fontSize: 24,
    color: '#000000',
    position: 'center',
    opacity: 100
  });
  const [showSpinner, setShowSpinner] = useState(false);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    const errors: string[] = [];
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        errors.push(`File ${file.name} is not a PDF.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.name} exceeds 50MB limit.`);
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`Duplicate file skipped: ${file.name}`);
        continue;
      }
      deduped.push(file);
    }
    setFiles(deduped);
    if (errors.length) setBanner({ message: errors.join(' '), type: 'error' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) setPreviewUrl(null);
      return newFiles;
    });
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'Please upload at least one PDF file.', type: 'error' });
      return;
    }
    if (!settings.text) {
      setBanner({ message: 'Please enter the text to add.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    setBanner(null);
    setErrorSummary([]);
    try {
      const processedBlobs: Blob[] = [];
      const errors: string[] = [];
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pages = pdfDoc.getPages();
          if (pages.length === 0) throw new Error('No pages in PDF.');
          const page = pages[0];
          const { width, height } = page.getSize();
          const fontObj = SUPPORTED_FONTS.find(f => f.value === settings.fontFamily) || SUPPORTED_FONTS[0];
          const font = await pdfDoc.embedFont(fontObj.pdfFont);
          // Convert hex color to RGB
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255
            } : { r: 0, g: 0, b: 0 };
          };
          const color = hexToRgb(settings.color);
          const textColor = rgb(color.r, color.g, color.b);
          const textWidth = font.widthOfTextAtSize(settings.text, settings.fontSize);
          const textHeight = font.heightAtSize(settings.fontSize);
          let x = width / 2 - textWidth / 2;
          let y = height / 2 + textHeight / 2;
          switch (settings.position) {
            case 'top-left':
              x = 50;
              y = height - 50;
              break;
            case 'top-right':
              x = width - textWidth - 50;
              y = height - 50;
              break;
            case 'bottom-left':
              x = 50;
              y = 50 + textHeight;
              break;
            case 'bottom-right':
              x = width - textWidth - 50;
              y = 50 + textHeight;
              break;
            default:
              x = width / 2 - textWidth / 2;
              y = height / 2 + textHeight / 2;
          }
          page.drawText(settings.text, {
            x,
            y,
            size: settings.fontSize,
            font,
            color: textColor,
            opacity: settings.opacity / 100
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processedBlobs.push(blob);
        } catch (err: any) {
          errors.push(`Failed to process ${file.name}: ${err.message || err}`);
        }
      }
      setProcessedFiles(processedBlobs);
      setIsDownloadReady(true);
      if (errors.length) setErrorSummary(errors);
      if (processedBlobs.length && !errors.length) setBanner({ message: 'Text added to all PDFs successfully!', type: 'success' });
      if (!processedBlobs.length && errors.length) setBanner({ message: 'All files failed to process.', type: 'error' });
    } catch (error: any) {
      setBanner({ message: 'Error processing PDF files. Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setShowSpinner(false);
    }
  };

  const downloadFiles = () => {
    if (!processedFiles.length) {
      setBanner({ message: 'No processed files to download.', type: 'error' });
      return;
    }
    processedFiles.forEach((blob, index) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files[index]?.name.replace('.pdf', '_with_text.pdf') || `processed-${index + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    setBanner({ message: 'Download started.', type: 'success' });
  };

  const clearFiles = () => {
    if (files.length > 0 && !window.confirm('Are you sure you want to reset? All files and settings will be cleared.')) return;
    setFiles([]);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    setPreviewUrl(null);
    setBanner(null);
    setErrorSummary([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Live preview using pdfjs-dist
  const processPreview = useCallback(async () => {
    if (files.length === 0) return;
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.7 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      // Overlay text
      ctx.save();
      ctx.globalAlpha = settings.opacity / 100;
      ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
      ctx.fillStyle = settings.color;
      const text = settings.text;
      const textWidth = ctx.measureText(text).width;
      let x = canvas.width / 2 - textWidth / 2;
      let y = canvas.height / 2 + settings.fontSize / 2;
      switch (settings.position) {
        case 'top-left':
          x = 50;
          y = settings.fontSize + 20;
          break;
        case 'top-right':
          x = canvas.width - textWidth - 50;
          y = settings.fontSize + 20;
          break;
        case 'bottom-left':
          x = 50;
          y = canvas.height - 20;
          break;
        case 'bottom-right':
          x = canvas.width - textWidth - 50;
          y = canvas.height - 20;
          break;
        default:
          x = canvas.width / 2 - textWidth / 2;
          y = canvas.height / 2 + settings.fontSize / 2;
      }
      if (text) ctx.fillText(text, x, y);
      ctx.restore();
      canvas.toBlob((blob) => {
        if (blob) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }, 'image/jpeg', 0.8);
    } catch (err) {
      setPreviewUrl(null);
    }
  }, [files, settings]);

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    } else {
      setPreviewUrl(null);
    }
    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [files, settings, processPreview]);

  // Accessibility: focus management for banners
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (banner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [banner]);

  const stats = [
    { label: 'Text Customization', value: 'Full Control', icon: <Type className="h-5 w-5" /> },
    { label: 'Position Control', value: 'Precise Placement', icon: <Shield className="h-5 w-5" /> },
    { label: 'Font Options', value: 'Multiple Fonts', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Custom Text Addition',
      description: 'Add any text to your PDF documents with full control over content, positioning, and styling options.',
      icon: <Type className="h-6 w-6" />
    },
    {
      title: 'Advanced Typography',
      description: 'Choose from multiple fonts, sizes, colors, and opacity levels to create professional text overlays.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Precise Positioning',
      description: 'Position text anywhere on your PDF with options for center, corners, or custom coordinates.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'Batch Processing',
      description: 'Add the same text to multiple PDF files simultaneously with consistent formatting and positioning.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Supports multiple files for batch processing.'
    },
    {
      step: 2,
      title: 'Enter Your Text',
      description: 'Type the text you want to add and configure font, size, color, position, and opacity settings.'
    },
    {
      step: 3,
      title: 'Preview & Process',
      description: 'See a live preview of your text overlay and click process to add text to your PDFs.'
    },
    {
      step: 4,
      title: 'Download PDFs',
      description: 'Download your PDF files with the added text, ready for use in any application.'
    }
  ];

  return (
    <>
      <SEO 
        title="PDF Add Text | Insert Text into PDFs Instantly"
        description="Use our online tool to add custom text to any PDF page. Free and easy to use—great for annotations, comments, and quick edits."
        keywords="PDF add text, insert text into PDF, add labels to PDF, PDF text insertion, online tool, free tool"
        canonical="pdf-add-text"
        ogImage="/images/pdf-add-text-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Type className="h-4 w-4" />
                <span>PDF Text Adder</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Text to PDF Documents
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add custom text to your PDF documents with professional typography controls. 
                Perfect for adding watermarks, annotations, labels, or any text content to your PDF files.
              </p>
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

            {/* Error/Success Banner */}
            {banner && (
              <div
                ref={bannerRef}
                tabIndex={-1}
                aria-live="assertive"
                className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-3 font-medium ${banner.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                role="alert"
              >
                {banner.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                <span>{banner.message}</span>
              </div>
            )}
            {errorSummary.length > 0 && (
              <div className="mb-6 rounded-lg px-4 py-3 bg-yellow-100 text-yellow-900" aria-live="polite">
                <div className="font-semibold mb-1">Some files failed to process:</div>
                <ul className="list-disc pl-5">
                  {errorSummary.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {/* Main Tool Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    files.length > 0 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  tabIndex={0}
                  aria-label="PDF file upload area. Drag and drop or click to select files."
                  role="region"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for text addition
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    aria-label="Choose PDF files"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose PDF Files
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg" aria-live="polite">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                    <ul className="mt-2 space-y-1">
                      {files.map((file, idx) => (
                        <li key={file.name + file.size} className="flex items-center gap-2 justify-between bg-white rounded px-3 py-1 border border-gray-200">
                          <span className="truncate" title={file.name}>{file.name}</span>
                          <button
                            aria-label={`Remove file ${file.name}`}
                            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                            onClick={() => removeFile(idx)}
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Live Preview */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Live Preview (first page)</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center relative" style={{ minHeight: 320 }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Live preview of the first page with text overlay"
                      className="rounded shadow max-w-full max-h-96 border border-gray-200"
                      aria-label="Live preview of the first page with text overlay"
                    />
                  ) : (
                    <span className="text-gray-400">Upload a PDF and enter text to see a live preview.</span>
                  )}
                  {showSpinner && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl z-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">Preview uses only supported fonts: Helvetica, Courier, Times Roman.</div>
              </div>

              {/* Text Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Text Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="text-content">
                      Text Content
                    </label>
                    <textarea
                      id="text-content"
                      value={settings.text}
                      onChange={(e) => setSettings({...settings, text: e.target.value})}
                      placeholder="Enter the text you want to add to your PDF..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                      rows={3}
                      aria-label="Text to add to PDF"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="font-family">
                      Font Family (PDF output only supports Helvetica, Courier, Times Roman)
                    </label>
                    <select
                      id="font-family"
                      value={settings.fontFamily}
                      onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      aria-label="Font family"
                    >
                      {SUPPORTED_FONTS.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="font-size">
                      Font Size: {settings.fontSize}px
                    </label>
                    <input
                      id="font-size"
                      type="range"
                      min="8"
                      max="72"
                      value={settings.fontSize}
                      onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Font size"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="text-color">
                      Text Color
                    </label>
                    <input
                      id="text-color"
                      type="color"
                      value={settings.color}
                      onChange={(e) => setSettings({...settings, color: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
                      aria-label="Text color"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="position">
                      Position
                    </label>
                    <select
                      id="position"
                      value={settings.position}
                      onChange={(e) => setSettings({...settings, position: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      aria-label="Text position"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="opacity">
                      Opacity: {settings.opacity}%
                    </label>
                    <input
                      id="opacity"
                      type="range"
                      min="10"
                      max="100"
                      value={settings.opacity}
                      onChange={(e) => setSettings({...settings, opacity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Text opacity"
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
                  aria-label="Add text to PDF"
                >
                  {isProcessing || showSpinner ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Text...</span>
                    </>
                  ) : (
                    <>
                      <Type className="h-5 w-5" />
                      <span>Add Text to PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                  aria-label="Reset tool"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Download */}
              {processedFiles.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={downloadFiles}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    aria-label="Download processed PDF files"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF Files</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Text Adder?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional text addition with advanced typography controls and formatting options
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
                  How to Add Text to PDFs
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to add text to your PDF documents
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                    Ready to Add Text to Your PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents with professional text overlays. Join thousands of users 
                    who trust our tool for document enhancement.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Type className="h-5 w-5" />
                    <span>Start Adding Text Now</span>
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

export default PDFAddText; 