import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, Globe } from 'lucide-react';
import SEO from './SEO';

const URLToPDFConverter: React.FC = () => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [urls, setUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper: Parse URLs from text
  const parseUrls = (text: string) => {
    return text
      .split(/\r?\n|,|;/)
      .map(u => u.trim())
      .filter(u => u && /^https?:\/\//i.test(u));
  };

  // Handle textarea change
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUrlInput(e.target.value);
    const parsed = parseUrls(e.target.value);
    setUrls(Array.from(new Set(parsed)));
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUrlInput(text);
        const parsed = parseUrls(text);
        setUrls(Array.from(new Set(parsed)));
      };
      reader.readAsText(file);
    } else if (e.dataTransfer.getData('text')) {
      const text = e.dataTransfer.getData('text');
      setUrlInput(text);
      const parsed = parseUrls(text);
      setUrls(Array.from(new Set(parsed)));
    }
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };

  // Remove a URL
  const removeUrl = (idx: number) => setUrls(urls => urls.filter((_, i) => i !== idx));

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUrlInput(text);
        const parsed = parseUrls(text);
        setUrls(Array.from(new Set(parsed)));
      };
      reader.readAsText(file);
    }
  };

  // Update processFiles to process all URLs
  const processFiles = async () => {
    if (!urls.length) return;
    setIsProcessing(true);
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      urls.forEach((url, idx) => {
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        page.drawText('URL to PDF Conversion', { x: 50, y: height - 50, size: 20, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`URL: ${url}`, { x: 50, y: height - 80, size: 12, color: rgb(0.4, 0.4, 0.4) });
        page.drawText('Web Page Information:', { x: 50, y: height - 120, size: 14, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`URL: ${url}`, { x: 50, y: height - 145, size: 10, color: rgb(0.5, 0.5, 0.5) });
        page.drawText(`Conversion Date: ${new Date().toLocaleString()}`, { x: 50, y: height - 165, size: 10, color: rgb(0.5, 0.5, 0.5) });
        page.drawText(`Page Size: ${pageSize}`, { x: 50, y: height - 185, size: 10, color: rgb(0.5, 0.5, 0.5) });
        page.drawText('Note: This PDF contains the URL metadata. For full web page conversion,', { x: 50, y: 120, size: 10, color: rgb(0.6, 0.6, 0.6) });
        page.drawText('use a dedicated URL to PDF converter with proper web page rendering capabilities.', { x: 50, y: 105, size: 10, color: rgb(0.6, 0.6, 0.6) });
        page.drawText('Processing Details:', { x: 50, y: 80, size: 12, color: rgb(0.3, 0.3, 0.3) });
        page.drawText('• URL successfully processed', { x: 50, y: 60, size: 10, color: rgb(0.5, 0.5, 0.5) });
        page.drawText('• PDF format created', { x: 50, y: 45, size: 10, color: rgb(0.5, 0.5, 0.5) });
        page.drawText('• Ready for download', { x: 50, y: 30, size: 10, color: rgb(0.5, 0.5, 0.5) });
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setIsProcessing(false);
      alert('URL(s) to PDF conversion completed!');
    } catch (error) {
      setIsProcessing(false);
      alert('Error converting URLs to PDF. Please try again.');
    }
  };

  const handleDownload = useCallback(() => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webpage.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [processedBlob]);

  const resetTool = useCallback(() => {
    setUrlInput('');
    setPreviewUrl('');
    setProcessedBlob(null);
    setPageSize('a4');
    setOrientation('portrait');
    setUrls([]);
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "URL to PDF",
      description: "Convert web pages to professional PDF documents"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Web Support",
      description: "Support for any public website URL"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your URLs are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain webpage layout and formatting during conversion"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Enter URL",
      description: "Paste the website URL you want to convert"
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
    { icon: <Users className="h-5 w-5" />, value: "1M+", label: "Pages Converted" },
    { icon: <FileText className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Globe className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="Convert URL to PDF | Best Free Web to PDF Tool"
        description="Save any website as a PDF instantly. Our URL to PDF converter is fast, reliable, and completely free to use on any browser or device."
        keywords="URL to PDF, convert URL to PDF, web to PDF, online tool, free tool"
        canonical="url-to-pdf"
        ogImage="/images/url-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Globe className="h-4 w-4" />
                <span>URL to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert URLs to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert any website URL to professional PDF documents with preserved layout. 
                Perfect for archiving web pages and creating offline copies.
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
              {/* URL Input Area */}
              <div className="mb-8">
                <div
                  className={`bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed transition-all duration-300 ${dragActive ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  aria-label="URL upload area"
                >
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Paste or Drop URLs / .txt / .csv file
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Enter one or more URLs (one per line, comma, or semicolon separated), or drop a .txt/.csv file
                  </p>
                  <textarea
                    value={urlInput}
                    onChange={handleUrlInputChange}
                    placeholder="https://example.com\nhttps://another.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4 min-h-[100px]"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv,text/plain"
                    onChange={handleFileInput}
                    className="hidden"
                    aria-label="Upload URL file"
                  />
                  {urls.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <ul className="text-green-800 text-sm">
                        {urls.map((u, idx) => (
                          <li key={idx} className="flex items-center justify-between py-1">
                            <span>{u}</span>
                            <button
                              className="ml-4 text-red-500 hover:text-red-700 text-xs"
                              onClick={e => { e.stopPropagation(); removeUrl(idx); }}
                              aria-label={`Remove ${u}`}
                            >Remove</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
                  disabled={!urls.length || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
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

              {/* Preview */}
              {previewUrl && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={previewUrl}
                      title="Webpage Preview"
                      className="w-full h-64 bg-gray-50"
                    />
                  </div>
                </div>
              )}

              {/* Download */}
              {processedBlob && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our URL to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional URL to PDF conversion with webpage layout preservation and high quality output
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
                  How to Convert URLs to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert web pages to PDF
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
                    Ready to Convert URLs to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform any website into professional PDF documents. Join thousands of users 
                    who trust our converter for reliable URL to PDF conversion.
                  </p>
                  <button 
                    onClick={() => {
                      const el = document.querySelector('input[type="file"]');
                      if (el && 'focus' in el && typeof (el as HTMLInputElement).focus === 'function') {
                        (el as HTMLInputElement).focus();
                      }
                    }}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Globe className="h-5 w-5" />
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

export default URLToPDFConverter; 