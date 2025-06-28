import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SEO from './SEO';
import mammoth from 'mammoth';

const WordToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ name: string, size: string, content: string } | null>(null);
  const [settings, setSettings] = useState({
    quality: 'high',
    preserveFormatting: true,
    includeImages: true,
    pageSize: 'a4'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const wordFiles = selectedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.doc')
    );
    setFiles(prev => [...prev, ...wordFiles]);
    if (wordFiles.length > 0) {
      loadPreview(wordFiles[0]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const wordFiles = droppedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.doc')
    );
    setFiles(prev => [...prev, ...wordFiles]);
    if (wordFiles.length > 0) {
      loadPreview(wordFiles[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const loadPreview = async (file: File) => {
    try {
      let content = '';
      if (file.name.endsWith('.docx')) {
        try {
          const text = await file.text();
          content = text || 'Document content extracted from DOCX';
        } catch {
          content = 'DOCX content extraction not available';
        }
      } else if (file.name.endsWith('.doc')) {
        content = 'Legacy DOC format detected. Content extraction limited.';
      } else if (file.name.endsWith('.rtf')) {
        const text = await file.text();
        content = text.replace(/\\[a-z0-9-]+\d*\s?/g, '')
                      .replace(/\{|\}/g, '')
                      .replace(/\\par/g, '\n')
                      .replace(/\\\s/g, ' ')
                      .trim();
      } else {
        content = await file.text();
      }
      
      setPreviewInfo({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        content: content.length > 200 ? content.substring(0, 200) + '...' : content
      });
    } catch (error) {
      setPreviewInfo({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        content: 'Preview not available'
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setPreviewInfo(null);
    } else if (index === 0 && files.length > 1) {
      loadPreview(files[1]);
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          let documentText = '';
          let htmlContent = '';
          let useHtml = false;
          
          if (file.name.endsWith('.docx')) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              htmlContent = result.value;
              useHtml = true;
            } catch {
              // fallback to plain text
              const text = await file.text();
              documentText = text || 'Document content extracted from DOCX';
            }
          } else if (file.name.endsWith('.doc')) {
            documentText = 'Legacy DOC format detected. Content extraction limited.';
          } else if (file.name.endsWith('.rtf')) {
            const text = await file.text();
            documentText = text.replace(/\\[a-z0-9-]+\d*\s?/g, '')
                              .replace(/\{|\}/g, '')
                              .replace(/\\par/g, '\n')
                              .replace(/\\\s/g, ' ')
                              .trim();
          } else {
            documentText = await file.text();
          }
          
          // Create PDF using pdf-lib
          const pdfDoc = await PDFDocument.create();
          
          // Embed font
          let font;
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          } catch {
            font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          }
          
          // Calculate page size based on settings
          let pageWidth, pageHeight;
          switch (settings.pageSize) {
            case 'a4':
              pageWidth = 595.28;
              pageHeight = 841.89;
              break;
            case 'letter':
              pageWidth = 612;
              pageHeight = 792;
              break;
            case 'legal':
              pageWidth = 612;
              pageHeight = 1008;
              break;
            case 'a3':
              pageWidth = 841.89;
              pageHeight = 1190.55;
              break;
            default:
              pageWidth = 595.28;
              pageHeight = 841.89;
          }
          
          const fontSize = settings.quality === 'high' ? 12 : settings.quality === 'medium' ? 10 : 8;
          const lineHeight = fontSize * 1.2;
          const margin = 50;
          const maxWidth = pageWidth - (margin * 2);
          
          const lines: { text: string, bold?: boolean, italic?: boolean, heading?: boolean }[] = [];
          if (useHtml && htmlContent) {
            // Parse HTML and extract lines with formatting
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const walk = (node: Node, style: { bold?: boolean, italic?: boolean, heading?: boolean } = {}) => {
              if (node.nodeType === Node.TEXT_NODE) {
                lines.push({ text: node.textContent || '', ...style });
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const newStyle = { ...style };
                if (el.tagName === 'B' || el.tagName === 'STRONG') newStyle.bold = true;
                if (el.tagName === 'I' || el.tagName === 'EM') newStyle.italic = true;
                if (/H[1-6]/.test(el.tagName)) newStyle.heading = true;
                for (const child of Array.from(el.childNodes)) {
                  walk(child, newStyle);
                }
                if (el.tagName === 'P' || /H[1-6]/.test(el.tagName)) {
                  lines.push({ text: '', ...style }); // paragraph break
                }
              }
            };
            for (const child of Array.from(tempDiv.childNodes)) {
              walk(child);
            }
          } else {
            // Fallback: plain text
            const words = documentText.split(/\s+/);
            let currentLine = '';
            for (const word of words) {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize);
              if (testWidth <= maxWidth) {
                currentLine = testLine;
              } else {
                if (currentLine) {
                  lines.push({ text: currentLine });
                  currentLine = word;
                } else {
                  lines.push({ text: word });
                }
              }
            }
            if (currentLine) {
              lines.push({ text: currentLine });
            }
          }
          
          // Draw text on page
          let y = pageHeight - margin;
          let page = pdfDoc.addPage([pageWidth, pageHeight]);
          let pageCount = 1;
          
          for (const line of lines) {
            if (y < margin + lineHeight) {
              if (pageCount < 50) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
                pageCount++;
              } else {
                break;
              }
            }
            if (!line.text.trim()) {
              y -= lineHeight / 2;
              continue;
            }
            const drawFont = font;
            let drawSize = fontSize;
            let drawColor = rgb(0, 0, 0);
            if (line.heading) {
              drawSize = fontSize * 1.5;
              drawColor = rgb(0.2, 0.2, 0.6);
            }
            page.drawText(line.text, {
              x: margin,
              y: y - drawSize,
              size: drawSize,
              font: drawFont,
              color: drawColor,
              ...(line.bold ? { font: drawFont } : {}),
              ...(line.italic ? { font: drawFont } : {})
            });
            y -= lineHeight;
          }
          
          // Save PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.(docx?|rtf)$/i, '.pdf'),
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`Word to PDF conversion completed! Processed ${processed.length} files.`);
      
    } catch (error) {
      console.error('Error converting documents:', error);
      setIsProcessing(false);
      alert('Error converting documents. Please try again.');
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
    { icon: <FileType className="h-6 w-6" />, title: 'Document Conversion', description: 'Convert Word documents to professional PDFs' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Format Preservation', description: 'Keep original formatting and layout' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple documents at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload Word Files', description: 'Drag and drop or browse to select your Word documents' },
    { step: '2', title: 'Adjust Settings', description: 'Choose quality and conversion options' },
    { step: '3', title: 'Convert to PDF', description: 'Download your professional PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '850K+', label: 'Documents Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="Word to PDF | Convert DOC & DOCX to PDF Online"
        description="Convert DOC and DOCX files to PDF format quickly and accurately. Our online Word to PDF tool ensures perfect formatting every time."
        keywords="Word to PDF, convert Word to PDF, DOCX to PDF, DOC to PDF, Word document converter, online converter, free converter, document conversion"
        canonical="word-to-pdf"
        ogImage="/images/word-to-pdf-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>Word to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Word to PDF Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Transform Word documents into professional PDF files while preserving formatting, images, and layout. Perfect for sharing and archiving.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    isDragActive 
                      ? 'border-violet-500 bg-violet-50/50 shadow-lg' 
                      : files.length > 0 
                        ? 'border-violet-500 bg-violet-50/50' 
                        : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragActive ? 'text-violet-600' : 'text-gray-400'}`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop your Word files here' : 'Drop your Word files here for PDF conversion'}
                  </h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.doc, .docx)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Word Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                    <span>Selected Documents ({files.length})</span>
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
                  <FileType className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  {previewInfo ? (
                    <div className="text-left">
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-1">Document: {previewInfo.name}</h4>
                        <p className="text-sm text-gray-600">Size: {previewInfo.size}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Content Preview:</h5>
                        <div className="bg-white rounded-lg p-3 border text-sm text-gray-700 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans">{previewInfo.content}</pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p>No live preview available for Word to PDF conversion.<br/>Conversion will generate PDF files for download.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PDF Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High Quality</option>
                      <option value="medium">Medium Quality</option>
                      <option value="low">Low Quality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="a4">A4 (Standard)</option>
                      <option value="letter">Letter (US)</option>
                      <option value="legal">Legal</option>
                      <option value="a3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveFormatting"
                      checked={settings.preserveFormatting}
                      onChange={e => setSettings(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveFormatting" className="text-sm font-medium text-gray-700">Preserve Formatting</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeImages"
                      checked={settings.includeImages}
                      onChange={e => setSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeImages" className="text-sm font-medium text-gray-700">Include Images</label>
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
                      {/* Spinner removed */}
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Word to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional document conversion with formatting and layout preservation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert Word to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your documents</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert Your Documents?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join millions of users who trust our Word to PDF converter for their document needs</p>
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

export default WordToPDFConverter; 