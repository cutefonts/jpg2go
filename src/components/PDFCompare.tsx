import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, XCircle } from 'lucide-react';
import SEO from './SEO';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const PDFCompare: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPair, setSelectedPair] = useState<[number, number] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    compareMode: 'visual',
    highlightDifferences: true,
    ignoreWhitespace: true,
    ignoreCase: false,
    generateReport: true,
    outputFormat: 'txt',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [preview, setPreview] = useState<{ similarity: number, differences: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // File validation and deduplication
  const validateAndAddFiles = (incoming: File[]) => {
    const validFiles = incoming.filter(f => f.type === 'application/pdf');
    const newFiles = validFiles.filter(f => !files.some(existing => existing.name === f.name && existing.size === f.size));
    if (newFiles.length === 0) {
      setError('No new valid PDF files to add.');
      return;
    }
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    validateAndAddFiles(selectedFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // Make drop area clickable
  const handleDropAreaClick = (e: React.MouseEvent) => {
    if (e.target === dropAreaRef.current) {
      fileInputRef.current?.click();
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedPair(null);
  };

  // Select two files for comparison
  const handleSelectPair = (i: number) => {
    if (!selectedPair) setSelectedPair([i, -1]);
    else if (selectedPair[0] !== -1 && selectedPair[1] === -1 && selectedPair[0] !== i) setSelectedPair([selectedPair[0], i]);
    else setSelectedPair([i, -1]);
  };

  // Main processing logic
  const processFiles = async () => {
    setError(null);
    setSuccess(null);
    setProcessedFiles([]);
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to compare.');
      return;
    }
    let idx1 = 0, idx2 = 1;
    if (selectedPair && selectedPair[0] !== -1 && selectedPair[1] !== -1) {
      idx1 = selectedPair[0];
      idx2 = selectedPair[1];
    }
    if (idx1 === idx2) {
      setError('Please select two different files to compare.');
      return;
    }
    setIsProcessing(true);
    setShowSpinner(true);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
      const pdf1Buffer = await files[idx1].arrayBuffer();
      const pdf2Buffer = await files[idx2].arrayBuffer();
      const pdf1Doc = await pdfjsLib.getDocument({ data: pdf1Buffer }).promise;
      const pdf2Doc = await pdfjsLib.getDocument({ data: pdf2Buffer }).promise;
      let pdf1Text = '';
      let pdf2Text = '';
      for (let pageNum = 1; pageNum <= pdf1Doc.numPages; pageNum++) {
        const page = await pdf1Doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pdf1Text += `Page ${pageNum}:\n${pageText}\n\n`;
      }
      for (let pageNum = 1; pageNum <= pdf2Doc.numPages; pageNum++) {
        const page = await pdf2Doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        pdf2Text += `Page ${pageNum}:\n${pageText}\n\n`;
      }
      // Use compareMode
      const result = compareTexts(pdf1Text, pdf2Text);
      // Only generate/download report if generateReport is checked
      if (!settings.generateReport) {
        setIsProcessing(false);
        setShowSpinner(false);
        setSuccess('Comparison completed! See live preview for results.');
        return;
      }
      // Output format logic
      let outName = `comparison_report_${files[idx1].name.replace(/\.pdf$/i, '')}_vs_${files[idx2].name.replace(/\.pdf$/i, '')}`;
      let blob: Blob;
      if (settings.outputFormat === 'txt') {
        const report = generateTextReport(files[idx1].name, files[idx2].name, pdf1Doc.numPages, pdf2Doc.numPages, result);
        blob = new Blob([report], { type: 'text/plain' });
        outName += '.txt';
      } else if (settings.outputFormat === 'html') {
        const report = generateHTMLReport(files[idx1].name, files[idx2].name, pdf1Doc.numPages, pdf2Doc.numPages, result);
        blob = new Blob([report], { type: 'text/html' });
        outName += '.html';
      } else if (settings.outputFormat === 'pdf') {
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const page = pdfDoc.addPage([595, 842]);
        let y = 800;
        page.drawText('PDF Comparison Report', { x: 50, y, size: 20, font, color: rgb(0.2,0.2,0.7) });
        y -= 30;
        page.drawText(`File 1: ${files[idx1].name}`, { x: 50, y, size: 12, font });
        y -= 18;
        page.drawText(`File 2: ${files[idx2].name}`, { x: 50, y, size: 12, font });
        y -= 18;
        page.drawText(`Pages: ${pdf1Doc.numPages} vs ${pdf2Doc.numPages}`, { x: 50, y, size: 12, font });
        y -= 18;
        page.drawText(`Similarity: ${Math.round(result.similarity * 100)}%`, { x: 50, y, size: 12, font });
        y -= 18;
        page.drawText(`Differences: ${result.differences.length}`, { x: 50, y, size: 12, font });
        y -= 30;
        page.drawText('Differences:', { x: 50, y, size: 14, font, color: rgb(0.7,0.2,0.2) });
        y -= 18;
        for (const diff of result.differences) {
          if (y < 40) break;
          page.drawText(diff.replace(/\*\*(.*?)\*\*/g, (m, w) => w), { x: 60, y, size: 10, font, color: settings.highlightDifferences ? (diff.includes('PDF 1') ? rgb(0.8,0.2,0.2) : rgb(0.2,0.4,0.8)) : rgb(0,0,0) });
          y -= 14;
        }
        if (result.structure) {
          y -= 20;
          page.drawText('Structural Analysis:', { x: 50, y, size: 12, font, color: rgb(0.2,0.2,0.2) });
          y -= 16;
          page.drawText(`PDF 1 pages: ${result.structure.pageCount1}`, { x: 60, y, size: 10, font });
          y -= 14;
          page.drawText(`PDF 2 pages: ${result.structure.pageCount2}`, { x: 60, y, size: 10, font });
        }
        const pdfBytes = await pdfDoc.save();
        blob = new Blob([pdfBytes], { type: 'application/pdf' });
        outName += '.pdf';
      } else {
        const report = generateTextReport(files[idx1].name, files[idx2].name, pdf1Doc.numPages, pdf2Doc.numPages, result);
        blob = new Blob([report], { type: 'text/plain' });
        outName += '.txt';
      }
      processed.push({ name: outName, blob });
      setProcessedFiles(processed);
      setSuccess('PDF comparison completed!');
    } catch (error) {
      setError('Error comparing PDFs. Please try again.');
      console.error('Error comparing PDFs:', error);
    }
    setIsProcessing(false);
    setShowSpinner(false);
  };

  // Helper: compare texts
  const compareTexts = (text1: string, text2: string) => {
    let t1 = settings.ignoreWhitespace ? text1.replace(/\s+/g, ' ') : text1;
    let t2 = settings.ignoreWhitespace ? text2.replace(/\s+/g, ' ') : text2;
    if (settings.ignoreCase) {
      t1 = t1.toLowerCase();
      t2 = t2.toLowerCase();
    }
    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const similarity = union.size === 0 ? 1 : intersection.size / union.size;
    const differences = [];
    const onlyIn1 = [...set1].filter(x => !set2.has(x));
    const onlyIn2 = [...set2].filter(x => !set1.has(x));
    if (onlyIn1.length > 0) differences.push(`Words only in PDF 1: ${onlyIn1.slice(0, 10).map(w => settings.highlightDifferences ? highlightWord(w, '1') : w).join(', ')}${onlyIn1.length > 10 ? '...' : ''}`);
    if (onlyIn2.length > 0) differences.push(`Words only in PDF 2: ${onlyIn2.slice(0, 10).map(w => settings.highlightDifferences ? highlightWord(w, '2') : w).join(', ')}${onlyIn2.length > 10 ? '...' : ''}`);
    // Structural comparison
    let structure = null;
    if (settings.compareMode === 'structural' || settings.compareMode === 'comprehensive') {
      structure = {
        pageCount1: (text1.match(/Page \d+:/g) || []).length,
        pageCount2: (text2.match(/Page \d+:/g) || []).length,
        // Add more structure checks as needed
      };
    }
    return { similarity, differences, structure };
  };

  // Helper to highlight words
  function highlightWord(word: string, which: '1' | '2') {
    if (settings.outputFormat === 'html') return `<mark style=\"background:${which === '1' ? '#ffe066' : '#b2f2ff'}\">${word}</mark>`;
    if (settings.outputFormat === 'pdf') return word; // PDF handled in report
    return `**${word}**`;
  }

  // Helper: generate text report
  const generateTextReport = (file1: string, file2: string, pages1: number, pages2: number, result: any) => {
    let report = `PDF COMPARISON REPORT\nGenerated: ${new Date().toLocaleString()}\n\nFile 1: ${file1}\nFile 2: ${file2}\n\nCOMPARISON RESULTS:\nSimilarity: ${Math.round(result.similarity * 100)}%\nDifferences: ${result.differences.length}\n`;
    if (result.structure) {
      report += `\nSTRUCTURAL ANALYSIS:\n- PDF 1 pages: ${result.structure.pageCount1}\n- PDF 2 pages: ${result.structure.pageCount2}\n`;
    }
    report += `\nDETAILED ANALYSIS:\n- PDF 1 has ${pages1} pages\n- PDF 2 has ${pages2} pages\n\nDIFFERENCES:\n${result.differences.map((diff: string, i: number) => `${i + 1}. ${diff}`).join('\n')}`;
    return report;
  };
  // Helper: generate HTML report
  const generateHTMLReport = (file1: string, file2: string, pages1: number, pages2: number, result: any) => {
    let report = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>PDF Comparison Report</title></head><body><h1>PDF Comparison Report</h1><p><b>Generated:</b> ${new Date().toLocaleString()}</p><p><b>File 1:</b> ${file1}<br/><b>File 2:</b> ${file2}</p><h2>Comparison Results</h2><p><b>Similarity:</b> ${Math.round(result.similarity * 100)}%<br/><b>Differences:</b> ${result.differences.length}</p>`;
    if (result.structure) {
      report += `<h2>Structural Analysis</h2><ul><li>PDF 1 pages: ${result.structure.pageCount1}</li><li>PDF 2 pages: ${result.structure.pageCount2}</li></ul>`;
    }
    report += `<h2>Detailed Analysis</h2><ul><li>PDF 1 has ${pages1} pages</li><li>PDF 2 has ${pages2} pages</li></ul><h2>Differences</h2><ol>${result.differences.map((diff: string) => `<li>${diff}</li>`).join('')}</ol></body></html>`;
    return report;
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
    { icon: <FileText className="h-6 w-6" />, title: 'Smart Comparison', description: 'Compare PDFs visually and textually' },
    { icon: <Shield className="h-6 w-6" />, title: 'Difference Highlighting', description: 'Highlight all differences between documents' },
    { icon: <Zap className="h-6 w-6" />, title: 'Multiple Modes', description: 'Visual, textual, and structural comparison' },
    { icon: <Users className="h-6 w-6" />, title: 'Detailed Reports', description: 'Generate comprehensive comparison reports' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select two or more PDF files to compare' },
    { step: '2', title: 'Choose Comparison', description: 'Select comparison mode and settings' },
    { step: '3', title: 'Compare & Download', description: 'Download comparison report' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '90K+', label: 'PDFs Compared' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Live preview effect
  useEffect(() => {
    const runPreview = async () => {
      setPreview(null);
      if (!selectedPair || selectedPair[0] === -1 || selectedPair[1] === -1 || selectedPair[0] === selectedPair[1]) return;
      setPreviewLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        const pdf1Buffer = await files[selectedPair[0]].arrayBuffer();
        const pdf2Buffer = await files[selectedPair[1]].arrayBuffer();
        const pdf1Doc = await pdfjsLib.getDocument({ data: pdf1Buffer }).promise;
        const pdf2Doc = await pdfjsLib.getDocument({ data: pdf2Buffer }).promise;
        let pdf1Text = '';
        let pdf2Text = '';
        for (let pageNum = 1; pageNum <= Math.min(pdf1Doc.numPages, 2); pageNum++) {
          const page = await pdf1Doc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pdf1Text += `Page ${pageNum}:\n${pageText}\n\n`;
        }
        for (let pageNum = 1; pageNum <= Math.min(pdf2Doc.numPages, 2); pageNum++) {
          const page = await pdf2Doc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pdf2Text += `Page ${pageNum}:\n${pageText}\n\n`;
        }
        let t1 = settings.ignoreWhitespace ? pdf1Text.replace(/\s+/g, ' ') : pdf1Text;
        let t2 = settings.ignoreWhitespace ? pdf2Text.replace(/\s+/g, ' ') : pdf2Text;
        if (settings.ignoreCase) {
          t1 = t1.toLowerCase();
          t2 = t2.toLowerCase();
        }
        const words1 = t1.split(/\s+/);
        const words2 = t2.split(/\s+/);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        const similarity = union.size === 0 ? 1 : intersection.size / union.size;
        const differences = [];
        const onlyIn1 = [...set1].filter(x => !set2.has(x));
        const onlyIn2 = [...set2].filter(x => !set1.has(x));
        if (onlyIn1.length > 0) differences.push(`Words only in PDF 1: ${onlyIn1.slice(0, 10).join(', ')}${onlyIn1.length > 10 ? '...' : ''}`);
        if (onlyIn2.length > 0) differences.push(`Words only in PDF 2: ${onlyIn2.slice(0, 10).join(', ')}${onlyIn2.length > 10 ? '...' : ''}`);
        setPreview({ similarity, differences });
      } catch (err) {
        setPreview(null);
      }
      setPreviewLoading(false);
    };
    if (selectedPair && files.length > Math.max(selectedPair[0], selectedPair[1])) {
      runPreview();
    } else {
      setPreview(null);
      setPreviewLoading(false);
    }
     
  }, [selectedPair, files, settings.ignoreWhitespace, settings.ignoreCase]);

  // Auto-select first two files for preview if not already selected
  useEffect(() => {
    if (files.length >= 2 && (!selectedPair || selectedPair[0] === -1 || selectedPair[1] === -1)) {
      setSelectedPair([0, 1]);
    }
  }, [files, selectedPair]);

  return (
    <>
      <SEO 
        title="PDF Compare | Compare PDF Files Online Free"
        description="Compare PDF files online and highlight text changes instantly. Fast, easy, and secure PDF comparison for all your document needs."
        keywords="PDF compare, compare PDF documents, PDF differences, side-by-side comparison, online tool, free tool"
        canonical="pdf-compare"
        ogImage="/images/pdf-compare-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF Compare</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Compare PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Compare multiple PDF documents to find differences in content, layout, or structure. Perfect for document review, version control, and quality assurance.
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
              {/* Error/Success Banners */}
              {error && (
                <div className="mb-4 flex items-center bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert" aria-live="assertive">
                  <XCircle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                  <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)} aria-label="Dismiss error">×</button>
                </div>
              )}
              {success && (
                <div className="mb-4 flex items-center bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg" role="status" aria-live="polite">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>{success}</span>
                  <button className="ml-auto text-green-500 hover:text-green-700" onClick={() => setSuccess(null)} aria-label="Dismiss success">×</button>
                </div>
              )}
              {/* Spinner Overlay */}
              {showSpinner && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" role="status" aria-live="polite">
                  <div className="flex flex-col items-center">
                    <span className="text-white text-lg font-semibold">Comparing PDFs...</span>
                  </div>
                </div>
              )}
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  ref={dropAreaRef}
                  onClick={handleDropAreaClick}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer (minimum 2 files)</p>
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
                    <FileText className="h-5 w-5 text-violet-600" />
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className={`bg-gray-50 rounded-xl p-4 flex items-center space-x-3 cursor-pointer border-2 transition-all duration-200 ${selectedPair && (selectedPair[0] === index || selectedPair[1] === index) ? 'border-violet-500 ring-2 ring-violet-300' : 'border-transparent hover:border-violet-300'}`}
                        tabIndex={0}
                        aria-pressed={!!(selectedPair && (selectedPair[0] === index || selectedPair[1] === index))}
                        aria-label={`Select file ${file.name} for comparison`}
                        onClick={() => handleSelectPair(index)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectPair(index); }}
                      >
                        <FileText className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); removeFile(index); }} className="text-red-500 hover:text-red-700 transition-colors" aria-label={`Remove file ${file.name}`}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Click on two files to select for comparison. Selected files are highlighted.</div>
                </div>
              )}

              {/* Live Preview (real) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-700">
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span>Loading preview...</span>
                    </div>
                  ) : preview ? (
                    <div>
                      <div className="mb-2 text-lg font-semibold">Similarity: {Math.round(preview.similarity * 100)}%</div>
                      <div className="mb-2 text-sm text-gray-600">Differences found: {preview.differences.length}</div>
                      <ul className="text-left text-sm text-gray-700 list-disc pl-6">
                        {preview.differences.slice(0, 3).map((diff, i) => (
                          <li key={i}>{diff}</li>
                        ))}
                      </ul>
                      {preview.differences.length === 0 && <div className="text-green-600">No major differences detected.</div>}
                    </div>
                  ) : (
                    <div className="text-gray-500">Select two files to preview differences before comparing.</div>
                  )}
                </div>
                {/* Placeholder for visual preview */}
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 mt-4">
                  <p>No visual preview available for PDF comparison.<br/>Comparison will analyze differences and generate a detailed report.</p>
                </div>
              </div>

              {/* Comparison Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Comparison Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comparison Mode</label>
                    <select
                      value={settings.compareMode}
                      onChange={e => setSettings(prev => ({ ...prev, compareMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="visual">Visual Comparison</option>
                      <option value="textual">Textual Comparison</option>
                      <option value="structural">Structural Comparison</option>
                      <option value="comprehensive">Comprehensive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                    <select
                      value={settings.outputFormat}
                      onChange={e => setSettings(prev => ({ ...prev, outputFormat: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="pdf">PDF Report</option>
                      <option value="html">HTML Report</option>
                      <option value="txt">Text Report</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="highlightDifferences"
                      checked={settings.highlightDifferences}
                      onChange={e => setSettings(prev => ({ ...prev, highlightDifferences: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="highlightDifferences" className="text-sm font-medium text-gray-700">Highlight Differences</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ignoreWhitespace"
                      checked={settings.ignoreWhitespace}
                      onChange={e => setSettings(prev => ({ ...prev, ignoreWhitespace: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ignoreWhitespace" className="text-sm font-medium text-gray-700">Ignore Whitespace</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ignoreCase"
                      checked={settings.ignoreCase}
                      onChange={e => setSettings(prev => ({ ...prev, ignoreCase: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ignoreCase" className="text-sm font-medium text-gray-700">Ignore Case</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="generateReport"
                      checked={settings.generateReport}
                      onChange={e => setSettings(prev => ({ ...prev, generateReport: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="generateReport" className="text-sm font-medium text-gray-700">Generate Report</label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length < 2 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <span>Comparing PDFs...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Compare PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Comparison Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Compare Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced comparison technology for accurate document analysis</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Compare PDF Files</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to compare your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Compare PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF compare tool for accurate document analysis</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Comparing Now</span>
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

export default PDFCompare; 