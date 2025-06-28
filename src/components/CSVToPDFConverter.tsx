import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, BarChart3, FileType, XCircle, Table, AlertCircle } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
  preview: string;
  size: number;
  status: 'success' | 'error';
  error?: string;
}

interface CSVData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalColumns: number;
}

const CSVToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ [key: string]: number }>({});
  const [settings, setSettings] = useState({
    delimiter: ',',
    pageSize: 'A4',
    orientation: 'portrait',
    includeHeaders: true,
    tableStyle: 'default',
    fontSize: '10pt',
    margins: '0.5in',
    autoDetectDelimiter: true,
    maxRowsPerPage: 50,
    headerStyle: 'bold'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Parser function
  const parseCSV = (text: string, delimiter: string): CSVData => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };
    }

    // Auto-detect delimiter if enabled
    let actualDelimiter = delimiter;
    if (settings.autoDetectDelimiter) {
      const firstLine = lines[0];
      const delimiters = [',', ';', '\t', '|'];
      let maxColumns = 0;
      
      for (const delim of delimiters) {
        const columns = firstLine.split(delim).length;
        if (columns > maxColumns) {
          maxColumns = columns;
          actualDelimiter = delim;
        }
      }
    }

    // Parse CSV with proper handling of quoted fields
    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === actualDelimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result.map(field => field.replace(/^"|"$/g, '')); // Remove outer quotes
    };

    const parsedRows = lines.map(parseRow);
    const headers = settings.includeHeaders ? parsedRows[0] : [];
    const dataRows = settings.includeHeaders ? parsedRows.slice(1) : parsedRows;

    return {
      headers,
      rows: dataRows,
      totalRows: dataRows.length,
      totalColumns: headers.length || (dataRows[0]?.length || 0)
    };
  };

  // Extract preview text
  const extractPreview = (data: CSVData, maxRows: number = 5): string => {
    const previewRows = data.rows.slice(0, maxRows);
    const allRows = data.headers.length > 0 ? [data.headers, ...previewRows] : previewRows;
    
    return allRows
      .map(row => row.join(' | '))
      .join('\n') + (data.totalRows > maxRows ? '\n...' : '');
  };

  // Get page size dimensions
  const getPageSize = () => {
    const sizes = {
      'A4': { width: 595.28, height: 841.89 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 },
      'A3': { width: 841.89, height: 1190.55 },
      'A5': { width: 420.94, height: 595.28 }
    };
    
    const size = sizes[settings.pageSize as keyof typeof sizes] || sizes.A4;
    
    if (settings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    
    return size;
  };

  // Get font size in points
  const getFontSize = () => {
    return parseInt(settings.fontSize.replace('pt', ''));
  };

  // Get margins in points
  const getMargins = () => {
    const marginMap = {
      '0.25in': 18,
      '0.5in': 36,
      '0.75in': 54,
      '1in': 72,
      '1.25in': 90,
      '1.5in': 108
    };
    return marginMap[settings.margins as keyof typeof marginMap] || 36;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const csvFiles = selectedFiles.filter(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv')
    );
    
    if (csvFiles.length !== selectedFiles.length) {
      setErrorMessage('Some files were skipped. Only CSV files are supported.');
    }
    
    setFiles(prev => [...prev, ...csvFiles]);
    setErrorMessage('');
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    const csvFiles = droppedFiles.filter(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv')
    );
    
    if (csvFiles.length !== droppedFiles.length) {
      setErrorMessage('Some files were skipped. Only CSV files are supported.');
    }
    
    setFiles(prev => [...prev, ...csvFiles]);
    setErrorMessage('');
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrorMessage('');
  };

  const clearAllFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setErrorMessage('');
    setProcessingProgress({});
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessedFiles([]);
    setErrorMessage('');
    setProcessingProgress({});
    
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const processed: ProcessedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        
        try {
          setProcessingProgress(prev => ({ ...prev, [fileName]: 0 }));
          
          // Read CSV content
          const csvText = await file.text();
          setProcessingProgress(prev => ({ ...prev, [fileName]: 20 }));
          
          // Parse CSV content
          const csvData = parseCSV(csvText, settings.delimiter);
          setProcessingProgress(prev => ({ ...prev, [fileName]: 40 }));
          
          if (csvData.totalRows === 0 && csvData.headers.length === 0) {
            throw new Error('No data found in CSV file');
          }
          
          // Create PDF
          const pdfDoc = await PDFDocument.create();
          setProcessingProgress(prev => ({ ...prev, [fileName]: 60 }));
          
          // Embed fonts
          let font, boldFont;
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          } catch {
            font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
          }
          
          // Get page dimensions and settings
          const { width, height } = getPageSize();
          const fontSize = getFontSize();
          const margins = getMargins();
          const maxRowsPerPage = settings.maxRowsPerPage;
          
          // Calculate table dimensions
          const tableArea = {
            x: margins,
            y: height - margins,
            width: width - (margins * 2),
            height: height - (margins * 2)
          };
          
          const rowHeight = fontSize * 1.5;
          const columnWidth = tableArea.width / csvData.totalColumns;
          
          // Process data in chunks for pagination
          const allRows = settings.includeHeaders ? [csvData.headers, ...csvData.rows] : csvData.rows;
          const totalPages = Math.ceil(allRows.length / maxRowsPerPage);
          
          for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const page = pageNum === 0 ? pdfDoc.addPage([width, height]) : pdfDoc.addPage([width, height]);
            setProcessingProgress(prev => ({ ...prev, [fileName]: 60 + (pageNum * 20 / totalPages) }));
            
            const startRow = pageNum * maxRowsPerPage;
            const endRow = Math.min(startRow + maxRowsPerPage, allRows.length);
            const pageRows = allRows.slice(startRow, endRow);
            
            // Draw table
            let currentY = tableArea.y;
            
            for (let rowIndex = 0; rowIndex < pageRows.length; rowIndex++) {
              const row = pageRows[rowIndex];
              const isHeader = settings.includeHeaders && rowIndex === 0 && pageNum === 0;
              const currentFont = isHeader && settings.headerStyle === 'bold' ? boldFont : font;
              const currentFontSize = isHeader ? fontSize + 1 : fontSize;
              
              // Draw row background for striped style
              if (settings.tableStyle === 'striped' && rowIndex % 2 === 1) {
                page.drawRectangle({
                  x: tableArea.x,
                  y: currentY - rowHeight,
                  width: tableArea.width,
                  height: rowHeight,
                  color: rgb(0.95, 0.95, 0.95)
                });
              }
              
              // Draw cell borders for bordered style
              if (settings.tableStyle === 'bordered') {
                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                  const cellX = tableArea.x + (colIndex * columnWidth);
                  page.drawRectangle({
                    x: cellX,
                    y: currentY - rowHeight,
                    width: columnWidth,
                    height: rowHeight,
                    borderColor: rgb(0.8, 0.8, 0.8),
                    borderWidth: 0.5
                  });
                }
              }
              
              // Draw cell content
              for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const cellValue = row[colIndex] || '';
                const cellX = tableArea.x + (colIndex * columnWidth) + 5;
                const cellY = currentY - (rowHeight / 2) + (currentFontSize / 3);
                
                page.drawText(cellValue, {
                  x: cellX,
                  y: cellY,
                  size: currentFontSize,
                  font: currentFont,
                  color: rgb(0, 0, 0),
                  maxWidth: columnWidth - 10
                });
              }
              
              currentY -= rowHeight;
            }
          }
          
          // Save PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 100 }));
          
          processed.push({
            name: file.name.replace(/\.csv$/i, '.pdf'),
            blob,
            preview: extractPreview(csvData),
            size: blob.size,
            status: 'success'
          });
          
        } catch (error: any) {
          processed.push({
            name: file.name.replace(/\.csv$/i, '.pdf'),
            blob: new Blob(),
            preview: '',
            size: 0,
            status: 'error',
            error: error?.message || 'Unknown error'
          });
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      
      const successCount = processed.filter(p => p.status === 'success').length;
      if (successCount < processed.length) {
        setErrorMessage(`${successCount} of ${processed.length} files converted successfully. Some files had errors.`);
      }
      
    } catch (error: any) {
      console.error('Error converting CSV to PDF:', error);
      setErrorMessage(error?.message || 'Error converting CSV to PDF. Please try again.');
      setIsProcessing(false);
    }
  };

  const downloadFile = (file: ProcessedFile) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    processedFiles.forEach(file => {
      if (file.status === 'success') {
        downloadFile(file);
      }
    });
  };

  const features = [
    { icon: <Table className="h-6 w-6" />, title: 'Advanced Table Rendering', description: 'Convert CSV data to properly formatted PDF tables with borders and styling' },
    { icon: <Shield className="h-6 w-6" />, title: 'Smart Delimiter Detection', description: 'Auto-detect CSV delimiters or manually specify comma, tab, semicolon, pipe' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple CSV files simultaneously with progress tracking' },
    { icon: <Users className="h-6 w-6" />, title: 'Flexible Formatting', description: 'Customize table styles, headers, fonts, and page layout' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload CSV Files', description: 'Drag & drop or click to select CSV data files' },
    { step: '2', title: 'Configure Settings', description: 'Choose delimiter, table style, headers, and formatting options' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF tables with preview' }
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
        title="CSV to PDF | Convert CSV Files to PDF Online Free"
        description="Use our free online CSV to PDF converter to convert your CSV files into PDFs quickly and accurately. Compatible with all devices and browsers."
        keywords="CSV to PDF, convert CSV to PDF, data to PDF, table to PDF, online tool, free tool"
        canonical="csv-to-pdf"
        ogImage="/images/csv-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BarChart3 className="h-4 w-4" />
                <span>CSV to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert CSV to PDF
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> as Tables</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert CSV data files to PDF tables with custom delimiter, table style, and header options. Perfect for reports, analytics, and data sharing.
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
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                    isDragOver ? 'text-violet-500' : 'text-gray-400'
                  }`} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragOver ? 'Drop your CSV files here' : 'Drop your CSV files here'}
                  </h3>
                  <p className="text-gray-600 mb-6">or click anywhere to browse files from your computer (.csv)</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose CSV Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700 text-sm whitespace-pre-line">{errorMessage}</span>
                </div>
              )}

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <FileType className="h-5 w-5 text-violet-600" />
                      <span>Selected CSV Files ({files.length})</span>
                    </h3>
                    <button
                      onClick={clearAllFiles}
                      className="text-red-500 hover:text-red-700 transition-colors text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <BarChart3 className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {processingProgress[file.name] !== undefined && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${processingProgress[file.name]}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{processingProgress[file.name]}%</p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => removeFile(index)} 
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delimiter</label>
                    <select
                      value={settings.delimiter}
                      onChange={e => setSettings(prev => ({ ...prev, delimiter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="\t">Tab</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                    <select
                      value={settings.pageSize}
                      onChange={e => setSettings(prev => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="Letter">Letter (US)</option>
                      <option value="Legal">Legal</option>
                      <option value="A3">A3 (Large)</option>
                      <option value="A5">A5 (Small)</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="8pt">8pt (Small)</option>
                      <option value="9pt">9pt</option>
                      <option value="10pt">10pt (Standard)</option>
                      <option value="11pt">11pt</option>
                      <option value="12pt">12pt (Large)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margins</label>
                    <select
                      value={settings.margins}
                      onChange={e => setSettings(prev => ({ ...prev, margins: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="0.25in">0.25 inch (Narrow)</option>
                      <option value="0.5in">0.5 inch (Standard)</option>
                      <option value="0.75in">0.75 inch</option>
                      <option value="1in">1 inch (Wide)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Table Style</label>
                    <select
                      value={settings.tableStyle}
                      onChange={e => setSettings(prev => ({ ...prev, tableStyle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="default">Default (Clean)</option>
                      <option value="striped">Striped (Alternating rows)</option>
                      <option value="bordered">Bordered (Grid lines)</option>
                    </select>
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoDetectDelimiter"
                      checked={settings.autoDetectDelimiter}
                      onChange={e => setSettings(prev => ({ ...prev, autoDetectDelimiter: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoDetectDelimiter" className="text-sm font-medium text-gray-700">Auto-detect Delimiter</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Rows Per Page</label>
                    <select
                      value={settings.maxRowsPerPage}
                      onChange={e => setSettings(prev => ({ ...prev, maxRowsPerPage: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows (Recommended)</option>
                      <option value={75}>75 rows</option>
                      <option value={100}>100 rows</option>
                    </select>
                  </div>
                </div>
                
                {/* Settings Preview */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Current Settings Preview</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Delimiter:</span>
                      <span className="text-blue-600 ml-1">
                        {settings.autoDetectDelimiter ? 'Auto-detect' : settings.delimiter}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Page:</span>
                      <span className="text-blue-600 ml-1">{settings.pageSize} ({settings.orientation})</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Font:</span>
                      <span className="text-blue-600 ml-1">{settings.fontSize}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Style:</span>
                      <span className="text-blue-600 ml-1">{settings.tableStyle}</span>
                    </div>
                    <div className="md:col-span-4">
                      <span className="text-blue-700 font-medium">Features:</span>
                      <span className="text-blue-600 ml-1">
                        {settings.includeHeaders ? 'Headers included' : 'No headers'} • 
                        {settings.maxRowsPerPage} rows per page • 
                        {settings.margins} margins
                      </span>
                    </div>
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
                      <BarChart3 className="h-5 w-5" />
                      <span>Convert CSV to PDF</span>
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
            </div>

            {/* Results Section */}
            {processedFiles.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Conversion Results</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {processedFiles.map((file, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        {file.status === 'success' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.status === 'success' 
                              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Conversion failed'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {file.status === 'success' && file.preview && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                          <p className="text-xs text-gray-600 bg-white p-3 rounded border font-mono">
                            {file.preview}
                          </p>
                        </div>
                      )}
                      
                      {file.status === 'error' && file.error && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-red-700 mb-2">Error:</p>
                          <p className="text-xs text-red-600 bg-red-50 p-3 rounded border">
                            {file.error}
                          </p>
                        </div>
                      )}
                      
                      {file.status === 'success' && (
                        <button
                          onClick={() => downloadFile(file)}
                          className="w-full bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                        >
                          Download PDF
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our CSV to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect table transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert CSV to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your CSV files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert CSV to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our CSV to PDF converter for perfect table conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <BarChart3 className="h-5 w-5" />
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

export default CSVToPDFConverter; 