import React, { useRef, useState } from 'react';
import { Upload, Download, FileImage, FileType, Users, Zap, Shield } from 'lucide-react';
import SEO from './SEO';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '100K+', label: 'BMPs Converted' },
  { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const features = [
  { icon: <FileType className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple BMPs to PDFs at once' },
  { icon: <FileType className="h-6 w-6" />, title: 'High Quality', description: 'Preserve image quality in PDF' },
  { icon: <FileType className="h-6 w-6" />, title: 'Custom Settings', description: 'Choose page size and orientation' },
  { icon: <FileType className="h-6 w-6" />, title: 'Fast & Secure', description: 'Quick conversion with privacy' },
];

const howToSteps = [
  { step: 1, title: 'Upload BMPs', description: 'Select or drag and drop your BMP files.' },
  { step: 2, title: 'Set Preferences', description: 'Choose PDF settings.' },
  { step: 3, title: 'Download PDF', description: 'Get your converted PDF files.' },
];

const BMPToPDFConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Load PDF using pdf-lib
      const { PDFDocument, rgb } = await import('pdf-lib');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Process each BMP file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create a new page for each image
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { width, height } = page.getSize();
        
        // Load the BMP image
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        
        // Create canvas to process image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the BMP image
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
        
        // Convert blob to Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Embed the image in PDF
        const image = await pdfDoc.embedPng(uint8Array);
        
        // Calculate image dimensions to fit on page
        const imgWidth = image.width;
        const imgHeight = image.height;
        
        // Calculate scaling to fit image on page with margins
        const margin = 50;
        const maxWidth = width - (margin * 2);
        const maxHeight = height - (margin * 2);
        
        let scale = 1;
        if (imgWidth > maxWidth || imgHeight > maxHeight) {
          scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        }
        
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Center the image on the page
        const x = (width - scaledWidth) / 2;
        const y = height - margin - scaledHeight;
        
        // Draw the image
        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        // Add title
        page.drawText('BMP to PDF Conversion', {
          x: 50,
          y: height - 30,
          size: 16,
          color: rgb(0.2, 0.2, 0.2),
        });
        
        // Add file information
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
        
        // Clean up
        URL.revokeObjectURL(imageUrl);
      }
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedFiles(files.map(f => f.name.replace(/\.[^/.]+$/, '') + '_converted.pdf'));
      setProcessedBlob(pdfBlob);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Error converting BMP to PDF:', error);
      setIsProcessing(false);
      alert('Error converting BMP to PDF. Please try again.');
    }
  };

  const downloadAll = () => {
    if (!processedBlob) {
      alert('No processed files to download');
      return;
    }
    
    // Download the single PDF file
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bmp-to-pdf-converted.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEO
        title="BMP to PDF | Free Online BMP to PDF Converter"
        description="Convert BMP images to PDF instantly. Use our simple, fast, and 100% free online BMP to PDF tool—no software installation required."
        keywords="BMP to PDF, convert BMP to PDF, BMP to document, online converter, free tool"
        canonical="bmp-to-pdf"
        ogImage="/images/bmp-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>BMP to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert BMP Images to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert BMP images to high-quality PDF format. Fast, secure, and free BMP to PDF creator for web, print, and sharing.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your BMP files here for PDF conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose BMP Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".bmp,image/bmp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected BMP Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileImage className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Convert Button */}
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
                      <FileImage className="h-5 w-5" />
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
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our BMP to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional BMP to PDF conversion with customizable settings and high quality output</p>
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

            {/* How-To Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert BMP to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your BMP images to PDF</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert BMP to PDF?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Transform your BMP images into professional PDF documents. Join thousands of users who trust our converter for reliable BMP to PDF conversion.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
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

export default BMPToPDFConverter; 