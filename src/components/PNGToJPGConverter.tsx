import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image, FileType, Users, Zap, Shield, FileText, Camera, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import SEO from './SEO';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "2M+", label: "Images Converted" },
  { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileType className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

// Features for PNG to JPG
const features = [
  {
    icon: <FileType className="h-6 w-6" />,
    title: 'Batch Conversion',
    description: 'Convert multiple PNG images to JPG in one go for maximum efficiency.'
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Secure & Private',
    description: 'All conversions happen in your browser. Your images are never uploaded.'
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Fast Processing',
    description: 'Lightning-fast conversion with instant download, no waiting.'
  },
  {
    icon: <Image className="h-6 w-6" />,
    title: 'Quality Control',
    description: 'Preserve image quality and control background color for transparent PNGs.'
  }
];

const howToSteps = [
  {
    step: '1',
    title: 'Upload PNG Images',
    description: 'Drag and drop or click to select your PNG files.'
  },
  {
    step: '2',
    title: 'Convert to JPG',
    description: 'Click the convert button to process your images.'
  },
  {
    step: '3',
    title: 'Download JPGs',
    description: 'Download your converted JPG images instantly.'
  }
];

const PNGToJPGConverter: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    const errors: string[] = [];
    for (const file of newFiles) {
      if (file.type !== 'image/png') {
        errors.push(`File ${file.name} is not a PNG image.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.name} exceeds 50MB limit.`);
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`Duplicate file skipped: ${file.name}`);
        continue;
      }
      deduped.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      });
    }
    setFiles(deduped);
    if (errors.length) setBanner({ message: errors.join(' '), type: 'error' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const toRemove = prev.find(img => img.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.url);
      return prev.filter(img => img.id !== id);
    });
  };

  const resetTool = () => {
    files.forEach(img => URL.revokeObjectURL(img.url));
    setFiles([]);
    setProcessedFiles([]);
    setBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Accessibility: focus management for banners
  useEffect(() => {
    if (banner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [banner]);

  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'Please upload at least one PNG file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    setBanner(null);
    setProcessedFiles([]);
    try {
      const results: { name: string; blob: Blob }[] = [];
      for (const img of files) {
        const blob = await convertPngToJpg(img.file, '#ffffff', 0.92);
        results.push({ name: img.name.replace(/\.png$/i, '.jpg'), blob });
      }
      setProcessedFiles(results);
      setBanner({ message: 'Conversion completed!', type: 'success' });
    } catch {
      setBanner({ message: 'Error converting PNG to JPG. Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setShowSpinner(false);
    }
  };

  const convertPngToJpg = (file: File, background: string, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject('Conversion failed');
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const downloadAll = () => {
    processedFiles.forEach(file => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file.blob);
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    setBanner({ message: 'Download started.', type: 'success' });
  };

  return (
    <>
      <SEO
        title="PNG to JPG Converter | Convert PNG to JPG Online Free"
        description="Convert PNG files to JPG quickly while maintaining image quality. Use our free online PNG to JPG converter—perfect for web and social media."
        keywords="PNG to JPG, convert PNG to JPG, PNG image converter, batch conversion, online tool, free tool"
        canonical="png-to-jpg"
        ogImage="/images/png-to-jpg-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>PNG to JPG Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PNG Images to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> JPG Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert PNG images to high-quality JPG format. Fast, secure, and free PNG to JPG converter for web, print, and sharing.
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
            {/* Banner */}
            {banner && (
              <div ref={bannerRef} tabIndex={-1} aria-live="assertive" className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-3 ${banner.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}> 
                {banner.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                <span>{banner.message}</span>
                <button onClick={() => setBanner(null)} className="ml-auto text-gray-400 hover:text-gray-700 focus:outline-none" aria-label="Close banner"><XCircle className="h-5 w-5" /></button>
              </div>
            )}
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
                  tabIndex={0}
                  aria-label="PNG upload area"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your PNG images here'}</h3>
                  <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PNG Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload PNG files"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-violet-600" />
                    <span>Selected PNGs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div key={file.id} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <Image className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Convert Button */}
              {files.length > 0 && (
                <div className="mb-8 text-center">
                  <button
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    onClick={processFiles}
                    disabled={isProcessing}
                    aria-label="Convert PNG to JPG"
                  >
                    {isProcessing || showSpinner ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <FileType className="h-5 w-5" />
                        <span>Convert to JPG</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Converted Files */}
              {processedFiles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span>Converted JPGs ({processedFiles.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedFiles.map((file, idx) => (
                      <div key={idx} className="bg-green-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                        </div>
                        <a
                          href={URL.createObjectURL(file.blob)}
                          download={file.name}
                          className="text-green-600 hover:underline font-semibold"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col items-center cursor-pointer" onClick={downloadAll} tabIndex={0} aria-label="Download all JPGs">
                    <button
                      onClick={e => { e.stopPropagation(); downloadAll(); }}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                      aria-label="Download all JPGs"
                    >
                      <Download className="h-5 w-5" />
                      Download All JPGs
                    </button>
                    <p className="text-gray-500 text-sm mt-2">Click anywhere in this box to download</p>
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our PNG to JPG Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Fast, secure, and high-quality PNG to JPG conversion for all your needs.</p>
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

            {/* How to Use Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PNG to JPG</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your images.</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert Your PNGs to JPG?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Experience fast, secure, and high-quality image conversion. Start now for free!</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileType className="h-5 w-5" />
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

export default PNGToJPGConverter; 