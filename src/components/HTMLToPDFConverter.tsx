import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, Globe, FileType } from 'lucide-react';
import SEO from './SEO';
// declare module 'html2pdf.js';
import html2pdf from 'html2pdf.js';

const HTMLToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>(['']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    includeCSS: true,
    includeImages: true,
    includeLinks: true,
    pageSize: 'A4',
    orientation: 'portrait',
    waitForLoad: true,
    customCSS: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ [name: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const htmlFiles = selectedFiles.filter(file => 
      file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')
    );
    setFiles(prev => [...prev, ...htmlFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const htmlFiles = droppedFiles.filter(file => 
      file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')
    );
    setFiles(prev => [...prev, ...htmlFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    setUrls(prev => [...prev, '']);
  };

  const removeUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    setUrls(prev => prev.map((url, i) => i === index ? value : url));
  };

  const handleDropAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  function preprocessHTML(html: string, settings: any): string {
    const doc = document.implementation.createHTMLDocument('');
    doc.documentElement.innerHTML = html;
    // Remove CSS if needed
    if (!settings.includeCSS) {
      doc.querySelectorAll('style,link[rel="stylesheet"]').forEach(el => el.remove());
    }
    // Remove images if needed
    if (!settings.includeImages) {
      doc.querySelectorAll('img').forEach(el => el.remove());
      // Remove inline background images
      doc.querySelectorAll('[style]').forEach(el => {
        el.setAttribute('style', el.getAttribute('style')?.replace(/background(-image)?:[^;]+;?/gi, '') || '');
      });
    }
    // Remove links if needed
    if (!settings.includeLinks) {
      doc.querySelectorAll('a').forEach(el => {
        el.replaceWith(...el.childNodes);
      });
    }
    return doc.documentElement.innerHTML;
  }

  const processFiles = async () => {
    setErrorMsg(''); setSuccessMsg('');
    setProgress({});
    setIsProcessing(true);
    const processed: { name: string, blob: Blob }[] = [];
    try {
      // Process local files (in-browser)
      for (const file of files) {
        setProgress(p => ({ ...p, [file.name]: 0 }));
        try {
          let text = await file.text();
          text = preprocessHTML(text, settings);
          // Create a container for rendering
          const container = document.createElement('div');
          container.innerHTML = text;
          if (settings.customCSS) {
            const style = document.createElement('style');
            style.innerHTML = settings.customCSS;
            container.appendChild(style);
          }
          // Wait for images if needed
          if (settings.waitForLoad) {
            await Promise.all(Array.from(container.querySelectorAll('img')).map(img => {
              return new Promise(res => {
                if (img.complete) return res(true);
                img.onload = img.onerror = () => res(true);
              });
            }));
          }
          // html2pdf options
          const opt = {
            margin: 0.5,
            filename: file.name.replace(/\.html?$/i, '.pdf'),
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: {
              unit: 'pt',
              format: settings.pageSize || 'a4',
              orientation: settings.orientation || 'portrait',
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          };
          // Render to PDF Blob
          const pdfBlob: Blob = await new Promise((resolve, reject) => {
            html2pdf().set(opt).from(container).outputPdf('blob').then(resolve).catch(reject);
          });
          processed.push({ name: file.name.replace(/\.html?$/i, '.pdf'), blob: pdfBlob });
          setProgress(p => ({ ...p, [file.name]: 100 }));
        } catch (err: any) {
          setErrorMsg(prev => prev + ` Error processing ${file.name}: ${err?.message || err}`);
          setProgress(p => ({ ...p, [file.name]: 0 }));
        }
      }
      // Process URLs (server-side Puppeteer)
      for (const url of urls.filter(u => u.trim())) {
        setProgress(p => ({ ...p, [url]: 0 }));
        try {
          const response = await fetch('http://localhost:4000/api/html-to-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              pageSize: settings.pageSize,
              orientation: settings.orientation,
            }),
          });
          if (!response.ok) throw new Error('Failed to convert URL');
          const blob = await response.blob();
          processed.push({ name: url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf', blob });
          setProgress(p => ({ ...p, [url]: 100 }));
        } catch (err: any) {
          setErrorMsg(prev => prev + ` Error processing URL ${url}: ${err?.message || err}`);
          setProgress(p => ({ ...p, [url]: 0 }));
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      if (processed.length > 0) {
        setSuccessMsg('HTML to PDF conversion completed!');
      }
    } catch (error: any) {
      setIsProcessing(false);
      setErrorMsg('Error converting HTML to PDF. Please try again.');
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
    { icon: <Globe className="h-6 w-6" />, title: 'Web Page Conversion', description: 'Convert web pages and HTML files to PDF' },
    { icon: <Shield className="h-6 w-6" />, title: 'CSS Preservation', description: 'Maintain styling and layout in PDF output' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple HTML files and URLs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'High-quality PDF output with perfect formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload HTML Files or URLs', description: 'Select HTML files or enter website URLs' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion options and formatting' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '180K+', label: 'Web Pages Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="HTML to PDF | Convert Web Pages to PDF Easily"
        description="Convert HTML web pages to PDF files with one click. Our online tool preserves formatting and works on all devices and browsers."
        keywords="HTML to PDF, convert HTML, HTML converter, web page to PDF, online tool, free tool"
        canonical="html-to-pdf"
        ogImage="/images/html-to-pdf-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Globe className="h-4 w-4" />
                <span>HTML to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert HTML to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert HTML files and web pages to professional PDF documents while preserving styling, images, and layout. Perfect for archiving web content and creating documents.
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
                  onKeyDown={handleDropAreaKeyDown}
                  tabIndex={0}
                  aria-label="HTML file upload area. Click or press Enter/Space to select files, or drag and drop HTML files."
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your HTML files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.html, .htm)</p>
                  <button
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose HTML Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".html,.htm,text/html"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* URL Input Area */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-violet-600" />
                  <span>Website URLs</span>
                </h3>
                <div className="space-y-3">
                  {urls.map((url, index) => (
                    <div key={index} className="flex space-x-3">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {urls.length > 1 && (
                        <button
                          onClick={() => removeUrl(index)}
                          className="px-3 py-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addUrl}
                    className="text-violet-600 hover:text-violet-700 font-medium"
                  >
                    + Add another URL
                  </button>
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected HTML Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <Globe className="h-8 w-8 text-violet-600" />
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
                  <Globe className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for HTML to PDF conversion.<br/>Conversion will preserve CSS styling, images, and layout.</p>
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                      <option value="A3">A3</option>
                      <option value="A5">A5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                    <select
                      value={settings.orientation}
                      onChange={e => setSettings(prev => ({ ...prev, orientation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeCSS"
                      checked={settings.includeCSS}
                      onChange={e => setSettings(prev => ({ ...prev, includeCSS: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeCSS" className="text-sm font-medium text-gray-700">Include CSS</label>
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeLinks"
                      checked={settings.includeLinks}
                      onChange={e => setSettings(prev => ({ ...prev, includeLinks: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeLinks" className="text-sm font-medium text-gray-700">Include Links</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="waitForLoad"
                      checked={settings.waitForLoad}
                      onChange={e => setSettings(prev => ({ ...prev, waitForLoad: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="waitForLoad" className="text-sm font-medium text-gray-700">Wait for Page Load</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={(files.length === 0 && urls.every(url => !url.trim())) || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
                      <span>Convert HTML to PDF</span>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our HTML to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect HTML to PDF transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert HTML to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your HTML files and web pages</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert HTML to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our HTML to PDF converter for perfect web page conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Globe className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Per-file progress and error/success messages */}
            {errorMsg && (
              <div className="mb-4 text-red-600 font-semibold text-center">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="mb-4 text-green-600 font-semibold text-center">{successMsg}</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default HTMLToPDFConverter; 