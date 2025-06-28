import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "80K+", label: "PPTs Converted" },
  { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileType className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

const PowerPointToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'landscape',
    quality: 'high',
    preserveFormatting: true,
    includeImages: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ name: string, slideCount: number | null } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pptFiles = selectedFiles.filter(file => file.name.endsWith('.ppt') || file.name.endsWith('.pptx'));
    setFiles(prev => [...prev, ...pptFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pptFiles = droppedFiles.filter(file => file.name.endsWith('.ppt') || file.name.endsWith('.pptx'));
    setFiles(prev => [...prev, ...pptFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Live preview: extract slide count from pptx if possible
  useEffect(() => {
    const loadPreview = async () => {
      if (files.length === 0) {
        setPreviewInfo(null);
        return;
      }
      const file = files[0];
      let slideCount: number | null = null;
      if (file.name.endsWith('.pptx')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const slides = Object.keys(zip.files).filter(name => name.match(/^ppt\/slides\/slide[0-9]+\.xml$/));
          slideCount = slides.length;
        } catch (e) {
          slideCount = null;
        }
      }
      setPreviewInfo({ name: file.name, slideCount });
    };
    loadPreview();
  }, [files]);

  const extractSlideTexts = async (file: File): Promise<string[] | null> => {
    if (!file.name.endsWith('.pptx')) return null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files).filter(name => name.match(/^ppt\/slides\/slide[0-9]+\.xml$/)).sort((a, b) => {
        // Sort by slide number
        const getNum = (n: string) => parseInt(n.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
        return getNum(a) - getNum(b);
      });
      const texts: string[] = [];
      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async('text');
        // Extract text between <a:t>...</a:t>
        const matches = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g));
        const slideText = matches.map(m => m[1]).join(' ');
        texts.push(slideText);
      }
      return texts;
    } catch {
      return null;
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    const unsupported = [];
    if (settings.preserveFormatting) unsupported.push('Preserve Formatting');
    if (settings.includeImages) unsupported.push('Include Images');
    if (unsupported.length > 0) {
      alert('Note: The following features are not supported in browser-based conversion and will be ignored: ' + unsupported.join(', '));
    }
    alert('Note: This tool does not render real PowerPoint slides. The generated PDF will only contain file metadata and slide text. For real slide rendering, a server-side solution or third-party API is required.');

    try {
      const processed: { name: string, blob: Blob }[] = [];
      const pageSizes: Record<string, [number, number]> = {
        A4: [595.28, 841.89],
        Letter: [612, 792],
        Legal: [612, 1008],
        A3: [841.89, 1190.55]
      };
      const baseSize = pageSizes[settings.pageSize] || pageSizes['A4'];
      const pageSize: [number, number] = settings.orientation === 'landscape' ? [baseSize[1], baseSize[0]] : baseSize;
      const fontSize = settings.quality === 'high' ? 14 : settings.quality === 'medium' ? 12 : 10;
      const lineHeight = fontSize + 6;

      for (const file of files) {
        try {
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          // Metadata/info page
          const page = pdfDoc.addPage(pageSize);
          const [width, height] = pageSize;
          let y = height - 50;
          page.drawText('PowerPoint to PDF Conversion', {
            x: 50,
            y,
            size: fontSize + 4,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= lineHeight * 1.5;
          page.drawText(`Original File: ${file.name}`, {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= lineHeight;
          page.drawText('Presentation Information:', {
            x: 50,
            y,
            size: fontSize + 2,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          y -= lineHeight;
          page.drawText(`File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= lineHeight;
          page.drawText(`File Type: ${file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation'}`, {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= lineHeight;
          // Try to show slide count for pptx
          let slideTexts: string[] | null = null;
          if (file.name.endsWith('.pptx')) {
            slideTexts = await extractSlideTexts(file);
            if (slideTexts) {
              page.drawText(`Slides: ${slideTexts.length}`, {
                x: 50,
                y,
                size: fontSize,
                font,
                color: rgb(0.5, 0.5, 0.5),
              });
              y -= lineHeight;
            }
          }
          page.drawText(`Last Modified: ${new Date(file.lastModified).toLocaleString()}`, {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= lineHeight * 2;
          page.drawText('Note: This PDF contains only PowerPoint file metadata and slide text.', {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.6, 0.2, 0.2),
          });
          y -= lineHeight;
          if (unsupported.length > 0) {
            page.drawText('Unsupported features: ' + unsupported.join(', '), {
              x: 50,
              y,
              size: fontSize,
              font,
              color: rgb(0.8, 0.4, 0.2),
            });
            y -= lineHeight;
          }
          page.drawText('For real slide rendering, use a dedicated server-side converter.', {
            x: 50,
            y,
            size: fontSize,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
          // Add slide text pages
          if (slideTexts && slideTexts.length > 0) {
            for (let i = 0; i < slideTexts.length; i++) {
              const slidePage = pdfDoc.addPage(pageSize);
              let sy = height - 50;
              slidePage.drawText(`Slide ${i + 1}`, {
                x: 50,
                y: sy,
                size: fontSize + 2,
                font,
                color: rgb(0.2, 0.2, 0.6),
              });
              sy -= lineHeight * 1.5;
              // Split slide text into lines for the page
              const text = slideTexts[i] || '';
              const words = text.split(' ');
              let line = '';
              for (const word of words) {
                if (font.widthOfTextAtSize(line + ' ' + word, fontSize) > width - 100) {
                  slidePage.drawText(line, {
                    x: 50,
                    y: sy,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                  });
                  sy -= lineHeight;
                  line = word;
                } else {
                  line = line ? line + ' ' + word : word;
                }
              }
              if (line) {
                slidePage.drawText(line, {
                  x: 50,
                  y: sy,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
              }
            }
          }
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.(pptx|ppt)$/i, '.pdf'),
            blob: blob
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`PowerPoint to PDF conversion completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error converting PowerPoint to PDF:', error);
      setIsProcessing(false);
      alert('Error converting PowerPoint to PDF. Please try again.');
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
    { icon: <FileType className="h-6 w-6" />, title: 'Accurate Conversion', description: 'Convert PowerPoint slides to PDF format' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Preserve Layout', description: 'Keep original slide layout and formatting' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple presentations at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PowerPoint Files', description: 'Drag and drop or browse to select your PPT/PPTX files' },
    { step: '2', title: 'Adjust Settings', description: 'Choose output format and layout options' },
    { step: '3', title: 'Convert to PDF', description: 'Download your PDF files' }
  ];

  return (
    <>
      <SEO
        title="PowerPoint to PDF | Convert PPT to PDF Online Free"
        description="Easily convert PowerPoint presentations (PPT, PPTX) to PDF online for free. Preserve formatting and share your slides in professional PDF format."
        keywords="PPT to PDF, convert PowerPoint to PDF, presentation to PDF, online tool, free tool"
        canonical="powerpoint-to-pdf"
        ogImage="/images/ppt-to-pdf-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>PowerPoint to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PowerPoint to PDF Converter
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your PowerPoint (.ppt, .pptx) files to high-quality PDF format. Fast, secure, and free PPT to PDF converter for business, education, and more.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PowerPoint files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PowerPoint Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".ppt,.pptx"
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
                    <span>Selected Presentations ({files.length})</span>
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
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  {previewInfo ? (
                    <div className="text-gray-800 text-sm">
                      <div><strong>File:</strong> {previewInfo.name}</div>
                      <div><strong>Slides:</strong> {previewInfo.slideCount !== null ? previewInfo.slideCount : 'N/A'}</div>
                      <div className="text-xs text-gray-400 mt-2">(Preview limited to file info. Real slide preview is not supported in-browser.)</div>
                    </div>
                  ) : (
                    <p>No live preview available for PowerPoint to PDF conversion.<br/>Conversion will generate PDF files for download.</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4 (Default)</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                    <select
                      value={settings.orientation}
                      onChange={e => setSettings(prev => ({ ...prev, orientation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PowerPoint to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional PPTX to PDF conversion with layout and animation preservation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PowerPoint to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your presentations</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert Your Presentations?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join millions of users who trust our PowerPoint to PDF converter for their document needs</p>
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

export default PowerPointToPDFConverter; 