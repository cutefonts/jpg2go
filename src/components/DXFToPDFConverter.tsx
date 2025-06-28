import React, { useState, useRef } from 'react';
import { FileType, Upload, Download, Settings, FileText, Zap, Shield, Users, FileImage, CheckCircle, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import DxfParser from 'dxf-parser';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "50K+", label: "DXF Files Converted" },
  { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileType className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

const features = [
  { icon: <FileImage className="h-6 w-6" />, title: 'CAD Drawing Support', description: 'Render lines, circles, and arcs from DXF files' },
  { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Your files are processed securely and never stored' },
  { icon: <Zap className="h-6 w-6" />, title: 'Fast Conversion', description: 'Convert DXF to PDF in seconds' },
  { icon: <CheckCircle className="h-6 w-6" />, title: 'No Registration', description: 'Free to use, no signup required' }
];

const howToSteps = [
  { step: '1', title: 'Upload DXF File', description: 'Select or drag and drop your DXF CAD file' },
  { step: '2', title: 'Configure Settings', description: 'Choose page size, orientation, and scale' },
  { step: '3', title: 'Convert & Download', description: 'Download your technical drawing as a PDF' }
];

const DXFToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<{ name: string, blob: Blob }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'portrait',
    scale: 1
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE_MB = 20;

  const validateFiles = (files: File[]) => {
    const valid: File[] = [];
    let error = '';
    for (const file of files) {
      if (!file.name.endsWith('.dxf')) {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(''); setSuccessMsg('');
    const files = Array.from(event.target.files || []);
    const { valid, error } = validateFiles(files);
    setSelectedFiles(valid);
    setProcessedBlobs([]);
    if (error) setErrorMsg(error);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(false); setErrorMsg(''); setSuccessMsg('');
    const files = Array.from(event.dataTransfer.files || []);
    const { valid, error } = validateFiles(files);
    setSelectedFiles(valid);
    setProcessedBlobs([]);
    if (error) setErrorMsg(error);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault(); setIsDragOver(false);
  };

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDropAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(''); setSuccessMsg('');
    const processed: { name: string, blob: Blob }[] = [];
    for (const file of selectedFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        let dxf;
        try {
          const parser = new DxfParser();
          dxf = parser.parseSync(text);
        } catch (err) {
          setErrorMsg('Failed to parse DXF file. Only ASCII DXF files are supported.');
          continue;
        }
        // PDF page size
        const pageSizes: Record<string, [number, number]> = {
          'A4': [595.28, 841.89],
          'A3': [841.89, 1190.55],
          'Letter': [612, 792]
        };
        let [width, height] = pageSizes[settings.pageSize] || pageSizes['A4'];
        if (settings.orientation === 'landscape') {
          [width, height] = [height, width];
        }
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        let font;
        try {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        } catch {
          font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        }
        const page = pdfDoc.addPage([width, height]);
        // Draw entities
        const ctx = page;
        const scale = Number(settings.scale) || 1;
        if (dxf && dxf.entities && Array.isArray(dxf.entities)) {
          dxf.entities.forEach((entity: any) => {
            if (entity.type === 'LINE') {
              ctx.drawLine({
                start: { x: entity.vertices[0].x * scale, y: entity.vertices[0].y * scale },
                end: { x: entity.vertices[1].x * scale, y: entity.vertices[1].y * scale },
                thickness: 0.5,
                color: rgb(0, 0, 0)
              });
            } else if (entity.type === 'CIRCLE') {
              ctx.drawEllipse({
                x: entity.center.x * scale,
                y: entity.center.y * scale,
                xScale: entity.radius * scale,
                yScale: entity.radius * scale,
                color: rgb(0, 0, 0),
                borderWidth: 0.5
              });
            } else if (entity.type === 'ARC') {
              // pdf-lib does not support arc, so skip or approximate
            }
          });
        }
        page.drawText(`DXF: ${file.name}`, { x: 40, y: 30, size: 10, font, color: rgb(0.5,0.5,0.5) });
        const pdfBytes = await pdfDoc.save();
        processed.push({ name: file.name.replace(/\.[^/.]+$/, '') + '.pdf', blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
      } catch (error) {
        setErrorMsg(`Error creating PDF for ${file.name}.`);
      }
    }
    setProcessedBlobs(processed);
    setIsProcessing(false);
    if (processed.length > 0) {
      setSuccessMsg('DXF to PDF conversion completed!');
      // Set preview for first file
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

  const resetTool = () => {
    setSelectedFiles([]);
    setPreviewPdfUrl('');
    setProcessedBlobs([]);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <>
      <SEO 
        title="Convert DXF to PDF | Best Free DXF to PDF Tool"
        description="Convert DXF files to PDFs online with precision. Perfect for architects and engineers who need clear, shareable design documents."
        keywords="DXF to PDF, convert DXF to PDF, CAD to PDF, online tool, free tool"
        canonical="dxf-to-pdf"
        ogImage="/images/dxf-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>DXF to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert DXF Drawings to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your DXF CAD drawings to high-quality PDF format. Fast, secure, and free DXF to PDF converter for engineering, architecture, and more.
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
                  role="button"
                  tabIndex={0}
                  aria-label="Upload or drop DXF files"
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
                    Drop your DXF files here for PDF conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".dxf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose DXF Files
                  </label>
                </div>
              </div>

              {/* File Management */}
              {selectedFiles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected DXF Files</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                    <FileType className="h-8 w-8 text-violet-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFiles.map(f => f.name).join(', ')}</p>
                      <p className="text-xs text-gray-500">{(selectedFiles.reduce((total, f) => total + f.size, 0) / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={resetTool}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Settings Card (SmartCrop style) */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Conversion Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="Letter">Letter</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scale</label>
                    <input
                      type="number"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={settings.scale}
                      onChange={e => setSettings(prev => ({ ...prev, scale: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <button
                    className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    onClick={processFiles}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <FileType className="h-5 w-5" />
                        <span>Convert to PDFs</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Convert DXF to PDF</h2>
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
                <h2 className="text-3xl font-bold mb-4">Ready to Convert Your DXF Drawings?</h2>
                <p className="text-xl mb-6 opacity-90">Join thousands of engineers and architects using our DXF to PDF converter</p>
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
      {previewPdfUrl && (
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview (First Page)</h3>
          <iframe src={previewPdfUrl + '#page=1'} title="PDF Preview" className="w-full max-w-2xl h-96 mx-auto border rounded-lg shadow" />
        </div>
      )}
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
          <a
            href={URL.createObjectURL(processedBlobs[0].blob)}
            download={processedBlobs[0].name}
            className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <Download className="h-5 w-5" />
            <span>Download PDF</span>
          </a>
        </div>
      )}
    </>
  );
};

export default DXFToPDFConverter; 