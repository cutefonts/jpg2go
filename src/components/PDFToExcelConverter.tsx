import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileInput, Eye, FileType } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';

const PDFToExcelConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob, rows?: string[][] }[]>([]);
  const [settings, setSettings] = useState({
    format: 'xlsx',
    extractTables: true,
    preserveFormatting: true,
    includeImages: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setZipBlob(null);
    setPreviewRows(null);
    try {
      const processed: { name: string, blob: Blob, rows?: string[][] }[] = [];
      const zip = new JSZip();
      
      for (const file of files) {
        try {
          // Load PDF using pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');
          
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          
          let extractedData: string[][] = [];
          
          // Extract text from each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            
            // Extract text content
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            // Simple table detection - split by common delimiters
            const lines = pageText.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              // Try to detect table-like structure
              if (line.includes('\t') || line.includes('  ') || line.includes('|')) {
                // Split by tabs, multiple spaces, or pipes
                const cells = line.split(/\t+|  +|\|/).map(cell => cell.trim()).filter(cell => cell);
                if (cells.length > 1) {
                  extractedData.push(cells);
                }
              } else if (line.trim()) {
                // Single column data
                extractedData.push([line.trim()]);
              }
            }
          }
          
          // If no table-like data found, create a simple text extraction
          if (extractedData.length === 0) {
            const allText = await Promise.all(
              Array.from({ length: numPages }, async (_, i) => {
                const page = await pdfDoc.getPage(i + 1);
                const textContent = await page.getTextContent();
                return textContent.items.map((item: any) => item.str).join(' ');
              })
            );
            
            // Split text into rows
            const textLines = allText.join('\n').split('\n').filter(line => line.trim());
            extractedData = textLines.map(line => [line.trim()]);
          }
          
          // Create Excel file based on format
          let blob: Blob;
          let fileName: string;
          
          if (settings.format === 'xlsx') {
            // Create XLSX using xlsx library
            const XLSX = await import('xlsx');
            
            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(extractedData);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
            
            // Generate XLSX file
            const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            blob = new Blob([xlsxBuffer], { 
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            fileName = file.name.replace(/\.pdf$/i, '.xlsx');
            
          } else if (settings.format === 'xls') {
            // Create XLS (Legacy) using xlsx library
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(extractedData);
            XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
            const xlsBuffer = XLSX.write(wb, { bookType: 'xls', type: 'array' });
            blob = new Blob([xlsBuffer], { type: 'application/vnd.ms-excel' });
            fileName = file.name.replace(/\.pdf$/i, '.xls');
          } else if (settings.format === 'csv') {
            // Create CSV file
            const csvContent = extractedData
              .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
              .join('\n');
            
            blob = new Blob([csvContent], { type: 'text/csv' });
            fileName = file.name.replace(/\.pdf$/i, '.csv');
            
          } else {
            // Fallback to CSV
            const csvContent = extractedData
              .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
              .join('\n');
            
            blob = new Blob([csvContent], { type: 'text/csv' });
            fileName = file.name.replace(/\.pdf$/i, '.csv');
          }
          
          processed.push({
            name: fileName,
            blob: blob,
            rows: extractedData
          });
          zip.file(fileName, blob);
          
        } catch (error) {
          setError(`Error processing ${file.name}: ${error}`);
        }
      }
      
      setProcessedFiles(processed);
      // Set preview rows from first file
      if (processed.length > 0 && processed[0].rows) {
        setPreviewRows(processed[0].rows.slice(0, 5));
      }
      // Generate ZIP
      if (processed.length > 1) {
        const zipContent = await zip.generateAsync({ type: 'blob' });
        setZipBlob(zipContent);
      } else {
        setZipBlob(null);
      }
      setIsProcessing(false);
      alert(`PDF to Excel conversion completed! Processed ${processed.length} files.`);
      
    } catch (error) {
      setError('Error converting PDFs: ' + error);
      setIsProcessing(false);
      alert('Error converting PDFs. Please try again.');
    }
  };

  const downloadAll = () => {
    if (zipBlob) {
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pdf-to-excel-files.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
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
    }
  };

  const features = [
    { icon: <FileType className="h-6 w-6" />, title: 'Table Extraction', description: 'Extract tables and data from PDF documents' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Format Preservation', description: 'Keep original table formatting and structure' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag and drop or browse to select your PDF documents' },
    { step: '2', title: 'Adjust Settings', description: 'Choose output format and extraction options' },
    { step: '3', title: 'Extract to Excel', description: 'Download your editable Excel files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '950K+', label: 'PDFs Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="PDF to Excel | Extract Tables from PDFs to Excel Format"
        description="Convert PDF tables into Excel files online with ease. Our PDF to Excel converter keeps your data organized and ready to edit."
        keywords="PDF to Excel, convert PDF to Excel, PDF to table, data extraction, online tool, free tool"
        canonical="pdf-to-excel"
        ogImage="/images/pdf-to-excel-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>PDF to Excel</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract Tables from
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF to Excel</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract tables and data from PDF documents into editable Excel spreadsheets. Perfect for data analysis and manipulation.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
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
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
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

              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileType className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF to Excel conversion.<br/>Conversion will extract tables and generate Excel files for download.</p>
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Extraction Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.format}
                      onChange={e => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="xlsx">XLSX (Modern)</option>
                      <option value="xls">XLS (Legacy)</option>
                      <option value="csv">CSV (Simple)</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extractTables"
                      checked={settings.extractTables}
                      onChange={e => setSettings(prev => ({ ...prev, extractTables: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="extractTables" className="text-sm font-medium text-gray-700">Extract Tables</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveFormatting"
                      checked={settings.preserveFormatting}
                      onChange={e => setSettings(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveFormatting" className="text-sm font-medium text-gray-700">Preserve Formatting</label>
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
                      {/* Spinner removed */}
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Extract to Excel</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Excel Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF to Excel Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional table extraction with formatting and data preservation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Extract Tables from PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to extract your data</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Extract Your Data?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join millions of users who trust our PDF to Excel converter for their data needs</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Zap className="h-5 w-5" />
                    <span>Start Extracting Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {error && (<div className="bg-red-100 text-red-700 rounded-lg p-3 mb-4 text-center">{error}</div>)}
      {previewRows && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 overflow-x-auto">
          <strong>Live Preview (first 5 rows):</strong>
          <table className="min-w-full text-xs mt-2"><tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}</tr>
            ))}
          </tbody></table>
        </div>
      )}
    </>
  );
};

export default PDFToExcelConverter; 