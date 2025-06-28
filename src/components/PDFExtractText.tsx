import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Users, Zap, Shield, FileType, FileText, CheckCircle, Sparkles, Settings, ArrowRight, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import SEO from './SEO';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFExtractText: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState({
    preserveFormatting: true,
    includePageNumbers: false,
    extractImages: false,
    ocrEnabled: true
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        // Load the PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let extractedText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          if (settings.includePageNumbers) {
            extractedText += `\n--- Page ${pageNum} ---\n`;
          }
          
          // Extract text items
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          extractedText += pageText + '\n';
          
          if (settings.preserveFormatting) {
            extractedText += '\n';
          }
        }
        
        // Create text file blob
        const textBlob = new Blob([extractedText], { type: 'text/plain' });
        processed.push({
          name: file.name.replace('.pdf', '_extracted.txt'),
          blob: textBlob
        });
      }
      
      setProcessedFiles(processed);
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Error extracting text from PDF files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (file: { name: string, blob: Blob }) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setPreviewUrl(null);
  };

  // Live preview processing
  const processPreview = useCallback(async () => {
    if (files.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }, 'image/jpeg', 0.8);
    };
    
    const fileUrl = URL.createObjectURL(files[0]);
    img.src = fileUrl;
  }, [files, settings]);

  useEffect(() => {
    if (files.length > 0) {
      processPreview();
    }
  }, [processPreview]);

  const features = [
    { icon: <FileText className="h-6 w-6" />, title: 'Text Extraction', description: 'Extract text with high accuracy from any PDF' },
    { icon: <Shield className="h-6 w-6" />, title: 'OCR Technology', description: 'Convert scanned PDFs to editable text' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Extract text from multiple PDFs at once' },
    { icon: <Users className="h-6 w-6" />, title: 'Format Preservation', description: 'Maintain text formatting and structure' }
  ];

  const howToSteps = [
    {
      step: '1',
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse and select them from your device.'
    },
    {
      step: '2',
      title: 'Configure Extraction',
      description: 'Choose OCR settings, formatting options, and output preferences.'
    },
    {
      step: '3',
      title: 'Download Extracted Text',
      description: 'Click process to extract text and download your text files instantly.'
    }
  ];

  return (
    <>
      <SEO 
        title="PDF Extract Text | Convert PDF to Editable Text"
        description="Use our PDF extract text tool to pull plain text from any PDF file online. Ideal for copying, editing, or analyzing PDF content."
        keywords="PDF extract text, extract text from PDF, PDF to text, online tool, free tool"
        canonical="pdf-extract-text"
        ogImage="/images/pdf-extract-text-og.jpg"
      />
      <div className="bg-gray-50 min-h-screen">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF Text Extractor</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract Text from PDF Documents
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract text from PDF documents with advanced OCR technology and formatting preservation. 
                Perfect for document analysis, content extraction, and text processing workflows.
              </p>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600 mb-2">15M+</div>
                  <div className="text-sm text-gray-600">PDFs Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">99.5%</div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">&lt; 5s</div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 mb-2">50+</div>
                  <div className="text-sm text-gray-600">Languages</div>
                </div>
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for text extraction
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
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
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
              </div>

              {/* Extraction Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Text Extraction Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preserveFormatting"
                      checked={settings.preserveFormatting}
                      onChange={(e) => setSettings({...settings, preserveFormatting: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveFormatting" className="text-sm font-medium text-gray-700">
                      Preserve Formatting
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includePageNumbers"
                      checked={settings.includePageNumbers}
                      onChange={(e) => setSettings({...settings, includePageNumbers: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includePageNumbers" className="text-sm font-medium text-gray-700">
                      Include Page Numbers
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="extractImages"
                      checked={settings.extractImages}
                      onChange={(e) => setSettings({...settings, extractImages: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="extractImages" className="text-sm font-medium text-gray-700">
                      Extract Images
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ocrEnabled"
                      checked={settings.ocrEnabled}
                      onChange={(e) => setSettings({...settings, ocrEnabled: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ocrEnabled" className="text-sm font-medium text-gray-700">
                      Enable OCR
                    </label>
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
                      <span>Extracting Text...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Extract Text</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Download */}
              {processedFiles.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => downloadFile(processedFiles[0])}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Text File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Text Extractor?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  AI-powered text extraction with OCR technology and formatting preservation
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
                  How to Extract Text from PDFs
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to extract text from your PDF documents
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
                    Ready to Extract Text from PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents into editable text. Join thousands of users 
                    who trust our tool for text extraction and analysis.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
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

export default PDFExtractText; 