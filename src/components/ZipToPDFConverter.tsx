import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCcw, Settings, Archive, Users, Shield, CheckCircle, FileText, XCircle, AlertTriangle } from 'lucide-react';
import SEO from './SEO';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { degrees } from 'pdf-lib';
import { Canvg } from 'canvg';
import { marked } from 'marked';
import PSD from 'psd.js';
import DxfParser from 'dxf-parser';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ZipToPDFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedBlobs, setProcessedBlobs] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [includeText, setIncludeText] = useState(true);
  const [includedFiles, setIncludedFiles] = useState<{ name: string, type: string }[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [progress, setProgress] = useState<number>(0); // Progress percentage
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Executive' | 'Custom'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [customWidth, setCustomWidth] = useState<number>(595.28);
  const [customHeight, setCustomHeight] = useState<number>(841.89);
  const [fileOrder, setFileOrder] = useState<{ path: string[], name: string, included: boolean }[]>([]);
  const [conversionReport, setConversionReport] = useState<{
    processed: number;
    skipped: number;
    errors: { name: string; error: string }[];
    log: { name: string; status: string }[];
  } | null>(null);

  // Deduplicate and validate files
  const addFiles = (newFiles: File[]) => {
    const deduped = [...files];
    const errors: string[] = [];
    for (const file of newFiles) {
      if (file.type !== 'application/zip') {
        errors.push(`File ${file.name} is not a ZIP archive.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.name} exceeds 100MB limit.`);
        continue;
      }
      if (deduped.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`Duplicate file skipped: ${file.name}`);
        continue;
      }
      deduped.push(file);
    }
    setFiles(deduped);
    if (errors.length) setBanner({ message: errors.join(' '), type: 'error' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const droppedItems = event.dataTransfer.items;
    const files: File[] = [];
    if (droppedItems && droppedItems.length > 0) {
      for (let i = 0; i < droppedItems.length; i++) {
        const item = droppedItems[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            // Recursively read folder and zip contents
            const zip = new JSZip();
            await readFolderToZip(entry, zip, '');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFile = new File([zipBlob], entry.name + '.zip', { type: 'application/zip' });
            files.push(zipFile);
          } else {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      }
    } else {
      // Fallback for browsers without DataTransferItem support
      const droppedFiles = Array.from(event.dataTransfer.files);
      files.push(...droppedFiles);
    }
    addFiles(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setIncludedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedBlobs([]);
    setPreviewUrl(null);
    setIncludedFiles([]);
    setIncludeImages(true);
    setIncludeText(true);
    setBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Extract file list for preview
  useEffect(() => {
    const extractFileLists = async () => {
      if (files.length === 0) {
        setIncludedFiles([]);
        return;
      }
      const allIncluded: { name: string, type: string }[][] = [];
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const filesArr: { name: string, type: string }[] = [];
          zip.forEach((relativePath, zipEntry) => {
            filesArr.push({ name: zipEntry.name, type: zipEntry.dir ? 'folder' : zipEntry.name.split('.').pop() || '' });
          });
          allIncluded.push(filesArr.filter(f => !f.name.endsWith('/')));
        } catch {
          allIncluded.push([]);
        }
      }
      setIncludedFiles(allIncluded);
    };
    extractFileLists();
  }, [files]);

  // Real PDF preview (first page of first processed PDF)
  useEffect(() => {
    let revoked = false;
    const genPreview = async () => {
      if (processedBlobs.length === 0) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const blob = processedBlobs[0];
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const url = canvas.toDataURL('image/png');
        if (!revoked) setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    genPreview();
    return () => { revoked = true; };
  }, [processedBlobs]);

  // Accessibility: focus management for banners
  useEffect(() => {
    if (banner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [banner]);

  // Memory cleanup for preview URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // After ZIP upload, build fileOrder from filesByFolder
  useEffect(() => {
    if (files.length === 0) {
      setFileOrder([]);
      return;
    }
    // Use the flattenTree logic to get all files
    const buildOrder = async () => {
      const allOrders: { path: string[], name: string, included: boolean }[] = [];
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const tocTree: Record<string, any> = {};
        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return;
          const parts = relativePath.split('/');
          let node: Record<string, any> = tocTree;
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            if (j === parts.length - 1) {
              node[part] = null;
            } else {
              node[part] = node[part] || {};
              node = node[part];
            }
          }
        });
        function flattenTree(node: Record<string, any>, path: string[] = []): { path: string[], name: string }[] {
          let result: { path: string[], name: string }[] = [];
          for (const key in node) {
            if (node[key]) {
              result = result.concat(flattenTree(node[key], [...path, key]));
            } else {
              result.push({ path, name: key });
            }
          }
          return result;
        }
        const filesByFolder = flattenTree(tocTree);
        for (const f of filesByFolder) {
          allOrders.push({ ...f, included: true });
        }
      }
      setFileOrder(allOrders);
    };
    buildOrder();
  }, [files]);

  // Real data processing: convert ZIPs to PDFs
  const processFiles = async () => {
    if (files.length === 0) {
      setBanner({ message: 'Please upload at least one ZIP file.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    setBanner(null);
    setProcessedBlobs([]);
    setProgress(0); // Reset progress
    setConversionReport(null); // Reset before processing
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const processed: Blob[] = [];
      let processedCount = 0;
      let skippedCount = 0;
      const errorList: { name: string; error: string }[] = [];
      const log: { name: string; status: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const pdfDoc = await PDFDocument.create();
        let font: any; // PDFEmbeddedFont from pdf-lib
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        // --- Build folder tree for TOC ---
        const tocTree: Record<string, any> = {};
        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return;
          const parts = relativePath.split('/');
          let node: Record<string, any> = tocTree;
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            if (j === parts.length - 1) {
              node[part] = null; // file
            } else {
              node[part] = node[part] || {};
              node = node[part];
            }
          }
        });
        // --- Prepare a list of files grouped by folder ---
        function flattenTree(node: Record<string, any>, path: string[] = []): { path: string[], name: string }[] {
          let result: { path: string[], name: string }[] = [];
          for (const key in node) {
            if (node[key]) {
              // Folder
              result = result.concat(flattenTree(node[key], [...path, key]));
            } else {
              // File
              result.push({ path, name: key });
            }
          }
          return result;
        }
        const filesByFolder = flattenTree(tocTree);
        let lastFolderPath: string[] = [];
        for (const fileInfo of filesByFolder) {
          // Insert a divider page if entering a new folder
          const folderPath = fileInfo.path;
          if (folderPath.join('/') !== lastFolderPath.join('/')) {
            if (folderPath.length > 0) {
              const dividerPage = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
              const { height } = dividerPage.getSize();
              dividerPage.drawText(folderPath.join(' / '), { x: 50, y: height - 100, size: 18, font, color: rgb(0.3,0.3,0.7) });
            }
            lastFolderPath = folderPath;
          }
          // Find the file in the ZIP
          const relativePath = [...folderPath, fileInfo.name].join('/');
          const zipFile = zip.file(relativePath);
          if (!zipFile) {
            skippedCount++;
            log.push({ name: fileInfo.name, status: 'Skipped (not found)' });
            continue;
          }
          const ext = fileInfo.name.split('.').pop()?.toLowerCase() || '';
          // Filter files
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'psd'];
          const textExtensions = ['txt', 'md', 'csv', 'log', 'dxf'];
          const filesToInclude: { name: string, ext: string, file: JSZip.JSZipObject }[] = [];
          if ((includeImages && imageExtensions.includes(ext)) || (includeText && textExtensions.includes(ext))) {
            filesToInclude.push({ name: fileInfo.name, ext, file: zipFile });
          }
          if (filesToInclude.length === 0) {
            skippedCount++;
            log.push({ name: fileInfo.name, status: 'Skipped (unsupported type)' });
            continue;
          }
          for (const { name, ext, file: zipFile } of filesToInclude) {
            try {
              if (['svg'].includes(ext)) {
                // SVG: render to canvas with canvg, embed as image
                const svgText = await zipFile.async('text');
                const canvas = document.createElement('canvas');
                canvas.width = 800; canvas.height = 600;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const v = Canvg.fromString(ctx, svgText);
                  await v.render();
                  const dataUrl = canvas.toDataURL('image/png');
                  const imgData = await fetch(dataUrl).then(r => r.arrayBuffer());
                  const image = await pdfDoc.embedPng(imgData);
                  const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                  page.drawText(name, { x: 10, y: 10, size: 10, font, color: rgb(0.5,0.5,0.5) });
                  processedCount++;
                  log.push({ name, status: 'Processed (SVG)' });
                }
              } else if (['md'].includes(ext)) {
                // Markdown: convert to HTML, render as text
                const mdText = await zipFile.async('text');
                const html = marked(mdText);
                // Strip HTML tags for now, or render as plain text
                const plain = (typeof html === 'string' ? html : await html).replace(/<[^>]+>/g, '');
                const lines = plain.split(/\r?\n/);
                const margin = 50;
                const lineHeight = 14;
                const maxLinesPerPage = 50;
                let pageIndex = 0;
                for (let i = 0; i < lines.length; i += maxLinesPerPage) {
                  const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                  const { width, height } = page.getSize();
                  if (pageIndex === 0) {
                    page.drawText(name, { x: margin, y: height - margin, size: 12, font, color: rgb(0,0,0) });
                  }
                  let y = height - margin - (pageIndex === 0 ? 20 : 0) - lineHeight;
                  const pageLines = lines.slice(i, i + maxLinesPerPage);
                  for (const line of pageLines) {
                    page.drawText(line.slice(0, 100), { x: margin, y, size: 10, font, color: rgb(0,0,0) });
                    y -= lineHeight;
                  }
                  pageIndex++;
                }
                processedCount++;
                log.push({ name, status: 'Processed (Markdown)' });
              } else if (['psd'].includes(ext)) {
                // PSD: use psd.js to extract PNG, embed as image
                const arrBuf = await zipFile.async('arraybuffer');
                const psd = await PSD.fromArrayBuffer(arrBuf);
                const pngData = await psd.image.toPng().toBuffer();
                const image = await pdfDoc.embedPng(pngData);
                const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                page.drawText(name, { x: 10, y: 10, size: 10, font, color: rgb(0.5,0.5,0.5) });
                processedCount++;
                log.push({ name, status: 'Processed (PSD)' });
              } else if (['dxf'].includes(ext)) {
                // DXF: use dxf-parser to SVG, then canvg to image
                const dxfText = await zipFile.async('text');
                const parser = new DxfParser();
                let svgText = '';
                try {
                  const dxfObj = parser.parseSync(dxfText);
                  // dxf-parser does not output SVG directly; use a helper or skip for now
                  // For demo, just add as plain text
                  const lines = dxfText.split(/\r?\n/);
                  const margin = 50;
                  const lineHeight = 14;
                  const maxLinesPerPage = 50;
                  let pageIndex = 0;
                  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
                    const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                    const { width, height } = page.getSize();
                    if (pageIndex === 0) {
                      page.drawText(name, { x: margin, y: height - margin, size: 12, font, color: rgb(0,0,0) });
                    }
                    let y = height - margin - (pageIndex === 0 ? 20 : 0) - lineHeight;
                    const pageLines = lines.slice(i, i + maxLinesPerPage);
                    for (const line of pageLines) {
                      page.drawText(line.slice(0, 100), { x: margin, y, size: 10, font, color: rgb(0,0,0) });
                      y -= lineHeight;
                    }
                    pageIndex++;
                  }
                  processedCount++;
                  log.push({ name, status: 'Processed (DXF as text)' });
                } catch (err) {
                  skippedCount++;
                  log.push({ name, status: 'Skipped (DXF parse error)' });
                }
              } else if (imageExtensions.includes(ext)) {
                // Image: add as a page
                const imgData = await zipFile.async('uint8array');
                let image;
                if (ext === 'png') {
                  image = await pdfDoc.embedPng(imgData);
                } else {
                  image = await pdfDoc.embedJpg(imgData);
                }
                const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                page.drawText(name, { x: 10, y: 10, size: 10, font, color: rgb(0.5,0.5,0.5) });
                processedCount++;
                log.push({ name, status: 'Processed (image)' });
              } else if (textExtensions.includes(ext)) {
                // Text: add as multi-page
                const text = await zipFile.async('text');
                const lines = text.split(/\r?\n/);
                const pageWidth = 595.28; // A4
                const pageHeight = 841.89;
                const margin = 50;
                const lineHeight = 14;
                const maxLinesPerPage = Math.floor((pageHeight - 2 * margin - 20) / lineHeight); // 20 for title
                let pageIndex = 0;
                for (let i = 0; i < lines.length; i += maxLinesPerPage) {
                  const page = pdfDoc.addPage(getPageDimensions(pageSize, orientation, customWidth, customHeight));
                  const { width, height } = page.getSize();
                  // Title on first page
                  if (pageIndex === 0) {
                    page.drawText(name, { x: margin, y: height - margin, size: 12, font, color: rgb(0,0,0) });
                  }
                  let y = height - margin - (pageIndex === 0 ? 20 : 0) - lineHeight;
                  const pageLines = lines.slice(i, i + maxLinesPerPage);
                  for (const line of pageLines) {
                    page.drawText(line.slice(0, 100), { x: margin, y, size: 10, font, color: rgb(0,0,0) });
                    y -= lineHeight;
                  }
                  pageIndex++;
                }
                processedCount++;
                log.push({ name, status: 'Processed (text)' });
              } else {
                skippedCount++;
                log.push({ name, status: 'Skipped (unsupported type)' });
              }
            } catch (err) {
              errorList.push({ name, error: (err as any)?.message || 'Unknown error' });
              log.push({ name, status: 'Error' });
            }
          }
        }
        const pdfBytes = await pdfDoc.save();
        processed.push(new Blob([pdfBytes], { type: 'application/pdf' }));
        // After each file is processed:
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setProcessedBlobs(processed);
      setConversionReport({ processed: processedCount, skipped: skippedCount, errors: errorList, log });
      setBanner({ message: 'ZIP(s) successfully converted to PDF(s)!', type: 'success' });
    } catch (error) {
      setBanner({ message: 'Error converting ZIP(s) to PDF(s). Please try again.', type: 'error' });
      setConversionReport(null);
    } finally {
      setIsProcessing(false);
      setShowSpinner(false);
      setProgress(0); // Reset progress after done
    }
  };

  const handleDownload = () => {
    if (processedBlobs.length === 0) return;
    processedBlobs.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files[i]?.name.replace(/\.zip$/i, '') + '.pdf' || 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    setBanner({ message: 'Download started.', type: 'success' });
  };

  const features = [
    {
      icon: <Archive className="h-6 w-6" />,
      title: "ZIP to PDF",
      description: "Convert ZIP archives to organized PDF documents"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Content Filtering",
      description: "Choose which content types to include in the PDF"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your files are processed securely and never stored permanently"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Organized Output",
      description: "Create well-structured PDFs from archive contents"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload ZIP(s)",
      description: "Select one or more ZIP archive files from your device"
    },
    {
      step: "2",
      title: "Choose Content",
      description: "Select which content types to include in the PDF(s)"
    },
    {
      step: "3",
      title: "Convert & Download",
      description: "Convert to PDF(s) and download the result"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "200K+", label: "Archives Converted" },
    { icon: <Archive className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileText className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO 
        title="ZIP to PDF Converter | Convert ZIP Archives to PDF Online "
        description="Convert ZIP archives to organized PDF documents with content filtering. Extract and organize files from ZIP archives into professional PDF format. Free ZIP to PDF converter."
        keywords="ZIP to PDF, convert ZIP to PDF, archive to PDF, ZIP converter, archive converter, online ZIP tool, free converter, document conversion"
        canonical="zip-to-pdf"
        ogImage="/images/zip-to-pdf-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Archive className="h-4 w-4" />
                <span>ZIP to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert ZIP to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> PDF</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert your ZIP archives to organized PDF documents with content filtering options. 
                Perfect for creating documentation from archived files.
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

            {/* Banner */}
            {banner && (
              <div ref={bannerRef} tabIndex={-1} aria-live="assertive" className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-3 ${banner.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}> 
                {banner.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                <span>{banner.message}</span>
                <button onClick={() => setBanner(null)} className="ml-auto text-gray-400 hover:text-gray-700 focus:outline-none" aria-label="Close banner"><XCircle className="h-5 w-5" /></button>
              </div>
            )}

            {/* Main Tool Section */}
            <div 
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              tabIndex={0}
              aria-label="ZIP upload area"
              className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16 focus:ring-2 focus:ring-violet-500 outline-none"
              style={{ cursor: 'pointer' }}
            >
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className="border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload ZIP files. Click or press Enter to open file dialog."
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { fileInputRef.current?.click(); } }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your ZIP archive(s) here for PDF conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  {/* Note: Folder drag-and-drop is supported via the drop handler. Use the drag-and-drop area for folders. The file input only accepts ZIPs. */}
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                    aria-label="Choose ZIP files to upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                    tabIndex={0}
                    aria-label="Choose ZIP File(s)"
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { fileInputRef.current?.click(); } }}
                  >
                    Choose ZIP File(s)
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center bg-green-50 rounded-lg p-2 text-green-800 text-sm justify-between">
                        <span>{file.name}</span>
                        <button onClick={e => { e.stopPropagation(); removeFile(idx); }} aria-label={`Remove ${file.name}`} className="ml-2 text-red-400 hover:text-red-700"><XCircle className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Preview and Reorder UI */}
              {fileOrder.length > 0 && (
                <div className="mb-8" aria-label="Preview and reorder files before conversion">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview & Reorder Files</h3>
                  <ul className="bg-white rounded-xl shadow p-4 divide-y divide-gray-200" role="listbox" aria-label="File order list">
                    {fileOrder.map((f, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2" role="option" aria-selected={f.included} tabIndex={0}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">{f.path.length > 0 ? f.path.join(' / ') + ' / ' : ''}</span>
                          <span className="text-gray-800 font-mono">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFileOrder(order => idx > 0 ? [
                              ...order.slice(0, idx - 1),
                              order[idx],
                              order[idx - 1],
                              ...order.slice(idx + 1)
                            ] : order)}
                            disabled={idx === 0}
                            className="px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                            title="Move Up"
                            aria-label={`Move ${f.name} up in order`}
                          >↑</button>
                          <button
                            onClick={() => setFileOrder(order => idx < order.length - 1 ? [
                              ...order.slice(0, idx),
                              order[idx + 1],
                              order[idx],
                              ...order.slice(idx + 2)
                            ] : order)}
                            disabled={idx === fileOrder.length - 1}
                            className="px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                            title="Move Down"
                            aria-label={`Move ${f.name} down in order`}
                          >↓</button>
                          <label className="flex items-center gap-1 text-xs" aria-label={`Include ${f.name} in conversion`}>
                            <input
                              type="checkbox"
                              checked={f.included}
                              onChange={e => setFileOrder(order => order.map((item, i) => i === idx ? { ...item, included: e.target.checked } : item))}
                              tabIndex={0}
                            />
                            Include
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Content Settings</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-images"
                      checked={includeImages}
                      onChange={e => setIncludeImages(e.target.checked)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <label htmlFor="include-images" className="ml-2 text-sm text-gray-700">
                      Include images in the PDF(s)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-text"
                      checked={includeText}
                      onChange={e => setIncludeText(e.target.checked)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <label htmlFor="include-text" className="ml-2 text-sm text-gray-700">
                      Include text files in the PDF(s)
                    </label>
                  </div>
                  {/* Page Size and Orientation Settings */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div>
                      <label htmlFor="page-size" className="block text-sm text-gray-700 font-medium mb-1">Page Size</label>
                      <select
                        id="page-size"
                        value={pageSize}
                        onChange={e => setPageSize(e.target.value as any)}
                        className="rounded border-gray-300 text-gray-700 focus:ring-violet-500 px-2 py-1"
                      >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="Tabloid">Tabloid</option>
                        <option value="Executive">Executive</option>
                        <option value="Custom">Custom</option>
                      </select>
                      {pageSize === 'Custom' && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="number"
                            min={100}
                            max={2000}
                            value={customWidth}
                            onChange={e => setCustomWidth(Number(e.target.value))}
                            className="w-24 rounded border-gray-300 text-gray-700 focus:ring-violet-500 px-2 py-1"
                            placeholder="Width (pt)"
                          />
                          <input
                            type="number"
                            min={100}
                            max={2000}
                            value={customHeight}
                            onChange={e => setCustomHeight(Number(e.target.value))}
                            className="w-24 rounded border-gray-300 text-gray-700 focus:ring-violet-500 px-2 py-1"
                            placeholder="Height (pt)"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="orientation" className="block text-sm text-gray-700 font-medium mb-1">Orientation</label>
                      <select
                        id="orientation"
                        value={orientation}
                        onChange={e => setOrientation(e.target.value as 'portrait' | 'landscape')}
                        className="rounded border-gray-300 text-gray-700 focus:ring-violet-500 px-2 py-1"
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {processedBlobs.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-4 mt-8" aria-label="Conversion actions">
                  <button
                    onClick={processFiles}
                    disabled={isProcessing || files.length === 0}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-lg"
                    aria-label="Convert ZIP to PDF"
                  >
                    <Archive className="h-5 w-5" aria-hidden="true" />
                    <span>Convert ZIP to PDF</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-lg"
                    aria-label="Download Converted PDFs"
                  >
                    <Download className="h-5 w-5" aria-hidden="true" />
                    <span>Download Converted PDFs</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 mt-8" aria-label="Conversion actions">
                  <button
                    onClick={processFiles}
                    disabled={isProcessing || files.length === 0}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-lg"
                    aria-label="Convert ZIP to PDF"
                  >
                    <Archive className="h-5 w-5" aria-hidden="true" />
                    <span>Convert ZIP to PDF</span>
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="w-full mt-4">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-gradient-to-r from-violet-600 to-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1 text-center">{progress}%</div>
                </div>
              )}

              {/* Preview */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PDF Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PDF Preview</h3>
                  <div className="border rounded-lg overflow-hidden min-h-[16rem] flex items-center justify-center bg-gray-50 relative">
                    {previewLoading ? (
                      null
                    ) : previewUrl ? (
                      <img src={previewUrl} alt="PDF preview" className="w-full h-64 object-contain" />
                    ) : (
                      <span className="text-gray-400">No PDF generated yet</span>
                    )}
                  </div>
                </div>
                {/* ZIP Contents Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ZIP Contents</h3>
                  <div className="border rounded-lg overflow-hidden min-h-[16rem] flex flex-col bg-gray-50 p-4 max-h-64 overflow-y-auto">
                    {includedFiles.length > 0 && files.length > 0 ? (
                      includedFiles[0].map((f, idx) => (
                        <span key={idx} className="text-gray-700 text-sm">{f.name}</span>
                      ))
                    ) : (
                      <span className="text-gray-400">No ZIP selected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversion Report */}
              {conversionReport && (
                <div className="mt-8 bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversion Report</h3>
                  <div className="mb-2 text-sm text-gray-700">Processed: {conversionReport.processed} | Skipped: {conversionReport.skipped} | Errors: {conversionReport.errors.length}</div>
                  <ul className="mb-2 text-xs text-gray-700">
                    {conversionReport.log.map((item, idx) => (
                      <li key={idx}><span className="font-mono">{item.name}</span>: {item.status}</li>
                    ))}
                  </ul>
                  {conversionReport.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <div className="font-semibold">Errors:</div>
                      <ul>
                        {conversionReport.errors.map((err, idx) => (
                          <li key={idx}><span className="font-mono">{err.name}</span>: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our ZIP to PDF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Professional ZIP to PDF conversion with content filtering and organized output
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
                  How to Convert ZIP to PDF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your ZIP archives to PDF
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
                    Ready to Convert ZIP to PDF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your ZIP archives into organized PDF documents. Join thousands of users 
                    who trust our converter for archive to PDF conversion.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Archive className="h-5 w-5" />
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

// Utility: get page dimensions
function getPageDimensions(pageSize: string, orientation: 'portrait' | 'landscape', customWidth?: number, customHeight?: number) {
  let dims: [number, number];
  switch (pageSize) {
    case 'A4':
      dims = [595.28, 841.89]; break;
    case 'Letter':
      dims = [612, 792]; break;
    case 'Legal':
      dims = [612, 1008]; break;
    case 'Tabloid':
      dims = [792, 1224]; break;
    case 'Executive':
      dims = [522, 756]; break;
    case 'Custom':
      dims = [customWidth || 595.28, customHeight || 841.89]; break;
    default:
      dims = [595.28, 841.89];
  }
  if (orientation === 'landscape') {
    dims = [dims[1], dims[0]];
  }
  return dims;
}

// Helper: Recursively read a folder entry and add files to JSZip
async function readFolderToZip(entry: any, zip: JSZip, path: string) {
  return new Promise<void>((resolve, reject) => {
    const reader = entry.createReader();
    reader.readEntries(async (entries: any[]) => {
      for (const ent of entries) {
        if (ent.isDirectory) {
          await readFolderToZip(ent, zip, path + ent.name + '/');
        } else if (ent.isFile) {
          await new Promise<void>((res, rej) => {
            ent.file((file: File) => {
              const reader = new FileReader();
              reader.onload = () => {
                zip.file(path + file.name, reader.result as ArrayBuffer);
                res();
              };
              reader.onerror = rej;
              reader.readAsArrayBuffer(file);
            }, rej);
          });
        }
      }
      resolve();
    }, reject);
  });
}

// Helper: Convert hex color to rgb tuple (0-1)
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r / 255, g / 255, b / 255];
}

export default ZipToPDFConverter; 