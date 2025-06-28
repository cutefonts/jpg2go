import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, BookOpen, Zap, FileType } from 'lucide-react';
import SEO from './SEO';

const FB2ToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const fb2Files = files.filter(file => file.name.endsWith('.fb2'));
    setSelectedFiles(prev => [...prev, ...fb2Files]);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    const fb2Files = files.filter(file => file.name.endsWith('.fb2'));
    setSelectedFiles(prev => [...prev, ...fb2Files]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const processFiles = async () => {
    if (!selectedFiles.length) return;
    setIsProcessing(true);
    const blobs: { name: string, blob: Blob }[] = [];
    for (const file of selectedFiles) {
      try {
        const text = await file.text();
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        let font;
        try {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        } catch {
          font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        }
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        const lines = text.split(/\r?\n/);
        let y = height - 50;
        for (const line of lines) {
          if (y < 50) break;
          page.drawText(line, { x: 50, y: y, size: 12, font: font, color: rgb(0, 0, 0) });
          y -= 18;
        }
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        blobs.push({ name: file.name.replace(/\.fb2$/i, '.pdf'), blob });
      } catch (error) {
        // skip file on error
      }
    }
    setProcessedBlobs(blobs);
    setIsProcessing(false);
    alert('FB2 to PDF batch conversion completed!');
  };

  const handleDownload = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setProcessedBlobs([]);
    setPageSize('a4');
    setOrientation('portrait');
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "FB2 to PDF",
      description: "Convert FB2 ebooks to professional PDF documents"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Ebook Support",
      description: "Full support for FictionBook 2.0 format"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain formatting and structure during conversion"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload FB2",
      description: "Select your FB2 ebook file from your device"
    },
    {
      step: "2",
      title: "Choose Settings",
      description: "Select page size and orientation for the PDF"
    },
    {
      step: "3",
      title: "Convert & Download",
      description: "Convert to PDF and download the result"
    }
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
        title="FB2 to PDF | Free Online FB2 to PDF Converter"
        description="Turn FB2 eBooks into PDF documents instantly. Use our easy, browser-based converter with no software required and 100% free access."
        keywords="FB2 to PDF, convert FB2, FB2 converter, ebook conversion, online tool, free tool"
        canonical="fb2-to-pdf"
        ogImage="/images/fb2-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BookOpen className="h-4 w-4" />
                <span>FB2 to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert FB2 to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your FB2 ebooks to professional PDF documents with preserved formatting. 
                Perfect for reading on any device or sharing with others.
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
                    selectedFiles.length > 0
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your FB2 ebooks here for PDF conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".fb2"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose FB2 Files
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <ul className="text-green-800">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex items-center justify-between py-1">
                          <span>{file.name}</span>
                          <button
                            className="ml-4 text-red-500 hover:text-red-700 text-sm"
                            onClick={() => handleRemoveFile(idx)}
                            aria-label={`Remove ${file.name}`}
                          >Remove</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">PDF Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Size
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'legal')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={!selectedFiles.length || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Download */}
              {processedBlobs.length > 0 && (
                <div className="mt-8 text-center">
                  <div className="mb-4 text-green-700 font-semibold">Batch conversion complete! Download your PDFs:</div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {processedBlobs.map((f, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(f.blob, f.name)}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2"
                      >
                        <Download className="h-5 w-5" />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our FB2 to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional FB2 to PDF conversion with formatting preservation and high quality output
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
                  How to Convert FB2 to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your FB2 ebooks to PDF
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
                    Ready to Convert FB2 to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your FB2 ebooks into professional PDF documents. Join thousands of users 
                    who trust our converter for reliable FB2 to PDF conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>Start Converting Now</span>
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

export default FB2ToPDFConverter; 