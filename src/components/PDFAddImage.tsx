import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCcw, Settings, Image, Users, Shield, CheckCircle, FileText, XCircle, AlertTriangle } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PDFAddImage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [processedBlobs, setProcessedBlobs] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imagePosition, setImagePosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [showSpinner, setShowSpinner] = useState(false);

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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBanner({ message: 'Only image files are allowed.', type: 'error' });
      return;
    }
    setImage(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfs = droppedFiles.filter(f => f.type === 'application/pdf');
    const imgs = droppedFiles.filter(f => f.type.startsWith('image/'));
    if (pdfs.length) addFiles(pdfs);
    if (imgs.length) setImage(imgs[0]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setFiles([]);
    setImage(null);
    setProcessedBlobs([]);
    setPreviewUrl(null);
    setImagePosition('center');
    setImageSize('medium');
    setBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Real PDF preview (first page of first file)
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
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const url = canvas.toDataURL('image/png');
        if (!revoked) setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    genPreview();
    return () => { revoked = true; };
  }, [files]);

  // Accessibility: focus management for banners
  useEffect(() => {
    if (banner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [banner]);

  // Memory cleanup for preview URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Real data processing: embed image in all PDFs
  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'Please upload at least one PDF file.', type: 'error' });
      return;
    }
    if (!image) {
      setBanner({ message: 'Please upload an image to add.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    setBanner(null);
    setProcessedBlobs([]);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const processed: Blob[] = [];
      for (const file of files) {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const pages = pdfDoc.getPages();
        const imageBuffer = await image.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);
        let embeddedImage;
        if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (image.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          throw new Error('Unsupported image format. Please use JPEG or PNG.');
        }
        // Size logic
        let scaleFactor = 1;
        if (imageSize === 'small') scaleFactor = 0.3;
        else if (imageSize === 'medium') scaleFactor = 0.6;
        else if (imageSize === 'large') scaleFactor = 0.9;
        pages.forEach(page => {
          const { width, height } = page.getSize();
          const imgW = embeddedImage.width * scaleFactor;
          const imgH = embeddedImage.height * scaleFactor;
          const x = (width - imgW) / 2;
          let y = (height - imgH) / 2;
          if (imagePosition === 'top') y = height - imgH - 40;
          else if (imagePosition === 'bottom') y = 40;
          page.drawImage(embeddedImage, { x, y, width: imgW, height: imgH });
        });
        const pdfBytes = await pdfDoc.save();
        processed.push(new Blob([pdfBytes], { type: 'application/pdf' }));
      }
      setProcessedBlobs(processed);
      setBanner({ message: 'Image(s) successfully added to PDF(s)!', type: 'success' });
    } catch (error) {
      setBanner({ message: 'Error adding image to PDF(s). Please try again.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setShowSpinner(false);
    }
  };

  const handleDownload = () => {
    if (processedBlobs.length === 0) return;
    processedBlobs.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files[i]?.name.replace(/\.pdf$/i, '') + '-with-image.pdf' || 'pdf-with-image.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    setBanner({ message: 'Download started.', type: 'success' });
  };

  const features = [
    {
      icon: <Image className="h-6 w-6" />,
      title: "Add Images",
      description: "Add images to your PDF documents with precise positioning"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Multiple Options",
      description: "Choose image position and size for perfect placement"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain image and PDF quality during processing"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDF & Image",
      description: "Select your PDF file and the image to add"
    },
    {
      step: "2",
      title: "Choose Settings",
      description: "Select image position and size settings"
    },
    {
      step: "3",
      title: "Add & Download",
      description: "Add image to PDF and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "1.2M+", label: "PDFs Processed" },
    { icon: <Image className="h-5 w-5" />, value: "< 8s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Add Image | Online Tool to Add Images to PDFs"
        description="Insert images into any PDF document quickly with our free online PDF add image tool. Simple drag-and-drop interface, no sign-up needed."
        keywords="PDF add image, insert images into PDF, add photos to PDF, PDF image insertion, online tool, free tool"
        canonical="pdf-add-image"
        ogImage="/images/pdf-add-image-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Image className="h-4 w-4" />
                <span>PDF Image Adder</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Images to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Add images to your PDF documents with precise positioning and sizing controls. 
                Perfect for creating professional documents with visual elements.
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
            <div 
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              tabIndex={0}
              aria-label="PDF and image upload area"
              className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16 focus:ring-2 focus:ring-violet-500 outline-none"
              style={{ cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* File Upload Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* PDF Upload */}
                <div>
                  <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload PDF(s)</h3>
                    <p className="text-gray-600 mb-4 text-sm">Select one or more PDF files</p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      ref={fileInputRef}
                      aria-label="Upload PDF files"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer text-sm"
                    >
                      Choose PDF(s)
                    </label>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center bg-green-50 rounded-lg p-2 text-green-800 text-sm justify-between">
                          <span>{file.name}</span>
                          <button onClick={e => { e.stopPropagation(); removeFile(idx); }} aria-label={`Remove ${file.name}`} className="ml-2 text-red-400 hover:text-red-700"><XCircle className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Image Upload */}
                <div>
                  <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer" onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }}>
                    <Image className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Image</h3>
                    <p className="text-gray-600 mb-4 text-sm">Select image to add</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      ref={imageInputRef}
                      aria-label="Upload image file"
                    />
                    <label
                      htmlFor="image-upload"
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer text-sm"
                    >
                      Choose Image
                    </label>
                  </div>
                  {image && (
                    <div className="mt-3 flex items-center bg-green-50 rounded-lg p-2 text-green-800 text-sm justify-between">
                      <span>{image.name}</span>
                      <button onClick={e => { e.stopPropagation(); setImage(null); }} aria-label={`Remove ${image.name}`} className="ml-2 text-red-400 hover:text-red-700"><XCircle className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
              {/* Image Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Image Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Position</label>
                    <select
                      value={imagePosition}
                      onChange={e => setImagePosition(e.target.value as 'top' | 'center' | 'bottom')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      aria-label="Image position"
                    >
                      <option value="top">Top</option>
                      <option value="center">Center</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image Size</label>
                    <select
                      value={imageSize}
                      onChange={e => setImageSize(e.target.value as 'small' | 'medium' | 'large')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      aria-label="Image size"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || !image || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Add image to PDF(s)"
                >
                  {isProcessing || showSpinner ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding Image...</span>
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5" />
                      <span>Add Image to PDF(s)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                  aria-label="Reset tool"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>
              {/* Preview */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PDF Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PDF Preview</h3>
                  <div className="border rounded-lg overflow-hidden min-h-[16rem] flex items-center justify-center bg-gray-50 relative">
                    {previewLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>
                    ) : previewUrl ? (
                      <img src={previewUrl} alt="PDF preview" className="w-full h-64 object-contain" />
                    ) : (
                      <span className="text-gray-400">No PDF selected</span>
                    )}
                  </div>
                </div>
                {/* Image Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Preview</h3>
                  <div className="border rounded-lg overflow-hidden min-h-[16rem] flex items-center justify-center bg-gray-50">
                    {image ? (
                      <img src={URL.createObjectURL(image)} alt="Image preview" className="w-full h-64 object-contain" />
                    ) : (
                      <span className="text-gray-400">No image selected</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Download */}
              {processedBlobs.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    aria-label="Download processed PDF(s)"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF(s)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Image Adder?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF image addition with precise positioning and sizing controls
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
                  How to Add Images to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to add images to your PDF documents
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
                    Ready to Add Images to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents with professional image additions. Join thousands of users 
                    who trust our image adder for creating visually appealing documents.
                  </p>
                  <button 
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Image className="h-5 w-5" />
                    <span>Start Adding Images Now</span>
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

export default PDFAddImage; 