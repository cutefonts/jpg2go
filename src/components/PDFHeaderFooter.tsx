import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Settings, FileText, Users, Zap, Shield, Info } from 'lucide-react';
import SEO from './SEO';

const PDFHeaderFooter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    addHeader: false,
    headerText: '',
    headerSize: 12,
    headerColor: '#000000',
    headerPosition: 'center' as 'left' | 'center' | 'right',
    addFooter: false,
    footerText: '',
    footerSize: 12,
    footerColor: '#000000',
    footerPosition: 'center' as 'left' | 'center' | 'right'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setProcessedBlob(null);
    }
  }, []);

  const getPositionX = (position: 'left' | 'center' | 'right', pageWidth: number, text: string, fontSize: number) => {
    // Estimate text width (rough approximation)
    const estimatedTextWidth = text.length * fontSize * 0.6;
    
    switch (position) {
      case 'left': return 50;
      case 'center': return (pageWidth - estimatedTextWidth) / 2;
      case 'right': return pageWidth - estimatedTextWidth - 50;
      default: return pageWidth / 2;
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    
    try {
      // Load PDF using pdf-lib
      const { PDFDocument, rgb } = await import('pdf-lib');
      
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Get all pages
      const pages = pdfDoc.getPages();
      
      // Add headers and footers to each page
      pages.forEach((page, pageIndex) => {
        const { width, height } = page.getSize();
        const pageNumber = pageIndex + 1;
        
        // Add header if enabled
        if (settings.addHeader && settings.headerText) {
          const headerText = settings.headerText
            .replace('{page}', pageNumber.toString())
            .replace('{total}', pages.length.toString())
            .replace('{date}', new Date().toLocaleDateString())
            .replace('{filename}', selectedFile.name);
          
          const headerX = getPositionX(settings.headerPosition, width, headerText, settings.headerSize);
          const headerColor = settings.headerColor;
          const rgbColor = rgb(
            parseInt(headerColor.slice(1, 3), 16) / 255,
            parseInt(headerColor.slice(3, 5), 16) / 255,
            parseInt(headerColor.slice(5, 7), 16) / 255
          );
          
          page.drawText(headerText, {
            x: headerX,
            y: height - 30,
            size: settings.headerSize,
            color: rgbColor,
          });
          
          // Add header line
          page.drawLine({
            start: { x: 50, y: height - 40 },
            end: { x: width - 50, y: height - 40 },
            thickness: 1,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
        
        // Add footer if enabled
        if (settings.addFooter && settings.footerText) {
          const footerText = settings.footerText
            .replace('{page}', pageNumber.toString())
            .replace('{total}', pages.length.toString())
            .replace('{date}', new Date().toLocaleDateString())
            .replace('{filename}', selectedFile.name);
          
          const footerX = getPositionX(settings.footerPosition, width, footerText, settings.footerSize);
          const footerColor = settings.footerColor;
          const rgbColor = rgb(
            parseInt(footerColor.slice(1, 3), 16) / 255,
            parseInt(footerColor.slice(3, 5), 16) / 255,
            parseInt(footerColor.slice(5, 7), 16) / 255
          );
          
          page.drawText(footerText, {
            x: footerX,
            y: 30,
            size: settings.footerSize,
            color: rgbColor,
          });
          
          // Add footer line
          page.drawLine({
            start: { x: 50, y: 40 },
            end: { x: width - 50, y: 40 },
            thickness: 1,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
      });
      
      // Save the PDF with headers/footers
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedBlob(blob);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Error adding headers/footers to PDF:', error);
      setIsProcessing(false);
      alert('Error adding headers/footers to PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `header-footer_${selectedFile?.name || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetTool = () => {
    setSelectedFile(null);
    setProcessedBlob(null);
    setSettings({
      addHeader: false,
      headerText: '',
      headerSize: 12,
      headerColor: '#000000',
      headerPosition: 'center',
      addFooter: false,
      footerText: '',
      footerSize: 12,
      footerColor: '#000000',
      footerPosition: 'center'
    });
  };

  const placeholderInfo = [
    { placeholder: '{page}', description: 'Current page number' },
    { placeholder: '{total}', description: 'Total number of pages' },
    { placeholder: '{date}', description: 'Current date' },
    { placeholder: '{filename}', description: 'Original file name' }
  ];

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Custom Headers",
      description: "Add professional headers with custom text, fonts, and positioning"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Flexible Footers",
      description: "Create footers with page numbers, dates, and custom content"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your PDFs are processed securely and never stored permanently"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDF",
      description: "Drag and drop your PDF or click to browse and select from your computer"
    },
    {
      step: "2", 
      title: "Configure Headers/Footers",
      description: "Add custom text, choose fonts, colors, and positioning options"
    },
    {
      step: "3",
      title: "Process & Download",
      description: "Apply headers and footers to your PDF and download instantly"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "25M+", label: "PDFs Processed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="PDF Header Footer | Customize PDF Headers and Footers"
        description="Add or edit headers and footers in your PDF files online. Use our PDF header footer tool to include text, dates, or numbering—no sign-up needed."
        keywords="PDF header footer, add headers to PDF, PDF footer tool, page numbers PDF, PDF formatting, online PDF editor, free PDF tool"
        canonical="pdf-header-footer"
        ogImage="/images/pdf-header-footer-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF Headers & Footers</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Add Professional
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Headers & Footers</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Enhance your PDF documents with custom headers and footers. Add page numbers, 
                dates, company information, and more with professional formatting options.
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
              {/* File Upload */}
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
                    Drop your PDF here for headers & footers
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose PDF
                  </label>
                </div>
              </div>

              {/* Settings */}
              {selectedFile && (
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Header & Footer Settings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Header Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="headerEnabled"
                          checked={settings.addHeader}
                          onChange={(e) => setSettings({ ...settings, addHeader: e.target.checked })}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <label htmlFor="headerEnabled" className="text-sm font-medium text-gray-700">
                          Enable Header
                        </label>
                      </div>
                      {settings.addHeader && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Enter header text..."
                            value={settings.headerText}
                            onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="footerEnabled"
                          checked={settings.addFooter}
                          onChange={(e) => setSettings({ ...settings, addFooter: e.target.checked })}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <label htmlFor="footerEnabled" className="text-sm font-medium text-gray-700">
                          Enable Footer
                        </label>
                      </div>
                      {settings.addFooter && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Enter footer text..."
                            value={settings.footerText}
                            onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Style Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Header Font Size ({settings.headerSize}px)
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={settings.headerSize}
                        onChange={(e) => setSettings({ ...settings, headerSize: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Header Color
                      </label>
                      <input
                        type="color"
                        value={settings.headerColor}
                        onChange={(e) => setSettings({ ...settings, headerColor: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Header Alignment
                      </label>
                      <select
                        value={settings.headerPosition}
                        onChange={(e) => setSettings({ ...settings, headerPosition: e.target.value as 'left' | 'center' | 'right' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Footer Style Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Font Size ({settings.footerSize}px)
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={settings.footerSize}
                        onChange={(e) => setSettings({ ...settings, footerSize: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Color
                      </label>
                      <input
                        type="color"
                        value={settings.footerColor}
                        onChange={(e) => setSettings({ ...settings, footerColor: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Alignment
                      </label>
                      <select
                        value={settings.footerPosition}
                        onChange={(e) => setSettings({ ...settings, footerPosition: e.target.value as 'left' | 'center' | 'right' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Placeholder Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-5 w-5 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-800">Available Placeholders</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {placeholderInfo.map((info, index) => (
                        <div key={index} className="text-xs">
                          <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                            {info.placeholder}
                          </code>
                          <p className="text-blue-700 mt-1">{info.description}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-3">
                      Example: "Page {'{page}'} of {'{total}'} - {'{date}'}" will show "Page 1 of 5 - 12/25/2024"
                    </p>
                  </div>
                </div>
              )}

              {/* Preview */}
              {selectedFile && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>PDF Preview</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-center text-gray-600">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm">
                        {selectedFile.name} - {Math.round(selectedFile.size / 1024)} KB
                      </p>
                      {(settings.addHeader || settings.addFooter) && (
                        <div className="mt-4 p-3 bg-white rounded-lg border">
                          <p className="text-xs text-gray-500 mb-2">Preview of headers/footers:</p>
                          {settings.addHeader && (
                            <div className="text-sm mb-2" style={{ color: settings.headerColor, fontSize: `${settings.headerSize}px` }}>
                              Header: {settings.headerText || 'Sample header text'}
                            </div>
                          )}
                          {settings.addFooter && (
                            <div className="text-sm" style={{ color: settings.footerColor, fontSize: `${settings.footerSize}px` }}>
                              Footer: {settings.footerText || 'Sample footer text'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFile}
                  disabled={!selectedFile || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Add Headers & Footers</span>
                    </>
                  )}
                </button>
                {processedBlob && (
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF Header & Footer Tool?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional PDF enhancement with customizable headers and footers
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
                  How to Add Headers & Footers
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to enhance your PDF documents
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
                    Ready to Enhance Your PDFs?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Add professional headers and footers to your PDF documents. Join thousands of users 
                    who trust our tool for document enhancement and formatting.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Enhancing Now</span>
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

export default PDFHeaderFooter; 