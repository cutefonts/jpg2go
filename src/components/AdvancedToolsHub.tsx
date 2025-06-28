import React, { useState, useMemo, useCallback } from 'react';
import { Brain, Target, Scissors, BarChart3, Layers, Sparkles, ArrowRight, Star, TrendingUp, Zap, Palette, RotateCw, Maximize2, Grid3X3, Filter, Sun, Droplets, Paintbrush, Copy, Image as ImageIcon, FileText, Users, Shield, CheckCircle, Eye, Camera, FileType, Download, Upload, RotateCcw, FileImage, FilePlus, Combine, Merge, Split, Minimize2, Lock, Unlock, Wrench, Hash, Search, GitCompare, Eraser, Crop, List, PenTool, Edit, Trash2, Type, MessageSquare, Highlighter, Edit3, Monitor, AlignCenter, Replace, Focus, Layers3, Globe, Mail, Book } from 'lucide-react';
import SEO from './SEO';
import { PageType } from '../types';

interface AdvancedToolsHubProps {
  onNavigate?: (page: PageType) => void;
}

const AdvancedToolsHub: React.FC<AdvancedToolsHubProps> = React.memo(({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Memoize tools array to prevent unnecessary re-renders
  const tools = useMemo(() => [
    // AI Tools
    {
      id: 'ai-enhancer',
      name: 'AI Image Enhancer',
      description: 'Transform your images with cutting-edge AI algorithms that analyze and enhance every pixel',
      icon: <Brain className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Super-resolution up to 4x', 'Intelligent noise reduction', 'Smart sharpening', 'Color optimization'],
      badge: 'AI Powered',
      category: 'AI Tools',
      isActive: true
    },
    {
      id: 'crop-image',
      name: 'Crop Image',
      description: 'AI-powered composition analysis with face detection and social media optimization',
      icon: <Target className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: ['Face & object detection', 'Rule of thirds analysis', 'Social media formats', 'Confidence scoring'],
      badge: 'Smart AI',
      category: 'AI Tools',
      isActive: true
    },
    {
      id: 'background-remover',
      name: 'Background Remover',
      description: 'Intelligent background removal with edge detection and replacement options',
      icon: <Scissors className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['AI background detection', 'Edge smoothing', 'Color replacement', 'Transparent output'],
      badge: 'Pro Tool',
      category: 'AI Tools',
      isActive: true
    },

    // PDF Tools
    {
      id: 'pdf-to-jpg',
      name: 'PDF to JPG',
      description: 'Convert PDF pages to high-quality JPG images with custom DPI and quality settings',
      icon: <FileImage className="h-8 w-8" />,
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      features: ['High-resolution output', 'Custom DPI settings', 'Batch page conversion', 'Quality optimization'],
      badge: 'PDF Pro',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-png',
      name: 'PDF to PNG',
      description: 'Extract PDF pages as PNG images with transparency support and lossless quality',
      icon: <FileText className="h-8 w-8" />,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      features: ['Transparency preservation', 'Lossless conversion', 'Vector graphics support', 'Text clarity'],
      badge: 'Lossless',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'jpg-to-pdf',
      name: 'JPG to PDF',
      description: 'Combine multiple JPG images into a single PDF with custom page layouts and compression',
      icon: <FilePlus className="h-8 w-8" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['Multi-image PDF creation', 'Custom page layouts', 'Compression options', 'Metadata support'],
      badge: 'Creator',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'png-to-pdf',
      name: 'PNG to PDF',
      description: 'Convert PNG images to PDF while preserving transparency and image quality',
      icon: <Combine className="h-8 w-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      features: ['Transparency handling', 'Quality preservation', 'Batch conversion', 'Custom sizing'],
      badge: 'Quality',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-merger',
      name: 'PDF Merger',
      description: 'Merge multiple PDF files into one document with custom page ordering',
      icon: <Merge className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      features: ['Drag & drop ordering', 'Page range selection', 'Bookmark preservation', 'Metadata merging'],
      badge: 'Combine',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-splitter',
      name: 'PDF Splitter',
      description: 'Split PDF documents into individual pages or custom page ranges',
      icon: <Split className="h-8 w-8" />,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      features: ['Page range splitting', 'Individual page extraction', 'Batch processing', 'Custom naming'],
      badge: 'Divide',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-compressor',
      name: 'PDF Compressor',
      description: 'Reduce PDF file size while maintaining quality using advanced compression algorithms',
      icon: <Minimize2 className="h-8 w-8" />,
      gradient: 'from-slate-500 via-gray-500 to-zinc-500',
      features: ['Smart compression', 'Quality presets', 'Size optimization', 'Batch compression'],
      badge: 'Optimize',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-protector',
      name: 'PDF Password Protector',
      description: 'Add password protection and security features to your PDF documents',
      icon: <Lock className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['Password encryption', 'Permission controls', 'Digital signatures', 'Security levels'],
      badge: 'Secure',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-unlocker',
      name: 'PDF Password Remover',
      description: 'Remove password protection from PDF files you own with proper authorization',
      icon: <Unlock className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Password removal', 'Permission unlocking', 'Batch processing', 'Security validation'],
      badge: 'Unlock',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-word',
      name: 'PDF to Word',
      description: 'Convert PDF documents to editable Word files with high accuracy and formatting preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['High accuracy conversion', 'Format preservation', 'Text extraction', 'Image handling'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'word-to-pdf',
      name: 'Word to PDF',
      description: 'Convert Word documents to professional PDF files with perfect formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Perfect formatting', 'Multiple formats', 'Quality control', 'Batch conversion'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-powerpoint',
      name: 'PDF to PowerPoint',
      description: 'Convert PDF presentations to editable PowerPoint slides with layout preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['Slide conversion', 'Layout preservation', 'Image extraction', 'Text editing'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'powerpoint-to-pdf',
      name: 'PowerPoint to PDF',
      description: 'Convert PowerPoint presentations to PDF with perfect slide formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-red-600 via-pink-600 to-purple-600',
      features: ['Slide preservation', 'Animation handling', 'Quality control', 'Batch conversion'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-excel',
      name: 'PDF to Excel',
      description: 'Extract tables and data from PDFs into editable Excel spreadsheets',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Table extraction', 'Data recognition', 'Format preservation', 'Cell editing'],
      badge: 'Extract',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'excel-to-pdf',
      name: 'Excel to PDF',
      description: 'Convert Excel spreadsheets to PDF with perfect table formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      features: ['Table formatting', 'Chart preservation', 'Page layout', 'Quality control'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'html-to-pdf',
      name: 'HTML to PDF',
      description: 'Convert web pages and HTML content to professional PDF documents',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['Web page conversion', 'CSS styling', 'Image handling', 'Link preservation'],
      badge: 'Web',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-repair',
      name: 'PDF Repair',
      description: 'Fix corrupted and damaged PDF files with advanced recovery algorithms',
      icon: <Wrench className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['File recovery', 'Data extraction', 'Error fixing', 'Corruption repair'],
      badge: 'Repair',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-watermark',
      name: 'PDF Watermark',
      description: 'Add watermarks to PDF documents online with text and image options',
      icon: <FileImage className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Text watermarks', 'Image watermarks', 'Positioning control', 'Opacity settings'],
      badge: 'Watermark',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-page-numbers',
      name: 'PDF Page Numbers',
      description: 'Add page numbers to PDF documents with custom formatting and positioning',
      icon: <Hash className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['Custom formatting', 'Position control', 'Style options', 'Range selection'],
      badge: 'Numbers',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-ocr',
      name: 'PDF OCR',
      description: 'Convert scanned PDFs to searchable text with optical character recognition',
      icon: <Search className="h-8 w-8" />,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      features: ['Text recognition', 'Searchable output', 'Language support', 'Accuracy control'],
      badge: 'OCR',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-compare',
      name: 'PDF Compare',
      description: 'Compare two PDF documents and highlight differences with side-by-side analysis',
      icon: <GitCompare className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['Side-by-side comparison', 'Difference highlighting', 'Change detection', 'Report generation'],
      badge: 'Compare',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-redact',
      name: 'PDF Redact',
      description: 'Permanently remove sensitive information from PDF documents',
      icon: <Eraser className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['Text redaction', 'Image redaction', 'Permanent removal', 'Security compliance'],
      badge: 'Redact',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-crop',
      name: 'PDF Crop',
      description: 'Crop PDF pages to remove unwanted margins and focus on specific content',
      icon: <Crop className="h-8 w-8" />,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      features: ['Page cropping', 'Margin removal', 'Content focus', 'Batch processing'],
      badge: 'Crop',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-organize',
      name: 'PDF Organize',
      description: 'Reorder, delete, and add pages to organize your PDF documents',
      icon: <List className="h-8 w-8" />,
      gradient: 'from-violet-600 via-purple-600 to-pink-600',
      features: ['Page reordering', 'Page deletion', 'Page insertion', 'Batch operations'],
      badge: 'Organize',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-sign',
      name: 'PDF Sign',
      description: 'Add digital signatures and electronic signatures to PDF documents',
      icon: <PenTool className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Digital signatures', 'Electronic signatures', 'Signature placement', 'Certificate support'],
      badge: 'Sign',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'epub-to-pdf',
      name: 'EPUB to PDF',
      description: 'Convert EPUB ebooks to PDF format with chapter preservation and formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['Chapter preservation', 'Formatting control', 'Table of contents', 'Image handling'],
      badge: 'eBook',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-epub',
      name: 'PDF to EPUB',
      description: 'Convert PDF documents to EPUB ebook format for e-readers',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      features: ['Text extraction', 'Chapter creation', 'E-reader compatibility', 'Formatting preservation'],
      badge: 'eBook',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'djvu-to-pdf',
      name: 'DjVu to PDF',
      description: 'Convert DjVu scanned documents to PDF with OCR and text recognition',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['OCR support', 'Text recognition', 'Image quality', 'Batch conversion'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'tiff-to-pdf',
      name: 'TIFF to PDF',
      description: 'Convert TIFF images to PDF with high quality and compression options',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['High quality', 'Compression options', 'Multi-page support', 'Color preservation'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'txt-to-pdf',
      name: 'TXT to PDF',
      description: 'Convert plain text files to PDF with custom formatting and fonts',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-slate-600 via-gray-600 to-zinc-600',
      features: ['Text formatting', 'Font selection', 'Page layout', 'Encoding support'],
      badge: 'Text',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'odt-to-pdf',
      name: 'ODT to PDF',
      description: 'Convert OpenDocument Text files to PDF with formatting preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['OpenDocument support', 'Format preservation', 'Style handling', 'Cross-platform'],
      badge: 'Open',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'svg-to-pdf',
      name: 'SVG to PDF',
      description: 'Convert SVG vector graphics to PDF with scalable quality',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['Vector graphics', 'Scalable quality', 'Color preservation', 'Layer support'],
      badge: 'Vector',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'csv-to-pdf',
      name: 'CSV to PDF',
      description: 'Convert CSV data files to PDF tables with formatting options',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Table formatting', 'Data preservation', 'Column alignment', 'Header styling'],
      badge: 'Data',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'rtf-to-pdf',
      name: 'RTF to PDF',
      description: 'Convert Rich Text Format files to PDF with formatting preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Rich text support', 'Format preservation', 'Font handling', 'Image inclusion'],
      badge: 'Rich',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'mobi-to-pdf',
      name: 'MOBI to PDF',
      description: 'Convert MOBI ebook files to PDF format for universal compatibility',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['Kindle format support', 'Chapter preservation', 'Image handling', 'Text extraction'],
      badge: 'Kindle',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'xps-to-pdf',
      name: 'XPS to PDF',
      description: 'Convert XPS documents to PDF with perfect formatting preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['XPS support', 'Format preservation', 'Vector graphics', 'Cross-platform'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'xml-to-pdf',
      name: 'XML to PDF',
      description: 'Convert XML files to PDF with structured formatting and styling',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      features: ['XML parsing', 'Structured output', 'Custom styling', 'Data formatting'],
      badge: 'XML',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-tiff',
      name: 'PDF to TIFF',
      description: 'Convert PDF pages to high-quality TIFF images with custom resolution',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['High resolution', 'Color depth control', 'Compression options', 'Batch conversion'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-odt',
      name: 'PDF to ODT',
      description: 'Convert PDF documents to OpenDocument Text format for editing',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['OpenDocument format', 'Text extraction', 'Format preservation', 'Cross-platform'],
      badge: 'Open',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-svg',
      name: 'PDF to SVG',
      description: 'Convert PDF graphics to SVG vector format for web and design use',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['Vector output', 'Scalable graphics', 'Web compatibility', 'Design tools'],
      badge: 'Vector',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-csv',
      name: 'PDF to CSV',
      description: 'Extract tables from PDF and convert to CSV format for data analysis',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Table extraction', 'Data recognition', 'CSV formatting', 'Excel compatibility'],
      badge: 'Data',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-rtf',
      name: 'PDF to RTF',
      description: 'Convert PDF text to Rich Text Format for editing in word processors',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Text extraction', 'Format preservation', 'Word processor compatibility', 'Editing support'],
      badge: 'Rich',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-gif',
      name: 'PDF to GIF',
      description: 'Convert PDF pages to animated GIF images with custom settings',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-pink-600 via-rose-600 to-red-600',
      features: ['Animated GIFs', 'Frame control', 'Color optimization', 'Web compatibility'],
      badge: 'Animated',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-to-bmp',
      name: 'PDF to BMP',
      description: 'Convert PDF pages to BMP bitmap images with lossless quality',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['Lossless quality', 'Bitmap format', 'Color depth control', 'High resolution'],
      badge: 'Bitmap',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-editor',
      name: 'PDF Editor',
      description: 'Edit PDF text, images, and content with professional editing tools',
      icon: <Edit className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Text editing', 'Image editing', 'Content modification', 'Professional tools'],
      badge: 'Edit',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-viewer',
      name: 'PDF Viewer',
      description: 'View and navigate PDF documents with advanced viewing features',
      icon: <Eye className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['Document viewing', 'Navigation tools', 'Zoom controls', 'Search functionality'],
      badge: 'View',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-resize-pages',
      name: 'PDF Page Resize',
      description: 'Resize PDF page dimensions and adjust layout for different formats',
      icon: <Maximize2 className="h-8 w-8" />,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      features: ['Page resizing', 'Format adjustment', 'Layout preservation', 'Batch processing'],
      badge: 'Resize',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-page-delete',
      name: 'PDF Page Delete',
      description: 'Remove specific pages from PDF documents with precision',
      icon: <Trash2 className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['Page deletion', 'Range selection', 'Batch removal', 'Precision control'],
      badge: 'Delete',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-flatten',
      name: 'PDF Flattener',
      description: 'Convert interactive PDF elements to static content for printing',
      icon: <Layers className="h-8 w-8" />,
      gradient: 'from-slate-600 via-gray-600 to-zinc-600',
      features: ['Form flattening', 'Interactive removal', 'Print optimization', 'Security enhancement'],
      badge: 'Flatten',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-page-extract',
      name: 'PDF Page Extract',
      description: 'Extract specific pages from PDF documents as separate files',
      icon: <Scissors className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['Page extraction', 'Range selection', 'Individual pages', 'Batch extraction'],
      badge: 'Extract',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-add-text',
      name: 'PDF Text Add',
      description: 'Add text to PDF documents with custom fonts and positioning',
      icon: <Type className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Text addition', 'Font selection', 'Positioning control', 'Style options'],
      badge: 'Add',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-text-extract',
      name: 'PDF Text Extract',
      description: 'Extract text from PDF documents with formatting preservation',
      icon: <FileText className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Text extraction', 'Format preservation', 'OCR support', 'Batch processing'],
      badge: 'Extract',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-image-extract',
      name: 'PDF Image Extract',
      description: 'Extract images from PDF documents with original quality',
      icon: <FileImage className="h-8 w-8" />,
      gradient: 'from-pink-600 via-rose-600 to-red-600',
      features: ['Image extraction', 'Quality preservation', 'Format selection', 'Batch extraction'],
      badge: 'Extract',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-rotator',
      name: 'PDF Rotator',
      description: 'Rotate PDF pages with custom angles and batch processing',
      icon: <RotateCw className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['Page rotation', 'Custom angles', 'Batch processing', 'Orientation fix'],
      badge: 'Rotate',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-extract',
      name: 'PDF Extractor',
      description: 'Extract content from PDF documents with comprehensive extraction options',
      icon: <Scissors className="h-8 w-8" />,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      features: ['Content extraction', 'Multiple formats', 'Batch processing', 'Quality control'],
      badge: 'Extract',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-add-image',
      name: 'PDF Image Add',
      description: 'Add images to PDF documents with positioning and scaling options',
      icon: <ImageIcon className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['Image addition', 'Positioning control', 'Scaling options', 'Quality preservation'],
      badge: 'Add',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-annotate',
      name: 'PDF Annotate',
      description: 'Add annotations, comments, and notes to PDF documents',
      icon: <MessageSquare className="h-8 w-8" />,
      gradient: 'from-yellow-600 via-orange-600 to-red-600',
      features: ['Annotations', 'Comments', 'Notes', 'Collaboration tools'],
      badge: 'Annotate',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-highlight',
      name: 'PDF Highlight',
      description: 'Highlight text and content in PDF documents with color options',
      icon: <Highlighter className="h-8 w-8" />,
      gradient: 'from-yellow-600 via-orange-600 to-red-600',
      features: ['Text highlighting', 'Color options', 'Multiple highlights', 'Persistence'],
      badge: 'Highlight',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-metadata-remove',
      name: 'PDF Metadata Remove',
      description: 'Remove metadata and personal information from PDF documents',
      icon: <Shield className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['Metadata removal', 'Privacy protection', 'Information cleaning', 'Security enhancement'],
      badge: 'Privacy',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-edit-metadata',
      name: 'PDF Metadata Edit',
      description: 'Edit PDF metadata including title, author, subject, and keywords',
      icon: <Edit3 className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['Metadata editing', 'Batch processing', 'Property management', 'Quality preservation'],
      badge: 'Edit',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-whiteout',
      name: 'PDF Whiteout',
      description: 'Apply whiteout effect to hide content in PDF documents',
      icon: <Eraser className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['Content hiding', 'Whiteout effect', 'Precision control', 'Batch processing'],
      badge: 'Hide',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-grayscale',
      name: 'PDF Grayscale',
      description: 'Convert PDF documents to grayscale for printing and archiving',
      icon: <Monitor className="h-8 w-8" />,
      gradient: 'from-slate-600 via-gray-600 to-zinc-600',
      features: ['Grayscale conversion', 'Print optimization', 'File size reduction', 'Archival quality'],
      badge: 'Convert',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-header-footer',
      name: 'PDF Header & Footer',
      description: 'Add custom headers and footers to PDF documents',
      icon: <AlignCenter className="h-8 w-8" />,
      gradient: 'from-violet-600 via-purple-600 to-pink-600',
      features: ['Header addition', 'Footer addition', 'Custom text', 'Page numbering'],
      badge: 'Headers',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'pdf-filler',
      name: 'PDF Form Fill',
      description: 'Fill PDF forms with text, checkboxes, and signature fields',
      icon: <FileText className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Form filling', 'Text fields', 'Checkboxes', 'Signature support'],
      badge: 'Forms',
      category: 'PDF Tools',
      isActive: true
    },

    // JPG Specific Tools
    {
      id: 'jpeg-optimizer',
      name: 'JPG Optimizer',
      description: 'Advanced JPG compression with quality analysis and progressive encoding options',
      icon: <Zap className="h-8 w-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      features: ['Progressive JPEG', 'Quality analysis', 'Huffman optimization', 'Chroma subsampling'],
      badge: 'Optimize',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'jpg-metadata-editor',
      name: 'JPG Metadata Editor',
      description: 'Edit EXIF data, GPS coordinates, and image metadata with precision',
      icon: <Type className="h-8 w-8" />,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      features: ['EXIF editing', 'GPS coordinates', 'Camera settings', 'Copyright information'],
      badge: 'Editor',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'jpg-quality-analyzer',
      name: 'JPG Quality Analyzer',
      description: 'Analyze JPG image quality, compression artifacts, and provide optimization recommendations',
      icon: <BarChart3 className="h-8 w-8" />,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      features: ['Quality scoring', 'Artifact detection', 'Optimization tips', 'Compression analysis'],
      badge: 'Analyze',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'progressive-jpg-creator',
      name: 'Progressive JPG',
      description: 'Create progressive JPEG images for faster web loading and better user experience',
      icon: <TrendingUp className="h-8 w-8" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['Progressive encoding', 'Web optimization', 'Loading preview', 'Quality control'],
      badge: 'Progressive',
      category: 'Image Tools',
      isActive: true
    },

    // PNG Specific Tools
    {
      id: 'png-optimizer',
      name: 'PNG Optimizer',
      description: 'Lossless PNG compression with transparency preservation and advanced optimization',
      icon: <Droplets className="h-6 w-6" />,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      features: ['Lossless compression', 'Transparency support', 'Color optimization', 'Palette reduction'],
      badge: 'Optimize',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'png-transparency-editor',
      name: 'PNG Transparency Editor',
      description: 'Edit transparency levels, create alpha masks, and manipulate PNG transparency',
      icon: <Paintbrush className="h-6 w-6" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Alpha channel editing', 'Transparency masks', 'Color key removal', 'Opacity control'],
      badge: 'Editor',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'png-to-jpg',
      name: 'PNG to JPG',
      description: 'Convert PNG images to JPG with background color options and quality control',
      icon: <Replace className="h-8 w-8" />,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      features: ['Background color selection', 'Quality control', 'Batch conversion', 'Transparency handling'],
      badge: 'Convert',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'png-sprite-generator',
      name: 'PNG Sprite Generator',
      description: 'Create CSS sprites from multiple PNG images for web optimization',
      icon: <Grid3X3 className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: ['Sprite generation', 'CSS output', 'Layout optimization', 'Web performance'],
      badge: 'Sprite',
      category: 'Image Tools',
      isActive: true
    },

    // Image Processing Tools
    {
      id: 'image-resizer',
      name: 'Smart Image Resizer',
      description: 'Intelligent image resizing with aspect ratio preservation and quality optimization',
      icon: <Maximize2 className="h-8 w-8" />,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      features: ['Smart resizing', 'Aspect ratio preservation', 'Quality optimization', 'Batch processing'],
      badge: 'Smart',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'format-converter',
      name: 'Universal Format Converter',
      description: 'Convert between all major image formats with advanced options and batch processing',
      icon: <Copy className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      features: ['Multi-format support', 'Batch conversion', 'Quality settings', 'Metadata preservation'],
      badge: 'Universal',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'watermark-tool',
      name: 'Watermark Tool',
      description: 'Add watermarks to PDF documents online with text, images, and advanced positioning options',
      icon: <Paintbrush className="h-8 w-8" />,
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      features: ['Text watermarks', 'Image watermarks', 'Positioning control', 'Opacity settings'],
      badge: 'Professional',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'color-adjuster',
      name: 'Color Adjuster',
      description: 'Advanced color correction with brightness, contrast, saturation, and hue controls',
      icon: <Palette className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['Brightness control', 'Contrast adjustment', 'Saturation control', 'Hue modification'],
      badge: 'Color Pro',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'filter-studio',
      name: 'Filter Studio',
      description: 'Apply artistic filters, effects, and creative transformations to your images',
      icon: <Filter className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Artistic filters', 'Creative effects', 'Custom adjustments', 'Preset library'],
      badge: 'Creative',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'noise-reducer',
      name: 'Noise Reducer',
      description: 'Remove digital noise and grain while preserving image details and sharpness',
      icon: <Droplets className="h-8 w-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      features: ['Noise reduction', 'Detail preservation', 'Sharpness control', 'Batch processing'],
      badge: 'Clean',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'sharpening-tool',
      name: 'Sharpening Tool',
      description: 'Enhance image sharpness with intelligent algorithms and edge detection',
      icon: <Focus className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: ['Intelligent sharpening', 'Edge detection', 'Detail enhancement', 'Quality control'],
      badge: 'Sharp',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'exposure-corrector',
      name: 'Exposure Corrector',
      description: 'Fix overexposed and underexposed images with advanced exposure adjustment',
      icon: <Sun className="h-8 w-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      features: ['Exposure correction', 'Highlight recovery', 'Shadow enhancement', 'Auto adjustment'],
      badge: 'Exposure',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'perspective-corrector',
      name: 'Perspective Corrector',
      description: 'Correct perspective distortion and straighten architectural and landscape photos',
      icon: <RotateCw className="h-8 w-8" />,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      features: ['Perspective correction', 'Straightening tools', 'Architectural fix', 'Auto detection'],
      badge: 'Perspective',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'vintage-effects',
      name: 'Vintage Effects',
      description: 'Apply retro and vintage effects to create nostalgic and artistic images',
      icon: <Camera className="h-8 w-8" />,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      features: ['Vintage filters', 'Retro effects', 'Film simulation', 'Color grading'],
      badge: 'Vintage',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'collage-maker',
      name: 'Collage Maker',
      description: 'Create beautiful photo collages with multiple layouts and customization options',
      icon: <Grid3X3 className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['Multiple layouts', 'Custom spacing', 'Background options', 'Text overlays'],
      badge: 'Collage',
      category: 'Image Tools',
      isActive: true
    },
    {
      id: 'photo-border',
      name: 'Photo Border',
      description: 'Add professional borders, frames, and decorative elements to your images',
      icon: <Layers3 className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      features: ['Border styles', 'Frame options', 'Custom colors', 'Size control'],
      badge: 'Frames',
      category: 'Image Tools',
      isActive: true
    },

    // Utility Tools
    {
      id: 'batch-processor',
      name: 'Batch Processor',
      description: 'Process multiple images simultaneously with consistent settings and automation',
      icon: <Layers className="h-8 w-8" />,
      gradient: 'from-slate-500 via-gray-500 to-zinc-500',
      features: ['Batch processing', 'Consistent settings', 'Automation', 'Progress tracking'],
      badge: 'Batch',
      category: 'Utility Tools',
      isActive: true
    },
    {
      id: 'image-analyzer',
      name: 'Image Analyzer',
      description: 'Analyze image properties, metadata, and provide detailed technical information',
      icon: <BarChart3 className="h-8 w-8" />,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      features: ['Image analysis', 'Metadata extraction', 'Technical details', 'Quality assessment'],
      badge: 'Analyze',
      category: 'Utility Tools',
      isActive: true
    },
    {
      id: 'webp-to-pdf',
      name: 'WebP to PDF',
      description: 'Convert WebP images to PDF with web-optimized quality preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['WebP support', 'Web optimization', 'Quality preservation', 'Batch conversion'],
      badge: 'Web',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'heif-to-pdf',
      name: 'HEIF to PDF',
      description: 'Convert HEIF images to PDF with high-efficiency format support',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-pink-600 via-rose-600 to-red-600',
      features: ['HEIF support', 'High efficiency', 'Quality preservation', 'Modern format'],
      badge: 'HEIF',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'jfif-to-pdf',
      name: 'JFIF to PDF',
      description: 'Convert JFIF images to PDF with JPEG File Interchange Format support',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['JFIF support', 'JPEG compatibility', 'Quality preservation', 'Standard format'],
      badge: 'JFIF',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'gif-to-pdf',
      name: 'GIF to PDF',
      description: 'Convert GIF images to PDF with animation frame handling',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      features: ['GIF support', 'Animation handling', 'Frame selection', 'Quality preservation'],
      badge: 'GIF',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'bmp-to-pdf',
      name: 'BMP to PDF',
      description: 'Convert BMP bitmap images to PDF with lossless quality',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-gray-600 via-slate-600 to-zinc-600',
      features: ['BMP support', 'Lossless quality', 'Bitmap format', 'High resolution'],
      badge: 'BMP',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'hwp-to-pdf',
      name: 'HWP to PDF',
      description: 'Convert Hangul Word Processor files to PDF with Korean text support',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['HWP support', 'Korean text', 'Format preservation', 'Asian language'],
      badge: 'HWP',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'chm-to-pdf',
      name: 'CHM to PDF',
      description: 'Convert Compiled HTML Help files to PDF with navigation preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['CHM support', 'Help documentation', 'Navigation preservation', 'HTML conversion'],
      badge: 'Help',
      category: 'PDF Tools',
      isActive: false
    },
    {
      id: 'fb2-to-pdf',
      name: 'FB2 to PDF',
      description: 'Convert FictionBook files to PDF with ebook formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['FB2 support', 'FictionBook format', 'Ebook conversion', 'Text preservation'],
      badge: 'Fiction',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'md-to-pdf',
      name: 'Markdown to PDF',
      description: 'Convert Markdown files to PDF with syntax highlighting and formatting',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-slate-600 via-gray-600 to-zinc-600',
      features: ['Markdown support', 'Syntax highlighting', 'Code formatting', 'Documentation'],
      badge: 'MD',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'url-to-pdf',
      name: 'URL to PDF',
      description: 'Convert web pages to PDF by entering URLs with full page rendering',
      icon: <Globe className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['Web page conversion', 'URL input', 'Full rendering', 'CSS preservation'],
      badge: 'Web',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'wps-to-pdf',
      name: 'WPS to PDF',
      description: 'Convert WPS Office files to PDF with Microsoft Office compatibility',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['WPS support', 'Office compatibility', 'Format preservation', 'Cross-platform'],
      badge: 'WPS',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'dxf-to-pdf',
      name: 'DXF to PDF',
      description: 'Convert AutoCAD DXF files to PDF with technical drawing preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['DXF support', 'Technical drawings', 'Layer preservation', 'CAD compatibility'],
      badge: 'CAD',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'eml-to-pdf',
      name: 'EML to PDF',
      description: 'Convert email files to PDF with message formatting preservation',
      icon: <Mail className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['EML support', 'Email conversion', 'Message formatting', 'Attachment handling'],
      badge: 'Email',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'ebook-to-pdf',
      name: 'eBook to PDF',
      description: 'Convert various ebook formats to PDF with universal compatibility',
      icon: <Book className="h-8 w-8" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      features: ['Multi-format support', 'Ebook conversion', 'Chapter preservation', 'Universal format'],
      badge: 'eBook',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'cbz-to-pdf',
      name: 'CBZ to PDF',
      description: 'Convert Comic Book ZIP files to PDF with image sequence preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['CBZ support', 'Comic books', 'Image sequence', 'ZIP extraction'],
      badge: 'Comic',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'cbr-to-pdf',
      name: 'CBR to PDF',
      description: 'Convert Comic Book RAR files to PDF with compressed image handling',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['CBR support', 'Comic books', 'RAR extraction', 'Image sequence'],
      badge: 'Comic',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'ai-to-pdf',
      name: 'AI to PDF',
      description: 'Convert Adobe Illustrator files to PDF with vector graphics preservation',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      features: ['AI support', 'Vector graphics', 'Adobe compatibility', 'Design preservation'],
      badge: 'Adobe',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'zip-to-pdf',
      name: 'ZIP to PDF',
      description: 'Convert ZIP archives to PDF with file listing and content organization',
      icon: <FileType className="h-8 w-8" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      features: ['ZIP support', 'Archive conversion', 'File listing', 'Content organization'],
      badge: 'Archive',
      category: 'PDF Tools',
      isActive: true
    },
    {
      id: 'image-converter',
      name: 'Universal Image Converter',
      description: 'Convert between all major image formats with advanced options and batch processing',
      icon: <ImageIcon className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      features: ['Multi-format support', 'Batch conversion', 'Quality settings', 'Metadata preservation'],
      badge: 'Universal',
      category: 'Image Tools',
      isActive: true
    }
  ], []);

  // Memoize categories
  const categories = useMemo(() => [
    { id: 'all', name: 'All Tools', icon: <Grid3X3 className="h-4 w-4" /> },
    { id: 'AI Tools', name: 'AI Tools', icon: <Brain className="h-4 w-4" /> },
    { id: 'PDF Tools', name: 'PDF Tools', icon: <FileText className="h-4 w-4" /> },
    { id: 'Image Tools', name: 'Image Tools', icon: <ImageIcon className="h-4 w-4" /> },
  ], []);

  // Memoize stats
  const stats = useMemo(() => [
    { label: 'Professional Tools', value: tools.filter(t => t.isActive).length },
    { label: 'AI-Powered Features', value: tools.filter(t => t.category === 'AI Tools' && t.isActive).length },
    { label: 'Free to Use', value: tools.length }
  ], [tools]);

  // Memoize filtered tools
  const filteredTools = useMemo(() => {
    if (selectedCategory === 'all') {
      return tools;
    }
    return tools.filter(tool => tool.category === selectedCategory);
  }, [tools, selectedCategory]);

  // Memoize event handlers
  const handleToolClick = useCallback((toolId: string) => {
    if (onNavigate) {
      onNavigate(toolId as PageType);
    }
  }, [onNavigate]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleScrollToConverter = useCallback(() => {
    const element = document.getElementById('converter');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <SEO
        title="Advanced Tools | Image & PDF Converter Tool"
        description="Unlock powerful features with our advanced image and PDF converter tools. Convert, compress, and edit with ease."
        keywords="advanced tools, image converter, PDF converter, professional tools, online converter, free tools"
        canonical="advanced-tools"
        ogImage="/images/advanced-tools-og.jpg"
      
      
      
      
      />
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Brain className="h-4 w-4" />
              <span>Advanced Tools Hub</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Image & PDF Converter Tool
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Convert images and PDFs with ease using our professional-grade tool. Fast, secure, and format-flexible.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-white/20">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                }`}
              >
                {category.icon}
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className={`group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden transform hover:-translate-y-2 ${
                  tool.isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                } min-w-0`}
                onClick={() => tool.isActive ? handleToolClick(tool.id) : null}
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                {/* Floating Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`px-3 py-1 bg-gradient-to-r ${tool.gradient} text-white text-xs font-bold rounded-full shadow-lg`}>
                    {tool.badge}
                  </span>
                </div>

                {/* Coming Soon Overlay for inactive tools */}
                {!tool.isActive && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="relative p-8 min-w-0">
                  {/* Icon & Header */}
                  <div className="mb-6 min-w-0">
                    <div className={`inline-flex p-4 bg-gradient-to-br ${tool.gradient} rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                      {tool.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 break-words">{tool.name}</h3>
                    <p className="text-gray-700 leading-relaxed text-sm break-words">
                      {tool.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Key Features</span>
                    </h4>
                    <div className="space-y-2">
                      {tool.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-2">
                          <div className={`w-2 h-2 bg-gradient-to-r ${tool.gradient} rounded-full`} />
                          <span className="text-sm text-gray-700 break-words">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    className={`w-full bg-gradient-to-r ${tool.gradient} text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-105 relative overflow-hidden ${
                      !tool.isActive ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    disabled={!tool.isActive}
                  >
                    <span className="relative z-10">
                      {tool.isActive ? `Try ${tool.name}` : 'Coming Soon'}
                    </span>
                    {tool.isActive && (
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform relative z-10" />
                    )}
                    
                    {/* Button shine effect */}
                    {tool.isActive && (
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    )}
                  </button>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            ))}
          </div>

          {/* Feature Categories Highlight */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Complete Professional Suite</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                From PDF processing to advanced image editing, our comprehensive toolkit covers all your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">PDF Tools</h4>
                <p className="text-sm text-gray-600">Convert, merge, split, compress, and secure PDF documents</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">JPG Optimization</h4>
                <p className="text-sm text-gray-600">Advanced compression, quality analysis, and metadata editing</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Droplets className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">PNG Processing</h4>
                <p className="text-sm text-gray-600">Transparency editing, lossless optimization, and sprite generation</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">AI Enhancement</h4>
                <p className="text-sm text-gray-600">Intelligent upscaling, noise reduction, and smart cropping</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  Ready for Professional Image & PDF Processing?
                </h3>
                <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                  Join thousands of professionals who trust JPG2GO for their complete image and document processing needs. 
                  Start with our basic converter or explore our advanced professional tools.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={handleScrollToConverter}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Start with Basic Converter
                  </button>
                  <button 
                    onClick={() => handleToolClick('ai-enhancer')}
                    className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-violet-600 transition-all duration-200"
                  >
                    Try AI Enhancer
                  </button>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
});

export default AdvancedToolsHub;