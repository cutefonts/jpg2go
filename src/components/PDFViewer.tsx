import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Eye, FileType, X } from 'lucide-react';
import SEO from './SEO';
import { Document, Page, pdfjs, Thumbnail, Outline } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Notification banner component
const Banner = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
    role="alert" aria-live="assertive">
    <div className="flex items-center space-x-3">
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">×</button>
    </div>
  </div>
);

const PDFViewer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [settings, setSettings] = useState({
    viewMode: 'single',
    zoomLevel: 100,
    showThumbnails: true,
    enableSearch: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [outline, setOutline] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      thumbnails.forEach(url => URL.revokeObjectURL(url));
    };
  }, [pdfUrl, thumbnails]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== selectedFiles.length) {
      setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    if (files.length === 0 && pdfFiles.length > 0) setSelectedFileIdx(0);
  };

  // Drag & drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== droppedFiles.length) {
      setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    if (files.length === 0 && pdfFiles.length > 0) setSelectedFileIdx(0);
  };
  const handleDragOver = (event: React.DragEvent) => event.preventDefault();

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFileIdx === index) setSelectedFileIdx(0);
    else if (selectedFileIdx > index) setSelectedFileIdx(selectedFileIdx - 1);
  };

  // File selector (dropdown)
  const FileSelector = () => files.length > 1 && (
    <div className="mb-4 flex items-center space-x-2">
      <label htmlFor="file-select" className="text-sm font-medium text-gray-700">Select PDF:</label>
      <select
        id="file-select"
        value={selectedFileIdx}
        onChange={e => { setSelectedFileIdx(Number(e.target.value)); setPageNumber(1); }}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        aria-label="Select PDF file to view"
      >
        {files.map((file, idx) => (
          <option key={file.name + idx} value={idx}>{file.name}</option>
        ))}
      </select>
    </div>
  );

  // Thumbnails sidebar
  const ThumbnailsSidebar = () => settings.showThumbnails && thumbnails.length > 0 && (
    <div className="w-24 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-2" aria-label="Page thumbnails sidebar">
      {thumbnails.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt={`Page ${idx + 1} thumbnail`}
          className={`mb-2 rounded cursor-pointer border-2 ${pageNumber === idx + 1 ? 'border-violet-500' : 'border-transparent'}`}
          onClick={() => setPageNumber(idx + 1)}
        />
      ))}
    </div>
  );

  // Generate PDF URL for react-pdf
  useEffect(() => {
    if (files[selectedFileIdx]) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(files[selectedFileIdx]));
    }
  }, [files, selectedFileIdx]);

  // Generate thumbnails
  useEffect(() => {
    const genThumbnails = async () => {
      if (!pdfUrl || !settings.showThumbnails) { setThumbnails([]); return; }
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const thumbs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
        setThumbnails(thumbs);
      } catch {
        setThumbnails([]);
      }
    };
    genThumbnails();
  }, [pdfUrl, settings.showThumbnails]);

  // Search logic
  const handleSearch = async () => {
    if (!pdfUrl || !searchQuery.trim()) return;
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const matches: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        if (text.toLowerCase().includes(searchQuery.toLowerCase())) matches.push(i);
      }
      setSearchMatches(matches);
      setCurrentMatchIdx(0);
      if (matches.length > 0) {
        setPageNumber(matches[0]);
        setBanner({ message: `Found ${matches.length} match(es) for "${searchQuery}".`, type: 'success' });
      } else {
        setBanner({ message: `No matches found for "${searchQuery}".`, type: 'error' });
      }
    } catch {
      setBanner({ message: 'Error searching PDF.', type: 'error' });
    }
  };

  // Outline (bookmarks)
  const handleOutline = (outline: any[]) => setOutline(outline);

  // View mode logic
  const getPagesToRender = () => {
    if (!numPages) return [];
    if (settings.viewMode === 'single') return [pageNumber];
    if (settings.viewMode === 'continuous') return Array.from({ length: numPages }, (_, i) => i + 1);
    if (settings.viewMode === 'facing') {
      const left = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
      return [left, left + 1].filter(p => p >= 1 && p <= numPages);
    }
    if (settings.viewMode === 'book') {
      // Book mode: show two pages, first page alone
      if (pageNumber === 1) return [1];
      const left = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1;
      return [left, left + 1].filter(p => p >= 1 && p <= numPages);
    }
    return [pageNumber];
  };

  const features = [
    { icon: <Eye className="h-6 w-6" />, title: 'Advanced Viewer', description: 'Professional PDF viewing with multiple modes' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Viewing', description: 'View PDFs without downloading to device' },
    { icon: <Zap className="h-6 w-6" />, title: 'Fast Loading', description: 'Optimized rendering for quick document viewing' },
    { icon: <Users className="h-6 w-6" />, title: 'Multiple Formats', description: 'Support for various PDF formats and versions' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select PDF files you want to view' },
    { step: '2', title: 'Configure Viewer', description: 'Choose viewing options and settings' },
    { step: '3', title: 'View & Download', description: 'View PDFs and download if needed' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '500K+', label: 'PDFs Viewed' },
    { icon: <Zap className="h-5 w-5" />, value: '< 5s', label: 'Loading Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Viewer | View PDF Files Online Free"
        description="View PDFs quickly and securely using our online PDF viewer. Perfect for reading, scrolling, and zooming PDF documents on any device."
        keywords="PDF viewer, view PDF, online PDF reader, free tool"
        canonical="pdf-viewer"
        ogImage="/images/pdf-viewer-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Eye className="h-4 w-4" />
                <span>PDF Viewer</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Professional PDF Viewer
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                View PDF documents online with advanced features like zoom, search, and secure viewing. No downloads required.
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
                  role="region"
                  aria-label="PDF file upload area"
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

              {/* PDF Viewer */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-violet-600" />
                    <span>PDF Viewer</span>
                  </h3>
                  <div className="flex w-full">
                    {FileSelector()}
                    {settings.showThumbnails && thumbnails.length > 0 && <ThumbnailsSidebar />}
                    <div className="flex-1 flex flex-col items-center">
                      {settings.enableSearch && (
                        <div className="mb-4 flex items-center space-x-2" role="search" aria-label="PDF text search">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search in document..."
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            aria-label="Search in document"
                          />
                          <button
                            onClick={handleSearch}
                            className="bg-violet-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-700 transition-all duration-200"
                            aria-label="Search"
                          >Search</button>
                          {searchMatches.length > 1 && (
                            <>
                              <button
                                onClick={() => {
                                  const idx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
                                  setCurrentMatchIdx(idx);
                                  setPageNumber(searchMatches[idx]);
                                }}
                                className="ml-2 px-2 py-1 rounded bg-gray-200"
                                aria-label="Previous match"
                              >Prev</button>
                              <span className="mx-2 text-sm text-gray-700">{currentMatchIdx + 1} / {searchMatches.length}</span>
                              <button
                                onClick={() => {
                                  const idx = (currentMatchIdx + 1) % searchMatches.length;
                                  setCurrentMatchIdx(idx);
                                  setPageNumber(searchMatches[idx]);
                                }}
                                className="px-2 py-1 rounded bg-gray-200"
                                aria-label="Next match"
                              >Next</button>
                            </>
                          )}
                        </div>
                      )}
                      <div className="mb-4">
                        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="px-3 py-1 rounded bg-gray-200 mr-2">Prev</button>
                        <span>Page {pageNumber} of {numPages || '?'}</span>
                        <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={numPages !== null && pageNumber >= numPages} className="px-3 py-1 rounded bg-gray-200 ml-2">Next</button>
                      </div>
                      <div className="mb-4">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-3 py-1 rounded bg-gray-200 mr-2">-</button>
                        <input
                          type="number"
                          value={Math.round(scale * 100)}
                          onChange={e => {
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = 100;
                            setScale(Math.max(0.5, Math.min(4, val / 100)));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          min="25"
                          max="400"
                          step="5"
                          aria-label="Zoom level percent"
                        />
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="px-3 py-1 rounded bg-gray-200 ml-2">+</button>
                      </div>
                      <div className="border rounded shadow overflow-auto bg-gray-50" style={{ width: '100%', maxWidth: 800 }} role="region" aria-label="PDF document viewer">
                        {getPagesToRender().map((p, idx) => (
                          <Page key={p} pageNumber={p} scale={scale} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Viewer Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-violet-600" />
                  <span>Viewer Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
                    <select
                      value={settings.viewMode}
                      onChange={e => setSettings(prev => ({ ...prev, viewMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="single">Single Page</option>
                      <option value="continuous">Continuous Scroll</option>
                      <option value="facing">Facing Pages</option>
                      <option value="book">Book Mode</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Level (%)</label>
                    <input
                      type="number"
                      value={settings.zoomLevel}
                      onChange={e => setSettings(prev => ({ ...prev, zoomLevel: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      min="25"
                      max="400"
                      step="25"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showThumbnails"
                      checked={settings.showThumbnails}
                      onChange={e => setSettings(prev => ({ ...prev, showThumbnails: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showThumbnails" className="text-sm font-medium text-gray-700">Show Thumbnails</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableSearch"
                      checked={settings.enableSearch}
                      onChange={e => setSettings(prev => ({ ...prev, enableSearch: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableSearch" className="text-sm font-medium text-gray-700">Enable Search</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {}}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Preparing Viewer...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5" />
                      <span>Open PDF Viewer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Viewer?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional online PDF viewing with advanced features and security</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to View PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to view your PDF files online</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to View Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF viewer for secure document viewing</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Eye className="h-5 w-5" />
                    <span>Start Viewing Now</span>
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

export default PDFViewer; 