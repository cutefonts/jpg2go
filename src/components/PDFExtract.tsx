import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Users, Zap, Shield, FileText, Scissors, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, FileType } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFExtract: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    extractMode: 'pages',
    pageRange: '',
    extractImages: true,
    extractText: true,
    preserveQuality: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle extract mode change and update related settings
  const handleExtractModeChange = (mode: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, extractMode: mode };
      
      // Auto-adjust related settings based on mode
      switch (mode) {
        case 'text':
          newSettings.extractText = true;
          newSettings.extractImages = false;
          break;
        case 'images':
          newSettings.extractText = false;
          newSettings.extractImages = true;
          break;
        case 'pages':
          newSettings.extractText = false;
          newSettings.extractImages = false;
          break;
        case 'all':
          newSettings.extractText = true;
          newSettings.extractImages = true;
          break;
      }
      
      return newSettings;
    });
  };

  // Validate page range input
  const validatePageRange = (input: string): string => {
    if (!input.trim()) return '';
    
    const parts = input.split(',').map(part => part.trim());
    const validParts = parts.filter(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        return !isNaN(start) && !isNaN(end) && start > 0 && end >= start;
      } else {
        const num = Number(part);
        return !isNaN(num) && num > 0;
      }
    });
    
    return validParts.join(', ');
  };

  // Parse page range string (e.g., "1-5, 8, 10-15")
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= totalPages) {
              pages.add(i);
            }
          }
        }
      } else {
        const pageNum = Number(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    // Validate settings before processing
    if (settings.extractMode === 'text' && !settings.extractText) {
      alert('Text extraction is disabled but Text mode is selected. Please enable text extraction or choose a different mode.');
      return;
    }
    
    if (settings.extractMode === 'images' && !settings.extractImages) {
      alert('Image extraction is disabled but Images mode is selected. Please enable image extraction or choose a different mode.');
      return;
    }
    
    if (settings.extractMode === 'all' && !settings.extractText && !settings.extractImages) {
      alert('Both text and image extraction are disabled but All Content mode is selected. Please enable at least one extraction type.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Create separate buffers for different operations to avoid detachment issues
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const numPages = pdfDoc.numPages;
          
          // Parse page range
          const pagesToExtract = parsePageRange(settings.pageRange, numPages);
          
          if (pagesToExtract.length === 0) {
            console.warn(`No valid pages found for ${file.name}`);
            continue;
          }
          
          let extractedContent = '';
          const extractedImages: string[] = [];
          
          // Extract content from selected pages
          for (const pageNum of pagesToExtract) {
            const page = await pdfDoc.getPage(pageNum);
            
            // Extract text if enabled
            if (settings.extractText) {
              try {
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                
                extractedContent += `Page ${pageNum}:\n${pageText}\n\n`;
              } catch (error) {
                console.warn(`Failed to extract text from page ${pageNum}:`, error);
              }
            }
            
            // Extract images if enabled
            if (settings.extractImages) {
              try {
                // Get page viewport with quality setting
                const scale = settings.preserveQuality ? 2.0 : 1.0; // Higher scale for better quality
                const viewport = page.getViewport({ scale });
                
                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                if (context) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  
                  // Set canvas quality settings
                  if (settings.preserveQuality) {
                    context.imageSmoothingEnabled = true;
                    context.imageSmoothingQuality = 'high';
                  }
                  
                  // Render page to canvas
                  const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                  };
                  
                  await page.render(renderContext).promise;
                  
                  // Convert canvas to data URL with quality setting
                  const quality = settings.preserveQuality ? 1.0 : 0.8;
                  const dataUrl = canvas.toDataURL('image/png', quality);
                  extractedImages.push(dataUrl);
                }
              } catch (error) {
                console.warn(`Failed to extract image from page ${pageNum}:`, error);
              }
            }
          }
          
          // Create output based on extraction mode
          let blob: Blob;
          let fileName: string;
          
          if (settings.extractMode === 'text') {
            // Create text file
            if (!extractedContent.trim()) {
              extractedContent = 'No text content found in the selected pages.';
            }
            blob = new Blob([extractedContent], { type: 'text/plain' });
            fileName = file.name.replace(/\.pdf$/i, '_extracted.txt');
          } else if (settings.extractMode === 'images') {
            // Create ZIP file with all images
            if (extractedImages.length > 0) {
              const JSZip = (await import('jszip')).default;
              const zip = new JSZip();
              
              extractedImages.forEach((imageDataUrl, index) => {
                const base64Data = imageDataUrl.split(',')[1];
                zip.file(`page_${pagesToExtract[index]}.png`, base64Data, { base64: true });
              });
              
              blob = await zip.generateAsync({ type: 'blob' });
              fileName = file.name.replace(/\.pdf$/i, '_extracted_images.zip');
            } else {
              blob = new Blob(['No images found in the selected pages.'], { type: 'text/plain' });
              fileName = file.name.replace(/\.pdf$/i, '_extracted.txt');
            }
          } else if (settings.extractMode === 'pages') {
            // Create new PDF with selected pages - use a fresh buffer for pdf-lib
            const { PDFDocument } = await import('pdf-lib');
            const freshBuffer = await file.arrayBuffer(); // Get a fresh buffer for pdf-lib
            const pdfDocLib = await PDFDocument.load(freshBuffer);
            const newPdf = await PDFDocument.create();
            
            for (const pageNum of pagesToExtract) {
              const [copiedPage] = await newPdf.copyPages(pdfDocLib, [pageNum - 1]);
              newPdf.addPage(copiedPage);
            }
            
            const pdfBytes = await newPdf.save();
            blob = new Blob([pdfBytes], { type: 'application/pdf' });
            fileName = file.name.replace(/\.pdf$/i, '_extracted_pages.pdf');
          } else {
            // Create combined file (all content)
            const combinedContent = `EXTRACTED CONTENT FROM ${file.name}\n\n${extractedContent}\n\nImages extracted: ${extractedImages.length}`;
            blob = new Blob([combinedContent], { type: 'text/plain' });
            fileName = file.name.replace(/\.pdf$/i, '_extracted.txt');
          }
          
          processed.push({
            name: fileName,
            blob: blob
          });
          
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}. Skipping this file.`);
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      
      if (processed.length > 0) {
        alert(`PDF extraction completed! Processed ${processed.length} files.`);
      } else {
        alert('No files were successfully processed. Please check your settings and try again.');
      }
      
    } catch (error) {
      console.error('Error extracting from PDFs:', error);
      setIsProcessing(false);
      alert('Error extracting from PDFs. Please try again.');
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
    { icon: <Scissors className="h-6 w-6" />, title: 'Page Extraction', description: 'Extract specific pages or page ranges from PDFs' },
    { icon: <Shield className="h-6 w-6" />, title: 'Content Extraction', description: 'Extract text, images, and other content' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Extract from multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Multiple Formats', description: 'Export to various formats and file types' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to extract from' },
    { step: '2', title: 'Configure Extraction', description: 'Choose extraction options and settings' },
    { step: '3', title: 'Extract & Download', description: 'Download extracted content' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '110K+', label: 'PDFs Extracted' },
    { icon: <Zap className="h-5 w-5" />, value: '< 40s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Extract | Free Online PDF Content Extractor"
        description="Extract text, images, and data from PDF files online with no hassle. Our free PDF extract tool is easy to use and works on any device."
        keywords="PDF extract, extract content, extract pages, extract text, extract images, online tool, free tool"
        canonical="pdf-extract"
        ogImage="/images/pdf-extract-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Scissors className="h-4 w-4" />
                <span>PDF Extract</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Extract Content from PDFs
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Easily</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Extract pages, text, images, and other content from PDF documents. Perfect for content reuse and data extraction.
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
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
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
                  <Scissors className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF extraction.<br/>Extraction will pull out selected content and generate extracted files for download.</p>
                </div>
              </div>

              {/* Extract Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span>Extract Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extract Mode</label>
                    <select
                      value={settings.extractMode}
                      onChange={e => handleExtractModeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="pages">Pages (New PDF)</option>
                      <option value="text">Text Content (.txt)</option>
                      <option value="images">Images (ZIP)</option>
                      <option value="all">All Content (.txt)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Choose what type of content to extract</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                    <input
                      type="text"
                      value={settings.pageRange}
                      onChange={e => setSettings(prev => ({ ...prev, pageRange: validatePageRange(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="e.g., 1-5, 8, 10-15"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to extract all pages</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extractImages"
                      checked={settings.extractImages}
                      onChange={e => setSettings(prev => ({ ...prev, extractImages: e.target.checked }))}
                      disabled={settings.extractMode === 'pages'}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor="extractImages" className="text-sm font-medium text-gray-700">Extract Images</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extractText"
                      checked={settings.extractText}
                      onChange={e => setSettings(prev => ({ ...prev, extractText: e.target.checked }))}
                      disabled={settings.extractMode === 'pages'}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor="extractText" className="text-sm font-medium text-gray-700">Extract Text</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveQuality"
                      checked={settings.preserveQuality}
                      onChange={e => setSettings(prev => ({ ...prev, preserveQuality: e.target.checked }))}
                      disabled={!settings.extractImages}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor="preserveQuality" className="text-sm font-medium text-gray-700">Preserve Quality</label>
                  </div>
                </div>
                
                {/* Settings Help */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Settings Guide</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p><strong>Pages:</strong> Extract specific pages as a new PDF file</p>
                    <p><strong>Text:</strong> Extract text content to a .txt file</p>
                    <p><strong>Images:</strong> Convert pages to images and package in ZIP</p>
                    <p><strong>All:</strong> Extract both text and images to a combined file</p>
                    <p><strong>Page Range:</strong> Use formats like "1-5" (pages 1 to 5), "1,3,5" (specific pages), or "1-3,7-9" (mixed ranges)</p>
                    <p><strong>Preserve Quality:</strong> Higher resolution images (larger file size)</p>
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
                      <span>Extracting Content...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="h-5 w-5" />
                      <span>Extract Content</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Extracted Content</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Extract Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced extraction technology for pulling content from PDF documents</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Extract Content from PDFs</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to extract content from your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Extract Content?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF extract tool for content extraction</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Scissors className="h-5 w-5" />
                    <span>Start Extracting Now</span>
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

export default PDFExtract; 