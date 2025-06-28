import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, FileText, Download, Loader2, Trash2, ArrowRight, AlertTriangle, FileType } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFDeletePages: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
    const [settings, setSettings] = useState({
        deleteMode: 'range',
        pageRange: '',
        deleteFirst: 0,
        deleteLast: 0,
        keepEven: false,
        keepOdd: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [banner, setBanner] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Deduplication helper
    const addFiles = (newFiles: File[]) => {
        setFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            return [...prev, ...newFiles.filter(f => !existingNames.has(f.name))];
        });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length !== selectedFiles.length) {
            setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
        }
        addFiles(pdfFiles);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files);
        const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length !== droppedFiles.length) {
            setBanner({ message: 'Some files were skipped. Only PDF files are allowed.', type: 'error' });
        }
        addFiles(pdfFiles);
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Helper to parse page ranges like "1-3,5,7-9"
    function parsePageRange(range: string, totalPages: number): Set<number> {
        const pages = new Set<number>();
        if (!range) return pages;
        range.split(',').forEach(part => {
            const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
            if (!isNaN(start)) {
                if (!isNaN(end)) {
                    for (let i = start; i <= end && i <= totalPages; i++) pages.add(i - 1);
                } else {
                    if (start <= totalPages) pages.add(start - 1);
                }
            }
        });
        return pages;
    }

    const processFiles = async () => {
        if (files.length === 0) {
            setBanner({ message: 'No PDF files selected. Please upload at least one PDF.', type: 'error' });
            return;
        }
        setIsProcessing(true);
        setBanner(null);
        try {
            const processed: { name: string, blob: Blob }[] = [];
            for (const file of files) {
                try {
                    const fileBuffer = await file.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(fileBuffer);
                    const totalPages = pdfDoc.getPageCount();
                    let pagesToDelete = new Set<number>();
                    // Delete mode logic
                    if (settings.deleteMode === 'range') {
                        pagesToDelete = parsePageRange(settings.pageRange, totalPages);
                    } else if (settings.deleteMode === 'first') {
                        for (let i = 0; i < Math.min(settings.deleteFirst, totalPages); i++) pagesToDelete.add(i);
                    } else if (settings.deleteMode === 'last') {
                        for (let i = totalPages - settings.deleteLast; i < totalPages; i++) if (i >= 0) pagesToDelete.add(i);
                    } else if (settings.deleteMode === 'even') {
                        for (let i = 1; i < totalPages; i += 2) pagesToDelete.add(i);
                    } else if (settings.deleteMode === 'odd') {
                        for (let i = 0; i < totalPages; i += 2) pagesToDelete.add(i);
                    }
                    // Keep even/odd overrides
                    if (settings.keepEven) {
                        pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 !== 0));
                    }
                    if (settings.keepOdd) {
                        pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 === 0));
                    }
                    // Always keep at least one page
                    if (pagesToDelete.size >= totalPages) pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).slice(1));
                    const pages = pdfDoc.getPages();
                    const pagesToKeep = pages.filter((_, i) => !pagesToDelete.has(i));
                    const newPdfDoc = await PDFDocument.create();
                    for (const page of pagesToKeep) {
                        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pdfDoc.getPages().indexOf(page)]);
                        newPdfDoc.addPage(copiedPage);
                    }
                    const pdfBytes = await newPdfDoc.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    processed.push({ name: file.name.replace(/\.pdf$/i, '_cleaned.pdf'), blob });
                } catch (error) {
                    setBanner({ message: `Error processing ${file.name}. Skipping this file.`, type: 'error' });
                }
            }
            setProcessedFiles(processed);
            setIsProcessing(false);
            setBanner({ message: `Page deletion completed! Processed ${processed.length} files.`, type: 'success' });
        } catch (error) {
            setIsProcessing(false);
            setBanner({ message: 'Error deleting pages. Please try again.', type: 'error' });
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
        { icon: <Trash2 className="h-6 w-6" />, title: 'Advanced Deletion', description: 'Delete specific pages or page ranges' },
        { icon: <ArrowRight className="h-6 w-6" />, title: 'Batch Processing', description: 'Clean multiple PDF files at once' },
        { icon: <FileText className="h-6 w-6" />, title: 'Keep Formatting', description: 'Original document formatting is preserved' },
        { icon: <AlertTriangle className="h-6 w-6" />, title: 'Secure & Private', description: 'Files processed locally, no data stored' }
    ];

    const howToSteps = [
        { step: '1', title: 'Upload PDFs', description: 'Select the PDF files you want to clean' },
        { step: '2', title: 'Set Deletion Rules', description: 'Choose which pages to delete' },
        { step: '3', title: 'Download Cleaned Files', description: 'Download your cleaned PDF documents' }
    ];

    // Live preview of first page after deletion
    useEffect(() => {
        const genPreview = async () => {
            if (!files[0]) { setPreviewUrl(null); return; }
            try {
                const file = files[0];
                const fileBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(fileBuffer);
                const totalPages = pdfDoc.getPageCount();
                let pagesToDelete = new Set<number>();
                if (settings.deleteMode === 'range') {
                    pagesToDelete = parsePageRange(settings.pageRange, totalPages);
                } else if (settings.deleteMode === 'first') {
                    for (let i = 0; i < Math.min(settings.deleteFirst, totalPages); i++) pagesToDelete.add(i);
                } else if (settings.deleteMode === 'last') {
                    for (let i = totalPages - settings.deleteLast; i < totalPages; i++) if (i >= 0) pagesToDelete.add(i);
                } else if (settings.deleteMode === 'even') {
                    for (let i = 1; i < totalPages; i += 2) pagesToDelete.add(i);
                } else if (settings.deleteMode === 'odd') {
                    for (let i = 0; i < totalPages; i += 2) pagesToDelete.add(i);
                }
                if (settings.keepEven) {
                    pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 !== 0));
                }
                if (settings.keepOdd) {
                    pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).filter(i => (i + 1) % 2 === 0));
                }
                if (pagesToDelete.size >= totalPages) pagesToDelete = new Set(Array.from({ length: totalPages }, (_, i) => i).slice(1));
                const pages = pdfDoc.getPages();
                const pagesToKeep = pages.filter((_, i) => !pagesToDelete.has(i));
                if (pagesToKeep.length === 0) { setPreviewUrl(null); setBanner({ message: 'No pages left to preview after deletion.', type: 'error' }); return; }
                const newPdfDoc = await PDFDocument.create();
                const [firstPage] = pagesToKeep;
                const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pdfDoc.getPages().indexOf(firstPage)]);
                newPdfDoc.addPage(copiedPage);
                const pdfBytes = await newPdfDoc.save();
                // Use pdfjs-dist for rendering
                const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
                const pdf = await loadingTask.promise;
                const previewPage = await pdf.getPage(1);
                const viewport = previewPage.getViewport({ scale: 0.7 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { setBanner({ message: 'Failed to get canvas context for preview.', type: 'error' }); return; }
                await previewPage.render({ canvasContext: ctx, viewport }).promise;
                setPreviewUrl(canvas.toDataURL());
            } catch (err) {
                setPreviewUrl(null);
                setBanner({ message: 'Failed to generate live preview. See console for details.', type: 'error' });
                console.error('[LivePreview] Error generating preview:', err);
            }
        };
        genPreview();
         
    }, [files, settings]);

    // Spinner overlay
    const SpinnerOverlay = () => (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            {/* Spinner removed */}
        </div>
    );

    return (
        <>
            <SEO 
                title="PDF Delete Pages | Best Free PDF Page Remover"
                description="Remove pages from PDF files effortlessly using our free online PDF delete pages tool. Works instantly on any device—no sign-up required."
                keywords="PDF delete pages, remove PDF pages, PDF page remover, delete pages from PDF, online tool, free tool"
                canonical="pdf-delete-pages"
                ogImage="/images/pdf-delete-pages-og.jpg"
            />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
                {/* Hero Section */}
                <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <Trash2 className="h-4 w-4" />
                                <span>PDF Delete Pages</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                                Delete PDF Pages
                            </h1>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                                Remove specific pages or page ranges from your PDF documents. Clean up your PDFs by deleting unwanted pages with our advanced page deleter.
                            </p>
                        </div>

                        {/* Main Tool Section */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
                            {/* File Upload Area */}
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
                                    <Trash2 className="h-5 w-5 text-violet-600" />
                                    <span>Live Preview</span>
                                </h3>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Live preview of first page after deletion" className="mx-auto rounded shadow bg-white" style={{ maxHeight: 400 }} />
                                ) : (
                                    <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                                        <p>No live preview available for PDF page deletion.<br/>Deletion will remove selected pages and generate cleaned PDFs for download.</p>
                                    </div>
                                )}
                            </div>

                            {/* Delete Settings */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                    <Trash2 className="h-5 w-5 text-violet-600" />
                                    <span>Delete Settings</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delete Mode</label>
                                        <select
                                            value={settings.deleteMode}
                                            onChange={e => setSettings(prev => ({ ...prev, deleteMode: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        >
                                            <option value="range">Page Range</option>
                                            <option value="first">Delete First Pages</option>
                                            <option value="last">Delete Last Pages</option>
                                            <option value="even">Delete Even Pages</option>
                                            <option value="odd">Delete Odd Pages</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                                        <input
                                            type="text"
                                            value={settings.pageRange}
                                            onChange={e => setSettings(prev => ({ ...prev, pageRange: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            placeholder="e.g., 1-3, 5, 7-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delete First N Pages</label>
                                        <input
                                            type="number"
                                            value={settings.deleteFirst}
                                            onChange={e => setSettings(prev => ({ ...prev, deleteFirst: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delete Last N Pages</label>
                                        <input
                                            type="number"
                                            value={settings.deleteLast}
                                            onChange={e => setSettings(prev => ({ ...prev, deleteLast: Number(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="keepEven"
                                            checked={settings.keepEven}
                                            onChange={e => setSettings(prev => ({ ...prev, keepEven: e.target.checked }))}
                                            className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="keepEven" className="text-sm font-medium text-gray-700">Keep Even Pages</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="keepOdd"
                                            checked={settings.keepOdd}
                                            onChange={e => setSettings(prev => ({ ...prev, keepOdd: e.target.checked }))}
                                            className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="keepOdd" className="text-sm font-medium text-gray-700">Keep Odd Pages</label>
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
                                            <span>Deleting Pages...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-5 w-5" />
                                            <span>Delete PDF Pages</span>
                                        </>
                                    )}
                                </button>
                                {processedFiles.length > 0 && (
                                    <button
                                        onClick={downloadAll}
                                        className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                                    >
                                        <Download className="h-5 w-5" />
                                        <span>Download Cleaned PDFs</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Features Section */}
                        <div className="mb-16">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Page Deleter?</h2>
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Advanced page deletion technology for cleaning PDF documents</p>
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
                                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Delete PDF Pages</h2>
                                <p className="text-lg text-gray-600">Follow these simple steps to clean your PDF files</p>
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
                                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Clean Your PDFs?</h2>
                                    <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF page deleter for document cleaning</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        <span>Start Cleaning Now</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            {banner && <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold ${banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
                role="alert" aria-live="assertive">
                <div className="flex items-center space-x-3">
                    {banner.type === 'success' ? <span>✓</span> : <span>!</span>}
                    <span>{banner.message}</span>
                    <button onClick={() => setBanner(null)} className="ml-4 text-white/80 hover:text-white">×</button>
                </div>
            </div>}
            {isProcessing && <SpinnerOverlay />}
        </>
    );
};

export default PDFDeletePages; 