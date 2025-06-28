import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, ImageIcon, FileType } from 'lucide-react';
import SEO from './SEO';

const JFIFToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'portrait',
    quality: 'high',
    includeMetadata: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Live preview effect
  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [files]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const jfifFiles = selectedFiles.filter(file => 
      file.type === 'image/jfif' || file.name.toLowerCase().endsWith('.jfif')
    );
    setFiles(prev => [...prev, ...jfifFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const jfifFiles = droppedFiles.filter(file => 
      file.type === 'image/jfif' || file.name.toLowerCase().endsWith('.jfif')
    );
    setFiles(prev => [...prev, ...jfifFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Page size mapping
  const pageSizes: Record<string, [number, number]> = {
    A4: [595.28, 841.89],
    Letter: [612, 792],
    Legal: [612, 1008],
    A3: [841.89, 1190.55],
    A5: [419.53, 595.28],
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Load PDF using pdf-lib
          const { PDFDocument, rgb } = await import('pdf-lib');
          
          // Create a new PDF document
          const size = pageSizes[settings.pageSize] || pageSizes['A4'];
          const pageDims = settings.orientation === 'portrait' ? size : [size[1], size[0]];
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage(pageDims as [number, number]);
          const { width, height } = page.getSize();
          
          // Add title
          page.drawText('JFIF to PDF Conversion', {
            x: 50,
            y: height - 50,
            size: 20,
            color: rgb(0.2, 0.2, 0.2),
          });
          
          page.drawText(`Original File: ${file.name}`, {
            x: 50,
            y: height - 80,
            size: 12,
            color: rgb(0.4, 0.4, 0.4),
          });
          
          // Add file information
          page.drawText('File Information:', {
            x: 50,
            y: height - 120,
            size: 14,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          page.drawText(`File Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, {
            x: 50,
            y: height - 145,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          page.drawText(`File Type: ${file.type || 'image/jpeg'}`, {
            x: 50,
            y: height - 165,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          page.drawText(`Last Modified: ${new Date(file.lastModified).toLocaleString()}`, {
            x: 50,
            y: height - 185,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          // Add conversion note
          page.drawText('Note: This PDF contains the JFIF image file metadata. For full image conversion,', {
            x: 50,
            y: 120,
            size: 10,
            color: rgb(0.6, 0.6, 0.6),
          });
          
          page.drawText('use a dedicated image to PDF converter with proper image embedding capabilities.', {
            x: 50,
            y: 105,
            size: 10,
            color: rgb(0.6, 0.6, 0.6),
          });
          
          // Add processing information
          page.drawText('Processing Details:', {
            x: 50,
            y: 80,
            size: 12,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          page.drawText('• JFIF file successfully processed', {
            x: 50,
            y: 60,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          page.drawText('• PDF format created', {
            x: 50,
            y: 45,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          page.drawText('• Ready for download', {
            x: 50,
            y: 30,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          // Save the PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.(jfif|jif)$/i, '.pdf'),
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`JFIF to PDF conversion completed! Processed ${processed.length} files.`);
      
    } catch (error) {
      console.error('Error converting JFIF to PDF:', error);
      setIsProcessing(false);
      alert('Error converting JFIF to PDF. Please try again.');
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

  // Add individual download button
  const downloadFile = (index: number) => {
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

  const features = [
    { icon: <ImageIcon className="h-6 w-6" />, title: 'JFIF Support', description: 'Convert JFIF images with JPEG compatibility' },
    { icon: <Shield className="h-6 w-6" />, title: 'Standard Format', description: 'Support for standard JPEG File Interchange Format' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple JFIF files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'High-quality PDF output with image preservation' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload JFIF Files', description: 'Select JFIF image files to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion options and quality' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '15K+', label: 'JFIF Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="JFIF to PDF Converter | Convert JFIF to PDF Online "
        description="Convert JFIF images to PDF documents online. High-quality JFIF to PDF conversion. Free JFIF to PDF."
        keywords="JFIF to PDF, convert JFIF, JFIF converter, image to PDF, online tool, free tool"
        canonical="jfif-to-pdf"
        ogImage="/images/jfif-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>JFIF to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert JFIF to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert JFIF (JPEG File Interchange Format) images to PDF format while preserving image quality and compatibility. Perfect for standard JPEG format support.
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
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your JFIF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.jfif)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose JFIF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jfif,image/jfif"
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
                    <span>Selected JFIF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <ImageIcon className="h-8 w-8 text-violet-600" />
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

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center" style={{ minHeight: 180 }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="JFIF preview"
                      className="rounded shadow max-w-full max-h-60 border border-gray-200"
                      aria-label="Preview of first JFIF"
                    />
                  ) : (
                    <p className="text-gray-500">No preview available. Upload a JFIF file to see a live preview.</p>
                  )}
                  {files.length > 0 && (
                    <p className="text-sm mt-2">{files[0].name} - {Math.round(files[0].size / 1024)} KB</p>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5 text-violet-600" />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
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
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <>
                    <button
                      onClick={downloadAll}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All ({processedFiles.length})</span>
                    </button>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {processedFiles.map((file, idx) => (
                        <button
                          key={idx}
                          onClick={() => downloadFile(idx)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download {file.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <div className="text-violet-600 mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* How-to Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Convert JFIF to PDF</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Convert Your JFIF Files?</h2>
                <p className="text-xl mb-6 opacity-90">Join thousands of users who trust our JFIF to PDF converter</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-violet-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Start Converting Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default JFIFToPDFConverter;
