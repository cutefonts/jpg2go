import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, FileType, Users, Zap, Shield, Settings, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
  originalFile: File;
  size: number;
  status: 'success' | 'error';
  error?: string;
}

interface ConversionSettings {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'auto';
  orientation: 'portrait' | 'landscape';
  fontSize: 'small' | 'medium' | 'large';
  includeAttributes: boolean;
  includeComments: boolean;
  colorizeTags: boolean;
  maxFileSize: number; // in MB
}

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '60K+', label: 'XMLs Converted' },
  { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const features = [
  { icon: <FileType className="h-6 w-6" />, title: 'Preserve Structure', description: 'Keep XML structure and attributes' },
  { icon: <FileType className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple XMLs at once' },
  { icon: <FileType className="h-6 w-6" />, title: 'Custom XSLT', description: 'Support for custom formatting' },
  { icon: <FileType className="h-6 w-6" />, title: 'All Platforms', description: 'Works on any device' },
];

const howToSteps = [
  { step: 1, title: 'Upload XMLs', description: 'Select or drag and drop your XML files.' },
  { step: 2, title: 'Set Preferences', description: 'Choose conversion settings.' },
  { step: 3, title: 'Download PDF', description: 'Get your converted PDF files.' },
];

const XMLToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [previewContent, setPreviewContent] = useState<string>('');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(-1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<ConversionSettings>({
    pageSize: 'A4',
    orientation: 'portrait',
    fontSize: 'medium',
    includeAttributes: true,
    includeComments: true,
    colorizeTags: true,
    maxFileSize: 10
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any object URLs if needed
    };
  }, []);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    const validTypes = ['text/xml', 'application/xml'];
    const validExtensions = ['.xml'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      return { 
        isValid: false, 
        error: 'Invalid file type. Please upload XML files only.' 
      };
    }
    
    // Check file size
    if (file.size > settings.maxFileSize * 1024 * 1024) {
      return { 
        isValid: false, 
        error: `File size too large. Maximum size is ${settings.maxFileSize}MB.` 
      };
    }
    
    return { isValid: true };
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  }, [settings.maxFileSize]);

  const addFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setProcessedFiles([]);
      
      // Set preview for first file
      if (validFiles.length > 0 && files.length === 0) {
        setSelectedFileIndex(0);
        loadPreview(validFiles[0]);
      }
    }
  };

  const loadPreview = async (file: File) => {
    try {
      const text = await file.text();
      // Truncate for preview if too long
      const preview = text.length > 1000 ? text.substring(0, 1000) + '...' : text;
      setPreviewContent(preview);
    } catch (error) {
      setPreviewContent('Error loading preview');
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  }, [settings.maxFileSize]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!dropZoneRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Update preview
    if (selectedFileIndex === index) {
      if (files.length > 1) {
        const newIndex = index === 0 ? 0 : index - 1;
        setSelectedFileIndex(newIndex);
        loadPreview(files[newIndex]);
      } else {
        setSelectedFileIndex(-1);
        setPreviewContent('');
      }
    } else if (selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  };

  const getPageSize = (): [number, number] => {
    const pageSizes = {
      A4: settings.orientation === 'portrait' ? [595.28, 841.89] : [841.89, 595.28],
      Letter: settings.orientation === 'portrait' ? [612, 792] : [792, 612],
      Legal: settings.orientation === 'portrait' ? [612, 1008] : [1008, 612],
    };
    
    return pageSizes[settings.pageSize] as [number, number];
  };

  const getFontSize = (): number => {
    const sizes = {
      small: 8,
      medium: 10,
      large: 12
    };
    return sizes[settings.fontSize];
  };

  const parseXML = (xmlString: string): Document => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }
    
    return doc;
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    
    // Debug: Log current settings
    console.log('XML to PDF Conversion Settings:', {
      pageSize: settings.pageSize,
      orientation: settings.orientation,
      fontSize: settings.fontSize,
      includeAttributes: settings.includeAttributes,
      includeComments: settings.includeComments,
      colorizeTags: settings.colorizeTags,
      maxFileSize: settings.maxFileSize,
      filesCount: files.length
    });
    
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const processed: ProcessedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingProgress({ current: i + 1, total: files.length });
        
        try {
          // Read and parse XML
          const xmlText = await file.text();
          const xmlDoc = parseXML(xmlText);
          
          // Create PDF document
          const pdfDoc = await PDFDocument.create();
          const [pageWidth, pageHeight] = getPageSize();
          const fontSize = getFontSize();
          
          // Debug: Log page size and font size being used
          console.log(`Processing ${file.name}:`, {
            pageSize: settings.pageSize,
            orientation: settings.orientation,
            pageDimensions: `${pageWidth.toFixed(2)} x ${pageHeight.toFixed(2)}`,
            fontSize: settings.fontSize,
            actualFontSize: fontSize,
            includeAttributes: settings.includeAttributes,
            includeComments: settings.includeComments,
            colorizeTags: settings.colorizeTags
          });
          
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Embed fonts
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
          
          const lineHeight = fontSize + 2;
          let y = pageHeight - 50;
          
          // Add title
          page.drawText('XML to PDF Conversion', {
            x: 50,
            y: y,
            size: 18,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 25;
          
          // Add file information
          page.drawText(`File: ${file.name}`, {
            x: 50,
            y: y,
            size: fontSize,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= lineHeight;
          
          page.drawText(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, {
            x: 50,
            y: y,
            size: fontSize,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= lineHeight * 2;
          
          // Function to recursively process XML nodes
          const processNode = (node: Element, level: number = 0): number => {
            if (y < 50) {
              // Add new page if needed
              const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - 50;
            }
            
            const indent = level * 20;
            const currentFontSize = Math.max(6, fontSize - level);
            
            // Draw opening tag with colorize setting
            const tagColor = settings.colorizeTags ? rgb(0.2, 0.2, 0.8) : rgb(0.2, 0.2, 0.2);
            page.drawText(`<${node.tagName}`, {
              x: 50 + indent,
              y: y,
              size: currentFontSize,
              font: boldFont,
              color: tagColor,
            });
            
            // Process attributes if enabled
            if (settings.includeAttributes && node.attributes.length > 0) {
              for (let j = 0; j < node.attributes.length; j++) {
                const attr = node.attributes[j];
                const attrText = ` ${attr.name}="${attr.value}"`;
                const attrWidth = font.widthOfTextAtSize(attrText, currentFontSize);
                
                if (50 + indent + attrWidth > pageWidth - 50) {
                  y -= lineHeight;
                  if (y < 50) {
                    const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
                    y = pageHeight - 50;
                  }
                }
                
                page.drawText(attrText, {
                  x: 50 + indent + font.widthOfTextAtSize(`<${node.tagName}`, currentFontSize),
                  y: y,
                  size: currentFontSize,
                  font: font,
                  color: rgb(0.6, 0.3, 0.1),
                });
              }
            }
            
            page.drawText('>', {
              x: 50 + indent + font.widthOfTextAtSize(`<${node.tagName}`, currentFontSize) + 
                  (settings.includeAttributes ? font.widthOfTextAtSize(
                    Array.from(node.attributes).map(attr => ` ${attr.name}="${attr.value}"`).join(''), 
                    currentFontSize
                  ) : 0),
              y: y,
              size: currentFontSize,
              font: boldFont,
              color: tagColor,
            });
            
            y -= lineHeight;
            
            // Process child nodes
            for (let j = 0; j < node.childNodes.length; j++) {
              const child = node.childNodes[j];
              
              if (child.nodeType === Node.ELEMENT_NODE) {
                y = processNode(child as Element, level + 1);
              } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                if (y < 50) {
                  const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
                  y = pageHeight - 50;
                }
                
                const text = child.textContent.trim();
                const maxWidth = pageWidth - 100 - indent;
                const words = text.split(' ');
                let line = '';
                let lineY = y;
                
                for (const word of words) {
                  const testLine = line + (line ? ' ' : '') + word;
                  const textWidth = font.widthOfTextAtSize(testLine, currentFontSize);
                  
                  if (textWidth > maxWidth && line) {
                    page.drawText(line, {
                      x: 50 + indent + 10,
                      y: lineY,
                      size: currentFontSize,
                      font: font,
                      color: rgb(0.2, 0.2, 0.2),
                    });
                    lineY -= lineHeight;
                    line = word;
                    
                    if (lineY < 50) {
                      const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
                      lineY = pageHeight - 50;
                    }
                  } else {
                    line = testLine;
                  }
                }
                
                if (line) {
                  page.drawText(line, {
                    x: 50 + indent + 10,
                    y: lineY,
                    size: currentFontSize,
                    font: font,
                    color: rgb(0.2, 0.2, 0.2),
                  });
                  y = lineY - lineHeight;
                }
              } else if (child.nodeType === Node.COMMENT_NODE && settings.includeComments) {
                if (y < 50) {
                  const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
                  y = pageHeight - 50;
                }
                
                const commentText = `<!-- ${child.textContent} -->`;
                page.drawText(commentText, {
                  x: 50 + indent + 10,
                  y: y,
                  size: currentFontSize,
                  font: italicFont,
                  color: rgb(0.5, 0.5, 0.5),
                });
                y -= lineHeight;
              }
            }
            
            // Draw closing tag with colorize setting
            if (y < 50) {
              const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - 50;
            }
            
            page.drawText(`</${node.tagName}>`, {
              x: 50 + indent,
              y: y,
              size: currentFontSize,
              font: boldFont,
              color: tagColor,
            });
            
            return y - lineHeight;
          };
          
          // Process root element
          if (xmlDoc.documentElement) {
            processNode(xmlDoc.documentElement);
          }
          
          // Save PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.xml$/i, '.pdf'),
            blob,
            originalFile: file,
            size: blob.size,
            status: 'success'
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          processed.push({
            name: file.name.replace(/\.xml$/i, '.pdf'),
            blob: new Blob(),
            originalFile: file,
            size: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      
      const successCount = processed.filter(p => p.status === 'success').length;
      const errorCount = processed.filter(p => p.status === 'error').length;
      
      if (errorCount > 0) {
        alert(`Conversion completed with ${successCount} successful and ${errorCount} failed conversions.`);
      } else {
        alert(`Successfully converted ${successCount} files to PDF!`);
      }
      
    } catch (error) {
      console.error('Error converting XML to PDF:', error);
      setIsProcessing(false);
      alert('Error converting XML to PDF. Please try again.');
    }
  };

  const downloadAll = () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success');
    
    if (successfulFiles.length === 1) {
      downloadSingle(0);
      return;
    }
    
    // For multiple files, download them one by one
    successfulFiles.forEach((file, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, index * 100); // Small delay between downloads
    });
  };

  const downloadSingle = (index: number) => {
    const file = processedFiles[index];
    if (file && file.status === 'success') {
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

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setPreviewContent('');
    setSelectedFileIndex(-1);
    setProcessingProgress({ current: 0, total: 0 });
  };

  return (
    <>
      <SEO
        title="XML to PDF | Convert XML Files to PDF Online Free"
        description="Convert XML documents to PDF easily and accurately. Our online XML to PDF tool preserves data structure for professional presentation."
        keywords="XML to PDF, convert XML to PDF, XML to document, online converter, free tool"
        canonical="xml-to-pdf"
        ogImage="/images/xml-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>XML to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert XML to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert XML files to high-quality PDF format. Fast, secure, and free XML to PDF converter with advanced formatting options.
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
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    isDragOver
                      ? 'border-violet-500 bg-violet-50/50 scale-105'
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
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                    isDragOver ? 'text-violet-600' : 'text-gray-400'
                  }`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragOver ? 'Drop XML files here' : 'Drop your XML files here for PDF conversion'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports: XML files (Max {settings.maxFileSize}MB per file)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xml,text/xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer inline-block"
                  >
                    Choose XML Files
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileType className="h-5 w-5" />
                      Selected XML Files ({files.length})
                    </h3>
                    <div className="space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* XML Preview */}
              {previewContent && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    XML Preview
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {previewContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
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
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                    <select
                      value={settings.orientation}
                      onChange={e => setSettings(prev => ({ ...prev, orientation: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeAttributes"
                      checked={settings.includeAttributes}
                      onChange={e => setSettings(prev => ({ ...prev, includeAttributes: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeAttributes" className="text-sm font-medium text-gray-700">Include Attributes</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeComments"
                      checked={settings.includeComments}
                      onChange={e => setSettings(prev => ({ ...prev, includeComments: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeComments" className="text-sm font-medium text-gray-700">Include Comments</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="colorizeTags"
                      checked={settings.colorizeTags}
                      onChange={e => setSettings(prev => ({ ...prev, colorizeTags: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colorizeTags" className="text-sm font-medium text-gray-700">Colorize Tags</label>
                  </div>
                </div>
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-blue-900">
                      Processing {processingProgress.current} of {processingProgress.total} files...
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    ></div>
                  </div>
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
                  <X className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Results */}
              {processedFiles.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Conversion Results
                  </h3>
                  <div className="space-y-3 mb-4">
                    {processedFiles.map((file, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-4 rounded-lg ${
                        file.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex-shrink-0">
                          {file.status === 'success' ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          {file.status === 'success' ? (
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          ) : (
                            <p className="text-xs text-red-600">{file.error}</p>
                          )}
                        </div>
                        {file.status === 'success' && (
                          <button
                            onClick={() => downloadSingle(idx)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {processedFiles.filter(f => f.status === 'success').length > 1 && (
                    <button
                      onClick={downloadAll}
                      className="w-full bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download All PDFs</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our XML to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional XML to PDF conversion with customizable settings and high quality output</p>
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

            {/* How-To Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert XML to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your XML files to PDF</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert XML to PDF?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Transform your XML files into professional PDF documents. Join thousands of users who trust our converter for reliable XML to PDF conversion.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileType className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
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

export default XMLToPDFConverter; 