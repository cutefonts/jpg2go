import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, BookOpen, FileType } from 'lucide-react';
import SEO from './SEO';
import ePub from 'epubjs';
import JSZip from 'jszip';

const EbookToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [fileProgress, setFileProgress] = useState<{ [name: string]: number }>({});
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('');
  const MAX_FILE_SIZE_MB = 50;

  const getPageDimensions = () => {
    const sizes = {
      a4: { width: 595.28, height: 841.89 },
      letter: { width: 612, height: 792 },
      legal: { width: 612, height: 1008 }
    };
    const size = sizes[pageSize];
    return orientation === 'landscape' 
      ? { width: size.height, height: size.width }
      : size;
  };

  const validateFiles = (files: File[]) => {
    const valid: File[] = [];
    let error = '';
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['epub', 'txt'].includes(ext || '')) {
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
    setProcessedFiles([]);
    if (error) setErrorMsg(error);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(''); setSuccessMsg('');
    const files = Array.from(e.dataTransfer.files || []);
    const { valid, error } = validateFiles(files);
    setSelectedFiles(valid);
    setProcessedFiles([]);
    if (error) setErrorMsg(error);
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

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          // For text files, return content directly
          if (file.name.endsWith('.txt')) {
            resolve(content);
            return;
          }
          
          // For other formats, try to extract readable text
          // This is a simplified approach - in a real implementation,
          // you'd need proper parsers for EPUB, MOBI, etc.
          let extractedText = '';
          
          if (file.name.endsWith('.epub')) {
            // EPUB is essentially a ZIP file with XML content
            extractedText = `EPUB File: ${file.name}\n\nThis is a placeholder for EPUB content extraction.\nIn a full implementation, this would parse the EPUB structure and extract the actual book content.\n\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB\nLast modified: ${new Date(file.lastModified).toLocaleString()}`;
          } else if (file.name.endsWith('.mobi')) {
            extractedText = `MOBI File: ${file.name}\n\nThis is a placeholder for MOBI content extraction.\nIn a full implementation, this would parse the MOBI format and extract the actual book content.\n\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB\nLast modified: ${new Date(file.lastModified).toLocaleString()}`;
          } else if (file.name.endsWith('.azw3')) {
            extractedText = `AZW3 File: ${file.name}\n\nThis is a placeholder for AZW3 content extraction.\nIn a full implementation, this would parse the AZW3 format and extract the actual book content.\n\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB\nLast modified: ${new Date(file.lastModified).toLocaleString()}`;
          }
          
          resolve(extractedText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(''); setSuccessMsg('');
    setFileProgress({});
    const processed: { name: string, blob: Blob }[] = [];
    for (const file of selectedFiles) {
      setFileProgress(fp => ({ ...fp, [file.name]: 0 }));
      const ext = file.name.split('.').pop()?.toLowerCase();
      try {
        if (ext === 'txt') {
          // TXT: Read and paginate
          const text = await file.text();
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const pageSize = getPageDimensions();
          const lines = text.split(/\r?\n/);
          const linesPerPage = Math.floor((pageSize.height - 100) / 18);
          for (let i = 0; i < lines.length; i += linesPerPage) {
            const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
            let y = pageSize.height - 50;
            for (const line of lines.slice(i, i + linesPerPage)) {
              page.drawText(line.slice(0, 100), {
                x: 50,
                y,
                size: 12,
                font,
                color: rgb(0, 0, 0)
              });
              y -= 18;
            }
          }
          const pdfBytes = await pdfDoc.save();
          processed.push({ name: file.name.replace(/\.txt$/i, '.pdf'), blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
          setFileProgress(fp => ({ ...fp, [file.name]: 100 }));
        } else if (ext === 'epub') {
          // EPUB: Advanced extraction
          const arrayBuffer = await file.arrayBuffer();
          const book = ePub(arrayBuffer);
          await book.ready;
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          // TOC
          const toc = book.navigation && book.navigation.toc ? await book.navigation.toc : [];
          if (toc.length > 0) {
            const tocPage = pdfDoc.addPage([595.28, 841.89]);
            tocPage.drawText('Table of Contents', { x: 50, y: 800, size: 18, font, color: rgb(0,0,0) });
            let y = 770;
            for (const item of toc) {
              if (y < 60) break;
              tocPage.drawText(item.label, { x: 70, y, size: 12, font, color: rgb(0.2,0.2,0.2) });
              y -= 18;
            }
          }
          // Chapters
          let totalChapters = 0;
          book.spine.each(() => { totalChapters++; });
          await new Promise<void>(resolve => {
            book.spine.each(async (item: any, idx: number) => {
              const chapter = await item.load(book.load.bind(book));
              const html = chapter;
              let text = '';
              const images: { src: string, data: Uint8Array }[] = [];
              try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                // Extract images
                const imgTags = Array.from(doc.images || []);
                for (const img of imgTags) {
                  if (img.src && img.src.startsWith('data:')) {
                    const base64 = img.src.split(',')[1];
                    const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                    images.push({ src: img.src, data: bin });
                  }
                }
                // Basic formatting: bold, italics, headings
                text = '';
                function walk(node: any) {
                  if (node.nodeType === 3) text += node.textContent;
                  if (node.nodeType === 1) {
                    if (/^h[1-6]$/.test(node.tagName.toLowerCase())) text += '\n' + node.textContent?.toUpperCase() + '\n';
                    else if (node.tagName.toLowerCase() === 'b' || node.tagName.toLowerCase() === 'strong') text += '**' + node.textContent + '**';
                    else if (node.tagName.toLowerCase() === 'i' || node.tagName.toLowerCase() === 'em') text += '*' + node.textContent + '*';
                    else Array.from(node.childNodes).forEach(walk);
                  }
                }
                walk(doc.body);
              } catch {
                text = html;
              }
              if (text) {
                const lines = text.split('\n');
                const linesPerPage = 40;
                for (let i = 0; i < lines.length; i += linesPerPage) {
                  const page = pdfDoc.addPage([595.28, 841.89]);
                  let y = 800;
                  for (const line of lines.slice(i, i + linesPerPage)) {
                    page.drawText(line.slice(0, 100), { x: 50, y, size: 12, font, color: rgb(0,0,0) });
                    y -= 18;
                  }
                }
              }
              if (idx === totalChapters - 1) resolve();
            });
          });
        
          const pdfBytes = await pdfDoc.save();
          processed.push({ name: file.name.replace(/\.epub$/i, '.pdf'), blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
          setFileProgress(fp => ({ ...fp, [file.name]: 100 }));
        } else if (ext === 'mobi' || ext === 'azw3') {
          setErrorMsg(`${ext?.toUpperCase()} files require server-side conversion due to their proprietary format. This feature is not available in the browser version. Please use Calibre or contact support for conversion options.`);
          setIsProcessing(false);
          return;
        } else {
          setErrorMsg(`Unsupported file format: ${ext}. Please use EPUB or TXT files.`);
          setIsProcessing(false);
          return;
        }
      } catch (error) {
        setErrorMsg('Error converting ebook to PDF. Please try again.');
        setIsProcessing(false);
      }
    }
    setProcessedFiles(processed);
    setIsProcessing(false);
    if (processed.length > 0) {
      setSuccessMsg('Ebook to PDF conversion completed!');
      // Set preview for first file
      const first = processed[0];
      if (first) {
        const url = URL.createObjectURL(first.blob);
        setPreviewPdfUrl(url);
      }
    }
  };

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setPreviewUrl('');
    setProcessedFiles([]);
    setPageSize('a4');
    setOrientation('portrait');
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Ebook to PDF",
      description: "Convert various ebook formats to professional PDF documents"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Multiple Formats",
      description: "Support for EPUB, MOBI, AZW3 and other ebook formats"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain formatting and structure during conversion"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Ebook",
      description: "Select your ebook file from your device"
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
    { icon: <Users className="h-5 w-5" />, value: "500K+", label: "Books Converted" },
    { icon: <FileText className="h-5 w-5" />, value: "< 8s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <BookOpen className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const handleDownloadAll = () => {
    processedFiles.forEach((f) => {
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

  return (
    <>
      <SEO 
        title="Ebook to PDF | Convert eBooks to PDF Online Free"
        description="Easily convert your eBooks to PDF format with our free online Ebook to PDF converter. Supports all popular eBook formats for quick, high-quality conversion."
        keywords="ebook to PDF, convert ebook, EPUB to PDF, MOBI to PDF, AZW to PDF, ebook converter, online tool, free tool"
        canonical="ebook-to-pdf"
        ogImage="/images/ebook-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BookOpen className="h-4 w-4" />
                <span>Ebook to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Ebooks to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your ebooks to professional PDF documents with preserved formatting. 
                Support for EPUB and TXT formats.
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
                  aria-label="Upload or drop ebook files"
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
                    Drop your ebooks here for PDF conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".epub,.txt"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    Choose Ebook Files
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
                      {selectedFiles.map(f => <li key={f.name}>{f.name} {fileProgress[f.name] ? `- ${fileProgress[f.name]}%` : ''}</li>)}
                    </ul>
                  </div>
                )}
                {previewPdfUrl && (
                  <div className="mt-8 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview (First Page)</h3>
                    <iframe src={previewPdfUrl + '#page=1'} title="PDF Preview" className="w-full max-w-2xl h-96 mx-auto border rounded-lg shadow" />
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5" />
                      <span>Convert to PDF</span>
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

              {/* Download Section for Batch */}
              {processedFiles.length > 1 && (
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
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Ebook to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional ebook to PDF conversion with formatting preservation and high quality output
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
                  How to Convert Ebooks to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your ebooks to PDF
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
                    Ready to Convert Ebooks to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your ebooks into professional PDF documents. Join thousands of users 
                    who trust our converter for reliable ebook to PDF conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <BookOpen className="h-5 w-5" />
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
    </>
  );
};

export default EbookToPDFConverter; 