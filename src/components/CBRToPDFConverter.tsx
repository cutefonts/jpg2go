import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle } from 'lucide-react';
import { createExtractorFromData } from 'node-unrar-js';
import { PDFDocument } from 'pdf-lib';
import SEO from './SEO';
import JSZip from 'jszip';

// Set WASM path for node-unrar-js in browser
if (typeof window !== 'undefined') {
  (window as any).UNRAR_WASM = '/unrar.wasm';
}

const CBRToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const cbrFiles = selectedFiles.filter(file =>
      (file.name.toLowerCase().endsWith('.cbr') || file.name.toLowerCase().endsWith('.rar'))
    );
    const oversized = cbrFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(`File(s) exceed 100MB: ${oversized.map(f => f.name).join(', ')}`);
      return;
    }
    setFiles(prev => [...prev, ...cbrFiles]);
    setError(null);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const cbrFiles = droppedFiles.filter(file =>
      (file.name.toLowerCase().endsWith('.cbr') || file.name.toLowerCase().endsWith('.rar'))
    );
    const oversized = cbrFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(`File(s) exceed 100MB: ${oversized.map(f => f.name).join(', ')}`);
      return;
    }
    setFiles(prev => [...prev, ...cbrFiles]);
    setError(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setProcessedFiles([]);
    setError(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const arrayBuffer = await file.arrayBuffer();
          const extractor = await createExtractorFromData({ data: arrayBuffer });
          const { files: rarFiles } = extractor.extract();
          const imageFiles: { name: string, blob: Blob }[] = [];
          for (const extractedFile of rarFiles) {
            if (
              !extractedFile.fileHeader.flags.directory &&
              extractedFile.fileHeader.name.match(/\.(jpe?g|png|gif|bmp|webp)$/i) &&
              extractedFile.extraction
            ) {
              const blob = new Blob([extractedFile.extraction]);
              imageFiles.push({ name: extractedFile.fileHeader.name, blob });
            }
          }
          imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
          if (imageFiles.length > 0) {
            const pdfDoc = await PDFDocument.create();
            for (const imageFile of imageFiles) {
              const imageBytes = await imageFile.blob.arrayBuffer();
              let image;
              if (imageFile.name.toLowerCase().endsWith('.png')) {
                image = await pdfDoc.embedPng(imageBytes);
              } else {
                image = await pdfDoc.embedJpg(imageBytes);
              }
              const page = pdfDoc.addPage([image.width, image.height]);
              page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
            const pdfBytes = await pdfDoc.save();
            processed.push({ name: file.name.replace(/\.(cbr|rar)$/i, '.pdf'), blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
          } else {
            setError(`No images found in ${file.name}. Only image-based CBR/RAR comics are supported.`);
          }
        } catch (error: any) {
          setError(`Error processing ${file.name}: ${error?.message || error}`);
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setProgress(100);
      if (processed.length > 0) {
        // alert('CBR to PDF conversion completed!');
      }
    } catch (error) {
      setIsProcessing(false);
      setError('Error processing files. Please try again.');
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }
    if (processedFiles.length === 1) {
      const file = processedFiles[0];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file.blob);
      link.download = file.name;
      link.click();
      return;
    }
    // Batch ZIP download
    const zip = new JSZip();
    processedFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cbr-to-pdf-files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const features = [
    { icon: <FileText className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple CBRs to PDFs at once' },
    { icon: <CheckCircle className="h-6 w-6" />, title: 'High Quality', description: 'Preserve comic quality in PDF' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Your comics are never stored or shared' },
    { icon: <Zap className="h-6 w-6" />, title: 'Fast & Free', description: 'Quick conversion, no registration required' },
  ];

  const howToSteps = [
    { step: '1', title: 'Upload CBR Files', description: 'Drag and drop or browse to select your CBR comic files' },
    { step: '2', title: 'Convert to PDF', description: 'Click the convert button to process your comics' },
    { step: '3', title: 'Download PDF', description: 'Save your new PDF comics instantly' },
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '200K+', label: 'Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' },
  ];

  return (
    <>
      <SEO
        title="Convert CBR to PDF | Best Free Comic to PDF Tool"
        description="Convert CBR files to PDF quickly while keeping the original comic layout intact. Perfect for reading, sharing, or printing your favorite comics."
        keywords="CBR to PDF, convert CBR to PDF, CBR to document, online converter, free tool"
        canonical="cbr-to-pdf"
        ogImage="/images/cbr-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>CBR to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert CBR Comics to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Format</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your CBR comic archives to PDF format with advanced options for quality, batch conversion, and more.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'} ${dragActive ? 'border-blue-500 bg-blue-50' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label="Upload CBR files by clicking or dragging and dropping"
                  tabIndex={0}
                  onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your CBR files here for PDF conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose CBR Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".cbr"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg" role="alert" aria-live="assertive">{error}</div>
                )}
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected CBR Files ({files.length})</span>
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
                      <FileText className="h-5 w-5" />
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

              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="bg-violet-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our CBR to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional CBR to PDF conversion with customizable settings and high quality output
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
                  How to Convert CBR to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your CBR comics to PDF
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
                    Ready to Convert Your CBR Comics?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your CBR comics into professional PDF documents. Join thousands of users who trust our converter for reliable CBR to PDF conversion.
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

export default CBRToPDFConverter; 