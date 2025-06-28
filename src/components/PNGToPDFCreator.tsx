import React, { useState, useRef } from 'react';
import { Upload, Download, FileImage, Users, Zap, Shield, FileText } from 'lucide-react';
import SEO from './SEO';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "1M+", label: "PDFs Created" },
  { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

const PNGToPDFCreator: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [pageSize, setPageSize] = useState('fit');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pdfFilename, setPdfFilename] = useState('converted.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [undoStack, setUndoStack] = useState<{files: File[], order: number[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{files: File[], order: number[]}[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPageCanvas, setPdfPageCanvas] = useState<HTMLCanvasElement | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    pushUndo();
    const selected = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...selected]);
    setOrder(prev => [...prev, ...selected.map((_, i) => prev.length + i)]);
    setProcessedBlob(null);
  };

  const handleDrop = (event: React.DragEvent) => {
    pushUndo();
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...dropped]);
    setOrder(prev => [...prev, ...dropped.map((_, i) => prev.length + i)]);
    setProcessedBlob(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const moveFile = (from: number, to: number) => {
    pushUndo();
    const newOrder = [...order];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setOrder(newOrder);
  };

  const removeFile = (idx: number) => {
    pushUndo();
    URL.revokeObjectURL(previewUrls[idx]);
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== idx);
      setOrder(newFiles.map((_, i) => i));
      return newFiles;
    });
    setProcessedBlob(null);
  };

  const pageSizes = [
    { id: 'fit', name: 'Fit to Image' },
    { id: 'a4', name: 'A4' },
    { id: 'letter', name: 'Letter' }
  ];
  const orientations = [
    { id: 'portrait', name: 'Portrait' },
    { id: 'landscape', name: 'Landscape' }
  ];
  const margins = [
    { id: 'none', name: 'None' },
    { id: 'small', name: 'Small' },
    { id: 'large', name: 'Large' }
  ];

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      for (const idx of order) {
        try {
          const file = files[idx];
          const imgBytes = await file.arrayBuffer();
          let image, width, height;
          if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(imgBytes);
          } else {
            image = await pdfDoc.embedJpg(imgBytes);
          }
          width = image.width;
          height = image.height;
          let pageWidth = width, pageHeight = height;
          if (pageSize === 'a4') {
            [pageWidth, pageHeight] = orientation === 'portrait' ? [595.28, 841.89] : [841.89, 595.28];
          } else if (pageSize === 'letter') {
            [pageWidth, pageHeight] = orientation === 'portrait' ? [612, 792] : [792, 612];
          }
          let marginPx = 0;
          if (margin === 'small') marginPx = 24;
          if (margin === 'large') marginPx = 64;
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          const drawWidth = pageWidth - 2 * marginPx;
          const drawHeight = pageHeight - 2 * marginPx;
          const scale = Math.min(drawWidth / width, drawHeight / height, 1);
          const x = (pageWidth - width * scale) / 2;
          const y = (pageHeight - height * scale) / 2;
          page.drawImage(image, { x, y, width: width * scale, height: height * scale });
        } catch (fileError) {
          // Skip this file and continue
          console.error('Error processing file:', fileError);
        }
      }
      const pdfBytes = await pdfDoc.save();
      setProcessedBlob(new Blob([pdfBytes], { type: 'application/pdf' }));
      setIsProcessing(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      alert('PDF created successfully!');
      if (processedBlob) {
        const url = URL.createObjectURL(processedBlob);
        setPdfPreviewUrl(url);
      }
    } catch (error) {
      setIsProcessing(false);
      alert('Error creating PDF.');
    }
  };

  React.useEffect(() => {
    setPreviewUrls(files.map(f => URL.createObjectURL(f)));
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  React.useEffect(() => {
    if (!pdfPreviewUrl) return;
    import('pdfjs-dist/build/pdf').then((pdfjsLib: any) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      pdfjsLib.getDocument(pdfPreviewUrl).promise.then((pdf: any) => {
        pdf.getPage(1).then((page: any) => {
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({ canvasContext: context, viewport }).promise.then(() => {
            setPdfPageCanvas(canvas);
          });
        });
      });
    });
  }, [pdfPreviewUrl]);

  const downloadPDF = () => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename.trim() ? pdfFilename.trim().replace(/\.pdf$/i, '') + '.pdf' : 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetAll = () => {
    setFiles([]); setOrder([]); setProcessedBlob(null); setPreviewUrls([]);
  };

  const pushUndo = () => setUndoStack(prev => [...prev, { files: [...files], order: [...order] }]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, { files: [...files], order: [...order] }]);
    const last = undoStack[undoStack.length - 1];
    setFiles(last.files);
    setOrder(last.order);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, { files: [...files], order: [...order] }]);
    const last = redoStack[redoStack.length - 1];
    setFiles(last.files);
    setOrder(last.order);
    setRedoStack(prev => prev.slice(0, -1));
  };

  return (
    <>
      <SEO
        title="PNG to PDF Converter | Free & Fast Online Tool"
        description="Convert PNG images to PDF in seconds. Free, secure, and easy-to-use online PNG to PDF converter. No sign-up or download required."
        keywords="PNG to PDF, convert PNG to PDF, PNG image to PDF, online tool, free tool"
        canonical="png-to-pdf"
        ogImage="/images/png-to-pdf-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileImage className="h-4 w-4" />
                <span>PNG to PDF Creator</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PNG Images to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert PNG images to high-quality PDF format. Fast, secure, and free PNG to PDF creator for web, print, and sharing.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PNG/JPG images here for PDF conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Choose PNG Images
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileImage className="h-5 w-5 text-violet-600" />
                    <span>Selected Images ({files.length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {order.map((idx, i) => (
                      <div key={files[idx].name + idx} className="relative bg-gray-50 rounded-xl p-2 flex flex-col items-center w-28">
                        <img src={previewUrls[idx]} alt="Preview" className="h-20 w-20 object-contain rounded-lg border mb-2" />
                        <p className="text-xs text-gray-900 truncate w-full text-center">{files[idx].name}</p>
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => moveFile(i, i - 1)} disabled={i === 0} className="text-gray-400 hover:text-violet-600">↑</button>
                          <button onClick={() => moveFile(i, i + 1)} disabled={i === order.length - 1} className="text-gray-400 hover:text-violet-600">↓</button>
                          <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {files.length > 0 && (
                    <div className="mb-4 flex gap-2 justify-end">
                      <button onClick={handleUndo} disabled={undoStack.length === 0} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold disabled:opacity-50">Undo</button>
                      <button onClick={handleRedo} disabled={redoStack.length === 0} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold disabled:opacity-50">Redo</button>
                    </div>
                  )}
                </div>
              )}

              {/* PDF Settings */}
              {files.length > 0 && (
                <div className="mb-8 bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>PDF Settings</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                      <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {pageSizes.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                      <select value={orientation} onChange={e => setOrientation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {orientations.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Margin</label>
                      <select value={margin} onChange={e => setMargin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {margins.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Filename Input */}
              {files.length > 0 && (
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <label className="text-sm font-medium text-gray-700">PDF Filename:</label>
                  <input
                    type="text"
                    value={pdfFilename}
                    onChange={e => setPdfFilename(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg w-64"
                    placeholder="converted.pdf"
                  />
                </div>
              )}

              {/* Convert, Download, Reset Buttons */}
              {files.length > 0 && (
                <div className="mb-8 text-center flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={processFiles}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Converting...' : 'Convert to PDF'}
                  </button>
                  {processedBlob && (
                    <button
                      onClick={downloadPDF}
                      className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200"
                    >
                      <Download className="h-5 w-5 inline-block mr-2" />Download PDF
                    </button>
                  )}
                  <button
                    onClick={resetAll}
                    className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                    disabled={isProcessing}
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Live PDF Preview */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>PDF Preview</span>
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {previewUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Page ${i + 1}`} className="h-24 w-20 object-contain rounded-lg border" />
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Preview Canvas */}
              {pdfPageCanvas && (
                <div className="mb-8 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Preview (First Page)</h3>
                  <div className="border rounded-xl overflow-hidden shadow-lg">
                    <div ref={el => { if (el && pdfPageCanvas) el.appendChild(pdfPageCanvas); }} />
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PNG to PDF Creator?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Fast, secure, and high-quality PNG to PDF conversion with batch support and privacy-first processing.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                    <FileImage className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">High-Quality Output</h3>
                  <p className="text-gray-600 text-sm">Preserve image clarity and color in your PDFs</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Conversion</h3>
                  <p className="text-gray-600 text-sm">Convert PNGs to PDF in seconds, even in batches</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
                  <p className="text-gray-600 text-sm">Your images are never stored or shared</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Registration</h3>
                  <p className="text-gray-600 text-sm">Free to use, no sign-up required</p>
                </div>
              </div>
            </div>

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  How to Convert PNG to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to create a PDF from your PNG image
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload PNG Image</h3>
                  <p className="text-gray-600">Drag and drop or browse to select your PNG file</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Convert to PDF</h3>
                  <p className="text-gray-600">Click the convert button to process your image</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Download PDF</h3>
                  <p className="text-gray-600">Save your new PDF file instantly</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                    Ready to Convert Your PNG to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Create high-quality PDFs from your PNG images in seconds. Fast, secure, and always free!
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileImage className="h-5 w-5" />
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
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="confetti-animation"></div>
        </div>
      )}
    </>
  );
};

export default PNGToPDFCreator;

/*
.confetti-animation {
  width: 100vw;
  height: 100vh;
  background: repeating-linear-gradient(45deg, #a78bfa 0 10px, #f472b6 10px 20px, #60a5fa 20px 30px, #fbbf24 30px 40px, transparent 40px 50px);
  opacity: 0.3;
  animation: confetti-fall 2s linear;
}
@keyframes confetti-fall {
  0% { transform: translateY(-100vh); }
  100% { transform: translateY(0); }
}
*/
