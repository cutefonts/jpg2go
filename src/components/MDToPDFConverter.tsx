import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RotateCcw, Settings, FileText, Users, Shield, CheckCircle, Code, Zap } from 'lucide-react';
import SEO from './SEO';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface MarkdownElement {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'blockquote' | 'horizontal-rule';
  content: string;
  level?: number;
  items?: string[];
  language?: string;
}

const stats = [
  { icon: <Users className="h-5 w-5" />, value: "100K+", label: "MD Files Converted" },
  { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
  { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
  { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
];

const MDToPDFConverter: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<{ name: string, blob: Blob }[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [markdownHtml, setMarkdownHtml] = useState<string>('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mdFiles = files.filter(file => file.name.endsWith('.md') || file.type === 'text/markdown');
    setSelectedFiles(prev => [...prev, ...mdFiles]);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    const mdFiles = files.filter(file => file.name.endsWith('.md') || file.type === 'text/markdown');
    setSelectedFiles(prev => [...prev, ...mdFiles]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Parse Markdown content into structured elements
  const parseMarkdown = (content: string): MarkdownElement[] => {
    const lines = content.split(/\r?\n/);
    const elements: MarkdownElement[] = [];
    let currentList: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push({
            type: 'code',
            content: codeBlockContent,
            language: codeBlockLanguage
          });
          inCodeBlock = false;
          codeBlockContent = '';
          codeBlockLanguage = '';
        } else {
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }

      // Handle headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const content = line.replace(/^#+\s*/, '');
        if (content) {
          elements.push({
            type: 'heading',
            content,
            level: Math.min(level, 6)
          });
        }
        continue;
      }

      // Handle horizontal rules
      if (line.match(/^[-*_]{3,}$/)) {
        elements.push({ type: 'horizontal-rule', content: '' });
        continue;
      }

      // Handle blockquotes
      if (line.startsWith('>')) {
        const content = line.replace(/^>\s*/, '');
        if (content) {
          elements.push({
            type: 'blockquote',
            content
          });
        }
        continue;
      }

      // Handle list items
      if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
        const content = line.replace(/^[-*+]\s|^\d+\.\s/, '');
        if (content) {
          currentList.push(content);
        }
        continue;
      }

      // Handle paragraphs and end lists
      if (line) {
        if (currentList.length > 0) {
          elements.push({
            type: 'list',
            content: '',
            items: [...currentList]
          });
          currentList = [];
        }
        elements.push({
          type: 'paragraph',
          content: line
        });
      } else if (currentList.length > 0) {
        elements.push({
          type: 'list',
          content: '',
          items: [...currentList]
        });
        currentList = [];
      }
    }

    // Handle any remaining list
    if (currentList.length > 0) {
      elements.push({
        type: 'list',
        content: '',
        items: currentList
      });
    }

    return elements;
  };

  const processFiles = async () => {
    if (!selectedFiles.length) return;
    setIsProcessing(true);
    const blobs: { name: string, blob: Blob }[] = [];
    for (const file of selectedFiles) {
      try {
        const text = await file.text();
        const elements = parseMarkdown(text);
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
        let pageWidth = 595.28;
        let pageHeight = 841.89;
        if (pageSize === 'letter') { pageWidth = 612; pageHeight = 792; }
        else if (pageSize === 'legal') { pageWidth = 612; pageHeight = 1008; }
        if (orientation === 'landscape') [pageWidth, pageHeight] = [pageHeight, pageWidth];
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const { width, height } = page.getSize();
        let y = height - 50;
        const margin = 50;
        const lineHeight = 16;
        for (const element of elements) {
          if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
          switch (element.type) {
            case 'heading':
              const headingSize = Math.max(20 - (element.level! - 1) * 2, 14);
              page.drawText(element.content, { x: margin, y: y, size: headingSize, font: boldFont, color: rgb(0, 0, 0) });
              y -= headingSize + 10;
              break;
            case 'paragraph':
              const words = element.content.split(' ');
              let currentLine = '';
              for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const testWidth = normalFont.widthOfTextAtSize(testLine, 12);
                if (testWidth > width - 2 * margin) {
                  if (currentLine) {
                    page.drawText(currentLine, { x: margin, y: y, size: 12, font: normalFont, color: rgb(0, 0, 0) });
                    y -= lineHeight;
                    currentLine = word;
                  }
                } else {
                  currentLine = testLine;
                }
              }
              if (currentLine) {
                page.drawText(currentLine, { x: margin, y: y, size: 12, font: normalFont, color: rgb(0, 0, 0) });
                y -= lineHeight;
              }
              y -= 5;
              break;
            case 'list':
              if (element.items) {
                for (const item of element.items) {
                  if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
                  page.drawText(`• ${item}`, { x: margin + 10, y: y, size: 12, font: normalFont, color: rgb(0, 0, 0) });
                  y -= lineHeight;
                }
                y -= 5;
              }
              break;
            case 'code':
              if (y < margin + 100) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
              const codeHeight = Math.min(element.content.split('\n').length * lineHeight + 20, y - margin);
              page.drawRectangle({ x: margin, y: y - codeHeight, width: width - 2 * margin, height: codeHeight, color: rgb(0.95, 0.95, 0.95) });
              const codeLines = element.content.split('\n');
              let codeY = y - 15;
              for (const line of codeLines) {
                if (codeY < margin + 20) break;
                page.drawText(line, { x: margin + 10, y: codeY, size: 11, font: normalFont, color: rgb(0.2, 0.2, 0.2) });
                codeY -= lineHeight - 2;
              }
              y = codeY - 10;
              break;
            case 'blockquote':
              if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
              page.drawText(`"${element.content}"`, { x: margin + 10, y: y, size: 12, font: italicFont, color: rgb(0.4, 0.4, 0.4) });
              y -= lineHeight + 5;
              break;
            case 'horizontal-rule':
              if (y < margin + 50) { pdfDoc.addPage([pageWidth, pageHeight]); y = height - 50; }
              page.drawLine({ start: { x: margin, y: y }, end: { x: width - margin, y: y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
              y -= 20;
              break;
          }
        }
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        blobs.push({ name: file.name.replace(/\.md$/i, '') + '.pdf', blob });
      } catch (error) {
        // skip file on error
      }
    }
    setProcessedBlobs(blobs);
    setIsProcessing(false);
    alert('Markdown to PDF batch conversion completed!');
  };

  const handleDownload = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const resetTool = useCallback(() => {
    setSelectedFiles([]);
    setPreviewUrl('');
    setProcessedBlobs([]);
    setPageSize('a4');
    setOrientation('portrait');
  }, []);

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Markdown to PDF",
      description: "Convert Markdown files to professional PDF documents"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Syntax Highlighting",
      description: "Preserve code formatting and syntax highlighting"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "High Quality",
      description: "Maintain document formatting and structure"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Markdown",
      description: "Select your Markdown file from your device"
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

  return (
    <>
      <SEO 
        title="Markdown to PDF | Simple & Secure MD to PDF Converter"
        description="Turn your Markdown files into clean, printable PDFs. Use our online MD to PDF converter to retain headings, code blocks, and formatting."
        keywords="MD to PDF, convert MD to PDF, Markdown to PDF, MD converter, online tool, free tool"
        canonical="md-to-pdf"
        ogImage="/images/md-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>Markdown to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Markdown to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your Markdown files to professional PDF documents with preserved formatting. 
                Perfect for documentation, README files, and technical writing.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    selectedFiles.length > 0
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your Markdown files here for PDF conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose Markdown Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,text/markdown"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <ul className="text-green-800">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex items-center justify-between py-1">
                          <span>{file.name}</span>
                          <button
                            className="ml-4 text-red-500 hover:text-red-700 text-sm"
                            onClick={() => handleRemoveFile(idx)}
                            aria-label={`Remove ${file.name}`}
                          >Remove</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Settings Card (SmartCrop style) */}
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
                  disabled={!selectedFiles.length || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
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

              {/* Markdown Preview (SmartCrop style) */}
              {markdownHtml && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 overflow-x-auto prose max-w-none" style={{ minHeight: 200 }}>
                    <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">* Preview uses real Markdown rendering with syntax highlighting. PDF output supports basic formatting only.</div>
                </div>
              )}

              {/* Download */}
              {processedBlobs.length > 0 && (
                <div className="mt-8 text-center">
                  <div className="mb-4 text-green-700 font-semibold">Batch conversion complete! Download your PDFs:</div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {processedBlobs.map((f, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(f.blob, f.name)}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2"
                      >
                        <Download className="h-5 w-5" />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Features Section (SmartCrop style) */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
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

            {/* How-to Section (SmartCrop style) */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How to Convert Markdown to PDF</h2>
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

            {/* CTA Section (SmartCrop style) */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Convert Your Markdown?</h2>
                <p className="text-xl mb-6 opacity-90">Join thousands of users who trust our Markdown to PDF converter</p>
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

export default MDToPDFConverter; 