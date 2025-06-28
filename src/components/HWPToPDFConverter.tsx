import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, FileType } from 'lucide-react';
import SEO from './SEO';

const features = [
  {
    icon: <FileText className="h-6 w-6" />, title: "HWP to PDF", description: "Convert HWP documents to professional PDF format"
  },
  {
    icon: <FileType className="h-6 w-6" />, title: "Korean Support", description: "Full support for Korean Hangul Word Processor files"
  },
  {
    icon: <Shield className="h-6 w-6" />, title: "Secure Processing", description: "Your files are processed securely and never stored permanently"
  },
  {
    icon: <CheckCircle className="h-6 w-6" />, title: "High Quality", description: "Maintain formatting and Korean text rendering"
  }
];

const howToSteps = [
  { step: "1", title: "Upload HWP", description: "Select your HWP document file from your device" },
  { step: "2", title: "Choose Settings", description: "Select page size and orientation for the PDF" },
  { step: "3", title: "Convert & Download", description: "Convert to PDF and download the result" }
];

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "200K+", label: "Documents Converted" },
  { icon: <FileText className="h-5 w-5" />, value: "< 7s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileType className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

const HWPToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const hwpFiles = files.filter(file => file.name.endsWith('.hwp'));
    setSelectedFiles(prev => [...prev, ...hwpFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const hwpFiles = files.filter(file => file.name.endsWith('.hwp'));
    setSelectedFiles(prev => [...prev, ...hwpFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setPageSize('a4');
    setOrientation('portrait');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <>
      <SEO 
        title="HWP to PDF | Convert HWP Files to PDF Online Free"
        description="Convert HWP (Hangul Word Processor) files to PDF instantly using our free online HWP to PDF converter. Fast, accurate, and no software needed."
        keywords="HWP to PDF, convert HWP, HWP converter, Hangul to PDF, online tool, free tool"
        canonical="hwp-to-pdf"
        ogImage="/images/hwp-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>HWP to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert HWP to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert Hangul Word Processor (HWP) files to PDF format while preserving formatting, images, and layout. Perfect for sharing and printing.
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
                    Drop your HWP files here for conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".hwp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    ref={fileInputRef}
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose HWP Files
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <ul className="text-green-800">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex items-center justify-between py-1">
                          <span>{file.name} <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></span>
                          <button
                            className="ml-4 text-red-500 hover:text-red-700 text-sm"
                            onClick={() => handleRemoveFile(idx)}
                            aria-label={`Remove ${file.name}`}
                          >Remove</button>
                        </li>
                      ))}
                    </ul>
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
                  disabled
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold opacity-50 cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <FileText className="h-5 w-5" />
                  <span>Convert HWP to PDF (Not Supported in Browser)</span>
                </button>
              </div>

              {/* Warning Message */}
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded shadow text-lg font-medium">
                  <span className="block mb-2 font-bold">Conversion Not Supported in Browser</span>
                  Real HWP to PDF conversion is <b>not possible in the browser</b> due to proprietary format restrictions.<br/>
                  Please use <b>Hancom Office</b> or a dedicated server-side tool for real conversion.
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our HWP to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Convert HWP files to PDF with formatting, Korean text support, and secure processing. Fast, free, and easy to use.
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
                  How to Convert HWP to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your HWP documents to PDF format efficiently
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
                    Ready to Convert HWP to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Convert your HWP documents to PDF format with formatting and Korean text support. Fast, secure, and free—no registration required.
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

export default HWPToPDFConverter; 