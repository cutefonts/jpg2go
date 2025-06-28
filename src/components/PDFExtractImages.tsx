import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Settings, 
  FileImage, 
  Zap, 
  Users,
  Shield,
  XCircle,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_FORMATS = ['jpg', 'png', 'webp'];

const PDFExtractImages: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedImages, setExtractedImages] = useState<{ file: string, images: { url: string, name: string }[] }[]>([]);
  const [imageFormat, setImageFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [quality, setQuality] = useState(90);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    const errors: string[] = [];
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        errors.push(`File ${file.name} is not a PDF.`);
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
      deduped.push(file);
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

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setExtractedImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setExtractedImages([]);
    setZipBlob(null);
    setBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Real image extraction using pdfjs-dist (render each page to image)
  const processPDFs = useCallback(async () => {
    if (files.length === 0) {
      setBanner({ message: 'Please upload at least one PDF file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    setBanner(null);
    setExtractedImages([]);
    setZipBlob(null);
    try {
      const allExtracted: { file: string, images: { url: string, name: string }[] }[] = [];
      const zip = new JSZip();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images: { url: string, name: string }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 }); // High-res
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          // Export canvas as image
          let url = '';
          if (imageFormat === 'jpg') {
            url = canvas.toDataURL('image/jpeg', quality / 100);
          } else if (imageFormat === 'png') {
            url = canvas.toDataURL('image/png');
          } else if (imageFormat === 'webp') {
            url = canvas.toDataURL('image/webp', quality / 100);
          }
          const imgNameOut = `${file.name.replace(/\.pdf$/i, '')}_page${i}.${imageFormat}`;
          images.push({ url, name: imgNameOut });
          // Add to zip
          zip.file(imgNameOut, url.split(',')[1], { base64: true });
        }
        allExtracted.push({ file: file.name, images });
      }
      setExtractedImages(allExtracted);
      if (zip.files && Object.keys(zip.files).length > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setZipBlob(zipBlob);
        setBanner({ message: 'Page images extracted and ZIP ready for download!', type: 'success' });
      } else {
        setBanner({ message: 'No images found in the uploaded PDFs.', type: 'error' });
      }
    } catch (error: any) {
      setBanner({ message: 'Error extracting images from PDFs. Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setShowSpinner(false);
    }
  }, [files, imageFormat, quality]);

  const handleDownload = () => {
    if (zipBlob) {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBanner({ message: 'Download started.', type: 'success' });
    }
  };

  // Memory cleanup for preview URLs
  useEffect(() => {
    return () => {
      extractedImages.forEach(batch => batch.images.forEach(img => URL.revokeObjectURL(img.url)));
    };
  }, [extractedImages]);

  // Accessibility: focus management for banners
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (banner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [banner]);

  // Generate PDF preview (first page of first file)
  useEffect(() => {
    let revoked = false;
    const genPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.7 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvas.toBlob(blob => {
          if (blob && !revoked) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
          }
          setPreviewLoading(false);
        }, 'image/jpeg', 0.8);
      } catch (err) {
        setPreviewUrl(null);
        setPreviewLoading(false);
      }
    };
    genPreview();
    return () => {
      revoked = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line
  }, [files]);

  const features = [
    {
      icon: <FileImage className="h-6 w-6" />,
      title: "Smart Extraction",
      description: "Intelligent image detection and extraction from PDF documents"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Multiple Formats",
      description: "Extract images in JPG, PNG, or WebP formats with quality control"
    },
    {
      icon: <FileImage className="h-6 w-6" />,
      title: "Selective Extraction",
      description: "Extract all images or choose specific pages for targeted extraction"
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
      description: "Drag and drop your PDF or click to browse and select from your computer"
    },
    {
      step: "2", 
      title: "Configure Settings",
      description: "Choose image format, quality, and extraction options"
    },
    {
      step: "3",
      title: "Extract & Download",
      description: "Extract images from your PDF and download as a ZIP file"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "15M+", label: "Images Extracted" },
    { icon: <Zap className="h-5 w-5" />, value: "< 15s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Extract Images | Online Tool to Save PDF Images"
        description="Extract and download images from your PDF files instantly. Free online tool for designers, researchers, and students."
        keywords="PDF extract images, extract images from PDF, PDF to image, online tool, free tool"
        canonical="pdf-extract-images"
        ogImage="/images/pdf-extract-images-og.jpg"
      />
      <div className="bg-gray-50 min-h-screen">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>PDF Image Extraction</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract Images from
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Documents</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract high-quality images from PDF files with intelligent detection. 
                Choose your preferred format and quality settings for perfect results.
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
              {/* File Upload */}
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
                    Drop your PDFs here for image extraction
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose PDFs
                  </label>
                </div>
              </div>

              {/* Settings */}
              {files.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Extraction Settings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image Format
                      </label>
                      <select
                        value={imageFormat}
                        onChange={(e) => setImageFormat(e.target.value as 'jpg' | 'png' | 'webp')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="jpg">JPG (JPEG)</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quality ({quality}%)
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileImage className="h-5 w-5 text-violet-600" />
                    <span>PDF Preview</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center relative" style={{ minHeight: 180 }}>
                    {previewLoading ? (
                      <div className="flex flex-col items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
                        <span className="text-gray-400">Loading preview...</span>
                      </div>
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview of first page"
                        className="rounded shadow max-w-full max-h-60 border border-gray-200"
                        aria-label="Preview of first page"
                      />
                    ) : (
                      <FileImage className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    )}
                    <p className="text-sm mt-2">
                      {files.map(file => `${file.name} - ${Math.round(file.size / 1024)} KB`).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Ready to extract images in {imageFormat.toUpperCase()} format
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processPDFs}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Extracting Images...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="h-5 w-5" />
                      <span>Extract Images</span>
                    </>
                  )}
                </button>
                {zipBlob && (
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Extracted Images Preview */}
            {extractedImages.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Extracted Images ({extractedImages.reduce((sum, batch) => sum + batch.images.length, 0)})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {extractedImages.map((batch, index) => (
                    batch.images.length > 0 ? (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 text-center">
                        <img 
                          src={batch.images[0].url} 
                          alt={`Extracted image from ${batch.file}`}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <p className="text-sm font-medium text-gray-700">
                          {batch.file}
                        </p>
                        <p className="text-xs text-gray-500">
                          {batch.images.length} image{batch.images.length > 1 ? 's' : ''} ({imageFormat.toUpperCase()})
                        </p>
                      </div>
                    ) : (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">{batch.file}</p>
                        <p className="text-xs text-gray-500">No images found in this file.</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Image Extractor?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional image extraction with multiple format support and quality control
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
                  How to Extract Images from PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to extract images from your PDF documents
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
                    Ready to Extract Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Extract high-quality images from your PDF documents. Join thousands of users 
                    who trust our tool for professional image extraction and conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
                    <span>Start Extracting Now</span>
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

export default PDFExtractImages; 