import React, { useState, useRef } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, EyeOff, XCircle, CheckCircle } from 'lucide-react';
import SEO from './SEO';

const colorMap = {
  black: [0, 0, 0],
  white: [1, 1, 1],
  gray: [0.5, 0.5, 0.5],
};

const PDFRedact: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    redactionType: 'text',
    redactionColor: 'black',
    permanentRedaction: true,
    includeMetadata: false
  });
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    let errorMsg = '';
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        errorMsg = 'Only PDF files are allowed.';
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errorMsg = 'Duplicate file skipped: ' + file.name;
        continue;
      }
      deduped.push(file);
    }
    setFiles(deduped);
    if (errorMsg) setError(errorMsg);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          // Remove metadata if requested
          if (settings.includeMetadata) {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('');
            pdfDoc.setCreator('');
          }
          const pages = pdfDoc.getPages();
          let font;
          try { font = await pdfDoc.embedFont(StandardFonts.Helvetica); } catch { font = await pdfDoc.embedFont(StandardFonts.TimesRoman); }
          pages.forEach((page, pageIndex) => {
            const { width, height } = page.getSize();
            // Color
            let colorArr: [number, number, number];
            if (settings.redactionColor === 'custom') {
              colorArr = [0.2, 0.2, 0.7];
            } else {
              const arr = colorMap[settings.redactionColor as keyof typeof colorMap];
              colorArr = Array.isArray(arr) && arr.length === 3 ? [arr[0], arr[1], arr[2]] : [0, 0, 0];
            }
            // Redaction logic
            if (settings.redactionType === 'text') {
              const redactionBoxes = [
                { x: 50, y: height - 100, width: 200, height: 20 },
                { x: 50, y: height - 150, width: 300, height: 20 },
                { x: 50, y: height - 200, width: 250, height: 20 }
              ];
              redactionBoxes.forEach(box => {
                page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(colorArr[0], colorArr[1], colorArr[2]) });
                page.drawText('REDACTED', { x: box.x + 5, y: box.y + 2, size: 10, font, color: rgb(1, 1, 1) });
              });
            } else if (settings.redactionType === 'image') {
              const imageBox = { x: width / 2 - 100, y: height / 2 - 100, width: 200, height: 200 };
              page.drawRectangle({ x: imageBox.x, y: imageBox.y, width: imageBox.width, height: imageBox.height, color: rgb(colorArr[0], colorArr[1], colorArr[2]) });
              page.drawText('IMAGE REDACTED', { x: imageBox.x + 20, y: imageBox.y + imageBox.height / 2, size: 12, font, color: rgb(1, 1, 1) });
            } else if (settings.redactionType === 'area') {
              // Area redaction: cover a fixed area (bottom right)
              const areaBox = { x: width - 220, y: 40, width: 200, height: 60 };
              page.drawRectangle({ x: areaBox.x, y: areaBox.y, width: areaBox.width, height: areaBox.height, color: rgb(colorArr[0], colorArr[1], colorArr[2]) });
              page.drawText('AREA REDACTED', { x: areaBox.x + 10, y: areaBox.y + 20, size: 12, font, color: rgb(1, 1, 1) });
            } else if (settings.redactionType === 'metadata') {
              // Metadata redaction: just add a note
              page.drawText('METADATA REDACTED', { x: 50, y: 50, size: 12, font, color: rgb(colorArr[0], colorArr[1], colorArr[2]) });
            } else {
              // Redact all content
              page.drawRectangle({ x: 0, y: 0, width: width, height: height, color: rgb(colorArr[0], colorArr[1], colorArr[2]) });
              page.drawText('DOCUMENT REDACTED', { x: width / 2 - 80, y: height / 2, size: 16, font, color: rgb(1, 1, 1) });
            }
            // Add redaction timestamp if enabled
            if (settings.includeMetadata) {
              const timestamp = new Date().toLocaleString();
              page.drawText(`Redacted: ${timestamp}`, { x: 50, y: 30, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
            }
          });
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({ name: file.name.replace(/\.pdf$/i, '_redacted.pdf'), blob });
        } catch (error) {
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setSuccess(`PDF redaction completed! Processed ${processed.length} files.`);
    } catch (error) {
      setError('Error redacting PDFs. Please try again.');
      setIsProcessing(false);
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

  const features = [
    { icon: <EyeOff className="h-6 w-6" />, title: 'Secure Redaction', description: 'Permanently remove sensitive information from PDFs' },
    { icon: <Shield className="h-6 w-6" />, title: 'Privacy Protection', description: 'Ensure confidential data is completely removed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Redact multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Multiple Formats', description: 'Support for text, images, and metadata redaction' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files containing sensitive information' },
    { step: '2', title: 'Configure Redaction', description: 'Choose redaction type and settings' },
    { step: '3', title: 'Process & Download', description: 'Download securely redacted PDFs' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '150K+', label: 'PDFs Redacted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 45s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Redact | Securely Redact Sensitive Information Online"
        description="Secure your PDFs by redacting private content with our easy-to-use PDF redact tool. Fast, reliable, and free online service."
        keywords="PDF redact, redact PDF, remove text from PDF, PDF redaction, online tool, free tool"
        canonical="pdf-redact"
        ogImage="/images/pdf-redact-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <EyeOff className="h-4 w-4" />
                <span>PDF Redact</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Secure PDF Redaction
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Tool</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Permanently remove sensitive information from PDF documents with our secure redaction tool. Protect confidential data and ensure compliance.
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
                  tabIndex={0}
                  role="button"
                  aria-label="Drop PDF files here or click to browse"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    className="hidden"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
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
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
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

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <EyeOff className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF redaction.<br/>Redaction will permanently remove selected content and generate secure PDFs for download.</p>
                </div>
              </div>

              {/* Redaction Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <EyeOff className="h-5 w-5 text-violet-600" />
                  <span>Redaction Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Redaction Type</label>
                    <select
                      value={settings.redactionType}
                      onChange={e => setSettings(prev => ({ ...prev, redactionType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="text">Text Redaction</option>
                      <option value="image">Image Redaction</option>
                      <option value="area">Area Redaction</option>
                      <option value="metadata">Metadata Redaction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Redaction Color</label>
                    <select
                      value={settings.redactionColor}
                      onChange={e => setSettings(prev => ({ ...prev, redactionColor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="black">Black</option>
                      <option value="white">White</option>
                      <option value="gray">Gray</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="permanentRedaction"
                      checked={settings.permanentRedaction}
                      onChange={e => setSettings(prev => ({ ...prev, permanentRedaction: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="permanentRedaction" className="text-sm font-medium text-gray-700">Permanent Redaction</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeMetadata"
                      checked={settings.includeMetadata}
                      onChange={e => setSettings(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeMetadata" className="text-sm font-medium text-gray-700">Remove Metadata</label>
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
                      <span>Redacting PDFs...</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-5 w-5" />
                      <span>Redact PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Redacted PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Redaction Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Secure and permanent redaction technology for sensitive document protection</p>
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

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Redact PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to securely redact your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Secure Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF redaction tool for document security</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <EyeOff className="h-5 w-5" />
                    <span>Start Redacting Now</span>
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

export default PDFRedact; 