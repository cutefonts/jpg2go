import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType, Image as ImageIcon } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFWatermark: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    watermarkType: 'text',
    watermarkText: 'CONFIDENTIAL',
    watermarkImage: null as File | null,
    position: 'center',
    opacity: 50,
    fontSize: 24,
    color: '#000000'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    // Prevent duplicates
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setSettings(prev => ({ ...prev, watermarkImage: selectedFiles[0] }));
      // Show thumbnail preview
      const reader = new FileReader();
      reader.onload = e => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(selectedFiles[0]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      watermarkType: 'text',
      watermarkText: 'CONFIDENTIAL',
      watermarkImage: null,
      position: 'center',
      opacity: 50,
      fontSize: 24,
      color: '#000000'
    });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setShowSpinner(true);
    setError(null);
    setSuccess(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Load the PDF file
          const fileBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          
          // Get all pages
          const pages = pdf.getPages();
          
          // Parse color
          const color = settings.color.startsWith('#') ? settings.color.slice(1) : settings.color;
          const r = parseInt(color.slice(0, 2), 16) / 255;
          const g = parseInt(color.slice(2, 4), 16) / 255;
          const b = parseInt(color.slice(4, 6), 16) / 255;
          
          // Embed font for text watermark
          let font;
          try {
            font = await pdf.embedFont(StandardFonts.Helvetica);
          } catch {
            font = await pdf.embedFont(StandardFonts.TimesRoman);
          }
          
          // Process each page
          for (const page of pages) {
            const { width, height } = page.getSize();
            
            if (settings.watermarkType === 'text') {
              // Add text watermark
              const text = settings.watermarkText;
              const fontSize = settings.fontSize;
              const textWidth = font.widthOfTextAtSize(text, fontSize);
              const textHeight = font.heightAtSize(fontSize);
              
              // Calculate position
              let x, y;
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
                case 'center':
                default:
                  x = (width - textWidth) / 2;
                  y = (height + textHeight) / 2;
                  break;
              }
              
              // Draw text watermark
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(r, g, b),
                opacity: settings.opacity / 100
              });
              
            } else if (settings.watermarkType === 'image' && settings.watermarkImage) {
              // Add image watermark
              try {
                const imageBuffer = await settings.watermarkImage.arrayBuffer();
                let image;
                
                if (settings.watermarkImage.type.includes('png')) {
                  image = await pdf.embedPng(imageBuffer);
                } else if (settings.watermarkImage.type.includes('jpeg') || settings.watermarkImage.type.includes('jpg')) {
                  image = await pdf.embedJpg(imageBuffer);
                } else {
                  throw new Error('Unsupported image format');
                }
                
                const { width: imgWidth, height: imgHeight } = image.scale(1);
                const scale = Math.min(width / imgWidth * 0.3, height / imgHeight * 0.3); // Scale to 30% of page
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;
                
                // Calculate position
                let x, y;
                switch (settings.position) {
                  case 'top-left':
                    x = 50;
                    y = height - scaledHeight - 50;
                    break;
                  case 'top-right':
                    x = width - scaledWidth - 50;
                    y = height - scaledHeight - 50;
                    break;
                  case 'bottom-left':
                    x = 50;
                    y = 50;
                    break;
                  case 'bottom-right':
                    x = width - scaledWidth - 50;
                    y = 50;
                    break;
                  case 'center':
                  default:
                    x = (width - scaledWidth) / 2;
                    y = (height - scaledHeight) / 2;
                    break;
                }
                
                // Draw image watermark
                page.drawImage(image, {
                  x,
                  y,
                  width: scaledWidth,
                  height: scaledHeight,
                  opacity: settings.opacity / 100
                });
                
              } catch (error) {
                console.error('Error embedding image watermark:', error);
                alert('Error processing image watermark. Using text watermark instead.');
                
                // Fallback to text watermark
                const text = 'WATERMARK';
                const fontSize = settings.fontSize;
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const x = (width - textWidth) / 2;
                const y = (height + font.heightAtSize(fontSize)) / 2;
                
                page.drawText(text, {
                  x,
                  y,
                  size: fontSize,
                  font,
                  color: rgb(r, g, b),
                  opacity: settings.opacity / 100
                });
              }
            }
          }
          
          // Save the watermarked PDF
          const watermarkedPdfBytes = await pdf.save();
          const blob = new Blob([watermarkedPdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.pdf$/i, '_watermarked.pdf'),
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      setShowSpinner(false);
      if (processed.length > 0) {
        setSuccess(`PDF watermarking completed! Processed ${processed.length} files.`);
      } else {
        setError('No files were processed. Please check your files and try again.');
      }
      
    } catch (error) {
      console.error('Error watermarking PDFs:', error);
      setIsProcessing(false);
      setShowSpinner(false);
      setError('Error watermarking PDFs. Please try again.');
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const features = [
    { icon: <ImageIcon className="h-6 w-6" />, title: 'Text & Image Watermarks', description: 'Add text or image watermarks to your PDFs' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Customizable Options', description: 'Control position, opacity, and styling' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Processing', description: 'Watermark multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag and drop or browse to select your PDF documents' },
    { step: '2', title: 'Configure Watermark', description: 'Choose text or image and adjust settings' },
    { step: '3', title: 'Apply & Download', description: 'Download your watermarked PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '750K+', label: 'PDFs Watermarked' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const renderPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      try {
        const file = files[0];
        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setPreviewUrl(null);
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Overlay watermark
        ctx.save();
        ctx.globalAlpha = settings.opacity / 100;
        if (settings.watermarkType === 'text') {
          ctx.font = `${settings.fontSize}px Helvetica, Arial, sans-serif`;
          ctx.fillStyle = settings.color;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          let x = canvas.width / 2, y = canvas.height / 2;
          if (settings.position === 'top-left') { x = 50; y = 50; }
          else if (settings.position === 'top-right') { x = canvas.width - 50; y = 50; }
          else if (settings.position === 'bottom-left') { x = 50; y = canvas.height - 50; }
          else if (settings.position === 'bottom-right') { x = canvas.width - 50; y = canvas.height - 50; }
          ctx.fillText(settings.watermarkText, x, y);
        } else if (settings.watermarkType === 'image' && imagePreview) {
          const img = new window.Image();
          img.onload = () => {
            let imgWidth = img.width, imgHeight = img.height;
            const scale = Math.min(canvas.width / imgWidth * 0.3, canvas.height / imgHeight * 0.3);
            imgWidth *= scale; imgHeight *= scale;
            let x = (canvas.width - imgWidth) / 2, y = (canvas.height - imgHeight) / 2;
            if (settings.position === 'top-left') { x = 50; y = 50; }
            else if (settings.position === 'top-right') { x = canvas.width - imgWidth - 50; y = 50; }
            else if (settings.position === 'bottom-left') { x = 50; y = canvas.height - imgHeight - 50; }
            else if (settings.position === 'bottom-right') { x = canvas.width - imgWidth - 50; y = canvas.height - imgHeight - 50; }
            ctx.drawImage(img, x, y, imgWidth, imgHeight);
            ctx.restore();
            canvas.toBlob(blob => {
              if (blob) setPreviewUrl(URL.createObjectURL(blob));
            }, 'image/png');
          };
          img.src = imagePreview;
          return;
        }
        ctx.restore();
        canvas.toBlob(blob => {
          if (blob) setPreviewUrl(URL.createObjectURL(blob));
        }, 'image/png');
      } catch (e) {
        setPreviewUrl(null);
      }
    };
    renderPreview();
    // Cleanup old preview URLs
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [files, settings, imagePreview]);

  return (
    <>
      <SEO 
        title="PDF Watermark | Add Watermarks to PDF Files Online"
        description="Protect your documents by adding custom watermarks to PDFs with our free online PDF watermark tool. Easy to use and no installation required."
        keywords="PDF watermark, add watermark to PDF, PDF branding, copyright protection, PDF tool, online watermark, free tool"
        canonical="pdf-watermark"
        ogImage="/images/pdf-watermark-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Spinner Overlay */}
        {showSpinner && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600 mb-4"></div>
              <span className="text-white text-lg font-semibold">Processing PDFs...</span>
            </div>
          </div>
        )}
        {/* Error/Success Banners */}
        <div className="max-w-2xl mx-auto pt-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
              <span className="block sm:inline">{success}</span>
            </div>
          )}
        </div>
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>PDF Watermark</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Watermarks to PDF Documents Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add text or image watermarks to your PDF documents. Perfect for branding, copyright protection, and document identification.
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
                  tabIndex={0}
                  aria-label="Upload PDF files by clicking or dragging and dropping"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    aria-label="Choose PDF Files"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="PDF file input"
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
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="PDF watermark preview" className="mx-auto max-h-96 w-auto object-contain border shadow" />
                  ) : (
                    <p className="text-gray-500">No preview available. Upload a PDF to see a live preview of the watermark on the first page.</p>
                  )}
                </div>
              </div>

              {/* Watermark Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Watermark Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Type</label>
                    <select
                      value={settings.watermarkType}
                      onChange={e => setSettings(prev => ({ ...prev, watermarkType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="text">Text Watermark</option>
                      <option value="image">Image Watermark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <select
                      value={settings.position}
                      onChange={e => setSettings(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opacity ({settings.opacity}%)</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.opacity}
                      onChange={e => setSettings(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  {settings.watermarkType === 'text' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Text</label>
                        <input
                          type="text"
                          value={settings.watermarkText}
                          onChange={e => setSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          placeholder="Enter watermark text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                        <input
                          type="number"
                          min="8"
                          max="72"
                          value={settings.fontSize}
                          onChange={e => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                        <input
                          type="color"
                          value={settings.color}
                          onChange={e => setSettings(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                  {settings.watermarkType === 'image' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Image</label>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          aria-label="Choose watermark image"
                        >
                          Choose Image
                        </button>
                        {settings.watermarkImage && (
                          <span className="text-sm text-gray-600">{settings.watermarkImage.name}</span>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          aria-label="Watermark image input"
                        />
                        {imagePreview && (
                          <img src={imagePreview} alt="Watermark preview" className="h-12 w-auto rounded shadow border ml-4" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Add Watermark"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Watermark...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Add Watermark</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center space-x-2"
                  aria-label="Reset Tool"
                  type="button"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    aria-label="Download Watermarked Files"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Watermarked Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Watermark Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional watermarking with customizable options and batch processing</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Add Watermarks to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to watermark your documents</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Watermark Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF watermark tool for their document needs</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span>Start Watermarking Now</span>
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

export default PDFWatermark; 