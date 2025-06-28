import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, Mail } from 'lucide-react';
import SEO from './SEO';

interface EmailData {
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  attachments: string[];
  headers: Record<string, string>;
}

const EMLToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<{ name: string, blob: Blob }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE_MB = 25;
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFiles = (files: File[]) => {
    const valid: File[] = [];
    let error = '';
    for (const file of files) {
      if (!file.name.endsWith('.eml') && file.type !== 'message/rfc822') {
        error = `Unsupported file type: ${file.name}`;
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        error = `File too large: ${file.name} (max ${MAX_FILE_SIZE_MB}MB)`;
        continue;
      }
      valid.push(file);
    }
    return { valid, error };
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(''); setSuccessMsg('');
    const files = Array.from(event.target.files || []);
    const { valid, error } = validateFiles(files);
    setSelectedFiles(valid);
    setProcessedBlobs([]);
    if (error) setErrorMsg(error);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(false); setErrorMsg(''); setSuccessMsg('');
    const files = Array.from(event.dataTransfer.files || []);
    const { valid, error } = validateFiles(files);
    setSelectedFiles(valid);
    setProcessedBlobs([]);
    if (error) setErrorMsg(error);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(false);
  }, []);

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDropAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const parseEML = async (content: string): Promise<EmailData> => {
    const lines = content.split(/\r?\n/);
    const headers: Record<string, string> = {};
    let body = '';
    let inBody = false;
    let currentHeader = '';
    let currentValue = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inBody) {
        if (line.trim() === '') {
          inBody = true;
          continue;
        }
        if (line.match(/^\s/)) {
          currentValue += ' ' + line.trim();
        } else {
          if (currentHeader) {
            headers[currentHeader.toLowerCase()] = currentValue.trim();
          }
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            currentHeader = line.substring(0, colonIndex).trim();
            currentValue = line.substring(colonIndex + 1).trim();
          }
        }
      } else {
        body += line + '\n';
      }
    }
    if (currentHeader) {
      headers[currentHeader.toLowerCase()] = currentValue.trim();
    }
    const from = headers['from'] || 'Unknown';
    const to = headers['to'] || 'Unknown';
    const subject = headers['subject'] || 'No Subject';
    const date = headers['date'] || new Date().toISOString();
    const contentType = headers['content-type'] || '';
    let emailBody = body;
    const attachments: string[] = [];
    if (contentType.includes('multipart')) {
      const boundary = contentType.match(/boundary="?([^";\s]+)"?/)?.[1];
      if (boundary) {
        const parts = body.split(`--${boundary}`);
        emailBody = '';
        for (const part of parts) {
          if (part.includes('Content-Type: text/plain') || part.includes('Content-Type: text/html')) {
            const bodyStart = part.indexOf('\n\n');
            if (bodyStart > -1) {
              emailBody += part.substring(bodyStart + 2);
            }
          } else if (part.includes('Content-Disposition: attachment')) {
            const filenameMatch = part.match(/filename="?([^"]+)"?/);
            if (filenameMatch) {
              attachments.push(filenameMatch[1]);
            }
          }
        }
      }
    }
    emailBody = emailBody.replace(/\r?\n/g, '\n').trim();
    return {
      from,
      to,
      subject,
      date,
      body: emailBody,
      attachments,
      headers
    };
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(''); setSuccessMsg('');
    const processed: { name: string, blob: Blob }[] = [];
    for (const file of selectedFiles) {
      try {
        const content = await file.text();
        const emailData = await parseEML(content);
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        let normalFont, boldFont, italicFont;
        try {
          normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
          boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        } catch {
          normalFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
          italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        }
        let pageWidth = 595.28, pageHeight = 841.89;
        if (pageSize === 'letter') { pageWidth = 612; pageHeight = 792; }
        else if (pageSize === 'legal') { pageWidth = 612; pageHeight = 1008; }
        if (orientation === 'landscape') [pageWidth, pageHeight] = [pageHeight, pageWidth];
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const { width, height } = page.getSize();
        let y = height - 50;
        const margin = 50, lineHeight = 16;
        page.drawText('Email Conversion Report', { x: margin, y, size: 20, font: boldFont, color: rgb(0.2,0.2,0.2) }); y -= 30;
        page.drawText('Email Details:', { x: margin, y, size: 16, font: boldFont, color: rgb(0.3,0.3,0.3) }); y -= 25;
        page.drawText('From:', { x: margin, y, size: 12, font: boldFont, color: rgb(0.4,0.4,0.4) });
        page.drawText(emailData.from, { x: margin + 60, y, size: 12, font: normalFont, color: rgb(0,0,0) }); y -= lineHeight;
        page.drawText('To:', { x: margin, y, size: 12, font: boldFont, color: rgb(0.4,0.4,0.4) });
        page.drawText(emailData.to, { x: margin + 60, y, size: 12, font: normalFont, color: rgb(0,0,0) }); y -= lineHeight;
        page.drawText('Subject:', { x: margin, y, size: 12, font: boldFont, color: rgb(0.4,0.4,0.4) });
        page.drawText(emailData.subject, { x: margin + 60, y, size: 12, font: normalFont, color: rgb(0,0,0) }); y -= lineHeight;
        page.drawText('Date:', { x: margin, y, size: 12, font: boldFont, color: rgb(0.4,0.4,0.4) });
        page.drawText(new Date(emailData.date).toLocaleString(), { x: margin + 60, y, size: 12, font: normalFont, color: rgb(0,0,0) }); y -= lineHeight * 2;
        if (emailData.attachments.length > 0) {
          page.drawText('Attachments:', { x: margin, y, size: 14, font: boldFont, color: rgb(0.3,0.3,0.3) }); y -= 20;
          for (const attachment of emailData.attachments) {
            if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
            page.drawText(`• ${attachment}`, { x: margin + 10, y, size: 11, font: normalFont, color: rgb(0.5,0.5,0.5) }); y -= lineHeight;
          }
          y -= 10;
        }
        if (emailData.body) {
          page.drawText('Email Content:', { x: margin, y, size: 14, font: boldFont, color: rgb(0.3,0.3,0.3) }); y -= 20;
          const words = emailData.body.split(/\s+/); let currentLine = '';
          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = normalFont.widthOfTextAtSize(testLine, 11);
            if (testWidth > width - 2 * margin) {
              if (currentLine) {
                if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
                page.drawText(currentLine, { x: margin, y, size: 11, font: normalFont, color: rgb(0,0,0) }); y -= lineHeight - 2; currentLine = word;
              }
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine && y > margin + 50) {
            page.drawText(currentLine, { x: margin, y, size: 11, font: normalFont, color: rgb(0,0,0) });
          }
        }
        const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        lastPage.drawText(`Converted from: ${file.name}`, { x: margin, y: 30, size: 9, font: italicFont, color: rgb(0.6,0.6,0.6) });
        lastPage.drawText(`Conversion date: ${new Date().toLocaleString()}`, { x: margin, y: 15, size: 9, font: italicFont, color: rgb(0.6,0.6,0.6) });
        const pdfBytes = await pdfDoc.save();
        processed.push({ name: file.name.replace(/\.eml$/i, '.pdf'), blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
      } catch (error) {
        setErrorMsg(`Error converting ${file.name}. Please try again.`);
      }
    }
    setProcessedBlobs(processed);
    setIsProcessing(false);
    if (processed.length > 0) {
      setSuccessMsg('EML to PDF conversion completed!');
      const first = processed[0];
      if (first) {
        const url = URL.createObjectURL(first.blob);
        setPreviewPdfUrl(url);
      }
    }
  };

  const handleDownloadAll = () => {
    processedBlobs.forEach((f) => {
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  React.useEffect(() => {
    return () => {
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    };
  }, [previewPdfUrl]);

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setPreviewPdfUrl('');
    setProcessedBlobs([]);
    setPageSize('a4');
    setOrientation('portrait');
    setErrorMsg('');
    setSuccessMsg('');
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "EML to PDF",
      description: "Convert EML email files to professional PDF documents"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Full support for EML email format with attachments"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain email formatting and structure during conversion"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload EML",
      description: "Select your EML email file from your device"
    },
    {
      step: "2",
      title: "Choose Settings",
      description: "Select page size and orientation for the PDF"
    },
    {
      step: "3",
      title: "Convert & Download",
      description: "Convert to PDF and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "250K+", label: "Emails Converted" },
    { icon: <FileText className="h-5 w-5" />, value: "< 5s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <Mail className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="EML to PDF | Online Email to PDF Converter"
        description="Use our free EML to PDF converter to save emails as PDFs for printing or backup. Secure, easy, and works on all browsers and devices."
        keywords="EML to PDF, convert EML to PDF, email to PDF, EML converter, online tool, free tool"
        canonical="eml-to-pdf"
        ogImage="/images/eml-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Mail className="h-4 w-4" />
                  <span>EML to PDF Converter</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                  Convert EML to
                  <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                  Convert your EML email files to professional PDF documents with preserved formatting. 
                  Perfect for archiving emails and sharing them in a universal format.
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
                    role="button"
                    tabIndex={0}
                    aria-label="Upload or drop EML files"
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer outline-none ${
                      selectedFiles.length > 0 
                        ? 'border-violet-500 bg-violet-50/50' 
                        : isDragOver
                        ? 'border-violet-400 bg-violet-50/30'
                        : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleDropAreaClick}
                    onKeyDown={handleDropAreaKeyDown}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Drop your EML emails here for PDF conversion
                    </h3>
                    <p className="text-gray-600 mb-6">
                      or click to browse files from your computer
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".eml,message/rfc822"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      Choose EML Files
                    </label>
                  </div>
                  {errorMsg && (
                    <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">{errorMsg}</div>
                  )}
                  {successMsg && (
                    <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">{successMsg}</div>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800">✓ {selectedFiles.length} file(s) selected</p>
                      <ul className="text-green-700 text-sm mt-2">
                        {selectedFiles.map(f => <li key={f.name}>{f.name}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Conversion Settings */}
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
                        onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'legal')}
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
                        onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
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
                    onClick={processFiles}
                    disabled={selectedFiles.length === 0 || isProcessing}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        {/* Spinner removed */}
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-5 w-5" />
                        <span>Convert to PDFs</span>
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
                {previewPdfUrl && (
                  <div className="mt-8 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview (First Page)</h3>
                    <iframe src={previewPdfUrl + '#page=1'} title="PDF Preview" className="w-full max-w-2xl h-96 mx-auto border rounded-lg shadow" />
                  </div>
                )}

                {/* Download */}
                {processedBlobs.length > 1 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleDownloadAll}
                      className="bg-blue-600 text-white px-8 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All PDFs</span>
                    </button>
                  </div>
                )}
                {processedBlobs.length === 1 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(processedBlobs[0].blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = processedBlobs[0].name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Features Section */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Why Choose Our EML to PDF Converter?
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Professional EML to PDF conversion with email formatting preservation and high quality output
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
                    How to Convert EML to PDF
                  </h2>
                  <p className="text-lg text-gray-600">
                    Follow these simple steps to convert your EML emails to PDF
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
                      Ready to Convert EML to PDF?
                    </h3>
                    <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                      Transform your EML emails into professional PDF documents. Join thousands of users 
                      who trust our converter for reliable EML to PDF conversion.
                    </p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                    >
                      <Mail className="h-5 w-5" />
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
      </div>
    </>
  );
};

export default EMLToPDFConverter; 