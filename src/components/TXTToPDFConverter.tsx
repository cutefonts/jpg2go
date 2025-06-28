import React, { useRef, useState, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Settings, Eye, FileType, XCircle, Loader2 } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
  size: number;
  status: 'success' | 'error' | 'processing';
  error?: string;
  preview?: string;
}

interface ConversionSettings {
  font: string;
  fontSize: number;
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  encoding: string;
  lineNumbers: boolean;
  lineSpacing: number;
  margins: number;
  headerFooter: boolean;
  pageNumbers: boolean;
  compressOutput: boolean;
  wordWrap: boolean;
}

const pageSizes = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
  A3: [841.89, 1190.55],
  A5: [420.94, 595.28],
};

const fonts = {
  'Arial': 'Helvetica',
  'Times New Roman': 'Times-Roman',
  'Courier New': 'Courier',
  'Verdana': 'Helvetica',
  'Georgia': 'Times-Roman',
  'Tahoma': 'Helvetica',
  'Comic Sans MS': 'Helvetica',
  'Impact': 'Helvetica',
  'Trebuchet MS': 'Helvetica',
  'Lucida Console': 'Courier'
};

const TXTToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processingProgress, setProcessingProgress] = useState<Record<string, number>>({});
  const [dragActive, setDragActive] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ConversionSettings>({
    font: 'Arial',
    fontSize: 12,
    pageSize: 'A4',
    orientation: 'portrait',
    encoding: 'UTF-8',
    lineNumbers: false,
    lineSpacing: 1.2,
    margins: 50,
    headerFooter: false,
    pageNumbers: true,
    compressOutput: true,
    wordWrap: true
  });

  // Get page size dimensions
  const getPageSize = () => {
    const [width, height] = pageSizes[settings.pageSize as keyof typeof pageSizes] || pageSizes.A4;
    return settings.orientation === 'landscape' ? [height, width] : [width, height];
  };

  // Function to wrap text to fit within available width
  const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
    if (!settings.wordWrap) {
      return [text];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, break it
          lines.push(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Function to detect text encoding
  const detectEncoding = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check for BOM (Byte Order Mark)
      if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return 'UTF-8';
      }
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return 'UTF-16LE';
      }
      if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return 'UTF-16BE';
      }
      
      // Default to UTF-8
      return 'UTF-8';
    } catch {
      return 'UTF-8';
    }
  };

  // Function to read text with proper encoding
  const readTextFile = async (file: File): Promise<string> => {
    try {
      const encoding = await detectEncoding(file);
      const text = await file.text();
      
      // Handle different encodings
      if (encoding === 'UTF-8') {
        return text;
      } else {
        // For other encodings, try to decode properly
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder(encoding);
        return decoder.decode(buffer);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error('Failed to read text file. Please check if the file is corrupted or uses an unsupported encoding.');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const txtFiles = selectedFiles.filter(file => 
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    );
    
    if (txtFiles.length !== selectedFiles.length) {
      alert('Some files were skipped. Only .txt files are supported.');
    }
    
    setFiles(prev => [...prev, ...txtFiles]);
    
    // Update preview with first file
    if (txtFiles.length > 0 && !previewText) {
      updatePreview(txtFiles[0]);
    }
  };

  const updatePreview = async (file: File) => {
    try {
      const text = await readTextFile(file);
      setPreviewText(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    } catch {
      setPreviewText('Error reading file preview');
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    const txtFiles = droppedFiles.filter(file => 
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    );
    
    if (txtFiles.length !== droppedFiles.length) {
      alert('Some files were skipped. Only .txt files are supported.');
    }
    
    setFiles(prev => [...prev, ...txtFiles]);
    
    // Update preview with first file
    if (txtFiles.length > 0 && !previewText) {
      updatePreview(txtFiles[0]);
    }
  }, [previewText, updatePreview]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setPreviewText('');
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessedFiles([]);
    setProcessingProgress({});
    
    const processed: ProcessedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      
      try {
        setProcessingProgress(prev => ({ ...prev, [fileName]: 10 }));
        
        // Read the text content with proper encoding
        const text = await readTextFile(file);
        setProcessingProgress(prev => ({ ...prev, [fileName]: 30 }));
        
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        setProcessingProgress(prev => ({ ...prev, [fileName]: 50 }));
        
        // Create a new PDF
        const pdfDoc = await PDFDocument.create();
        
        // Get page dimensions
        const [pageWidth, pageHeight] = getPageSize();
        
        // Embed font
        const fontName = fonts[settings.font as keyof typeof fonts] || 'Helvetica';
        let font;
        try {
          font = await pdfDoc.embedFont(StandardFonts[fontName as keyof typeof StandardFonts] || StandardFonts.Helvetica);
        } catch {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
        
        setProcessingProgress(prev => ({ ...prev, [fileName]: 70 }));
        
        // Split text into lines and handle word wrapping
        const lines = text.split(/\r?\n/);
        const fontSize = settings.fontSize;
        const lineHeight = fontSize * settings.lineSpacing;
        const margin = settings.margins;
        const availableWidth = pageWidth - (margin * 2);
        
        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        let pageNumber = 1;
        let lineIndex = 0;
        
        // Add header if enabled
        if (settings.headerFooter) {
          const headerText = `Document: ${file.name}`;
          currentPage.drawText(headerText, {
            x: margin,
            y: pageHeight - 30,
            size: fontSize - 2,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
          });
          y -= 40;
        }
        
        for (let originalLineIndex = 0; originalLineIndex < lines.length; originalLineIndex++) {
          const line = lines[originalLineIndex];
          
          // Wrap text if enabled
          const wrappedLines = wrapText(line, font, fontSize, availableWidth - (settings.lineNumbers ? 50 : 0));
          
          for (const wrappedLine of wrappedLines) {
            // Check if we need a new page
            if (y < margin + lineHeight) {
              // Add page number if enabled
              if (settings.pageNumbers) {
                const pageNumText = `Page ${pageNumber}`;
                const pageNumWidth = font.widthOfTextAtSize(pageNumText, fontSize - 2);
                currentPage.drawText(pageNumText, {
                  x: pageWidth - margin - pageNumWidth,
                  y: margin - 20,
                  size: fontSize - 2,
                  font: font,
                  color: rgb(0.5, 0.5, 0.5)
                });
              }
              
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
              pageNumber++;
              
              // Add header to new page if enabled
              if (settings.headerFooter) {
                const headerText = `Document: ${file.name}`;
                currentPage.drawText(headerText, {
                  x: margin,
                  y: pageHeight - 30,
                  size: fontSize - 2,
                  font: font,
                  color: rgb(0.5, 0.5, 0.5)
                });
                y -= 40;
              }
            }
            
            // Add line number if enabled
            const displayText = wrappedLine;
            let xOffset = 0;
            
            if (settings.lineNumbers) {
              const lineNum = (lineIndex + 1).toString();
              const lineNumWidth = font.widthOfTextAtSize(lineNum, fontSize - 2);
              currentPage.drawText(lineNum, {
                x: margin,
                y: y,
                size: fontSize - 2,
                font: font,
                color: rgb(0.7, 0.7, 0.7)
              });
              xOffset = lineNumWidth + 10;
            }
            
            // Draw the line text
            currentPage.drawText(displayText, {
              x: margin + xOffset,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0)
            });
            
            y -= lineHeight;
            lineIndex++;
          }
        }
        
        // Add page number to last page if enabled
        if (settings.pageNumbers) {
          const pageNumText = `Page ${pageNumber}`;
          const pageNumWidth = font.widthOfTextAtSize(pageNumText, fontSize - 2);
          currentPage.drawText(pageNumText, {
            x: pageWidth - margin - pageNumWidth,
            y: margin - 20,
            size: fontSize - 2,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
        
        setProcessingProgress(prev => ({ ...prev, [fileName]: 90 }));
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save({ useObjectStreams: settings.compressOutput });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        processed.push({
          name: file.name.replace(/\.txt$/i, '.pdf'),
          blob: blob,
          size: blob.size,
          status: 'success',
          preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
        });
        
        setProcessingProgress(prev => ({ ...prev, [fileName]: 100 }));
        
      } catch (error: any) {
        console.error(`Error processing ${fileName}:`, error);
        processed.push({
          name: file.name.replace(/\.txt$/i, '.pdf'),
          blob: new Blob(),
          size: 0,
          status: 'error',
          error: error?.message || 'Unknown error occurred'
        });
      }
    }
    
    setProcessedFiles(processed);
    setIsProcessing(false);
    setProcessingProgress({});
  };

  const downloadAll = () => {
    processedFiles.forEach((file) => {
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

  const downloadSingle = (file: ProcessedFile) => {
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
  };

  const features = [
    { icon: <FileText className="h-6 w-6" />, title: 'Text Conversion', description: 'Convert plain text files to PDF' },
    { icon: <Shield className="h-6 w-6" />, title: 'Font & Layout', description: 'Choose font, size, and layout' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple TXT files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Encoding Support', description: 'Supports UTF-8 and other encodings' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload TXT Files', description: 'Select plain text files to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose font, size, and layout' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '200K+', label: 'Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="TXT to PDF | Convert Text Documents to PDF Format"
        description="Convert your TXT files to PDF effortlessly. Our online TXT to PDF tool maintains formatting and creates easy-to-share PDF documents."
        keywords="TXT to PDF, convert TXT to PDF, text to PDF, online tool, free tool"
        canonical="txt-to-pdf"
        ogImage="/images/txt-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>TXT to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert TXT to PDF
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> with Custom Fonts</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert plain text files to PDF format with custom fonts, page size, and encoding. Perfect for reports, logs, and documentation.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    dragActive 
                      ? 'border-violet-500 bg-violet-50/50 scale-105' 
                      : files.length > 0 
                        ? 'border-violet-500 bg-violet-50/50' 
                        : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${dragActive ? 'text-violet-600' : 'text-gray-400'}`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {dragActive ? 'Drop your TXT files here' : 'Drop your TXT files here'}
                  </h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.txt)</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose TXT Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,text/plain"
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
                    <span>Selected TXT Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button 
                          onClick={() => removeFile(index)} 
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
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
                      <p>No files selected. Upload TXT files to see preview.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Text Preview:</h4>
                        <div className="bg-white rounded-lg p-3 border max-h-32 overflow-y-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                            {previewText || 'No preview available'}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Settings Summary:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Font:</span> {settings.font}
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Size:</span> {settings.fontSize}pt
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Page:</span> {settings.pageSize}
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Orientation:</span> {settings.orientation}
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Line Spacing:</span> {settings.lineSpacing}x
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Margins:</span> {settings.margins}pt
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Word Wrap:</span> {settings.wordWrap ? 'On' : 'Off'}
                          </div>
                          <div className="bg-white rounded-lg p-2 border">
                            <span className="text-gray-600">Line Numbers:</span> {settings.lineNumbers ? 'On' : 'Off'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font</label>
                    <select
                      value={settings.font}
                      onChange={e => setSettings(prev => ({ ...prev, font: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {Object.keys(fonts).map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={10}>10pt</option>
                      <option value={11}>11pt</option>
                      <option value={12}>12pt</option>
                      <option value={14}>14pt</option>
                      <option value={16}>16pt</option>
                      <option value={18}>18pt</option>
                      <option value={20}>20pt</option>
                    </select>
                  </div>
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
                      onChange={e => setSettings(prev => ({ ...prev, orientation: e.target.value as 'portrait' | 'landscape' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Line Spacing</label>
                    <select
                      value={settings.lineSpacing}
                      onChange={e => setSettings(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={1.0}>Single</option>
                      <option value={1.2}>1.2x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2.0}>Double</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margins</label>
                    <select
                      value={settings.margins}
                      onChange={e => setSettings(prev => ({ ...prev, margins: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={30}>Narrow (30pt)</option>
                      <option value={50}>Normal (50pt)</option>
                      <option value={70}>Wide (70pt)</option>
                      <option value={100}>Extra Wide (100pt)</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="lineNumbers"
                      checked={settings.lineNumbers}
                      onChange={e => setSettings(prev => ({ ...prev, lineNumbers: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="lineNumbers" className="text-sm font-medium text-gray-700">Show Line Numbers</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="headerFooter"
                      checked={settings.headerFooter}
                      onChange={e => setSettings(prev => ({ ...prev, headerFooter: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="headerFooter" className="text-sm font-medium text-gray-700">Add Header</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pageNumbers"
                      checked={settings.pageNumbers}
                      onChange={e => setSettings(prev => ({ ...prev, pageNumbers: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pageNumbers" className="text-sm font-medium text-gray-700">Page Numbers</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="compressOutput"
                      checked={settings.compressOutput}
                      onChange={e => setSettings(prev => ({ ...prev, compressOutput: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="compressOutput" className="text-sm font-medium text-gray-700">Compress Output</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="wordWrap"
                      checked={settings.wordWrap}
                      onChange={e => setSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="wordWrap" className="text-sm font-medium text-gray-700">Word Wrap</label>
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
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert TXT to PDF</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download All PDFs</span>
                  </button>
                )}
              </div>

              {/* Processing Progress */}
              {isProcessing && Object.keys(processingProgress).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Progress</h3>
                  <div className="space-y-3">
                    {Object.entries(processingProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{fileName}</span>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {processedFiles.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Results</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedFiles.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {file.status === 'success' ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {file.status === 'success' ? `${(file.size / 1024).toFixed(2)} KB` : 'Failed'}
                            </p>
                          </div>
                        </div>
                        {file.status === 'error' && file.error && (
                          <p className="text-xs text-red-600 mb-3">{file.error}</p>
                        )}
                        {file.status === 'success' && (
                          <button
                            onClick={() => downloadSingle(file)}
                            className="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our TXT to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect text transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert TXT to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your TXT files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert TXT to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our TXT to PDF converter for perfect text conversion</p>
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
    </>
  );
};

export default TXTToPDFConverter; 