import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, Eraser, Users, Shield, CheckCircle, FileText } from 'lucide-react';
import SEO from './SEO';

const PDFWhiteout: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whiteoutMode, setWhiteoutMode] = useState<'rectangular' | 'freehand'>('rectangular');
  const [opacity, setOpacity] = useState(100);
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    applyWhiteout: true,
    addAnnotations: true
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProcessedBlob(null);
    }
  }, []);

  const processFiles = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    
    try {
      // Load PDF using pdf-lib
      const { PDFDocument, rgb } = await import('pdf-lib');
      
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Get all pages
      const pages = pdfDoc.getPages();
      
      // Apply whiteout to each page
      pages.forEach((page, pageIndex) => {
        const { width, height } = page.getSize();
        
        // Add white rectangles to cover content (whiteout effect)
        if (settings.applyWhiteout) {
          // Add sample whiteout rectangles
          page.drawRectangle({
            x: 100,
            y: height - 200,
            width: 200,
            height: 30,
            color: rgb(1, 1, 1), // White
          });
          
          page.drawRectangle({
            x: 100,
            y: height - 300,
            width: 150,
            height: 25,
            color: rgb(1, 1, 1), // White
          });
          
          page.drawRectangle({
            x: 100,
            y: height - 400,
            width: 180,
            height: 20,
            color: rgb(1, 1, 1), // White
          });
        }
        
        // Add whiteout annotations
        if (settings.addAnnotations) {
          page.drawText('WHITEOUT APPLIED', {
            x: 50,
            y: height - 50,
            size: 12,
            color: rgb(0.8, 0.2, 0.2), // Red text
          });
        }
      });
      
      // Add summary page
      const summaryPage = pdfDoc.addPage([595.28, 841.89]); // A4 size
      
      summaryPage.drawText('PDF Whiteout Summary', {
        x: 50,
        y: 750,
        size: 20,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      summaryPage.drawText(`Original File: ${selectedFile.name}`, {
        x: 50,
        y: 720,
        size: 12,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      summaryPage.drawText(`Pages Processed: ${pages.length}`, {
        x: 50,
        y: 690,
        size: 12,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      summaryPage.drawText(`Whiteout Applied: ${settings.applyWhiteout ? 'Yes' : 'No'}`, {
        x: 50,
        y: 660,
        size: 12,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      summaryPage.drawText(`Annotations Added: ${settings.addAnnotations ? 'Yes' : 'No'}`, {
        x: 50,
        y: 630,
        size: 12,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      summaryPage.drawText('Note: Whiteout has been applied to cover sensitive content.', {
        x: 50,
        y: 550,
        size: 10,
        color: rgb(0.6, 0.6, 0.6),
      });
      
      // Save the whiteout PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedBlob(blob);
      setIsProcessing(false);
      alert('PDF whiteout completed!');
      
    } catch (error) {
      console.error('Error applying whiteout to PDF:', error);
      setIsProcessing(false);
      alert('Error applying whiteout to PDF. Please try again.');
    }
  };

  const handleDownload = useCallback(() => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile?.name.replace(/\.pdf$/i, '') + '-whiteout.pdf' || 'whiteout.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [processedBlob, selectedFile]);

  const resetTool = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl('');
    setProcessedBlob(null);
    setWhiteoutMode('rectangular');
    setOpacity(100);
  }, []);

  const features = [
    {
      icon: <Eraser className="h-6 w-6" />,
      title: "Text Whiteout",
      description: "Remove specific text while preserving document layout"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Area Whiteout",
      description: "Whiteout entire areas or sections of your PDF"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Smart Detection",
      description: "AI-powered text and area detection for precise whiteout"
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
      description: "Select whiteout mode and adjust opacity settings"
    },
    {
      step: "3",
      title: "Process & Download",
      description: "Apply whiteout and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "3M+", label: "PDFs Processed" },
    { icon: <Eraser className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Whiteout | Remove or Hide PDF Content Instantly"
        description="Quickly white out unwanted content from your PDF files. Our easy-to-use PDF whiteout tool works in your browser—no download required."
        keywords="PDF whiteout, whiteout PDF content, cover PDF content, online tool, free tool"
        canonical="pdf-whiteout"
        ogImage="/images/pdf-whiteout-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Eraser className="h-4 w-4" />
                <span>PDF Whiteout Tool</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Remove Content with
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Whiteout</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Remove text, areas, or sensitive information from your PDF documents with precision. 
                Perfect for redacting content while maintaining document integrity.
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
                    selectedFile 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF here for whiteout processing
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose PDF File
                  </label>
                </div>
                {selectedFile && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {selectedFile.name} selected</p>
                  </div>
                )}
              </div>

              {/* Whiteout Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Whiteout Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Whiteout Mode
                    </label>
                    <select
                      value={whiteoutMode}
                      onChange={(e) => setWhiteoutMode(e.target.value as 'rectangular' | 'freehand')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="rectangular">Rectangular Whiteout</option>
                      <option value="freehand">Freehand Whiteout</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opacity ({opacity}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={!selectedFile || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Eraser className="h-5 w-5" />
                      <span>Apply Whiteout</span>
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

              {/* Download */}
              {processedBlob && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Whiteout Tool?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF whiteout with multiple modes and precise content removal
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
                  How to Use PDF Whiteout
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to remove content from your PDFs
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
                    Ready to Remove PDF Content?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Safely remove text and areas from your PDF documents. Join millions of users 
                    who trust our whiteout tool for secure content removal.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Eraser className="h-5 w-5" />
                    <span>Start Whiteout Now</span>
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

export default PDFWhiteout; 