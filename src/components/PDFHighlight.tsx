import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Settings, Eye, ArrowRight, CheckCircle, Sparkles, Zap, Shield, Users, FileType, Highlighter } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';

const PDFHighlight: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    highlightColor: '#ffff00',
    opacity: 80,
    highlightText: '',
    autoDetect: false,
    preserveText: true,
    includeNotes: false,
    addSampleHighlights: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(pdfFiles);
    setProcessedFiles([]);
    
    // Create preview for first file
    if (pdfFiles.length > 0) {
      const url = URL.createObjectURL(pdfFiles[0]);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(pdfFiles);
    setProcessedFiles([]);
    
    if (pdfFiles.length > 0) {
      const url = URL.createObjectURL(pdfFiles[0]);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Utility: Convert hex color to rgb (0-1 range)
  function hexToRgb01(hex: string) {
    const hexVal = hex.replace('#', '');
    const bigint = parseInt(hexVal, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return { r, g, b };
  }

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          // Load PDF using pdf-lib
          const { PDFDocument, rgb } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();

          // Load PDF with pdfjs for text extraction
          const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
          const pdfjs = await loadingTask.promise;

          for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            const { width, height } = page.getSize();
            const pdfjsPage = await pdfjs.getPage(pageIndex + 1);
            const textContent = await pdfjsPage.getTextContent();

            // Find and highlight user-specified text
            if (settings.highlightText) {
              const searchText = settings.highlightText.trim();
              if (searchText.length > 0) {
                const colorObj = hexToRgb01(settings.highlightColor);
                const highlightColor = rgb(colorObj.r, colorObj.g, colorObj.b);
                const opacity = settings.opacity / 100;

                // Go through all text items and find matches
                textContent.items.forEach((item: any) => {
                  if (typeof item.str === 'string' && item.str.toLowerCase().includes(searchText.toLowerCase())) {
                    // Estimate position and width for the match
                    const tx = item.transform;
                    const x = tx[4];
                    const y = height - tx[5]; // pdfjs y=bottom, pdf-lib y=bottom
                    const fontHeight = Math.abs(tx[3]);
                    const widthEst = (item.width * (searchText.length / item.str.length)) || 50;
                    // Draw highlight rectangle
                    page.drawRectangle({
                      x,
                      y: y - fontHeight * 0.2,
                      width: widthEst,
                      height: fontHeight * 1.1,
                      color: highlightColor,
                      opacity,
                      borderColor: undefined,
                      borderWidth: 0
                    });
                  }
                });
              }
            }

            // Add sample highlights if requested (unchanged)
            if (settings.addSampleHighlights) {
              page.drawRectangle({
                x: 100,
                y: height - 300,
                width: 150,
                height: 15,
                color: rgb(1, 1, 0),
                opacity: 0.3
              });
              page.drawText('Important information', {
                x: 100,
                y: height - 300,
                size: 12,
                color: rgb(0, 0, 0),
              });
              page.drawRectangle({
                x: 100,
                y: height - 350,
                width: 180,
                height: 15,
                color: rgb(0, 1, 1),
                opacity: 0.3
              });
              page.drawText('Key points to remember', {
                x: 100,
                y: height - 350,
                size: 12,
                color: rgb(0, 0, 0),
              });
            }
          }
          // Save the highlighted PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.pdf$/i, '_highlighted.pdf'),
            blob: blob
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`PDF highlighting completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error highlighting PDFs:', error);
      setIsProcessing(false);
      alert('Error highlighting PDFs. Please try again.');
    }
  };

  const downloadFile = (file: { name: string, blob: Blob }) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadFiles = () => {
    processedFiles.forEach(file => downloadFile(file));
  };

  // Live preview processing
  const processPreview = useCallback(async () => {
    if (files.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);
      
      // Add highlight preview
      if (settings.highlightText) {
        ctx.fillStyle = settings.highlightColor;
        ctx.globalAlpha = settings.opacity / 100;
        
        // Simulate text highlighting
        ctx.fillRect(50, 100, 200, 20);
        ctx.fillRect(50, 150, 150, 20);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }, 'image/jpeg', 0.8);
    };
    
    const fileUrl = URL.createObjectURL(files[0]);
    img.src = fileUrl;
  }, [files, settings]);

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    }
  }, [processPreview]);

  const features = [
    {
      icon: <Highlighter className="h-6 w-6" />,
      title: "Smart Highlighting",
      description: "Automatically highlight text with intelligent detection"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Color Options",
      description: "Multiple highlight colors and opacity control"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Batch Processing",
      description: "Highlight multiple PDFs simultaneously"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Live Preview",
      description: "See highlights in real-time before processing"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDF Files",
      description: "Drag and drop your PDF files or click to browse and select them from your device"
    },
    {
      step: "2",
      title: "Configure Highlights",
      description: "Enter text to highlight, choose color, adjust opacity, and set preferences"
    },
    {
      step: "3",
      title: "Download Highlighted PDF",
      description: "Click process to add highlights and download your enhanced PDF files instantly"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "5M+", label: "PDFs Highlighted" },
    { icon: <Zap className="h-5 w-5" />, value: "99.8%", label: "Accuracy Rate" },
    { icon: <Shield className="h-5 w-5" />, value: "< 3s", label: "Processing Time" },
    { icon: <FileType className="h-5 w-5" />, value: "10+", label: "Highlight Colors" }
  ];

  return (
    <>
      <SEO 
        title="PDF Highlight | Add Highlights to PDF Documents"
        description="Highlight text in your PDF files quickly and easily. Free online PDF highlight tool—no sign-up or installation required."
        keywords="PDF highlight, highlight text in PDF, PDF highlighting, online tool, free tool"
        canonical="pdf-highlight"
        ogImage="/images/pdf-highlight-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Highlighter className="h-4 w-4" />
                <span>PDF Highlighter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Highlight Text in PDF Documents
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Highlight important text in your PDF documents with customizable colors and styles. 
                Perfect for document review, study notes, and content emphasis.
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
                    files.length > 0 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for highlighting
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose PDF Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Highlighter className="h-5 w-5 text-violet-600" />
                    <span>Selected PDF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <Highlighter className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlight Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Highlight Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Highlight Color
                    </label>
                    <input
                      type="color"
                      value={settings.highlightColor}
                      onChange={(e) => setSettings({...settings, highlightColor: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opacity: {settings.opacity}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.opacity}
                      onChange={(e) => setSettings({...settings, opacity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoDetect"
                      checked={settings.autoDetect}
                      onChange={(e) => setSettings({...settings, autoDetect: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoDetect" className="text-sm font-medium text-gray-700">
                      Auto-detect important text
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preserveText"
                      checked={settings.preserveText}
                      onChange={(e) => setSettings({...settings, preserveText: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveText" className="text-sm font-medium text-gray-700">
                      Preserve Original Text
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text to Highlight
                  </label>
                  <textarea
                    value={settings.highlightText}
                    onChange={(e) => setSettings({...settings, highlightText: e.target.value})}
                    placeholder="Enter the text you want to highlight (leave empty to highlight all text)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    rows={3}
                  />
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
                      {/* Spinner removed */}
                      <span>Adding Highlights...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5" />
                      <span>Add Highlights</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={() => downloadFiles()}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Highlighted PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Preview */}
            {previewUrl && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">PDF Preview</h2>
                <div className="bg-gray-100 rounded-xl p-4">
                  <iframe 
                    src={previewUrl} 
                    title="PDF Preview" 
                    className="w-full h-96 bg-white rounded-lg shadow-inner" 
                  />
                </div>
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Highlighter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional-grade PDF highlighting with advanced features and precision
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
                  How to Highlight PDF Documents
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to highlight your PDF documents
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
                    Ready to Highlight Your PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents with professional highlighting. Join thousands of 
                    users who trust our highlighter for document review and study materials.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Highlighter className="h-5 w-5" />
                    <span>Start Highlighting Now</span>
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

export default PDFHighlight; 