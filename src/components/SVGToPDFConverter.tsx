import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, ImageIcon, FileType, XCircle, AlertCircle, Trash2, Maximize2, Minimize2, Monitor, Ruler } from 'lucide-react';
import SEO from './SEO';

interface ProcessedFile {
  name: string;
  blob: Blob;
  preview: string;
  size: number;
  status: 'success' | 'error';
  error?: string;
}

interface SVGData {
  content: string;
  width: number;
  height: number;
  viewBox: string;
  hasTransparency: boolean;
}

interface PreviewData {
  pageWidth: number;
  pageHeight: number;
  svgWidth: number;
  svgHeight: number;
  finalWidth: number;
  finalHeight: number;
  margin: number;
  scale: number;
  fitToPage: boolean;
  backgroundColor: string;
  preserveTransparency: boolean;
}

const SVGToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ [key: string]: number }>({});
  const [previewData, setPreviewData] = useState<{ [key: string]: SVGData }>({});
  const [settings, setSettings] = useState({
    pageSize: 'A4',
    orientation: 'portrait',
    scale: 1,
    preserveTransparency: true,
    fitToPage: true,
    quality: 'high',
    margin: '0.5in',
    backgroundColor: '#FFFFFF',
    embedFonts: true,
    compressOutput: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse SVG and extract metadata
  const parseSVG = async (file: File): Promise<SVGData> => {
    const svgText = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('Invalid SVG file');
    }

    // Extract dimensions
    const width = svgElement.width?.baseVal?.value || 
                  svgElement.getAttribute('width') || 
                  svgElement.viewBox?.baseVal?.width || 595.28;
    const height = svgElement.height?.baseVal?.value || 
                   svgElement.getAttribute('height') || 
                   svgElement.viewBox?.baseVal?.height || 841.89;
    const viewBox = svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`;

    // Check for transparency
    const hasTransparency = svgText.includes('opacity') || 
                           svgText.includes('rgba') || 
                           svgText.includes('fill="none"') ||
                           svgText.includes('stroke="none"');

    return {
      content: svgText,
      width: parseFloat(width.toString()),
      height: parseFloat(height.toString()),
      viewBox,
      hasTransparency
    };
  };

  // Convert hex color to RGB values for jsPDF
  const hexToRgb = (hex: string): [number, number, number] => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return [r, g, b];
  };

  // Get page size dimensions
  const getPageSize = () => {
    const sizes = {
      'A4': { width: 595.28, height: 841.89 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 },
      'A3': { width: 841.89, height: 1190.55 },
      'A5': { width: 420.94, height: 595.28 },
      'Custom': { width: 595.28, height: 841.89 }
    };
    
    const size = sizes[settings.pageSize as keyof typeof sizes] || sizes.A4;
    
    if (settings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    
    return size;
  };

  // Get margin in points
  const getMargin = () => {
    const marginMap = {
      '0in': 0,
      '0.25in': 18,
      '0.5in': 36,
      '0.75in': 54,
      '1in': 72
    };
    return marginMap[settings.margin as keyof typeof marginMap] || 36;
  };

  // Calculate preview data for live preview
  const calculatePreviewData = useMemo((): PreviewData => {
    const { width: pageWidth, height: pageHeight } = getPageSize();
    const margin = getMargin();
    
    // Use first file's SVG data for preview, or default values
    const firstFile = files[0];
    const svgData = firstFile ? previewData[firstFile.name] : null;
    
    const svgWidth = svgData?.width || 400;
    const svgHeight = svgData?.height || 300;
    
    let finalWidth = svgWidth;
    let finalHeight = svgHeight;
    
    if (settings.fitToPage) {
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const scaleX = availableWidth / svgWidth;
      const scaleY = availableHeight / svgHeight;
      const scale = Math.min(scaleX, scaleY, settings.scale);
      finalWidth = svgWidth * scale;
      finalHeight = svgHeight * scale;
    } else {
      finalWidth = svgWidth * settings.scale;
      finalHeight = svgHeight * settings.scale;
    }
    
    return {
      pageWidth,
      pageHeight,
      svgWidth,
      svgHeight,
      finalWidth,
      finalHeight,
      margin,
      scale: settings.scale,
      fitToPage: settings.fitToPage,
      backgroundColor: settings.backgroundColor,
      preserveTransparency: settings.preserveTransparency
    };
  }, [files, previewData, settings]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const svgFiles = selectedFiles.filter(file => 
      file.type === 'image/svg+xml' || 
      file.name.toLowerCase().endsWith('.svg')
    );
    
    if (svgFiles.length !== selectedFiles.length) {
      setErrorMessage('Some files were skipped. Only SVG files are supported.');
    }
    
    setFiles(prev => [...prev, ...svgFiles]);
    setErrorMessage('');
    
    // Parse SVG files for preview
    svgFiles.forEach(async (file) => {
      try {
        const svgData = await parseSVG(file);
        setPreviewData(prev => ({ ...prev, [file.name]: svgData }));
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
      }
    });
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    const svgFiles = droppedFiles.filter(file => 
      file.type === 'image/svg+xml' || 
      file.name.toLowerCase().endsWith('.svg')
    );
    
    if (svgFiles.length !== droppedFiles.length) {
      setErrorMessage('Some files were skipped. Only SVG files are supported.');
    }
    
    setFiles(prev => [...prev, ...svgFiles]);
    setErrorMessage('');
    
    // Parse SVG files for preview
    svgFiles.forEach(async (file) => {
      try {
        const svgData = await parseSVG(file);
        setPreviewData(prev => ({ ...prev, [file.name]: svgData }));
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
      }
    });
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
    const file = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewData(prev => {
      const newData = { ...prev };
      delete newData[file.name];
      return newData;
    });
    setErrorMessage('');
  };

  const clearAllFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    setPreviewData({});
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
      const { jsPDF } = await import('jspdf');
      const svg2pdfModule = await import('svg2pdf.js');
      const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default;
      
      const processed: ProcessedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        
        try {
          setProcessingProgress(prev => ({ ...prev, [fileName]: 0 }));
          
          // Parse SVG
          const svgData = await parseSVG(file);
          setProcessingProgress(prev => ({ ...prev, [fileName]: 20 }));
          
          // Create temporary DOM element
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgData.content;
          const svgElement = tempDiv.querySelector('svg');
          
          if (!svgElement) {
            throw new Error('Invalid SVG structure');
          }
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 40 }));
          
          // Calculate dimensions
          const { width: pageWidth, height: pageHeight } = getPageSize();
          const margin = getMargin();
          const availableWidth = pageWidth - (margin * 2);
          const availableHeight = pageHeight - (margin * 2);
          
          let finalWidth = svgData.width;
          let finalHeight = svgData.height;
          
          // Apply scaling and fit-to-page logic
          if (settings.fitToPage) {
            const scaleX = availableWidth / svgData.width;
            const scaleY = availableHeight / svgData.height;
            const scale = Math.min(scaleX, scaleY, settings.scale);
            finalWidth = svgData.width * scale;
            finalHeight = svgData.height * scale;
          } else {
            finalWidth = svgData.width * settings.scale;
            finalHeight = svgData.height * settings.scale;
          }
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 60 }));
          
          // Create PDF
          const pdf = new jsPDF({
            orientation: finalWidth > finalHeight ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [pageWidth, pageHeight],
            compress: settings.compressOutput
          });
          
          // Set background color if not transparent
          if (settings.backgroundColor !== 'transparent') {
            const [r, g, b] = hexToRgb(settings.backgroundColor);
            pdf.setFillColor(r, g, b);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          }
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 80 }));
          
          // Position SVG in center of page
          const x = margin + (availableWidth - finalWidth) / 2;
          const y = margin + (availableHeight - finalHeight) / 2;
          
          // Configure SVG2PDF options based on quality and embedFonts settings
          const svg2pdfOptions: any = {
            x,
            y,
            width: finalWidth,
            height: finalHeight
          };
          
          // Apply quality settings
          if (settings.quality === 'low') {
            svg2pdfOptions.quality = 0.5;
          } else if (settings.quality === 'medium') {
            svg2pdfOptions.quality = 0.8;
          } else {
            svg2pdfOptions.quality = 1.0;
          }
          
          // Apply font embedding settings
          if (settings.embedFonts) {
            svg2pdfOptions.embedFonts = true;
          }
          
          // Render SVG to PDF
          await svg2pdf(svgElement, pdf, svg2pdfOptions);
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 90 }));
          
          // Get PDF as Blob
          const pdfBlob = pdf.output('blob');
          
          setProcessingProgress(prev => ({ ...prev, [fileName]: 100 }));
          
          processed.push({
            name: file.name.replace(/\.svg$/i, '.pdf'),
            blob: pdfBlob,
            preview: `SVG: ${svgData.width}×${svgData.height} → PDF: ${finalWidth.toFixed(0)}×${finalHeight.toFixed(0)}`,
            size: pdfBlob.size,
            status: 'success'
          });
          
        } catch (error: any) {
          processed.push({
            name: file.name.replace(/\.svg$/i, '.pdf'),
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
      console.error('Error converting SVG to PDF:', error);
      setErrorMessage(error?.message || 'Error converting SVG to PDF. Please try again.');
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
    { icon: <ImageIcon className="h-6 w-6" />, title: 'Vector Graphics', description: 'Convert SVG vector graphics to PDF with perfect quality' },
    { icon: <Shield className="h-6 w-6" />, title: 'Scalable Quality', description: 'Maintain scalable vector quality and transparency' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Convert multiple SVG files simultaneously with progress tracking' },
    { icon: <Users className="h-6 w-6" />, title: 'Advanced Settings', description: 'Customize page size, scale, margins, and quality options' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload SVG Files', description: 'Drag & drop or click to select SVG vector files' },
    { step: '2', title: 'Configure Settings', description: 'Choose page size, scale, margins, and quality options' },
    { step: '3', title: 'Convert & Download', description: 'Download your converted PDF files with preview' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '50K+', label: 'SVG Files Converted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO
        title="SVG to PDF | Convert SVG Files to PDF Online Free"
        description="Convert SVG vector graphics to PDF format with ease. Our online tool ensures high-quality conversion for your vector graphics, perfect for printing and sharing."
        keywords="SVG to PDF, convert SVG to PDF, SVG converter, vector to PDF, online tool, free tool"
        canonical="svg-to-pdf"
        ogImage="/images/svg-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ImageIcon className="h-4 w-4" />
                <span>SVG to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert SVG to PDF
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> with Vector Quality</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert SVG vector graphics to PDF format while preserving scalable quality, transparency, and perfect vector rendering. Ideal for design, print, and professional documents.
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
                    {isDragOver ? 'Drop your SVG files here' : 'Drop your SVG files here'}
                  </h3>
                  <p className="text-gray-600 mb-6">or click anywhere to browse files from your computer (.svg)</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose SVG Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".svg,image/svg+xml"
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
                      <span>Selected SVG Files ({files.length})</span>
                    </h3>
                    <button
                      onClick={clearAllFiles}
                      className="text-red-500 hover:text-red-700 transition-colors text-sm flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear All</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => {
                      const svgData = previewData[file.name];
                      return (
                        <div key={index} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <ImageIcon className="h-8 w-8 text-violet-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button 
                              onClick={() => removeFile(index)} 
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                          
                          {svgData && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Dimensions: {svgData.width}×{svgData.height}</div>
                              <div>ViewBox: {svgData.viewBox}</div>
                              <div>Transparency: {svgData.hasTransparency ? 'Yes' : 'No'}</div>
                            </div>
                          )}
                          
                          {processingProgress[file.name] !== undefined && (
                            <div className="mt-3">
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Preview Section */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Monitor className="h-5 w-5 text-violet-600" />
                    <span>Live Preview</span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visual Page Preview */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Page Layout Preview</span>
                      </h4>
                      <div className="relative mx-auto" style={{ 
                        width: '200px', 
                        height: `${(calculatePreviewData.pageHeight / calculatePreviewData.pageWidth) * 200}px`,
                        backgroundColor: calculatePreviewData.preserveTransparency ? 'transparent' : calculatePreviewData.backgroundColor,
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        position: 'relative'
                      }}>
                        {/* Page border */}
                        <div className="absolute inset-0 border-2 border-gray-300 rounded-md"></div>
                        
                        {/* Margin area */}
                        <div className="absolute inset-0 border border-blue-200 rounded-md m-2"></div>
                        
                        {/* SVG content area */}
                        <div className="absolute inset-0 m-4 flex items-center justify-center">
                          <div 
                            className="bg-violet-100 border border-violet-300 rounded"
                            style={{
                              width: `${(calculatePreviewData.finalWidth / calculatePreviewData.pageWidth) * 160}px`,
                              height: `${(calculatePreviewData.finalHeight / calculatePreviewData.pageHeight) * (calculatePreviewData.pageHeight / calculatePreviewData.pageWidth) * 160}px`,
                              minWidth: '10px',
                              minHeight: '10px'
                            }}
                          ></div>
                        </div>
                        
                        {/* Page info */}
                        <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-500">
                          {calculatePreviewData.pageWidth.toFixed(0)} × {calculatePreviewData.pageHeight.toFixed(0)} pt
                        </div>
                      </div>
                    </div>

                    {/* Settings Details */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
                        <Ruler className="h-4 w-4" />
                        <span>Conversion Details</span>
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Page Size:</span>
                          <span className="font-medium">{settings.pageSize} ({settings.orientation})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original SVG:</span>
                          <span className="font-medium">{calculatePreviewData.svgWidth} × {calculatePreviewData.svgHeight}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Final Size:</span>
                          <span className="font-medium">{calculatePreviewData.finalWidth.toFixed(0)} × {calculatePreviewData.finalHeight.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scale Factor:</span>
                          <span className="font-medium">{calculatePreviewData.fitToPage ? 'Auto-fit' : `${calculatePreviewData.scale}x`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Margins:</span>
                          <span className="font-medium">{settings.margin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Background:</span>
                          <span className="font-medium">
                            {calculatePreviewData.preserveTransparency ? 'Transparent' : 'Solid color'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality:</span>
                          <span className="font-medium capitalize">{settings.quality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Compression:</span>
                          <span className="font-medium">{settings.compressOutput ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scale</label>
                    <input
                      type="number"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={settings.scale}
                      onChange={e => setSettings(prev => ({ ...prev, scale: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margins</label>
                    <select
                      value={settings.margin}
                      onChange={e => setSettings(prev => ({ ...prev, margin: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="0in">No margins</option>
                      <option value="0.25in">0.25 inch</option>
                      <option value="0.5in">0.5 inch (Standard)</option>
                      <option value="0.75in">0.75 inch</option>
                      <option value="1in">1 inch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                    <select
                      value={settings.backgroundColor === 'transparent' ? 'transparent' : 'custom'}
                      onChange={e => {
                        if (e.target.value === 'transparent') {
                          setSettings(prev => ({ ...prev, backgroundColor: 'transparent' }));
                        } else if (e.target.value === 'custom' && settings.backgroundColor === 'transparent') {
                          setSettings(prev => ({ ...prev, backgroundColor: '#FFFFFF' }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-2"
                    >
                      <option value="transparent">Transparent</option>
                      <option value="custom">Custom Color</option>
                    </select>
                    {settings.backgroundColor !== 'transparent' && (
                      <input
                        type="color"
                        value={settings.backgroundColor}
                        onChange={e => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={e => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="high">High Quality</option>
                      <option value="medium">Medium Quality</option>
                      <option value="low">Low Quality (Smaller file)</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveTransparency"
                      checked={settings.preserveTransparency}
                      onChange={e => setSettings(prev => ({ ...prev, preserveTransparency: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveTransparency" className="text-sm font-medium text-gray-700">Preserve Transparency</label>
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
                      id="embedFonts"
                      checked={settings.embedFonts}
                      onChange={e => setSettings(prev => ({ ...prev, embedFonts: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="embedFonts" className="text-sm font-medium text-gray-700">Embed Fonts</label>
                  </div>
                </div>
                
                {/* Settings Preview */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Current Settings Summary</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Page:</span>
                      <span className="text-blue-600 ml-1">{settings.pageSize} ({settings.orientation})</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Scale:</span>
                      <span className="text-blue-600 ml-1">{settings.scale}x</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Margins:</span>
                      <span className="text-blue-600 ml-1">{settings.margin}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Quality:</span>
                      <span className="text-blue-600 ml-1">{settings.quality}</span>
                    </div>
                    <div className="md:col-span-4">
                      <span className="text-blue-700 font-medium">Features:</span>
                      <span className="text-blue-600 ml-1">
                        {settings.preserveTransparency ? 'Transparency preserved' : 'Background color applied'} • 
                        {settings.fitToPage ? 'Fit to page' : 'Original size'} • 
                        {settings.compressOutput ? 'Compressed output' : 'Uncompressed'} • 
                        {settings.embedFonts ? 'Fonts embedded' : 'Fonts not embedded'}
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
                      {/* Spinner removed */}
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting to PDF...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span>Convert SVG to PDF</span>
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
                          <p className="text-xs font-medium text-gray-700 mb-2">Conversion Details:</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our SVG to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced conversion technology for perfect vector transformation</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert SVG to PDF</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your SVG files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Convert SVG to PDF?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our SVG to PDF converter for perfect vector conversion</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <ImageIcon className="h-5 w-5" />
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

export default SVGToPDFConverter; 