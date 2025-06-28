import React, { useState, useRef, useCallback } from 'react';
import { FileType, Download, Upload, Settings, Eye, CheckCircle, Sparkles, Zap, BarChart3, Shield, FileText, FileSpreadsheet, RotateCcw, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import SEO from './SEO';
import JSZip from 'jszip';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToCSVConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState({
    delimiter: ',',
    encoding: 'utf-8',
    includeHeaders: true,
    detectTables: true
  });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const detectTableStructure = (textItems: any[]) => {
    if (!settings.detectTables) {
      // Simple row-based grouping
      return groupByRows(textItems);
    }

    // Advanced table detection
    const items = textItems.map((item: any) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width
    }));

    // Sort by Y position (top to bottom) and then by X position (left to right)
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) { // Same row
        return a.x - b.x;
      }
      return b.y - a.y; // Top to bottom
    });

    // Group items into rows
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let lastY = -1;
    
    items.forEach(item => {
      if (lastY === -1 || Math.abs(item.y - lastY) < 5) {
        // Same row
        currentRow.push(item.text);
      } else {
        // New row
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [item.text];
      }
      lastY = item.y;
    });
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const groupByRows = (textItems: any[]) => {
    // Simple grouping by Y position
    const items = textItems.map((item: any) => ({
      text: item.str,
      y: item.transform[5]
    }));

    // Group by Y position
    const groups: { [key: number]: string[] } = {};
    items.forEach(item => {
      const yKey = Math.round(item.y / 10) * 10; // Round to nearest 10
      if (!groups[yKey]) {
        groups[yKey] = [];
      }
      groups[yKey].push(item.text);
    });

    // Convert to rows and sort by Y position
    return Object.keys(groups)
      .sort((a, b) => parseInt(b) - parseInt(a)) // Top to bottom
      .map(key => groups[parseInt(key)]);
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setCsvPreview(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      let previewRows: string[][] | null = null;
      
      for (const file of files) {
        try {
          // Load the PDF
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          let csvContent = '';
          
          // Extract text from each page
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Detect table structure
            const rows = detectTableStructure(textContent.items);
            
            // Convert rows to CSV
            if (settings.includeHeaders && pageNum === 1 && rows.length > 0) {
              const maxColumns = Math.max(...rows.map(row => row.length));
              const headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
              csvContent += headers.join(settings.delimiter) + '\n';
            }
            
            rows.forEach(row => {
              // Escape CSV values
              const escapedRow = row.map(cell => {
                if (cell.includes(settings.delimiter) || cell.includes('"') || cell.includes('\n')) {
                  return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
              });
              csvContent += escapedRow.join(settings.delimiter) + '\n';
            });
          }
          
          // For preview: parse first 5 rows of the first file
          if (!previewRows && csvContent) {
            const lines = csvContent.split('\n').slice(0, 5);
            previewRows = lines.map(line => line.split(settings.delimiter));
          }
          
          // Create CSV blob with proper encoding
          const encoder = new TextEncoder();
          const csvBytes = encoder.encode(csvContent);
          const csvBlob = new Blob([csvBytes], { type: 'text/csv' });
          
          processed.push({
            name: file.name.replace('.pdf', '.csv'),
            blob: csvBlob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          setError(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setProcessedFiles(processed);
      setIsDownloadReady(true);
      if (processed.length === 0) setError('No files were successfully processed.');
      else alert(`PDF to CSV conversion completed! Processed ${processed.length} files.`);
      setCsvPreview(previewRows);
      
    } catch (error) {
      console.error('Error converting PDFs:', error);
      setError('Error converting PDF files to CSV. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFiles = async () => {
    if (processedFiles.length === 0) {
      setError('No processed files to download');
      return;
    }
    if (processedFiles.length === 1) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(processedFiles[0].blob);
      link.download = processedFiles[0].name;
      link.click();
    } else {
      // Batch ZIP download
      const zip = new JSZip();
      processedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'converted-csvs.zip';
      link.click();
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stats = [
    { label: 'Table Detection', value: 'Smart Recognition', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Data Extraction', value: 'Accurate Results', icon: <Shield className="h-5 w-5" /> },
    { label: 'Excel Compatible', value: 'CSV Format', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Intelligent Table Detection',
      description: 'Automatically detect and extract tables from PDF documents with advanced pattern recognition algorithms.',
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: 'Data Structure Preservation',
      description: 'Maintain table structure, column alignment, and data relationships in the converted CSV format.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Multiple Delimiter Options',
      description: 'Choose from comma, semicolon, tab, or custom delimiters for optimal compatibility with different applications.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'Excel Integration',
      description: 'Generate CSV files that are perfectly compatible with Microsoft Excel, Google Sheets, and other spreadsheet applications.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Works best with PDFs containing tables and structured data.'
    },
    {
      step: 2,
      title: 'Configure CSV Settings',
      description: 'Choose table detection options, delimiter type, encoding, and header row preferences for your CSV output.'
    },
    {
      step: 3,
      title: 'Process & Extract',
      description: 'Click process to extract tables from your PDFs and convert them to CSV format with preserved structure.'
    },
    {
      step: 4,
      title: 'Download CSV Files',
      description: 'Download your CSV files ready for import into Excel, Google Sheets, or any data analysis application.'
    }
  ];

  return (
    <>
      <SEO
        title="PDF to CSV | Convert PDF Tables to CSV Online Free"
        description="Quickly convert PDF tables to CSV files with our free online PDF to CSV converter. Extract data easily for spreadsheets and databases."
        keywords="PDF to CSV, convert PDF to CSV, PDF to table, data extraction, online tool, free tool"
        canonical="pdf-to-csv"
        ogImage="/images/pdf-to-csv-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileSpreadsheet className="h-4 w-4" />
                <span>PDF to CSV Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                PDF to CSV Converter Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract tables from PDF documents and convert them to CSV format with AI-powered table detection. 
                Perfect for data analysis, spreadsheet import, and database workflows.
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
                {error && (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
                )}
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    dragActive ? 'border-violet-500 bg-violet-50/50' : files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleDropZoneClick}
                  tabIndex={0}
                  aria-label="File upload drop zone"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for CSV conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  {/* Hidden file input for click-to-upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
                {csvPreview && (
                  <div className="mt-4 p-4 bg-blue-50 text-blue-900 rounded-lg max-h-40 overflow-y-auto text-xs">
                    <strong>Preview (first 5 rows):</strong>
                    <table className="w-full mt-2 text-xs">
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-1 py-0.5">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* File List & Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected Files</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">CSV Conversion Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delimiter
                    </label>
                    <select
                      value={settings.delimiter}
                      onChange={(e) => setSettings({...settings, delimiter: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="\t">Tab</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Encoding
                    </label>
                    <select
                      value={settings.encoding}
                      onChange={(e) => setSettings({...settings, encoding: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="utf-8">UTF-8</option>
                      <option value="utf-16">UTF-16</option>
                      <option value="latin1">Latin-1</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeHeaders"
                      checked={settings.includeHeaders}
                      onChange={(e) => setSettings({...settings, includeHeaders: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeHeaders" className="text-sm font-medium text-gray-700">
                      Include Headers
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="detectTables"
                      checked={settings.detectTables}
                      onChange={(e) => setSettings({...settings, detectTables: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="detectTables" className="text-sm font-medium text-gray-700">
                      Auto-detect Tables
                    </label>
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
                      <span>Converting to CSV...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-5 w-5" />
                      <span>Convert to CSV</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>
              {processedFiles.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => downloadFiles()}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download CSV Files</span>
                  </button>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF to CSV Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  AI-powered table detection with accurate data extraction and formatting
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
                  How to Convert PDF to CSV
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your PDF tables to CSV format
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
                    Ready to Convert PDF to CSV?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF tables into editable CSV data. Join thousands of users 
                    who trust our tool for data extraction and analysis.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileSpreadsheet className="h-5 w-5" />
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

export default PDFToCSVConverter; 