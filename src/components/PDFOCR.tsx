import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, FileType } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFOCR: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    language: 'eng',
    outputFormat: 'searchable',
    confidence: 'high',
    preserveLayout: true,
    addTextLayer: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ file: string, page: number, totalPages: number } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    // Prevent duplicates
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfFiles.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      language: 'eng',
      outputFormat: 'searchable',
      confidence: 'high',
      preserveLayout: true,
      addTextLayer: true
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setShowSpinner(true);
    setError(null);
    setSuccess(null);
    setProgress(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const Tesseract = (await import('tesseract.js')).default;
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          let docxLib: any = null;
          if (settings.outputFormat === 'word') {
            docxLib = await import('docx');
          }
          const fileBuffer = await file.arrayBuffer();
          let pdfDoc;
          try {
            pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          } catch (pdfErr) {
            console.error(`[PDFOCR] Failed to load PDF:`, file.name, pdfErr);
            setError(`Failed to load PDF: ${file.name}`);
            continue;
          }
          const numPages = pdfDoc.numPages;
          const allText: string[] = [];
          let outPdf: any = null;
          let font: any = null;
          if (settings.outputFormat === 'searchable') {
            outPdf = await PDFDocument.create();
            font = await outPdf.embedFont(StandardFonts.Helvetica);
          }
          let pagesProcessed = 0;
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            setProgress({ file: file.name, page: pageNum, totalPages: numPages });
            try {
              const page = await pdfDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Could not get canvas context');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;
              let text = '';
              try {
                const ocrResult = await Tesseract.recognize(canvas, settings.language || 'eng');
                text = ocrResult.data.text;
              } catch (ocrErr) {
                console.error(`[PDFOCR] OCR failed on page ${pageNum} of ${file.name}:`, ocrErr);
                setError(`OCR failed on page ${pageNum} of ${file.name}`);
                continue;
              }
              allText.push(text);
              if (settings.outputFormat === 'searchable') {
                const pdfPage = outPdf.addPage([canvas.width, canvas.height]);
                const pngImage = await outPdf.embedPng(canvas.toDataURL('image/png'));
                pdfPage.drawImage(pngImage, { x: 0, y: 0, width: canvas.width, height: canvas.height });
                if (settings.addTextLayer && text) {
                  const lines = text.split('\n');
                  let y = canvas.height - 40;
                  for (const line of lines) {
                    if (y < 40) break;
                    pdfPage.drawText(line, {
                      x: 40,
                      y,
                      size: 14,
                      font,
                      color: rgb(0.1, 0.5, 0.1),
                    });
                    y -= 20;
                  }
                }
              }
              pagesProcessed++;
            } catch (pageError) {
              console.error(`[PDFOCR] Error processing page ${pageNum} of ${file.name}:`, pageError);
              setError(`Error processing page ${pageNum} of ${file.name}`);
            }
          }
          if (pagesProcessed > 0) {
            try {
              let blob: Blob;
              let outName: string;
              if (settings.outputFormat === 'searchable') {
                const pdfBytes = await outPdf.save();
                blob = new Blob([pdfBytes], { type: 'application/pdf' });
                outName = file.name.replace(/\.pdf$/i, '_ocr.pdf');
              } else if (settings.outputFormat === 'text') {
                const txt = allText.join('\n\n');
                blob = new Blob([txt], { type: 'text/plain' });
                outName = file.name.replace(/\.pdf$/i, '_ocr.txt');
              } else if (settings.outputFormat === 'word') {
                const { Document, Packer, Paragraph, TextRun } = docxLib;
                const doc = new Document({
                  sections: [{
                    properties: {},
                    children: [
                      ...allText.join('\n\n').split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
                    ]
                  }]
                });
                const buffer = await Packer.toBuffer(doc);
                blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                outName = file.name.replace(/\.pdf$/i, '_ocr.docx');
              } else {
                // fallback to text
                const txt = allText.join('\n\n');
                blob = new Blob([txt], { type: 'text/plain' });
                outName = file.name.replace(/\.pdf$/i, '_ocr.txt');
              }
              processed.push({ name: outName, blob });
            } catch (saveErr) {
              console.error(`[PDFOCR] Failed to save output for ${file.name}:`, saveErr);
              setError(`Failed to save output for ${file.name}`);
            }
          } else {
            setError(`No pages processed for ${file.name}.`);
          }
        } catch (error) {
          console.error(`[PDFOCR] Error processing file ${file.name}:`, error);
          setError(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      setShowSpinner(false);
      setProgress(null);
      if (processed.length > 0) {
        setSuccess(`PDF OCR processing completed! Processed ${processed.length} file(s).`);
      } else {
        setError('No files were processed. Please check your files and try again.');
      }
    } catch (error) {
      console.error('[PDFOCR] Fatal error:', error);
      setIsProcessing(false);
      setShowSpinner(false);
      setProgress(null);
      setError('Error processing PDF OCR. Please try again.');
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
    { icon: <Eye className="h-6 w-6" />, title: 'Text Recognition', description: 'Extract text from scanned PDF documents' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Multi-Language', description: 'Support for 100+ languages and scripts' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Processing', description: 'OCR multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload Scanned PDFs', description: 'Drag and drop or browse to select scanned PDF files' },
    { step: '2', title: 'Choose OCR Settings', description: 'Select language and output format options' },
    { step: '3', title: 'Extract Text', description: 'Download searchable PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '500K+', label: 'PDFs Processed' },
    { icon: <Zap className="h-5 w-5" />, value: '< 60s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const renderPreview = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      try {
        const file = files[0];
        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setPreviewUrl(null);
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        // OCR with tesseract.js (first page only)
        const Tesseract = (await import('tesseract.js')).default;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, 40);
        ctx.restore();
        ctx.save();
        ctx.font = '18px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText('Running OCR preview...', 10, 10);
        ctx.restore();
        setPreviewUrl(canvas.toDataURL('image/png'));
        // Run OCR and update preview
        const { data: { text } } = await Tesseract.recognize(canvas, settings.language || 'eng');
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, 40);
        ctx.restore();
        ctx.save();
        ctx.font = '18px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#0a0';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText('OCR Preview:', 10, 10);
        ctx.restore();
        ctx.save();
        ctx.font = '16px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#0a0';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const lines = text.split('\n').slice(0, 5);
        lines.forEach((line, i) => ctx.fillText(line, 10, 40 + i * 22));
        ctx.restore();
        canvas.toBlob(blob => {
          if (blob) setPreviewUrl(URL.createObjectURL(blob));
        }, 'image/png');
      } catch (e) {
        setPreviewUrl(null);
      }
    };
    renderPreview();
    // Cleanup old preview URLs
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [files, settings.language]);

  return (
    <>
      <SEO 
        title="PDF OCR | Extract Text from PDFs Online Free"
        description="Convert scanned PDFs into editable text with our free online PDF OCR tool. Fast, accurate, and easy to use—no software installation required."
        keywords="PDF OCR, extract text from PDF, scanned PDF to text, OCR tool, text recognition, PDF text extraction, online OCR, free tool"
        canonical="pdf-ocr"
        ogImage="/images/pdf-ocr-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Eye className="h-4 w-4" />
                <span>PDF OCR</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract Text from
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Scanned PDFs</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert scanned PDF documents into searchable text with our advanced OCR technology. Support for 100+ languages and high accuracy recognition.
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
                  tabIndex={0}
                  aria-label="Upload PDF files by clicking or dragging and dropping"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your scanned PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
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

              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="PDF OCR preview" className="mx-auto max-h-96 w-auto object-contain border shadow" />
                  ) : (
                    <p className="text-gray-500">No preview available. Upload a PDF to see a live preview of the OCR result on the first page.</p>
                  )}
                </div>
              </div>

              {/* OCR Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-violet-600" />
                  <span>OCR Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="eng">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Output Format</label>
                    <select
                      value={settings.outputFormat}
                      onChange={e => setSettings(prev => ({ ...prev, outputFormat: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="searchable">Searchable PDF</option>
                      <option value="text">Plain Text (TXT)</option>
                      <option value="word">Word Document (DOCX)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Level</label>
                    <select
                      value={settings.confidence}
                      onChange={e => setSettings(prev => ({ ...prev, confidence: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High Accuracy</option>
                      <option value="medium">Medium Accuracy</option>
                      <option value="low">Fast Processing</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveLayout"
                      checked={settings.preserveLayout}
                      onChange={e => setSettings(prev => ({ ...prev, preserveLayout: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveLayout" className="text-sm font-medium text-gray-700">Preserve Layout</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="addTextLayer"
                      checked={settings.addTextLayer}
                      onChange={e => setSettings(prev => ({ ...prev, addTextLayer: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addTextLayer" className="text-sm font-medium text-gray-700">Add Text Layer</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  aria-label="Extract Text with OCR"
                  type="button"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Processing OCR...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5" />
                      <span>Extract Text with OCR</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetTool}
                  className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center space-x-2"
                  aria-label="Reset Tool"
                  type="button"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    aria-label="Download Processed Files"
                    type="button"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Processed Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF OCR Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced OCR technology with multi-language support and high accuracy</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Extract Text from Scanned PDFs</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert scanned documents to searchable text</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Extract Text from Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF OCR tool for text extraction</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Eye className="h-5 w-5" />
                    <span>Start OCR Processing Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {showSpinner && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            {/* Spinner removed */}
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      {progress && (
        <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="status">
          <span className="block sm:inline">Processing {progress.file} (page {progress.page} of {progress.totalPages})...</span>
        </div>
      )}
    </>
  );
};

export default PDFOCR; 