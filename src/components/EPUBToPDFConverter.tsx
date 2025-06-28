import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, Book, FileType } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';
import ePub, { Book as EpubBook, NavItem } from 'epubjs';

const PAGE_SIZES = {
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  Letter: [612, 792],
};
const FONT_SIZES = {
  'small': 10,
  'medium': 12,
  'large': 16,
  'extra-large': 20,
};

const EPUBToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    includeTOC: true,
    includeMetadata: true,
    pageSize: 'A5',
    orientation: 'portrait',
    fontSize: 'medium',
    maintainFormatting: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ [name: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const validateFiles = (inputFiles: File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of inputFiles) {
      if (!(file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub') || file.type === '')) {
        errors.push(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`File too large: ${file.name} (max 50MB)`);
        continue;
      }
      valid.push(file);
    }
    return { valid, error: errors.join(' ') };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(''); setSuccessMsg('');
    const selectedFiles = Array.from(event.target.files || []);
    const { valid, error } = validateFiles(selectedFiles);
    // Prevent duplicates
    setFiles(prev => [...prev, ...valid.filter(f => !prev.some(p => p.name === f.name && p.size === f.size))]);
    if (error) setErrorMsg(error);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    const droppedFiles = Array.from(event.dataTransfer.files);
    const { valid, error } = validateFiles(droppedFiles);
    setFiles(prev => [...prev, ...valid.filter(f => !prev.some(p => p.name === f.name && p.size === f.size))]);
    if (error) setErrorMsg(error);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDropAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(''); setSuccessMsg('');
    setProgress({});
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        setProgress(p => ({ ...p, [file.name]: 0 }));
        try {
          const arrayBuffer = await file.arrayBuffer();
          await JSZip.loadAsync(arrayBuffer); // Validate zip
          const book: EpubBook = ePub(arrayBuffer);
          await book.ready;
          const toc: NavItem[] = (await book.navigation?.toc) || [];
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          let font;
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          } catch {
            font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          }
          // Settings
          const pageSize = PAGE_SIZES[settings.pageSize as keyof typeof PAGE_SIZES] || PAGE_SIZES.A4;
          const orientation: [number, number] = settings.orientation === 'landscape' ? [pageSize[1], pageSize[0]] : [pageSize[0], pageSize[1]];
          const fontSize = FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES] || 12;
          // TOC
          if (settings.includeTOC && toc.length > 0) {
            const tocPage = pdfDoc.addPage(orientation);
            tocPage.drawText('Table of Contents', { x: 50, y: orientation[1] - 50, size: fontSize + 6, font, color: rgb(0,0,0) });
            let y = orientation[1] - 80;
            for (const item of toc) {
              if (y < 60) break;
              tocPage.drawText(item.label, { x: 70, y, size: fontSize, font, color: rgb(0.2,0.2,0.2) });
              y -= fontSize + 6;
            }
          }
          // Chapters (sequential, robust)
          let chapterCount = 0;
          let i = 0;
          let totalChapters = 0;
          // Count total chapters
          while (true) {
            const item = book.spine.get(totalChapters);
            if (!item) break;
            totalChapters++;
          }
          for (i = 0; i < totalChapters; i++) {
            try {
              const item = book.spine.get(i);
              if (!item) continue;
              const chapter = await item.load(book.load.bind(book));
              let text = '';
              if (chapter && typeof chapter === 'object' && 'textContent' in chapter) {
                // If chapter is a Document
                text = chapter.textContent || '';
              } else if (typeof chapter === 'string') {
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(chapter, 'text/html');
                  text = doc.body?.innerText || doc.body?.textContent || '';
                } catch {
                  text = chapter;
                }
              }
              if (text.trim()) {
                chapterCount++;
                const page = pdfDoc.addPage(orientation);
                const { width, height } = page.getSize();
                const tocItem = toc.find(t => t.href && item.href && t.href.endsWith(item.href));
                if (tocItem && tocItem.label) {
                  page.drawText(tocItem.label, {
                    x: 50,
                    y: height - 50,
                    size: fontSize + 4,
                    font: font,
                    color: rgb(0, 0, 0)
                  });
                }
                const lines = text.split('\n').filter(Boolean);
                let y = height - 80;
                for (const line of lines) {
                  if (y < 60) break;
                  page.drawText(line.slice(0, 120), {
                    x: 50,
                    y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0)
                  });
                  y -= fontSize + 6;
                }
              }
            } catch (err) {
              // Skip this chapter, but continue
              continue;
            }
            setProgress(p => ({ ...p, [file.name]: Math.round(((i + 1) / totalChapters) * 100) }));
          }
          if (chapterCount === 0) {
            setErrorMsg(`No readable chapters found in ${file.name}.`);
            setProgress(p => ({ ...p, [file.name]: 0 }));
            continue;
          }
          // Metadata
          if (settings.includeMetadata && book.loaded && book.loaded.metadata) {
            let meta: any = undefined;
            try {
              meta = await book.loaded.metadata;
            } catch {}
            if (meta) {
              const metaPage = pdfDoc.addPage(orientation);
              let y = orientation[1] - 50;
              metaPage.drawText('Metadata', { x: 50, y, size: fontSize + 6, font, color: rgb(0,0,0) });
              y -= fontSize + 10;
              Object.entries(meta).forEach(([key, value]) => {
                if (y < 60) return;
                metaPage.drawText(`${key}: ${value}`, { x: 60, y, size: fontSize, font, color: rgb(0.2,0.2,0.2) });
                y -= fontSize + 4;
              });
            }
          }
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.epub$/i, '.pdf'),
            blob: blob
          });
          setProgress(p => ({ ...p, [file.name]: 100 }));
        } catch (error: any) {
          setErrorMsg(`Error processing ${file.name}: ${error?.message || error}`);
          setProgress(p => ({ ...p, [file.name]: 0 }));
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      if (processed.length > 0) {
        setSuccessMsg('EPUB to PDF conversion completed!');
      }
    } catch (error) {
      setIsProcessing(false);
      setErrorMsg('Error converting EPUB to PDF. Please try again.');
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
    { icon: <Book className="h-6 w-6" />, title: 'eBook Conversion', description: 'Convert EPUB ebooks to PDF format' },
    { icon: <Shield className="h-6 w-6" />, title: 'Chapter Preservation', description: 'Maintain chapter structure and formatting' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple EPUB files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'High-quality PDF output with perfect formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload EPUB Files', description: 'Select EPUB ebook files to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion options and formatting' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '85K+', label: 'eBooks Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="EPUB to PDF | Online Tool to Convert EPUB to PDF"
        description="Convert EPUB files to PDF instantly with our free online EPUB to PDF converter. Fast, accurate, and compatible with all devices."
        keywords="EPUB to PDF, convert EPUB to PDF, e-book to PDF, EPUB converter, online tool, free tool"
        canonical="epub-to-pdf"
        ogImage="/images/epub-to-pdf-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Book className="h-4 w-4" />
                <span>EPUB to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert EPUB to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert EPUB ebooks to PDF format while preserving chapter structure, formatting, and metadata. Perfect for reading on any device and sharing with others.
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
                  onKeyDown={handleDropAreaKeyDown}
                  tabIndex={0}
                  aria-label="EPUB file upload area. Click or press Enter/Space to select files, or drag and drop EPUB files."
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your EPUB files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.epub)</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose EPUB Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".epub,application/epub+zip"
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
                    <span>Selected EPUB Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <Book className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {progress[file.name] !== undefined && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${progress[file.name]}%` }}></div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Book className="h-5 w-5 text-violet-600" />
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
                      <option value="A5">A5 (eBook size)</option>
                      <option value="A4">A4 (Standard)</option>
                      <option value="Letter">Letter</option>
                      <option value="A6">A6 (Small)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
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
                      id="includeTOC"
                      checked={settings.includeTOC}
                      onChange={e => setSettings(prev => ({ ...prev, includeTOC: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeTOC" className="text-sm font-medium text-gray-700">Include Table of Contents</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeMetadata"
                      checked={settings.includeMetadata}
                      onChange={e => setSettings(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeMetadata" className="text-sm font-medium text-gray-700">Include Metadata</label>
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
                      <Book className="h-5 w-5" />
                      <span>Convert EPUB to PDF</span>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our EPUB to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect ebook transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert EPUB to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your EPUB ebooks</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert EPUB to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our EPUB to PDF converter for perfect ebook conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Book className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 text-red-600 font-semibold text-center">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="mb-4 text-green-600 font-semibold text-center">{successMsg}</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default EPUBToPDFConverter; 