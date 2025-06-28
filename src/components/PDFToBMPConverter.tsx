import React, { useState, useRef } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, ImageIcon } from 'lucide-react';
import SEO from './SEO';

const PDFToBMPConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    quality: 'high',
    resolution: 300,
    color: 'full',
    pageRange: '',
    format: 'bmp'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'bmp' | 'png' | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setPreviewUrl(null);
    setPreviewType(null);
    setPreviewError(null);
    setErrorMsg(null);
    setProgress(null);
    // Check for worker file
    try {
      const workerCheck = await fetch('/pdf.worker.min.js', { method: 'HEAD' });
      if (!workerCheck.ok) {
        setIsProcessing(false);
        setErrorMsg('PDF.js worker file (pdf.worker.min.js) is missing. Please ensure it exists in the public/ directory.');
        return;
      }
    } catch {
      setIsProcessing(false);
      setErrorMsg('Unable to check for PDF.js worker file. Please check your network or deployment.');
      return;
    }
    try {
      const processed: { name: string, blob: Blob }[] = [];
      let totalPages = 0;
      let processedPages = 0;
      // First, count total pages for progress
      for (const file of files) {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          let pageNumbers: number[] = [];
          if (settings.pageRange.trim()) {
            const parts = settings.pageRange.split(',');
            for (const part of parts) {
              if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) pageNumbers.push(i);
              } else {
                const n = Number(part);
                if (!isNaN(n)) pageNumbers.push(n);
              }
            }
            pageNumbers = pageNumbers.filter(n => n >= 1 && n <= numPages);
          } else {
            pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
          }
          totalPages += pageNumbers.length;
        } catch {}
      }
      if (totalPages === 0) {
        setIsProcessing(false);
        setErrorMsg('No valid pages found in the uploaded PDFs.');
        return;
      }
      setProgress({ current: 0, total: totalPages });
      let previewSet = false;
      for (const file of files) {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          let pageNumbers: number[] = [];
          if (settings.pageRange.trim()) {
            const parts = settings.pageRange.split(',');
            for (const part of parts) {
              if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) pageNumbers.push(i);
              } else {
                const n = Number(part);
                if (!isNaN(n)) pageNumbers.push(n);
              }
            }
            pageNumbers = pageNumbers.filter(n => n >= 1 && n <= numPages);
          } else {
            pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
          }
          for (let i = 0; i < pageNumbers.length; i++) {
            const pageNum = pageNumbers[i];
            try {
            const page = await pdfDoc.getPage(pageNum);
              const scale = settings.resolution / 72;
            const scaledViewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
              if (!context) throw new Error('Canvas context not available');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
              const renderContext = { canvasContext: context, viewport: scaledViewport };
            await page.render(renderContext).promise;
              if (settings.color === 'grayscale') {
                const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
                for (let j = 0; j < imgData.data.length; j += 4) {
                  const avg = 0.299 * imgData.data[j] + 0.587 * imgData.data[j + 1] + 0.114 * imgData.data[j + 2];
                  imgData.data[j] = imgData.data[j + 1] = imgData.data[j + 2] = avg;
                }
                context.putImageData(imgData, 0, 0);
              }
              let blob: Blob;
              let isBmp = false;
              if (settings.format.startsWith('bmp')) {
                const pngBlob = await new Promise<Blob>((resolve) => {
                  canvas.toBlob((b) => b && resolve(b), 'image/png', settings.quality === 'high' ? 1.0 : 0.8);
                });
                try {
                  const bmpjs = await import('bmp-js');
                  const img = new window.Image();
                  const url = URL.createObjectURL(pngBlob);
                  await new Promise((resolve, reject) => {
                    img.onload = () => resolve(null);
                    img.onerror = reject;
                    img.src = url;
                  });
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = img.width;
                  tempCanvas.height = img.height;
                  const tempCtx = tempCanvas.getContext('2d');
                  tempCtx?.drawImage(img, 0, 0);
                  const imageData = tempCtx?.getImageData(0, 0, img.width, img.height);
                  if (imageData) {
                    let bmpBuffer;
                    if (settings.format === 'bmp8') {
                      bmpBuffer = bmpjs.encode({ data: imageData.data, width: img.width, height: img.height, bitPP: 8 }).data;
                    } else {
                      bmpBuffer = bmpjs.encode({ data: imageData.data, width: img.width, height: img.height, bitPP: 24 }).data;
                    }
                    blob = new Blob([bmpBuffer], { type: 'image/bmp' });
                    isBmp = true;
                } else {
                    blob = pngBlob;
                  }
                  URL.revokeObjectURL(url);
                } catch (err) {
                  blob = pngBlob;
                }
              } else {
                blob = await new Promise<Blob>((resolve) => {
                  canvas.toBlob((b) => b && resolve(b), 'image/png', settings.quality === 'high' ? 1.0 : 0.8);
            });
              }
            const baseName = file.name.replace(/\.pdf$/i, '');
              const ext = settings.format.startsWith('bmp') ? '.bmp' : '.png';
              const fileName = `${baseName}_page_${pageNum}${ext}`;
              processed.push({ name: fileName, blob });
              if (!previewSet) {
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setPreviewType(isBmp ? 'bmp' : 'png');
                setPreviewError(null);
                previewSet = true;
              }
            } catch (err) {
              setErrorMsg(`Error processing page ${pageNum} of ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
            }
            processedPages++;
            setProgress({ current: processedPages, total: totalPages });
          }
        } catch (err) {
          setErrorMsg(`Error processing file ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      if (processed.length === 0) {
        setErrorMsg('No pages were successfully converted. Please check your files and settings.');
      }
    } catch (error) {
      setIsProcessing(false);
      setErrorMsg('Unexpected error during conversion. Please try again.');
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
    { icon: <ImageIcon className="h-6 w-6" />, title: 'High Quality BMP', description: 'Convert PDF pages to high-quality BMP images' },
    { icon: <Shield className="h-6 w-6" />, title: 'Resolution Control', description: 'Adjust DPI and resolution for optimal quality' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple PDFs to BMPs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Color Options', description: 'Choose between full color and grayscale output' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files to convert to BMP format' },
    { step: '2', title: 'Configure Settings', description: 'Choose resolution, color, and quality options' },
    { step: '3', title: 'Convert & Download', description: 'Download your BMP image files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '8K+', label: 'PDFs Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="PDF to BMP | Free Online PDF to BMP Converter"
        description="Convert PDF files to BMP images effortlessly with our free online PDF to BMP converter. Fast, accurate, and easy to use on any device."
        keywords="PDF to BMP, convert PDF to BMP, PDF to image, BMP converter, online tool, free tool"
        canonical="pdf-to-bmp"
        ogImage="/images/pdf-to-bmp-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>PDF to BMP Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to BMP
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Images</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert PDF pages to high-quality BMP images with customizable resolution and color settings. Perfect for printing and archival purposes.
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
                    isDragActive 
                      ? 'border-violet-500 bg-violet-50/50 shadow-lg' 
                      : files.length > 0 
                        ? 'border-violet-500 bg-violet-50/50' 
                        : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragActive ? 'text-violet-600' : 'text-gray-400'}`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop your PDF files here' : 'Drop your PDF files here'}
                  </h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.pdf)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
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
                    <span>Selected PDF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <ImageIcon className="h-8 w-8 text-violet-600" />
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
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="mx-auto max-h-64 rounded shadow"
                      onError={() => {
                        if (previewType === 'bmp') {
                          setPreviewError('Your browser cannot display BMP images. Showing PNG preview if available.');
                          // Try to find a PNG preview from processedFiles
                          const pngFile = processedFiles.find(f => f.name.endsWith('.png'));
                          if (pngFile) {
                            const pngUrl = URL.createObjectURL(pngFile.blob);
                            setPreviewUrl(pngUrl);
                            setPreviewType('png');
                          }
                        } else {
                          setPreviewError('Your browser cannot display this image preview.');
                        }
                      }}
                    />
                  ) : (
                    <p className="text-gray-500">No live preview available for PDF to BMP conversion.<br/>Conversion will create high-quality BMP images from PDF pages.</p>
                  )}
                  {previewError && (
                    <div className="mt-2 text-red-600 font-semibold">{previewError}</div>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution (DPI)</label>
                    <input
                      type="number"
                      min={72}
                      max={600}
                      value={settings.resolution}
                      onChange={e => setSettings(prev => ({ ...prev, resolution: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <select
                      value={settings.color}
                      onChange={e => setSettings(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="full">Full Color</option>
                      <option value="grayscale">Grayscale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5,8,10"
                      value={settings.pageRange}
                      onChange={e => setSettings(prev => ({ ...prev, pageRange: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.format}
                      onChange={e => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="bmp">BMP</option>
                      <option value="bmp24">24-bit BMP</option>
                      <option value="bmp8">8-bit BMP</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Progress Indicator and Error Message */}
              {(progress && isProcessing) && (
                <div className="mb-4 text-center">
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-700">Processing page {progress.current} of {progress.total}...</span>
                </div>
              )}
              {errorMsg && (
                <div className="mb-4 text-center text-red-600 font-semibold">
                  {errorMsg}
                </div>
              )}

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
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Convert to BMP</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download All ({processedFiles.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Convert PDF to BMP</h2>
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
                <h2 className="text-3xl font-bold mb-4">Ready to Convert Your PDF Files?</h2>
                <p className="text-xl mb-6 opacity-90">Join thousands of users who trust our PDF to BMP converter</p>
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
    </>
  );
};

export default PDFToBMPConverter; 