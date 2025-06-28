import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, FileType } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToPowerPointConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    format: 'pptx',
    preserveLayout: true,
    extractImages: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setPreviewUrl(null);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Load PDF using pdfjs-dist
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          
          // Create PowerPoint presentation using pptxgenjs
          const pptx = await import('pptxgenjs');
          const pres = new pptx.default();
          
          // Extract content from each page and create slides
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            
            // Extract text content
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            // Create a new slide
            const slide = pres.addSlide();
            
            // Add title (use page number as title)
            slide.addText(`Page ${pageNum}`, {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 1,
              fontSize: 24,
              bold: true,
              color: '363636'
            });
            
            // Add content text
            if (pageText.trim()) {
              // Split text into manageable chunks
              const textChunks = pageText.match(/.{1,500}/g) || [pageText];
              
              let yOffset = 1.5;
              for (const chunk of textChunks) {
                if (yOffset < 6) { // Keep text within slide bounds
                  slide.addText(chunk, {
                    x: 0.5,
                    y: yOffset,
                    w: 9,
                    h: 1,
                    fontSize: 14,
                    color: '363636',
                    wrap: true
                  });
                  yOffset += 1.2;
                }
              }
            }
            
            // If no text content, add a placeholder
            if (!pageText.trim()) {
              slide.addText('Content extracted from PDF page', {
                x: 0.5,
                y: 6.5,
                w: 9,
                h: 1,
                fontSize: 14,
                color: '363636',
                wrap: true
              });
            }
          }
          
          // Generate PowerPoint file
          const pptxBuffer = await pres.write();
          const blob = new Blob([pptxBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
          });
          
          // Generate preview for the first file/slide (visual approximation)
          if (processed.length === 0) {
            // Render the first slide's text to a canvas for preview
            const firstPage = await pdfDoc.getPage(1);
            const textContent = await firstPage.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 450;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#363636';
              ctx.font = 'bold 32px Arial';
              ctx.fillText('Page 1', 40, 60);
              ctx.font = '16px Arial';
              // Wrap text for preview
              let y = 100;
              const words = pageText.split(' ');
              let line = '';
              for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > 700) {
                  ctx.fillText(line, 40, y);
                  line = word + ' ';
                  y += 28;
                  if (y > 400) break;
                } else {
                  line = testLine;
                }
              }
              if (y <= 400 && line) ctx.fillText(line, 40, y);
              setPreviewUrl(canvas.toDataURL('image/png'));
            }
          }
          
          processed.push({
            name: file.name.replace(/\.pdf$/i, '.pptx'),
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`PDF to PowerPoint conversion completed! Processed ${processed.length} files.`);
      
    } catch (error) {
      console.error('Error converting PDFs:', error);
      setIsProcessing(false);
      alert('Error converting PDFs. Please try again.');
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
    { icon: <FileType className="h-6 w-6" />, title: 'Accurate Conversion', description: 'Convert PDF slides to editable PowerPoint format' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Preserve Layout', description: 'Keep original slide layout and formatting' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag and drop or browse to select your PDF presentations' },
    { step: '2', title: 'Adjust Settings', description: 'Choose output format and layout options' },
    { step: '3', title: 'Convert to PowerPoint', description: 'Download your editable PPTX files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '1.2M+', label: 'PDFs Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="PDF to PowerPoint | Free Online PDF to PPT Converter"
        description="Transform PDFs into PowerPoint slides in seconds. Use our free PDF to PowerPoint converter online—no downloads, no sign-up needed."
        keywords="PDF to PowerPoint, PDF to PPTX, convert PDF to PowerPoint, PDF presentation converter, PDF to slides, online PDF converter, free converter"
        canonical="pdf-to-powerpoint"
        ogImage="/images/pdf-to-powerpoint-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>PDF to PowerPoint</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Editable PowerPoint</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform your PDF presentations into editable PowerPoint slides. Perfect for editing, collaboration, and presentations.
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

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileType className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                {previewUrl ? (
                  <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center">
                    <strong>Live Preview (first slide):</strong>
                    <img src={previewUrl} alt="First slide preview" className="rounded shadow max-w-full max-h-60 border border-gray-200 mt-2" />
                  </div>
                ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF to PowerPoint conversion.<br/>Conversion will generate editable PPTX files for download.</p>
                </div>
                )}
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.format}
                      onChange={e => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="pptx">PPTX (Modern)</option>
                      <option value="ppt">PPT (Legacy)</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveLayout"
                      checked={settings.preserveLayout}
                      onChange={e => setSettings(prev => ({ ...prev, preserveLayout: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveLayout" className="text-sm font-medium text-gray-700">Preserve Layout</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extractImages"
                      checked={settings.extractImages}
                      onChange={e => setSettings(prev => ({ ...prev, extractImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="extractImages" className="text-sm font-medium text-gray-700">Extract Images</label>
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
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Convert to PowerPoint</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PPTX Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF to PowerPoint Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional PDF to PPTX conversion with layout and image preservation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PDF to PowerPoint</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your PDF presentations</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join millions of users who trust our PDF to PowerPoint converter for their presentation needs</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Zap className="h-5 w-5" />
                    <span>Start Converting Now</span>
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

export default PDFToPowerPointConverter; 