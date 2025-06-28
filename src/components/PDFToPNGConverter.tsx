import React, { useState, useRef, useCallback, createContext, useContext } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

// Notification context for in-app messages
const NotificationContext = createContext<(msg: string, type?: 'error' | 'success') => void>(() => {});

export const useNotification = () => useContext(NotificationContext);

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'error' | 'success'>('success');
  React.useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [message]);
  return (
    <NotificationContext.Provider value={(msg, t = 'success') => { setMessage(msg); setType(t); }}>
      {children}
      {message && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          <div className={`px-4 py-2 rounded shadow-lg text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>{message}</div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

const PDFToPNGConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    quality: 'high',
    resolution: '300',
    format: 'png',
    compression: 'balanced',
    preserveTransparency: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();

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
    setErrors([]);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      const errorList: string[] = [];
      
      for (const file of files) {
        try {
          // Load PDF using pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          
          // Process each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            
            // Get page viewport
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate scale based on resolution
            const scale = parseInt(settings.resolution) / 72; // 72 DPI is default
            const scaledViewport = page.getViewport({ scale });
            
            // Create canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error('Canvas context not available');
            }
            
            // Set canvas dimensions
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            // Only fill white if not preserving transparency or not PNG
            if (!(settings.preserveTransparency && settings.format === 'png')) {
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Render PDF page to canvas
            const renderContext = {
              canvasContext: context,
              viewport: scaledViewport
            };
            
            await page.render(renderContext).promise;
            
            // Convert canvas to blob
            let mimeType = 'image/png';
            let quality = 1.0;
            let ext = 'png';
            if (settings.format === 'jpg') {
              mimeType = 'image/jpeg';
              ext = 'jpg';
              if (settings.quality === 'high') quality = 1.0;
              else if (settings.quality === 'medium') quality = 0.8;
              else quality = 0.6;
              if (settings.compression === 'minimal') quality = Math.max(quality, 0.9);
              if (settings.compression === 'maximum') quality = Math.min(quality, 0.5);
            } else if (settings.format === 'webp') {
              mimeType = 'image/webp';
              ext = 'webp';
              if (settings.quality === 'high') quality = 1.0;
              else if (settings.quality === 'medium') quality = 0.8;
              else quality = 0.6;
              if (settings.compression === 'minimal') quality = Math.max(quality, 0.9);
              if (settings.compression === 'maximum') quality = Math.min(quality, 0.5);
            } else {
              // PNG
              mimeType = 'image/png';
              ext = 'png';
              quality = settings.quality === 'high' ? 1.0 : 0.8;
            }
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  throw new Error('Failed to create blob from canvas');
                }
              }, mimeType, quality);
            });
            
            // Create filename
            const baseName = file.name.replace(/\.pdf$/i, '');
            const fileName = `${baseName}_page_${pageNum}.${ext}`;
            
            processed.push({
              name: fileName,
              blob: blob
            });
          }
          
        } catch (error) {
          const msg = `Error processing ${file.name}: ${error instanceof Error ? error.message : error}`;
          errorList.push(msg);
          notify(msg, 'error');
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      setErrors(errorList);
      if (errorList.length === 0) notify(`PDF to PNG conversion completed! Processed ${processed.length} pages.`, 'success');
      
    } catch (error) {
      console.error('Error converting PDFs:', error);
      setIsProcessing(false);
      setErrors([error instanceof Error ? error.message : String(error)]);
      notify('Error converting PDFs. Please try again.', 'error');
    }
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      notify('No processed files to download', 'error');
      return;
    }

    // Download each processed file
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

  const downloadAllAsZip = async () => {
    if (processedFiles.length === 0) return;
    const zip = new JSZip();
    processedFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pdf-to-png-images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "PDF to PNG Conversion",
      description: "Extract high-quality PNG images from PDF documents with transparency support"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "High Resolution Output",
      description: "Convert PDF pages to crisp, high-resolution PNG images up to 300 DPI"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Transparency Support",
      description: "Generate PNG images with transparency for professional graphics work"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDF",
      description: "Drag and drop your PDF file or click to browse and select from your computer"
    },
    {
      step: "2", 
      title: "Configure Settings",
      description: "Choose image quality, resolution, format, and compression settings"
    },
    {
      step: "3",
      title: "Convert to PNG",
      description: "Our system extracts and converts PDF pages to high-quality PNG images"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "600K+", label: "PDFs Converted" },
    { icon: <Zap className="h-5 w-5" />, value: "< 45s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Free Online PDF to PNG Tool | Convert in Seconds"
        description="Convert PDF files to PNG images in just a few clicks. 100% free, browser-based, and secure conversion with top-quality results."
        keywords="PDF to PNG, convert PDF to PNG, PDF converter, image conversion, online tool, free tool"
        canonical="pdf-to-png"
        ogImage="/images/pdf-to-png-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF to PNG Converter</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF to PNG Converter Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract images from PDF documents with precision. Convert PDF pages to PNG format 
                with transparency support and customizable quality settings.
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
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF file here for PNG conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Choose PDF
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
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
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

              {/* Image Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Image className="h-5 w-5 text-violet-600" />
                  <span>Image Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High (Best)</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low (Smaller)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                    <select
                      value={settings.resolution}
                      onChange={(e) => setSettings(prev => ({ ...prev, resolution: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="300">300 DPI (Print)</option>
                      <option value="150">150 DPI (Web)</option>
                      <option value="72">72 DPI (Screen)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                    <select
                      value={settings.compression}
                      onChange={(e) => setSettings(prev => ({ ...prev, compression: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="balanced">Balanced</option>
                      <option value="minimal">Minimal</option>
                      <option value="maximum">Maximum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preserve Transparency (PNG only)</label>
                    <input
                      type="checkbox"
                      checked={settings.preserveTransparency}
                      onChange={e => setSettings(prev => ({ ...prev, preserveTransparency: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable for true PNG transparency</span>
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
                      <span>Converting to PNG...</span>
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5" />
                      <span>Convert to PNG</span>
                    </>
                  )}
                </button>
                
                {processedFiles.length > 0 && (
                  <>
                    <button
                      onClick={downloadAll}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download Images</span>
                    </button>
                    <button
                      onClick={downloadAllAsZip}
                      className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 mt-2 sm:mt-0"
                      style={{ marginLeft: '0.5rem' }}
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All as ZIP</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF to PNG Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF to PNG conversion with transparency support and optimal quality
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
                  How to Convert PDF to PNG
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to extract PNG images from your PDF documents
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
                    Ready to Extract PNG Images from PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Convert your PDF pages to high-quality PNG images with transparency. Join thousands of users 
                    who trust our converter for their image extraction needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
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

// Wrap the main export with NotificationProvider
const PDFToPNGConverterWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFToPNGConverter />
  </NotificationProvider>
);

export default PDFToPNGConverterWithProvider; 