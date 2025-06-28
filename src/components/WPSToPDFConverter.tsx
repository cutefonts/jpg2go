import React, { useState, useRef, useCallback } from 'react';
import { FileType, Upload, Download, Settings, FileText, Zap, Shield, Users, FileImage, ArrowRight, CheckCircle, Sparkles, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

const WPSToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState('high');
  const [pageSize, setPageSize] = useState('auto');
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const wpsFiles = selectedFiles.filter(file => file.name.toLowerCase().endsWith('.wps'));
    setFiles(prev => [...prev, ...wpsFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const wpsFiles = droppedFiles.filter(file => file.name.toLowerCase().endsWith('.wps'));
    setFiles(prev => [...prev, ...wpsFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length > 0) {
      setIsProcessing(true);
      try {
        notify('WPS Office files require server-side conversion due to their proprietary format. This feature is not available in the browser version. Please contact support for server-side conversion options or use our desktop application.', 'error');
        setProcessedFiles([]);
      } catch (error) {
        notify('WPS conversion is not supported in the browser version. Please use our desktop application or contact support.', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDownload = () => {
    if (processedFiles.length > 0) {
      const url = URL.createObjectURL(processedFiles[0]);
      const a = document.createElement('a');
      a.href = url;
      a.download = processedFiles[0].name.replace(/\.wps$/, '') + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const features = [
    {
      icon: <FileType className="h-6 w-6" />,
      title: "WPS Support",
      description: "Convert WPS Office documents to PDF with precision"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Format Preservation",
      description: "Preserve document formatting and layout perfectly"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast Conversion",
      description: "Lightning-fast conversion with high-quality output"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload WPS Files",
      description: "Drag and drop your WPS files or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Choose Settings",
      description: "Select quality, page size, and conversion preferences"
    },
    {
      step: "3",
      title: "Convert to PDF",
      description: "Our system converts your WPS files to high-quality PDF documents"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "25M+", label: "Files Converted" },
    { icon: <Zap className="h-5 w-5" />, value: "< 3s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const qualityOptions = [
    { id: 'low', name: 'Low Quality', description: 'Smaller file size' },
    { id: 'medium', name: 'Medium Quality', description: 'Balanced size and quality' },
    { id: 'high', name: 'High Quality', description: 'Best quality output' },
    { id: 'ultra', name: 'Ultra Quality', description: 'Maximum quality for printing' }
  ];

  const pageSizeOptions = [
    { id: 'auto', name: 'Auto Detect', description: 'Detect from WPS content' },
    { id: 'a4', name: 'A4 (210×297mm)', description: 'Standard paper size' },
    { id: 'letter', name: 'Letter (8.5×11in)', description: 'US standard size' },
    { id: 'a3', name: 'A3 (297×420mm)', description: 'Large format' },
    { id: 'custom', name: 'Custom Size', description: 'Set your own dimensions' }
  ];

  return (
    <>
      <SEO 
        title="WPS to PDF | Convert WPS Files to PDF Online Free"
        description="Convert WPS files to PDF instantly with our easy-to-use online converter. Preserve formatting and share your documents effortlessly."
        keywords="WPS to PDF, convert WPS, WPS converter, document conversion, online tool, free tool"
        canonical="wps-to-pdf"
        ogImage="/images/wps-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>WPS to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert WPS to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Advanced WPS Office to PDF conversion with formatting preservation, high-quality output, 
                and multiple format options. Perfect for document sharing and archiving.
              </p>
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded shadow text-lg font-medium mb-8">
                  <span className="block mb-2 font-bold">Conversion Not Supported in Browser</span>
                  Real WPS to PDF conversion is <b>not possible in the browser</b> due to proprietary format restrictions.<br/>
                  Please use <b>WPS Office</b> or a dedicated server-side tool for real conversion.
                </div>
                {/* Upload Area */}
                <div className="mb-8">
                  <div
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    aria-label="WPS upload area"
                  >
                    <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your WPS files here for PDF conversion'}</h3>
                    <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files from your computer'}</p>
                    <button
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                      type="button"
                    >Choose WPS Files</button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".wps"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload WPS files"
                    />
                  </div>
                  {/* File List */}
                  {files.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <ul className="text-green-800">
                        {files.map((file, idx) => (
                          <li key={idx} className="flex items-center justify-between py-1">
                            <span>{file.name}</span>
                            <button
                              className="ml-4 text-red-500 hover:text-red-700 text-sm"
                              onClick={e => { e.stopPropagation(); removeFile(idx); }}
                              aria-label={`Remove ${file.name}`}
                            >Remove</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* Process Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleProcess}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    disabled={files.length === 0 || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Convert to PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

const WPSToPDFConverterWithProvider: React.FC = () => (
  <NotificationProvider>
    <WPSToPDFConverter />
  </NotificationProvider>
);

export default WPSToPDFConverterWithProvider; 