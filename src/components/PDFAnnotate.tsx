import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Settings, Eye, ArrowRight, CheckCircle, Sparkles, Zap, Shield, MessageSquare, RotateCcw } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SEO from './SEO';

const PDFAnnotate: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    annotationType: 'comment',
    color: '#FFD700',
    opacity: 80,
    includeTimestamp: true,
    authorName: 'User'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    
    // Create preview for first file
    if (pdfFiles.length > 0) {
      const url = URL.createObjectURL(pdfFiles[0]);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setIsDownloadReady(false);
    setProcessedFiles([]);
    
    if (pdfFiles.length > 0) {
      const url = URL.createObjectURL(pdfFiles[0]);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const processedBlobs: Blob[] = [];
      
      for (const file of files) {
        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Get the first page
        const pages = pdfDoc.getPages();
        if (pages.length === 0) continue;
        
        const page = pages[0];
        const { width, height } = page.getSize();
        
        // Embed font
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        // Convert hex color to RGB
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
          } : { r: 1, g: 0.843, b: 0 }; // Default to gold
        };
        
        const color = hexToRgb(settings.color);
        const annotationColor = rgb(color.r, color.g, color.b);
        
        // Create annotation text
        let annotationText = `[${settings.annotationType.toUpperCase()}]`;
        if (settings.includeTimestamp) {
          annotationText += ` - ${new Date().toLocaleString()}`;
        }
        if (settings.authorName) {
          annotationText += ` by ${settings.authorName}`;
        }
        
        // Calculate position for annotation
        const textWidth = font.widthOfTextAtSize(annotationText, 12);
        const x = width - textWidth - 50;
        const y = height - 50;
        
        // Add annotation based on type
        switch (settings.annotationType) {
          case 'highlight':
            // Draw highlight rectangle
            page.drawRectangle({
              x: x - 5,
              y: y - 5,
              width: textWidth + 10,
              height: 20,
              color: annotationColor,
              opacity: settings.opacity / 100
            });
            break;
          case 'strikeout':
            // Draw strikeout line
            page.drawLine({
              start: { x: x - 5, y: y + 8 },
              end: { x: x + textWidth + 5, y: y + 8 },
              thickness: 2,
              color: annotationColor,
              opacity: settings.opacity / 100
            });
            break;
          case 'underline':
            // Draw underline
            page.drawLine({
              start: { x: x - 5, y: y - 2 },
              end: { x: x + textWidth + 5, y: y - 2 },
              thickness: 2,
              color: annotationColor,
              opacity: settings.opacity / 100
            });
            break;
          default: // comment
            // Draw comment box
            page.drawRectangle({
              x: x - 5,
              y: y - 5,
              width: textWidth + 10,
              height: 20,
              borderColor: annotationColor,
              borderWidth: 1,
              opacity: settings.opacity / 100
            });
            break;
        }
        
        // Add annotation text
        page.drawText(annotationText, {
          x,
          y,
          size: 12,
          font,
          color: rgb(0, 0, 0),
          opacity: settings.opacity / 100
        });
        
        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        processedBlobs.push(blob);
      }
      
      setProcessedFiles(processedBlobs);
      setIsProcessing(false);
      setIsDownloadReady(true);
    } catch (error) {
      console.error('Error processing PDFs:', error);
      alert('Error adding annotations to PDF files. Please try again.');
      setIsProcessing(false);
    }
  };

  const downloadFiles = () => {
    processedFiles.forEach((blob, index) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files[index]?.name.replace('.pdf', '_annotated.pdf') || `annotated-${index + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setIsDownloadReady(false);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      
      // Add annotation preview
      ctx.fillStyle = settings.color;
      ctx.globalAlpha = settings.opacity / 100;
      
      if (settings.annotationType === 'comment') {
        ctx.fillRect(50, 50, 100, 30);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('Comment', 60, 70);
      } else if (settings.annotationType === 'highlight') {
        ctx.fillRect(50, 100, 200, 20);
      } else if (settings.annotationType === 'strikeout') {
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, 150);
        ctx.lineTo(250, 150);
        ctx.stroke();
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

  const stats = [
    { label: 'Annotation Types', value: 'Multiple Options', icon: <MessageSquare className="h-5 w-5" /> },
    { label: 'Collaboration', value: 'Team Features', icon: <Shield className="h-5 w-5" /> },
    { label: 'Export Options', value: 'PDF Compatible', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Multiple Annotation Types',
      description: 'Add comments, highlights, strikeouts, underlines, and custom annotations to your PDF documents.',
      icon: <MessageSquare className="h-6 w-6" />
    },
    {
      title: 'Collaborative Features',
      description: 'Include author names, timestamps, and collaborative annotations for team review and feedback.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Custom Styling',
      description: 'Choose colors, opacity levels, and annotation styles to match your workflow and preferences.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'Batch Processing',
      description: 'Apply consistent annotations to multiple PDF files simultaneously for efficient document review.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Supports multiple files for batch annotation.'
    },
    {
      step: 2,
      title: 'Configure Annotations',
      description: 'Choose annotation type, color, opacity, and add author information for collaborative work.'
    },
    {
      step: 3,
      title: 'Preview & Process',
      description: 'See a live preview of your annotations and click process to add them to your PDFs.'
    },
    {
      step: 4,
      title: 'Download Annotated PDFs',
      description: 'Download your PDF files with annotations, ready for review, collaboration, or archiving.'
    }
  ];

  return (
    <>
      <SEO 
        title="PDF Annotate | Online PDF Annotation Tool"
        description="Annotate PDFs in seconds with highlights, sticky notes, shapes, and more. A fast, easy-to-use tool for reviewing and editing PDFs online."
        keywords="PDF annotate, annotate PDF, PDF notes, PDF highlighter, online tool, free tool"
        canonical="pdf-annotate"
        ogImage="/images/pdf-annotate-og.jpg"
      />
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <MessageSquare className="h-4 w-4" />
                <span>PDF Annotator</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Annotations to PDF Documents
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add comments, highlights, and annotations to your PDF documents with professional collaboration tools. 
                Perfect for document review, feedback, and team collaboration workflows.
              </p>
              {/* Stats */}
              <div className="flex flex-col md:flex-row justify-center items-center gap-12 mb-12">
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
                    Drop your PDF files here for annotation
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
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose PDF Files
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
              </div>

              {/* Annotation Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Annotation Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annotation Type
                    </label>
                    <select
                      value={settings.annotationType}
                      onChange={(e) => setSettings({...settings, annotationType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="comment">Comment</option>
                      <option value="highlight">Highlight</option>
                      <option value="strikeout">Strikeout</option>
                      <option value="underline">Underline</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      value={settings.color}
                      onChange={(e) => setSettings({...settings, color: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeTimestamp"
                      checked={settings.includeTimestamp}
                      onChange={(e) => setSettings({...settings, includeTimestamp: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeTimestamp" className="text-sm font-medium text-gray-700">
                      Include Timestamp
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={settings.authorName}
                    onChange={(e) => setSettings({...settings, authorName: e.target.value})}
                    placeholder="Enter your name for annotations..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Annotations...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5" />
                      <span>Add Annotations</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
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
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Annotated PDFs</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Annotator?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional annotation tools with collaboration features and formatting options
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
                  How to Annotate PDFs
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to add annotations to your PDF documents
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
                    Ready to Annotate Your PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents with professional annotations. Join thousands of users 
                    who trust our tool for document collaboration and feedback.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span>Start Annotating Now</span>
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

export default PDFAnnotate; 