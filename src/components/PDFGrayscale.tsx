import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, Palette, Users, Shield, CheckCircle, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';

const PDFGrayscale: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [grayscaleMode, setGrayscaleMode] = useState<'standard' | 'high-contrast' | 'sepia'>('standard');
  const [intensity, setIntensity] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setProcessedFiles([]);
    if (pdfFiles.length > 0) {
      setPreviewUrl(URL.createObjectURL(pdfFiles[0]));
    }
  }, []);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
    setProcessedFiles([]);
    if (pdfFiles.length > 0) {
      setPreviewUrl(URL.createObjectURL(pdfFiles[0]));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Utility: Render a PDF page to an image (returns a data URL)
  async function renderPageToImage(pdfData: ArrayBuffer, pageNum: number, scale = 2): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    if (!context) throw new Error('Could not get canvas context');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  // Utility: Convert an image to grayscale/high-contrast/sepia (returns a data URL)
  function convertImageToGrayscale(dataUrl: string, mode: 'standard' | 'high-contrast' | 'sepia', intensity: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          let gray = (r + g + b) / 3;
          if (mode === 'high-contrast') {
            gray = gray > 128 ? 255 : 0;
          }
          let outR = gray, outG = gray, outB = gray;
          if (mode === 'sepia') {
            // Apply sepia filter to grayscale
            outR = Math.min(255, gray * 0.393 + gray * 0.769 + gray * 0.189);
            outG = Math.min(255, gray * 0.349 + gray * 0.686 + gray * 0.168);
            outB = Math.min(255, gray * 0.272 + gray * 0.534 + gray * 0.131);
          }
          // Blend with original based on intensity
          const blend = intensity / 100;
          imageData.data[i]     = outR * blend + r * (1 - blend);
          imageData.data[i + 1] = outG * blend + g * (1 - blend);
          imageData.data[i + 2] = outB * blend + b * (1 - blend);
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const fileBuffer = await file.arrayBuffer();
          // Load original PDF with pdfjs
          const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
          const pdf = await loadingTask.promise;
          const pageCount = pdf.numPages;
          // Create new PDF
          const { PDFDocument } = await import('pdf-lib');
          const newPdfDoc = await PDFDocument.create();
          for (let i = 1; i <= pageCount; i++) {
            // Render page to image
            const pageImgDataUrl = await renderPageToImage(fileBuffer, i, 2);
            // Convert to grayscale (all modes)
            const grayImgDataUrl = await convertImageToGrayscale(pageImgDataUrl, grayscaleMode, intensity);
            // Embed image in new PDF
            const imgBytes = await fetch(grayImgDataUrl as string).then(res => res.arrayBuffer());
            const img = await newPdfDoc.embedPng(imgBytes);
            const { width, height } = img;
            const page = newPdfDoc.addPage([width, height]);
            page.drawImage(img, { x: 0, y: 0, width, height });
          }
          const pdfBytes = await newPdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '_grayscale.pdf'), blob });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`PDF grayscale conversion completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error converting PDF to grayscale:', error);
      setIsProcessing(false);
      alert('Error converting PDF to grayscale. Please try again.');
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

  const downloadSingle = (index: number) => {
    const file = processedFiles[index];
    if (file) {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setPreviewUrl(null);
  };

  const features = [
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Grayscale Conversion",
      description: "Convert PDF colors to grayscale with multiple modes"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "High Contrast",
      description: "Enhance readability with high-contrast grayscale"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Quality Preservation",
      description: "Maintain document quality during grayscale conversion"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDF",
      description: "Select your PDF file from your device"
    },
    {
      step: "2",
      title: "Choose Mode",
      description: "Select grayscale mode and adjust intensity settings"
    },
    {
      step: "3",
      title: "Convert & Download",
      description: "Convert to grayscale and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "2M+", label: "PDFs Processed" },
    { icon: <Palette className="h-5 w-5" />, value: "< 8s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Grayscale | Free Online Tool to Grayscale PDFs"
        description="Convert your PDF documents to grayscale for efficient printing and file compression. Use our simple and free PDF grayscale tool online."
        keywords="PDF grayscale, convert PDF to grayscale, black and white PDF, online tool, free tool"
        canonical="pdf-grayscale"
        ogImage="/images/pdf-grayscale-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Palette className="h-4 w-4" />
                <span>PDF Grayscale Tool</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDFs to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Grayscale</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your PDF documents to grayscale with multiple modes and intensity controls. 
                Perfect for printing, accessibility, and professional presentations.
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
                    Drop your PDF files here for grayscale conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept="application/pdf"
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
                    Choose PDF Files
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex flex-col gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <FileText className="h-8 w-8 text-violet-600" />
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

              {/* Grayscale Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Grayscale Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grayscale Mode
                    </label>
                    <select
                      value={grayscaleMode}
                      onChange={(e) => setGrayscaleMode(e.target.value as 'standard' | 'high-contrast' | 'sepia')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="standard">Standard Grayscale</option>
                      <option value="high-contrast">High Contrast</option>
                      <option value="sepia">Sepia Tone</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intensity ({intensity}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={intensity}
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
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
                      {/* Spinner removed */}
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Palette className="h-5 w-5" />
                      <span>Convert to Grayscale</span>
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
                {processedFiles.length > 0 && (
                  <>
                    <button
                      onClick={downloadAll}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All PDFs</span>
                    </button>
                    {processedFiles.map((processed, idx) => (
                      <button
                        key={idx}
                        onClick={() => downloadSingle(idx)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 flex items-center space-x-2 mx-auto"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download {processed.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={previewUrl}
                      title="PDF Preview"
                      className="w-full h-64 bg-gray-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Grayscale Tool?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF grayscale conversion with multiple modes and quality preservation
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
                  How to Convert PDFs to Grayscale
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your PDFs to grayscale
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
                    Ready to Convert PDFs to Grayscale?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents to grayscale for printing and accessibility. Join millions of users 
                    who trust our grayscale tool for professional results.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Palette className="h-5 w-5" />
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

export default PDFGrayscale; 