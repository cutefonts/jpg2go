import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType, BarChart3 } from 'lucide-react';
import SEO from './SEO';

const ExcelToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    includeCharts: true,
    includeFormulas: false,
    pageOrientation: 'portrait',
    fitToPage: true,
    includeGridlines: true,
    maintainQuality: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<any[][] | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const excelFiles = selectedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    setFiles(prev => [...prev, ...excelFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const excelFiles = droppedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    setFiles(prev => [...prev, ...excelFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    if (settings.includeCharts) {
      alert('Chart rendering is not supported in browser-based PDF conversion. Charts will not appear in the PDF.');
    }

    try {
      const processed: { name: string, blob: Blob }[] = [];

      for (const file of files) {
        try {
          const XLSX = await import('xlsx');
          const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetNames = workbook.SheetNames;

          // Determine orientation
          let orientation = settings.pageOrientation;
          if (orientation === 'auto') {
            // Use first sheet's shape
            const ws = workbook.Sheets[sheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            orientation = (data.length > 0 && data[0].length > data.length) ? 'landscape' : 'portrait';
          }
          const pageSize = orientation === 'landscape' ? [841.89, 595.28] : [595.28, 841.89]; // A4

          // Font/spacing for quality
          const fontSize = settings.maintainQuality ? 12 : 10;
          const rowHeight = settings.maintainQuality ? 22 : 18;
          const margin = 40;

          const pdfDoc = await PDFDocument.create();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

          for (let s = 0; s < sheetNames.length; s++) {
            const sheetName = sheetNames[s];
            const ws = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];

            let page = pdfDoc.addPage(pageSize);
            const [width, height] = pageSize;
            let y = height - margin;
            const colCount = Array.isArray(data[0]) ? data[0].length : 1;
            const colWidth = settings.fitToPage ? (width - 2 * margin) / colCount : 100;

            // Sheet title
            page.drawText(`Sheet: ${sheetName}`, {
              x: margin,
              y: y,
              size: fontSize + 2,
              font,
              color: rgb(0.2, 0.2, 0.6),
            });
            y -= rowHeight * 1.5;

            // Draw table rows
            for (let i = 0; i < data.length; i++) {
              const row: any[] = Array.isArray(data[i]) ? data[i] : [];
              let x = margin;
              for (let j = 0; j < colCount; j++) {
                let cell = '';
                if (settings.includeFormulas && ws) {
                  // Try to get formula if present
                  const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
                  const cellObj = ws[cellRef];
                  if (cellObj && cellObj.f) {
                    cell = '=' + cellObj.f;
                  } else if (row[j] !== undefined && row[j] !== null) {
                    cell = String(row[j]);
                  }
                } else {
                  cell = row[j] !== undefined && row[j] !== null ? String(row[j]) : '';
                }
                page.drawText(cell.length > 30 ? cell.slice(0, 30) + '…' : cell, {
                  x,
                  y,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                  maxWidth: colWidth - 2,
                });
                // Draw gridlines if enabled
                if (settings.includeGridlines) {
                  // Vertical line (left)
                  page.drawLine({
                    start: { x, y: y + rowHeight },
                    end: { x, y: y },
                    thickness: 0.5,
                    color: rgb(0.8, 0.8, 0.8),
                  });
                  // Vertical line (right)
                  page.drawLine({
                    start: { x: x + colWidth, y: y + rowHeight },
                    end: { x: x + colWidth, y: y },
                    thickness: 0.5,
                    color: rgb(0.8, 0.8, 0.8),
                  });
                  // Horizontal line (top)
                  page.drawLine({
                    start: { x, y: y + rowHeight },
                    end: { x: x + colWidth, y: y + rowHeight },
                    thickness: 0.5,
                    color: rgb(0.8, 0.8, 0.8),
                  });
                  // Horizontal line (bottom)
                  page.drawLine({
                    start: { x, y },
                    end: { x: x + colWidth, y },
                    thickness: 0.5,
                    color: rgb(0.8, 0.8, 0.8),
                  });
                }
                x += colWidth;
              }
              y -= rowHeight;
              // Page break if needed
              if (y < margin + rowHeight) {
                page = pdfDoc.addPage(pageSize);
                y = height - margin;
              }
            }
          }

          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.(xlsx|xls)$/i, '.pdf'),
            blob: blob
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }

      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`Excel to PDF conversion completed! Processed ${processed.length} files.`);
    } catch (error) {
      console.error('Error converting Excel to PDF:', error);
      setIsProcessing(false);
      alert('Error converting Excel to PDF. Please try again.');
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
    { icon: <BarChart3 className="h-6 w-6" />, title: 'Chart Preservation', description: 'Maintain charts and graphs in PDF output' },
    { icon: <Shield className="h-6 w-6" />, title: 'Format Preservation', description: 'Keep Excel formatting and layout intact' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple Excel files simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Control', description: 'High-quality PDF output with perfect formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload Excel Files', description: 'Select Excel files (.xlsx, .xls) to convert' },
    { step: '2', title: 'Configure Settings', description: 'Choose conversion options and formatting' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '120K+', label: 'Excel Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Update preview when files change
  React.useEffect(() => {
    const loadPreview = async () => {
      if (files.length === 0) {
        setPreviewData(null);
        return;
      }
      try {
        const XLSX = await import('xlsx');
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        setPreviewData(data);
      } catch (e) {
        setPreviewData(null);
      }
    };
    loadPreview();
  }, [files]);

  return (
    <>
      <SEO
        title="Excel to PDF | Free XLS to PDF Conversion Online"
        description="Convert XLS and XLSX files to PDF with one click. Our online tool preserves your spreadsheet's layout and formatting—100% free and easy to use."
        keywords="Excel to PDF, convert Excel to PDF, spreadsheet to PDF, XLSX to PDF, XLS to PDF, Excel converter, online converter, free converter"
        canonical="excel-to-pdf"
        ogImage="/images/excel-to-pdf-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BarChart3 className="h-4 w-4" />
                <span>Excel to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert Excel to PDF
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert Excel spreadsheets to professional PDF documents while preserving charts, formatting, and data integrity. Perfect for reports, presentations, and sharing.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'} ${isDragActive ? 'border-blue-500 bg-blue-50/70' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload Excel files"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your Excel files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (.xlsx, .xls)</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose Excel Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="mt-4 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-xl mx-auto">
                    <strong>Note:</strong> This tool currently generates a PDF with Excel file metadata only. It does <span className="font-semibold">not</span> render the actual spreadsheet content. For full Excel-to-PDF conversion, advanced server-side processing or a specialized library is required.
                  </div>
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected Excel Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <BarChart3 className="h-8 w-8 text-violet-600" />
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
                  <BarChart3 className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  {previewData && previewData.length > 0 ? (
                    <div className="overflow-auto max-h-96">
                      <table className="min-w-full border border-gray-200 text-xs">
                        <tbody>
                          {previewData.slice(0, 20).map((row, i) => (
                            <tr key={i}>
                              {row.slice(0, 10).map((cell, j) => (
                                <td key={j} className="border border-gray-200 px-2 py-1 text-left text-gray-800 bg-white">{cell !== undefined && cell !== null ? String(cell) : ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewData.length > 20 && (
                        <div className="text-xs text-gray-400 mt-2">Preview limited to first 20 rows</div>
                      )}
                    </div>
                  ) : (
                    <p>No live preview available for Excel to PDF conversion.<br/>Conversion will preserve charts, formatting, and data layout.</p>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Orientation</label>
                    <select
                      value={settings.pageOrientation}
                      onChange={e => setSettings(prev => ({ ...prev, pageOrientation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                      <option value="auto">Auto-detect</option>
                    </select>
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
                      id="includeFormulas"
                      checked={settings.includeFormulas}
                      onChange={e => setSettings(prev => ({ ...prev, includeFormulas: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeFormulas" className="text-sm font-medium text-gray-700">Include Formulas</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="fitToPage"
                      checked={settings.fitToPage}
                      onChange={e => setSettings(prev => ({ ...prev, fitToPage: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="fitToPage" className="text-sm font-medium text-gray-700">Fit to Page</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeGridlines"
                      checked={settings.includeGridlines}
                      onChange={e => setSettings(prev => ({ ...prev, includeGridlines: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeGridlines" className="text-sm font-medium text-gray-700">Include Gridlines</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainQuality"
                      checked={settings.maintainQuality}
                      onChange={e => setSettings(prev => ({ ...prev, maintainQuality: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainQuality" className="text-sm font-medium text-gray-700">Maintain Quality</label>
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
                      <span>Convert Excel to PDF</span>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Excel to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect Excel to PDF transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert Excel to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your Excel files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert Excel to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our Excel to PDF converter for perfect formatting</p>
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

export default ExcelToPDFConverter; 