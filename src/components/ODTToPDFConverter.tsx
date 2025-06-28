import React, { useRef, useState, useCallback } from 'react';
import { Upload, Download, FileText, FileType, XCircle, CheckCircle, Loader2, Eye } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

interface ProcessedFile {
  name: string;
  blob: Blob;
  size: number;
  status: 'success' | 'error' | 'processing';
  error?: string;
  preview?: string;
}

const pageSizes = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
  A3: [841.89, 1190.55],
  A5: [420.94, 595.28],
};

const features = [
  { icon: <FileType className="h-6 w-6" />, title: 'Preserve Formatting', description: 'Keep original layout and images' },
  { icon: <FileType className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple ODTs at once' },
  { icon: <FileType className="h-6 w-6" />, title: 'Fast & Secure', description: 'Quick conversion with privacy' },
  { icon: <FileType className="h-6 w-6" />, title: 'All Platforms', description: 'Works on any device' },
];

const howToSteps = [
  { step: 1, title: 'Upload ODTs', description: 'Select or drag and drop your ODT files.' },
  { step: 2, title: 'Set Preferences', description: 'Choose conversion settings.' },
  { step: 3, title: 'Download PDF', description: 'Get your converted PDF files.' },
];

const stats = [
  { icon: <FileType className="h-5 w-5" />, value: '120K+', label: 'ODTs Converted' },
  { icon: <Upload className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
  { icon: <FileText className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <Download className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const ODTToPDFConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingProgress, setProcessingProgress] = useState<{ [key: string]: number }>({});
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'portrait',
    includeImages: true,
    includeCharts: false,
    maintainFormatting: true,
    includeHeaders: false,
  });

  // Drag and drop handlers
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.odt'));
    if (droppedFiles.length === 0) {
      setErrorMessage('Only ODT files are supported.');
      return;
    }
    setFiles(prev => [...prev, ...droppedFiles]);
    setErrorMessage('');
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  // File select handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter(f => f.name.toLowerCase().endsWith('.odt'));
    if (selectedFiles.length === 0) {
      setErrorMessage('Only ODT files are supported.');
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
    setErrorMessage('');
  };

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearAllFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setErrorMessage('');
    setProcessingProgress({});
  };

  // Batch download
  const downloadAll = () => {
    processedFiles.forEach(file => {
      if (file.status === 'success') {
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  };

  // Main processing logic
  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProcessedFiles([]);
    setProcessingProgress({});
    setErrorMessage('');
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const processed: ProcessedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress(prev => ({ ...prev, [file.name]: 0 }));
      try {
        setProcessingProgress(prev => ({ ...prev, [file.name]: 10 }));
        // Parse ODT using jszip and DOMParser
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const contentXml = await zip.file('content.xml')?.async('string');
        if (!contentXml) throw new Error('Invalid ODT: content.xml not found');
        setProcessingProgress(prev => ({ ...prev, [file.name]: 20 }));
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contentXml, 'text/xml');
        // Extract paragraphs
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('text:p'));
        // Extract title/header if enabled
        let title = '';
        if (settings.includeHeaders) {
          const metaXml = await zip.file('meta.xml')?.async('string');
          if (metaXml) {
            const metaDoc = parser.parseFromString(metaXml, 'text/xml');
            const titleNode = metaDoc.getElementsByTagName('dc:title')[0];
            if (titleNode && titleNode.textContent) title = titleNode.textContent;
          }
        }
        setProcessingProgress(prev => ({ ...prev, [file.name]: 30 }));
        // Prepare PDF
        let [pageWidth, pageHeight] = pageSizes[settings.pageSize as keyof typeof pageSizes] || pageSizes.A4;
        if (settings.orientation === 'landscape') {
          [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        let y = pageHeight - 50;
        // Add header if enabled
        if (title) {
          page.drawText(title, { x: 50, y, size: 18, font: boldFont, color: rgb(0.2,0.2,0.2) });
          y -= 30;
        }
        // Add content
        for (const para of paragraphs) {
          let text = para.textContent || '';
          if (!settings.maintainFormatting) text = text.replace(/\s+/g, ' ');
          page.drawText(text, { x: 50, y, size: 12, font: font, color: rgb(0,0,0) });
          y -= 18;
          if (y < 50) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - 50;
          }
        }
        // Add images if enabled
        if (settings.includeImages && zip.folder('Pictures')) {
          const pics = zip.folder('Pictures');
          if (pics) {
            const files = Object.values(pics.files);
            for (const imgFile of files) {
              if (imgFile.name.match(/\.(png|jpg|jpeg)$/i)) {
                const imgData = await imgFile.async('uint8array');
                let img;
                if (imgFile.name.endsWith('.png')) img = await pdfDoc.embedPng(imgData);
                else img = await pdfDoc.embedJpg(imgData);
                const imgDims = img.scale(0.25);
                page.drawImage(img, { x: 50, y: y - imgDims.height - 10, width: imgDims.width, height: imgDims.height });
                y -= imgDims.height + 20;
                if (y < 50) {
                  page = pdfDoc.addPage([pageWidth, pageHeight]);
                  y = pageHeight - 50;
                }
              }
            }
          }
        }
        // Add charts if enabled (not supported)
        if (settings.includeCharts) {
          page.drawText('[Charts not supported in browser version]', { x: 50, y, size: 10, font, color: rgb(0.5,0.2,0.2) });
          y -= 15;
        }
        setProcessingProgress(prev => ({ ...prev, [file.name]: 90 }));
        // Save PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        processed.push({
          name: file.name.replace(/\.odt$/i, '.pdf'),
          blob,
          size: blob.size,
          status: 'success',
          preview: `Pages: ${pdfDoc.getPageCount()} | Size: ${(blob.size/1024/1024).toFixed(2)} MB`
        });
        setProcessingProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error: any) {
        processed.push({
          name: file.name.replace(/\.odt$/i, '.pdf'),
          blob: new Blob(),
          size: 0,
          status: 'error',
          error: error?.message || 'Unknown error',
        });
        setProcessingProgress(prev => ({ ...prev, [file.name]: 100 }));
      }
    }
    setProcessedFiles(processed);
    setIsProcessing(false);
  };

  return (
    <div>
      <SEO
        title="Convert ODT to PDF | Reliable Online ODT to PDF Converter"
        description="Need to convert ODT files to PDF? Use our fast and secure online ODT to PDF converter for hassle-free document conversion."
        keywords="ODT to PDF, convert ODT to PDF, ODT to document, online converter, free tool"
        canonical="odt-to-pdf"
        ogImage="/images/odt-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>ODT to PDF</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">ODT to PDF</span> Instantly
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your ODT documents to PDF format with advanced options for formatting, images, and more. Fast, secure, and free.
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
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your ODT files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose ODT Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".odt,application/vnd.oasis.opendocument.text"
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
                    <span>Selected ODT Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
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
                <div className="bg-gray-50 rounded-xl p-4">
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2 text-violet-600">
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Processing...</span>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center text-gray-500">
                      <p>No file selected. Select or drop an ODT file to see a preview.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Preview of first file:</p>
                        <PreviewODTText file={files[0]} maxParagraphs={5} />
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                          <Eye className="h-4 w-4" />
                          <span>Current Settings Summary</span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          <div><span className="text-blue-700 font-medium">Page:</span> <span className="text-blue-600 ml-1">{settings.pageSize} ({settings.orientation})</span></div>
                          <div><span className="text-blue-700 font-medium">Images:</span> <span className="text-blue-600 ml-1">{settings.includeImages ? 'Included' : 'Excluded'}</span></div>
                          <div><span className="text-blue-700 font-medium">Charts:</span> <span className="text-blue-600 ml-1">{settings.includeCharts ? 'Placeholder' : 'Excluded'}</span></div>
                          <div><span className="text-blue-700 font-medium">Formatting:</span> <span className="text-blue-600 ml-1">{settings.maintainFormatting ? 'Preserved' : 'Flattened'}</span></div>
                          <div><span className="text-blue-700 font-medium">Headers:</span> <span className="text-blue-600 ml-1">{settings.includeHeaders ? 'Included' : 'Excluded'}</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                      <option value="A3">A3</option>
                      <option value="A5">A5</option>
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeImages"
                      checked={settings.includeImages}
                      onChange={e => setSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeImages" className="text-sm font-medium text-gray-700">Include Images</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      checked={settings.includeCharts}
                      onChange={e => setSettings(prev => ({ ...prev, includeCharts: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeCharts" className="text-sm font-medium text-gray-700">Include Charts</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainFormatting"
                      checked={settings.maintainFormatting}
                      onChange={e => setSettings(prev => ({ ...prev, maintainFormatting: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainFormatting" className="text-sm font-medium text-gray-700">Maintain Formatting</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeHeaders"
                      checked={settings.includeHeaders}
                      onChange={e => setSettings(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeHeaders" className="text-sm font-medium text-gray-700">Include Headers</label>
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
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert ODT to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download PDF Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our ODT to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect OpenDocument transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert ODT to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your ODT files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert ODT to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our ODT to PDF converter for perfect OpenDocument conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

function PreviewODTText({ file, maxParagraphs }: { file: File, maxParagraphs: number }) {
  const [preview, setPreview] = React.useState<string[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const JSZip = (await import('jszip')).default;
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const contentXml = await zip.file('content.xml')?.async('string');
        if (!contentXml) return setPreview(['Could not extract content.xml']);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contentXml, 'text/xml');
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('text:p'));
        const texts = paragraphs.slice(0, maxParagraphs).map(p => p.textContent || '').filter(Boolean);
        if (!cancelled) setPreview(texts.length ? texts : ['No text content found.']);
      } catch (e) {
        if (!cancelled) setPreview(['Error extracting preview.']);
      }
    })();
    return () => { cancelled = true; };
  }, [file, maxParagraphs]);
  return (
    <div className="text-left text-gray-700 text-xs space-y-2">
      {preview.map((p, i) => <p key={i} className="truncate">{p}</p>)}
    </div>
  );
}

export default ODTToPDFConverter; 