import React, { useRef, useState, useEffect, useContext } from 'react';
import { Upload, Download, FileType, Layers, XCircle, CheckCircle } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';
import { NotificationProvider } from './NotificationProvider';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const features = [
  { icon: <Layers className="h-6 w-6" />, title: 'Merge PDFs', description: 'Combine multiple PDFs into one' },
  { icon: <Layers className="h-6 w-6" />, title: 'Split PDFs', description: 'Split PDFs by pages or sections' },
  { icon: <Layers className="h-6 w-6" />, title: 'Reorder Pages', description: 'Drag and drop to reorder pages' },
  { icon: <Layers className="h-6 w-6" />, title: 'Extract Pages', description: 'Extract specific pages from PDFs' },
];

const howToSteps = [
  { step: 1, title: 'Upload PDFs', description: 'Select or drag and drop your PDF files.' },
  { step: 2, title: 'Choose Organization', description: 'Select merge, split, reorder, or extract.' },
  { step: 3, title: 'Download Result', description: 'Get your organized PDF instantly.' },
];

const stats = [
  { icon: <Layers className="h-5 w-5" />, value: '80K+', label: 'PDFs Organized' },
  { icon: <Upload className="h-5 w-5" />, value: '< 20s', label: 'Processing Time' },
  { icon: <FileType className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <Download className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

// Helper for generating page labels for custom order UI
function getPageLabels(files: (File & { _pageCount?: number })[]): { label: string, fileIdx: number, pageIdx: number }[] {
  // For merge: all pages from all PDFs, label as 'FileName - Page N'
  // For reorder: all pages from the single PDF, label as 'Page N'
  return files.flatMap((file: File & { _pageCount?: number }, fileIdx: number) => {
    const pageCount = file._pageCount || 0;
    return Array.from({ length: pageCount }, (_: unknown, i: number) => ({
      label: files.length === 1 ? `Page ${i + 1}` : `${file.name} - Page ${i + 1}`,
      fileIdx,
      pageIdx: i
    }));
  });
}

// Notification context for banners
const NotificationContext = React.createContext<(msg: string, type?: 'success' | 'error') => void>(() => {});
function useNotification() { return useContext(NotificationContext); }

const PDFOrganize: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    organizationMode: 'merge',
    pageOrder: 'ascending',
    addBookmarks: false,
    addPageNumbers: false,
    splitRange: '',
    extractRange: '',
    customOrder: [] as number[],
  });
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [customOrderList, setCustomOrderList] = useState<{ label: string, fileIdx: number, pageIdx: number }[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const notify = useNotification();

  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    let errorMsg = '';
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        errorMsg = 'Only PDF files are allowed.';
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errorMsg = 'Duplicate file skipped: ' + file.name;
        continue;
      }
      deduped.push(file);
    }
    setFiles(deduped);
    if (errorMsg) setError(errorMsg);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const parsePages = (str: string, total: number) => {
    const result: number[] = [];
    str.split(',').forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) if (i > 0 && i <= total) result.push(i - 1);
      } else {
        const n = Number(part);
        if (n > 0 && n <= total) result.push(n - 1);
      }
    });
    return Array.from(new Set(result));
  };

  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [pagesPreview, setPagesPreview] = useState<{url: string, idx: number}[]>([]);

  // Helper to update custom order list when files or mode changes
  useEffect(() => {
    const updateCustomOrderList = async () => {
      if (settings.pageOrder !== 'custom') return;
      if (files.length === 0) {
        setCustomOrderList([]);
        return;
      }
      // Load page counts for each file
      const { PDFDocument } = await import('pdf-lib');
      const filesWithPageCounts = await Promise.all(files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        return { ...file, _pageCount: pdfDoc.getPageCount() };
      }));
      const labels = getPageLabels(filesWithPageCounts);
      setCustomOrderList(labels);
      // If no custom order set, initialize to default order
      if (!settings.customOrder || settings.customOrder.length !== labels.length) {
        setSettings(prev => ({ ...prev, customOrder: labels.map((_, i) => i) }));
      }
    };
    updateCustomOrderList();
    // eslint-disable-next-line
  }, [files, settings.organizationMode, settings.pageOrder]);

  // Handler for moving a page up/down in custom order
  const moveCustomOrder = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= customOrderList.length) return;
    const newOrder = [...settings.customOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setSettings(prev => ({ ...prev, customOrder: newOrder }));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please upload at least one PDF file.');
      notify('Please upload at least one PDF file.', 'error');
      return;
    }
    if (settings.organizationMode === 'reorder' && files.length !== 1) {
      setError('Please upload a single PDF to reorder pages.');
      notify('Please upload a single PDF to reorder pages.', 'error');
      return;
    }
    if (settings.organizationMode === 'split' && !settings.splitRange.trim()) {
      setError('Please enter a valid split page range.');
      notify('Please enter a valid split page range.', 'error');
      return;
    }
    if (settings.organizationMode === 'extract' && !settings.extractRange.trim()) {
      setError('Please enter a valid extract page range.');
      notify('Please enter a valid extract page range.', 'error');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      let outputPdf: any = null;
      const outputBlobs: { name: string, blob: Blob }[] = [];
      if (settings.organizationMode === 'merge') {
        outputPdf = await PDFDocument.create();
        let allPages: any[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pages = await outputPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          allPages.push(...pages);
        }
        if (settings.pageOrder === 'descending') allPages.reverse();
        if (settings.pageOrder === 'custom' && settings.customOrder.length === allPages.length) {
          allPages = settings.customOrder.map(idx => allPages[idx]);
        }
        allPages.forEach(p => outputPdf.addPage(p));
        if (settings.addPageNumbers) {
          const pages = outputPdf.getPages();
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            page.drawText(`${i + 1}`, { x: width / 2 - 10, y: 30, size: 12, color: rgb(0.5, 0.5, 0.5) });
          }
        }
        const pdfBytes = await outputPdf.save();
        outputBlobs.push({ name: 'merged.pdf', blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
      } else if (settings.organizationMode === 'split') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          const splitIndices = parsePages(settings.splitRange, totalPages);
          if (splitIndices.length === 0) {
            setError('No valid pages selected for splitting.');
            setIsProcessing(false);
            notify('No valid pages selected for splitting.', 'error');
            return;
          }
          for (const idx of splitIndices) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [idx]);
            newPdf.addPage(page);
            if (settings.addPageNumbers) {
              const pages = newPdf.getPages();
              for (let j = 0; j < pages.length; j++) {
                const p = pages[j];
                const { width, height } = p.getSize();
                p.drawText(`${j + 1}`, { x: width / 2 - 10, y: 30, size: 12, color: rgb(0.5, 0.5, 0.5) });
              }
            }
            const pdfBytes = await newPdf.save();
            outputBlobs.push({ name: `${file.name.replace(/\.pdf$/i, '')}_page${idx + 1}.pdf`, blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
          }
        }
      } else if (settings.organizationMode === 'extract') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          const extractIndices = parsePages(settings.extractRange, totalPages);
          if (extractIndices.length === 0) {
            setError('No valid pages selected for extraction.');
            setIsProcessing(false);
            notify('No valid pages selected for extraction.', 'error');
            return;
          }
          const newPdf = await PDFDocument.create();
          for (const idx of extractIndices) {
            const [page] = await newPdf.copyPages(pdfDoc, [idx]);
            newPdf.addPage(page);
          }
          if (settings.addPageNumbers) {
            const pages = newPdf.getPages();
            for (let j = 0; j < pages.length; j++) {
              const p = pages[j];
              const { width, height } = p.getSize();
              p.drawText(`${j + 1}`, { x: width / 2 - 10, y: 30, size: 12, color: rgb(0.5, 0.5, 0.5) });
            }
          }
          const pdfBytes = await newPdf.save();
          outputBlobs.push({ name: `${file.name.replace(/\.pdf$/i, '')}_extracted.pdf`, blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
        }
      } else if (settings.organizationMode === 'reorder') {
        if (files.length !== 1) {
          setError('Please upload a single PDF to reorder pages.');
          setIsProcessing(false);
          notify('Please upload a single PDF to reorder pages.', 'error');
          return;
        }
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        let order = pageOrder.length === totalPages ? pageOrder : Array.from({ length: totalPages }, (_, i) => i);
        if (settings.pageOrder === 'custom' && settings.customOrder.length === totalPages) {
          order = settings.customOrder;
        }
        const newPdf = await PDFDocument.create();
        for (const idx of order) {
          const [page] = await newPdf.copyPages(pdfDoc, [idx]);
          newPdf.addPage(page);
        }
        if (settings.addPageNumbers) {
          const pages = newPdf.getPages();
          for (let j = 0; j < pages.length; j++) {
            const p = pages[j];
            const { width, height } = p.getSize();
            p.drawText(`${j + 1}`, { x: width / 2 - 10, y: 30, size: 12, color: rgb(0.5, 0.5, 0.5) });
          }
        }
        const pdfBytes = await newPdf.save();
        outputBlobs.push({ name: `${file.name.replace(/\.pdf$/i, '')}_reordered.pdf`, blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
      }
      if (outputBlobs.length > 1) {
        const zip = new JSZip();
        outputBlobs.forEach(({ name, blob }) => zip.file(name, blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'organized_pdfs.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('Downloaded all organized PDFs as ZIP!', 'success');
      } else if (outputBlobs.length === 1) {
        const { name, blob } = outputBlobs[0];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('Downloaded organized PDF!', 'success');
      }
      setProcessedFiles(outputBlobs);
      setIsProcessing(false);
      setSuccess('PDF organization completed!');
      notify('PDF organization completed!', 'success');
    } catch (error) {
      setError('Error organizing PDFs. Please try again.');
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    // Simulate download
    alert('Download all organized PDFs');
  };

  // Live preview effect
  useEffect(() => {
    // Phase 1: Generate preview PDF bytes
    const generatePreviewPdf = async () => {
      if (files.length === 0) {
        setPreviewUrl(null);
        setPreviewError(null);
        setPreviewPdfBytes(null);
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const { PDFDocument, rgb } = await import('pdf-lib');
        let outputPdf: any = null;
        if (settings.organizationMode === 'merge') {
          outputPdf = await PDFDocument.create();
          let allPages: any[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = await outputPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            allPages.push(...pages);
          }
          if (settings.pageOrder === 'descending') allPages.reverse();
          if (settings.pageOrder === 'custom' && settings.customOrder.length === allPages.length) {
            allPages = settings.customOrder.map(idx => allPages[idx]);
          }
          allPages.forEach(p => outputPdf.addPage(p));
          if (settings.addPageNumbers) {
            const pages = outputPdf.getPages();
            for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              const { width, height } = page.getSize();
              page.drawText(`${i + 1}`, { x: width / 2 - 10, y: 30, size: 12, color: rgb(0.5, 0.5, 0.5) });
            }
          }
        } else if (settings.organizationMode === 'split') {
          const file = files[0];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          const splitIndices = parsePages(settings.splitRange, totalPages);
          if (splitIndices.length === 0) {
            setPreviewUrl(null);
            setPreviewLoading(false);
            setPreviewPdfBytes(null);
            return;
          }
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [splitIndices[0]]);
          newPdf.addPage(page);
          outputPdf = newPdf;
        } else if (settings.organizationMode === 'extract') {
          const file = files[0];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          const extractIndices = parsePages(settings.extractRange, totalPages);
          if (extractIndices.length === 0) {
            setPreviewUrl(null);
            setPreviewLoading(false);
            setPreviewPdfBytes(null);
            return;
          }
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [extractIndices[0]]);
          newPdf.addPage(page);
          outputPdf = newPdf;
        } else if (settings.organizationMode === 'reorder') {
          if (files.length !== 1) {
            setPreviewUrl(null);
            setPreviewLoading(false);
            setPreviewPdfBytes(null);
            return;
          }
          const file = files[0];
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          let order = pageOrder.length === totalPages ? pageOrder : Array.from({ length: totalPages }, (_, i) => i);
          if (settings.pageOrder === 'custom' && settings.customOrder.length === totalPages) {
            order = settings.customOrder;
          }
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [order[0]]);
          newPdf.addPage(page);
          outputPdf = newPdf;
        }
        const pdfBytes = await outputPdf.save();
        setPreviewPdfBytes(pdfBytes);
        setPreviewUrl('canvas');
      } catch (e) {
        console.error('Live preview PDF generation failed:', e);
        setPreviewUrl(null);
        setPreviewError(e instanceof Error ? e.message : String(e));
        setPreviewPdfBytes(null);
      }
      setPreviewLoading(false);
    };
    generatePreviewPdf();
     
  }, [files, settings, pageOrder]);

  useEffect(() => {
    // Phase 2: Render preview PDF to canvas when both are available
    const renderToCanvas = async () => {
      if (!previewPdfBytes || !canvasRef.current) return;
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const loadingTask = pdfjsLib.getDocument({ data: previewPdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Preview canvas not available');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.error('Live preview rendering failed:', e);
        setPreviewUrl(null);
        setPreviewError(e instanceof Error ? e.message : String(e));
      }
    };
    if (previewUrl === 'canvas' && previewPdfBytes && canvasRef.current) {
      renderToCanvas();
    }
  }, [previewUrl, previewPdfBytes, canvasRef]);

  return (
    <div>
      <SEO
        title="PDF Organize | Manage PDF Pages Quickly & Easily"
        description="Use our PDF organize tool to reorder, delete, or rotate pages in your PDF documents. Free, intuitive, and perfect for efficient PDF management."
        keywords="PDF organize, organize PDF, merge PDF, split PDF, reorder PDF, extract PDF, online tool, free tool"
        canonical="pdf-organize"
        ogImage="/images/pdf-organize-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Layers className="h-4 w-4" />
                <span>PDF Organize</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Organize PDFs</span> Instantly
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Organize your PDF documents with advanced merge, split, reorder, and extract features. Fast, secure, and free.
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
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
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
              {/* Live Preview */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 flex flex-col items-center">
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mb-4"></div>Loading preview...</div>
                  ) : previewError ? (
                    <div className="text-red-600 font-semibold flex flex-col items-center justify-center h-64">
                      <XCircle className="h-8 w-8 mb-2" />
                      <span>Preview failed: {previewError}</span>
                    </div>
                  ) : previewUrl === 'canvas' ? (
                    <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 2px 8px #0001' }} />
                  ) : (
                    <p>No live preview available for PDF organization.<br/>Organization will merge, split, or reorder pages and generate organized PDFs for download.</p>
                  )}
                </div>
              </div>

              {/* Processed Files */}
              {processedFiles.length > 0 && (
                <div className="mb-8" aria-label="Processed Files">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Download className="h-5 w-5 text-green-600" />
                    <span>Download Processed PDFs</span>
                  </h3>
                  <div className="bg-green-50 rounded-xl p-4 flex flex-col gap-2">
                    {processedFiles.length === 1 ? (
                      <button
                        onClick={() => {
                          const { name, blob } = processedFiles[0];
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                        aria-label={`Download ${processedFiles[0].name}`}
                      >
                        <Download className="h-5 w-5" />
                        <span>Download {processedFiles[0].name}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            const JSZip = (await import('jszip')).default;
                            const zip = new JSZip();
                            processedFiles.forEach(({ name, blob }) => zip.file(name, blob));
                            const zipBlob = await zip.generateAsync({ type: 'blob' });
                            const url = URL.createObjectURL(zipBlob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'organized_pdfs.zip';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                          aria-label="Download all as ZIP"
                        >
                          <Download className="h-5 w-5" />
                          <span>Download All as ZIP</span>
                        </button>
                        <ul className="mt-4 space-y-2">
                          {processedFiles.map(({ name }, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-green-900">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>{name}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Organization Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-violet-600" />
                  <span>Organization Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization Mode</label>
                    <select
                      value={settings.organizationMode}
                      onChange={e => setSettings(prev => ({ ...prev, organizationMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="merge">Merge PDFs</option>
                      <option value="split">Split by Pages</option>
                      <option value="reorder">Reorder Pages</option>
                      <option value="extract">Extract Pages</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Order</label>
                    <select
                      value={settings.pageOrder}
                      onChange={e => setSettings(prev => ({ ...prev, pageOrder: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="ascending">Ascending</option>
                      <option value="descending">Descending</option>
                      <option value="custom">Custom Order</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="addBookmarks"
                      checked={settings.addBookmarks}
                      onChange={e => setSettings(prev => ({ ...prev, addBookmarks: e.target.checked }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addBookmarks" className="text-sm font-medium text-gray-700">
                      Add Bookmarks
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="addPageNumbers"
                      checked={settings.addPageNumbers}
                      onChange={e => setSettings(prev => ({ ...prev, addPageNumbers: e.target.checked }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addPageNumbers" className="text-sm font-medium text-gray-700">
                      Add Page Numbers
                    </label>
                  </div>
                </div>
                {settings.addBookmarks && (
                  <div className="mt-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm" role="alert">
                    <strong>Note:</strong> Bookmark support is not available in the current version. This feature will be enabled when supported by the PDF engine.
                  </div>
                )}
                {settings.pageOrder === 'custom' && customOrderList.length > 0 && (
                  <div className="mt-4" aria-label="Custom Page Order">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Set Custom Page Order</h4>
                    <ul className="space-y-2" role="listbox">
                      {settings.customOrder.map((orderIdx, idx) => (
                        <li key={orderIdx} className="flex items-center gap-2" role="option" aria-posinset={idx+1} aria-setsize={customOrderList.length}>
                          <span className="flex-1">{customOrderList[orderIdx]?.label}</span>
                          <button aria-label={`Move up`} disabled={idx === 0} onClick={() => moveCustomOrder(idx, idx-1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50">↑</button>
                          <button aria-label={`Move down`} disabled={idx === customOrderList.length-1} onClick={() => moveCustomOrder(idx, idx+1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50">↓</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                      <span>Organizing PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="h-5 w-5" />
                      <span>Organize PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Organized PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Organize Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced organization technology for efficient PDF document management</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Organize PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to organize your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Organize Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF organize tool for document management</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Layers className="h-5 w-5" />
                    <span>Start Organizing Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {banner && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800" role="status">{banner}</div>
      )}
    </div>
  );
};

const PDFOrganizeWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFOrganize />
  </NotificationProvider>
);

export default PDFOrganizeWithProvider; 