import React, { useRef, useState } from 'react';
import { Upload, Download, FileImage, Settings, RotateCcw, Users, Zap, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '120K+', label: 'GIFs Converted' },
  { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileImage className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const features = [
  { icon: <FileImage className="h-6 w-6" />, title: 'High Quality', description: 'Preserve GIF quality in PDF' },
  { icon: <CheckCircle className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple GIFs at once' },
  { icon: <Settings className="h-6 w-6" />, title: 'Custom Settings', description: 'Choose page size and orientation' },
  { icon: <Zap className="h-6 w-6" />, title: 'Fast & Secure', description: 'Quick conversion with privacy' },
];

const howToSteps = [
  { step: 1, title: 'Upload GIF', description: 'Select or drag and drop your GIF file.' },
  { step: 2, title: 'Set Preferences', description: 'Choose PDF settings.' },
  { step: 3, title: 'Download PDF', description: 'Get your converted PDF file.' },
];

const GIFToPDFConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBlobs, setProcessedBlobs] = useState<{ name: string, blob: Blob }[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notify = useNotification();

  const processFiles = async () => {
    if (selectedFiles.length === 0 || !canvasRef.current) return;
    setIsProcessing(true);
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pageSizes = {
        a4: [595.28, 841.89],
        letter: [612, 792],
        legal: [612, 1008],
      };
      const size = pageSizes[pageSize] as [number, number];
      const results: { name: string, blob: Blob }[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage(orientation === 'portrait' ? size : [size[1], size[0]]);
        const { width, height } = page.getSize();
        const imageUrl = URL.createObjectURL(file);
        const img = new window.Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          notify('Could not get canvas context. Try a different browser or smaller file.', 'error');
          continue;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const image = await pdfDoc.embedPng(uint8Array);
        const imgWidth = image.width;
        const imgHeight = image.height;
        const margin = 50;
        const maxWidth = width - (margin * 2);
        const maxHeight = height - (margin * 2);
        let scale = 1;
        if (imgWidth > maxWidth || imgHeight > maxHeight) {
          scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        }
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (width - scaledWidth) / 2;
        const y = height - margin - scaledHeight;
        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        page.drawText('GIF to PDF Conversion', {
          x: 50,
          y: height - 30,
          size: 16,
          color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(`Original File: ${file.name}`, {
          x: 50,
          y: height - 50,
          size: 10,
          color: rgb(0.4, 0.4, 0.4),
        });
        page.drawText(`File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, {
          x: 50,
          y: height - 65,
          size: 10,
          color: rgb(0.4, 0.4, 0.4),
        });
        page.drawText(`Image Dimensions: ${imgWidth} × ${imgHeight}`, {
          x: 50,
          y: height - 80,
          size: 10,
          color: rgb(0.4, 0.4, 0.4),
        });
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        results.push({ name: file.name.replace(/\.[^.]+$/, '.pdf'), blob: pdfBlob });
        URL.revokeObjectURL(imageUrl);
      }
      setProcessedBlobs(results);
      setIsProcessing(false);
      notify('GIF to PDF batch conversion completed!', 'success');
    } catch (error) {
      notify('Error converting GIF(s) to PDF. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const gifFiles = files.filter(file => file.type === 'image/gif');
    setSelectedFiles(prev => [...prev, ...gifFiles]);
    setPreviewUrls(prev => [...prev, ...gifFiles.map(f => URL.createObjectURL(f))]);
    setProcessedBlobs([]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const gifFiles = files.filter(file => file.type === 'image/gif');
    setSelectedFiles(prev => [...prev, ...gifFiles]);
    setPreviewUrls(prev => [...prev, ...gifFiles.map(f => URL.createObjectURL(f))]);
    setProcessedBlobs([]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setProcessedBlobs(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownload = (index: number) => {
    const processed = processedBlobs[index];
    if (processed) {
      const url = URL.createObjectURL(processed.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = processed.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadAll = () => {
    processedBlobs.forEach((processed) => {
      const url = URL.createObjectURL(processed.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = processed.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const resetTool = () => {
    setSelectedFiles([]);
    setProcessedBlobs([]);
    setPreviewUrls([]);
  };

  return (
    <>
      <SEO
        title="Convert GIF to PDF | Quick & Free Online Tool"
        description="Upload your GIF file and convert it to PDF instantly. No watermarks, no downloads—just fast and reliable GIF to PDF conversion."
        keywords="GIF to PDF, convert GIF to PDF, GIF to document, online converter, free tool"
        canonical="gif-to-pdf"
        ogImage="/images/gif-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>GIF to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert GIF to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Easily convert GIF images to PDF format online. Preserve quality, customize PDF settings, and download instantly. Free, secure, and no registration required.
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
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your GIFs here for conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept="image/gif"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose GIFs
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex flex-col gap-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <FileImage className="h-8 w-8 text-violet-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Section */}
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
                      onChange={e => setPageSize(e.target.value as 'a4' | 'letter' | 'legal')}
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
                      onChange={e => setOrientation(e.target.value as 'portrait' | 'landscape')}
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
                  disabled={selectedFiles.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="h-5 w-5" />
                      <span>Convert GIFs to PDF</span>
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
                {processedBlobs.length > 0 && (
                  <>
                    <button
                      onClick={handleDownloadAll}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All PDFs</span>
                    </button>
                    {processedBlobs.map((processed, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(idx)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 flex items-center space-x-2 mx-auto"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download {processed.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
              {/* Hidden canvas for processing GIF */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our GIF to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Convert GIFs to PDF with high quality, batch support, and custom settings. Fast, secure, and free.
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
                  How to Convert GIF to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your GIF images to PDF format efficiently
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
                    Ready to Convert GIFs to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Convert your GIF images to PDF format instantly. Fast, secure, and free—no registration required.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
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

const GIFToPDFConverterWithProvider: React.FC = () => (
  <NotificationProvider>
    <GIFToPDFConverter />
  </NotificationProvider>
);

export default GIFToPDFConverterWithProvider; 