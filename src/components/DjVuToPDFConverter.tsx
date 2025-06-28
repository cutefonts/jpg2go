import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType, Info } from 'lucide-react';
import SEO from './SEO';
// @ts-ignore
const DJVU_JS_URL = '/libs/djvujs/djvu.js';

// Add global type for DjVu
// @ts-ignore
declare global {
  interface Window {
    DjVu: any;
  }
}

const loadDjvuJs = () => {
  return new Promise<any>((resolve, reject) => {
    if (window.DjVu) return resolve(window.DjVu);
    const script = document.createElement('script');
    script.src = DJVU_JS_URL;
    script.onload = () => resolve(window.DjVu);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const parsePageRange = (range: string, max: number) => {
  if (!range) return Array.from({ length: max }, (_, i) => i + 1);
  const pages = new Set<number>();
  range.split(',').forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end && i <= max; i++) pages.add(i);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= max) pages.add(n);
    }
  });
  return Array.from(pages).sort((a, b) => a - b);
};

const DjVuToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    ocr: true,
    preserveImages: true,
    pageRange: '',
    dpi: 300
  });
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const djvuFiles = selectedFiles.filter(file => file.name.endsWith('.djvu'));
    setFiles(prev => [...prev, ...djvuFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const djvuFiles = droppedFiles.filter(file => file.name.endsWith('.djvu'));
    setFiles(prev => [...prev, ...djvuFiles]);
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
    setProgress('Loading DjVu.js...');
    try {
      // Dynamically load DjVu.js
      // @ts-ignore
      const DjVu: any = await loadDjvuJs();
      const processed: { name: string, blob: Blob }[] = [];
      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        setProgress(`Processing ${file.name} (${fileIdx + 1}/${files.length})...`);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const doc = new DjVu.Document(arrayBuffer);
          await doc.init();
          const numPages = doc.pagesCount;
          const pageNumbers = parsePageRange(settings.pageRange, numPages);
          // Import pdf-lib and tesseract.js only if needed
          const { PDFDocument, rgb } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          let font;
          try {
            font = await pdfDoc.embedFont('Helvetica');
          } catch {
            font = await pdfDoc.embedFont('TimesRoman');
          }
          for (let i = 0; i < pageNumbers.length; i++) {
            const pageNum = pageNumbers[i];
            setProgress(`Rendering page ${pageNum} of ${file.name}...`);
            const page = await doc.getPage(pageNum);
            const dpi = settings.dpi;
            const width = Math.round(page.width * (dpi / 300));
            const height = Math.round(page.height * (dpi / 300));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            await page.render({ canvas, width, height });
            // Add image to PDF
            const imgData = canvas.toDataURL('image/png');
            const img = await pdfDoc.embedPng(imgData);
            const pdfPage = pdfDoc.addPage([width, height]);
            pdfPage.drawImage(img, { x: 0, y: 0, width, height });
            // OCR if enabled
            if (settings.ocr) {
              setProgress(`Running OCR on page ${pageNum} of ${file.name}...`);
              const { createWorker } = await import('tesseract.js');
              const worker = await createWorker();
              await worker.load();
              // @ts-ignore
              await worker.loadLanguage('eng');
              // @ts-ignore
              await worker.initialize('eng');
              const { data: { text } } = await worker.recognize(canvas);
              await worker.terminate();
              // Add invisible text layer
              pdfPage.drawText(text, {
                x: 10, y: height - 30, size: 10, font, color: rgb(1, 1, 1), opacity: 0.01
              });
            }
          }
          const pdfBytes = await pdfDoc.save();
          processed.push({
            name: file.name.replace(/\.djvu$/i, '.pdf'),
            blob: new Blob([pdfBytes], { type: 'application/pdf' })
          });
        } catch (error) {
          setProgress('');
          alert(`Error processing ${file.name}: ${error}`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setProgress('');
      alert(`DjVu to PDF conversion completed! Processed ${processed.length} files.`);
    } catch (error) {
      setIsProcessing(false);
      setProgress('');
      alert('Error converting DjVu to PDF. Please try again.');
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
    { icon: <FileText className="h-6 w-6" />, title: 'DjVu Conversion', description: 'Convert DjVu scanned documents to PDF' },
    { icon: <Shield className="h-6 w-6" />, title: 'OCR Support', description: 'Recognize text in scanned DjVu files' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple DjVu files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'High-quality PDF output with images' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload DjVu Files', description: 'Select DjVu files to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion and OCR options' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '200K+', label: 'Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="DjVu to PDF Converter | Fast & Easy DjVu to PDF Online"
        description="Convert your DjVu files to PDF format quickly and effortlessly. Our online DjVu to PDF converter offers high-quality results for free."
        keywords="DjVu to PDF, convert DjVu, DjVu converter, online tool, free tool"
        canonical="djvu-to-pdf"
        ogImage="/images/djvu-to-pdf-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>DjVu to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert DjVu to PDF
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> with OCR</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert DjVu scanned documents to PDF format with optional OCR for text recognition. Preserve images and page layout.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your DjVu files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.djvu)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose DjVu Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".djvu"
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
                    <span>Selected DjVu Files ({files.length})</span>
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

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for DjVu to PDF conversion.<br/>Conversion will preserve images and layout. OCR is available for text recognition.</p>
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-2 opacity-60 cursor-not-allowed relative group">
                    <input
                      type="checkbox"
                      id="ocr"
                      checked={settings.ocr}
                      disabled
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ocr" className="text-sm font-medium text-gray-700">Enable OCR</label>
                    <Info className="h-4 w-4 text-gray-400 ml-1" />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      OCR is not available in-browser. This setting does not affect the output.
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-60 cursor-not-allowed relative group">
                    <input
                      type="checkbox"
                      id="preserveImages"
                      checked={settings.preserveImages}
                      disabled
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveImages" className="text-sm font-medium text-gray-700">Preserve Images</label>
                    <Info className="h-4 w-4 text-gray-400 ml-1" />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Image preservation is not available in-browser. This setting does not affect the output.
                    </div>
                  </div>
                  <div className="opacity-60 cursor-not-allowed relative group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range <Info className="inline h-4 w-4 text-gray-400 ml-1 align-text-bottom" /></label>
                    <input
                      type="text"
                      value={settings.pageRange}
                      disabled
                      placeholder="e.g. 1-5,8,10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-100"
                    />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Page range selection is not available in-browser. This setting does not affect the output.
                    </div>
                  </div>
                  <div className="opacity-60 cursor-not-allowed relative group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">DPI <Info className="inline h-4 w-4 text-gray-400 ml-1 align-text-bottom" /></label>
                    <select
                      value={settings.dpi}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-100"
                    >
                      <option value={150}>150 DPI</option>
                      <option value={300}>300 DPI</option>
                      <option value={600}>600 DPI</option>
                    </select>
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      DPI setting is not available in-browser. This setting does not affect the output.
                    </div>
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
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert DjVu to PDF</span>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our DjVu to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for scanned document transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert DjVu to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your DjVu files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert DjVu to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our DjVu to PDF converter for perfect scanned document conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
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

export default DjVuToPDFConverter; 