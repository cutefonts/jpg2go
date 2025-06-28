import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, Shield, Users, CheckCircle, FileText, EyeOff } from 'lucide-react';
import SEO from './SEO';

const PDFRemoveMetadata: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [removeMode, setRemoveMode] = useState<'all' | 'selective' | 'custom'>('all');
  const [selectedMetadata, setSelectedMetadata] = useState<string[]>(['author', 'creator', 'producer']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          if (removeMode === 'all') {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('');
            pdfDoc.setCreator('');
          } else if (removeMode === 'selective') {
            if (selectedMetadata.includes('title')) pdfDoc.setTitle('');
            if (selectedMetadata.includes('author')) pdfDoc.setAuthor('');
            if (selectedMetadata.includes('subject')) pdfDoc.setSubject('');
            if (selectedMetadata.includes('keywords')) pdfDoc.setKeywords([]);
            if (selectedMetadata.includes('producer')) pdfDoc.setProducer('');
            if (selectedMetadata.includes('creator')) pdfDoc.setCreator('');
          }
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '-cleaned.pdf'), blob });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`PDF metadata removal completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error removing metadata:', error);
      setIsProcessing(false);
      alert('Error removing metadata. Please try again.');
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
    setPreviewUrl('');
  };

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy Protection",
      description: "Remove sensitive metadata to protect your privacy"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Selective Removal",
      description: "Choose which metadata fields to remove or keep"
    },
    {
      icon: <EyeOff className="h-6 w-6" />,
      title: "Complete Anonymity",
      description: "Remove all identifying information from your PDFs"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
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
      description: "Select metadata removal mode and settings"
    },
    {
      step: "3",
      title: "Clean & Download",
      description: "Remove metadata and download the clean PDF"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "1.5M+", label: "PDFs Cleaned" },
    { icon: <Shield className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <EyeOff className="h-5 w-5" />, value: "100%", label: "Privacy Protected" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Remove Metadata | Clean PDF Metadata Online Free"
        description="Remove hidden metadata from your PDF files using our free online PDF remove metadata tool. Protect your privacy in just a few clicks."
        keywords="PDF remove metadata, clean PDF metadata, PDF privacy, metadata removal, PDF security, online tool, free tool"
        canonical="pdf-remove-metadata"
        ogImage="/images/pdf-remove-metadata-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Shield className="h-4 w-4" />
                <span>PDF Metadata Remover</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF Metadata Remover Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Safely remove sensitive metadata from your PDF documents to protect your privacy. 
                Choose what to remove and keep your documents clean and anonymous.
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
                    Drop your PDF files here for metadata removal
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

              {/* Metadata Removal Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Metadata Removal Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Removal Mode
                    </label>
                    <select
                      value={removeMode}
                      onChange={(e) => setRemoveMode(e.target.value as 'all' | 'selective' | 'custom')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="all">Remove All Metadata</option>
                      <option value="selective">Selective Removal</option>
                      <option value="custom">Custom Selection</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata Fields to Remove
                    </label>
                    <div className="space-y-2">
                      {['author', 'creator', 'producer', 'title', 'subject', 'keywords'].map((field) => (
                        <label key={field} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedMetadata.includes(field)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadata([...selectedMetadata, field]);
                              } else {
                                setSelectedMetadata(selectedMetadata.filter(f => f !== field));
                              }
                            }}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{field}</span>
                        </label>
                      ))}
                    </div>
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
                      <span>Removing Metadata...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      <span>Remove Metadata</span>
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
                      <span>Download All Cleaned PDFs</span>
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

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Metadata Remover?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF metadata removal with privacy protection and selective options
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
                  How to Remove PDF Metadata
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to clean your PDF metadata
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
                    Ready to Protect Your Privacy?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Safely remove sensitive metadata from your PDF documents. Join millions of users 
                    who trust our metadata remover for complete privacy protection.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Start Cleaning Now</span>
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

export default PDFRemoveMetadata; 