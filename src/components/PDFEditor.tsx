import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Edit3, FileType, Image, Highlighter, Underline, Strikethrough, Pencil, Eraser, Droplet, Hash, AlignCenter, Trash2, FilePlus, Crop, Layers, ShieldOff, Undo2, Redo2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Plus, Minus, Move, Type, Eye } from 'lucide-react';
import SEO from './SEO';
import { Document, Page, pdfjs } from 'react-pdf';
import { NotificationProvider, useNotification } from './NotificationProvider';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const TOOLBAR_TOOLS = [
  { key: 'select', label: 'Select', icon: <Move className="w-5 h-5" /> },
  { key: 'addText', label: 'Add Text', icon: <Type className="w-5 h-5" /> },
  { key: 'addImage', label: 'Add Image', icon: <Image className="w-5 h-5" /> },
  { key: 'highlight', label: 'Highlight', icon: <Highlighter className="w-5 h-5" /> },
  { key: 'underline', label: 'Underline', icon: <Underline className="w-5 h-5" /> },
  { key: 'strikeout', label: 'Strikeout', icon: <Strikethrough className="w-5 h-5" /> },
  { key: 'draw', label: 'Draw', icon: <Pencil className="w-5 h-5" /> },
  { key: 'whiteout', label: 'Whiteout', icon: <Eraser className="w-5 h-5" /> },
  { key: 'signature', label: 'Signature', icon: <Pencil className="w-5 h-5" /> },
  { key: 'watermark', label: 'Watermark', icon: <Droplet className="w-5 h-5" /> },
  { key: 'pageNumber', label: 'Page Number', icon: <Hash className="w-5 h-5" /> },
  { key: 'headerFooter', label: 'Header/Footer', icon: <AlignCenter className="w-5 h-5" /> },
  { key: 'deletePage', label: 'Delete Page', icon: <Trash2 className="w-5 h-5" /> },
  { key: 'extractPage', label: 'Extract Page', icon: <FilePlus className="w-5 h-5" /> },
  { key: 'rotate', label: 'Rotate', icon: <RotateCcw className="w-5 h-5" /> },
  { key: 'crop', label: 'Crop', icon: <Crop className="w-5 h-5" /> },
  { key: 'flatten', label: 'Flatten', icon: <Layers className="w-5 h-5" /> },
  { key: 'removeMetadata', label: 'Remove Metadata', icon: <ShieldOff className="w-5 h-5" /> },
  { key: 'undo', label: 'Undo', icon: <Undo2 className="w-5 h-5" /> },
  { key: 'redo', label: 'Redo', icon: <Redo2 className="w-5 h-5" /> },
  { key: 'zoomIn', label: 'Zoom In', icon: <ZoomIn className="w-5 h-5" /> },
  { key: 'zoomOut', label: 'Zoom Out', icon: <ZoomOut className="w-5 h-5" /> },
];

const PDFEditor: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    editMode: 'text',
    addText: '',
    addImage: null as File | null,
    pageNumber: 1,
    position: 'center',
    editText: '',
    addWatermark: false,
    addTimestamp: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState('select');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [textOverlays, setTextOverlays] = useState<{ page: number, x: number, y: number, text: string }[]>([]);
  const [addingText, setAddingText] = useState<{ x: number, y: number } | null>(null);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageOverlays, setImageOverlays] = useState<{ page: number, x: number, y: number, width: number, height: number, src: string }[]>([]);
  const [addingImage, setAddingImage] = useState<{ x: number, y: number } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>({ width: 120, height: 120 });
  const [signatureOverlays, setSignatureOverlays] = useState<{ page: number, x: number, y: number, width: number, height: number, src: string }[]>([]);
  const [addingSignature, setAddingSignature] = useState<{ x: number, y: number } | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureTab, setSignatureTab] = useState<'draw' | 'type' | 'upload' | 'preview'>('draw');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [typedFont, setTypedFont] = useState('cursive');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureSize, setSignatureSize] = useState<{ width: number, height: number }>({ width: 160, height: 60 });
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const notify = useNotification();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(pdfFiles.length > 0 ? [pdfFiles[0]] : []);
    setNumPages(null);
    setCurrentPage(1);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setSettings(prev => ({ ...prev, addImage: selectedFiles[0] }));
    }
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
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const file of files) {
        try {
          const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
          const fileBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();
          const pageIndex = Math.max(0, Math.min(settings.pageNumber - 1, pages.length - 1));
          const page = pages[pageIndex];
          const { width, height } = page.getSize();
          // Embed font
          let font;
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          } catch {
            font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          }
          // Position calculation
          const getPosition = (pos: string, contentWidth = 0, contentHeight = 0) => {
            switch (pos) {
              case 'top-left': return { x: 40, y: height - 40 - contentHeight };
              case 'top-right': return { x: width - 40 - contentWidth, y: height - 40 - contentHeight };
              case 'bottom-left': return { x: 40, y: 40 };
              case 'bottom-right': return { x: width - 40 - contentWidth, y: 40 };
              case 'center':
              default:
                return { x: (width - contentWidth) / 2, y: (height - contentHeight) / 2 };
            }
          };
          // Edit modes
          if (settings.editMode === 'text' && settings.editText && settings.editText.trim()) {
            const text = settings.editText;
            const size = 18;
            const textWidth = font.widthOfTextAtSize(text, size);
            const textHeight = font.heightAtSize(size);
            const pos = getPosition(settings.position, textWidth, textHeight);
            page.drawText(text, {
              x: pos.x,
              y: pos.y,
              size,
              font,
              color: rgb(0, 0, 0)
            });
          } else if (settings.editMode === 'image' && settings.addImage) {
            const imgFile = settings.addImage;
            const imgBytes = await imgFile.arrayBuffer();
            let imageEmbed, imgDims;
            if (imgFile.type === 'image/png') {
              imageEmbed = await pdfDoc.embedPng(imgBytes);
              imgDims = imageEmbed.scale(0.5);
            } else {
              imageEmbed = await pdfDoc.embedJpg(imgBytes);
              imgDims = imageEmbed.scale(0.5);
            }
            const pos = getPosition(settings.position, imgDims.width, imgDims.height);
            page.drawImage(imageEmbed, {
              x: pos.x,
              y: pos.y,
              width: imgDims.width,
              height: imgDims.height
            });
          } else if (settings.editMode === 'annotate') {
            // Draw a rectangle annotation as a placeholder
            const rectWidth = 120, rectHeight = 40;
            const pos = getPosition(settings.position, rectWidth, rectHeight);
            page.drawRectangle({
              x: pos.x,
              y: pos.y,
              width: rectWidth,
              height: rectHeight,
              borderColor: rgb(0.2, 0.4, 0.8),
              borderWidth: 2,
              color: rgb(0.8, 0.9, 1),
              opacity: 0.3
            });
          }
          // Watermark/timestamp on all pages
          pages.forEach((pg) => {
            const { width: w, height: h } = pg.getSize();
            if (settings.addWatermark) {
              pg.drawText('EDITED', {
                x: w / 2 - 30,
                y: h / 2,
                size: 24,
                font: font,
                color: rgb(0.8, 0.8, 0.8),
                rotate: degrees(-45)
              });
            }
            if (settings.addTimestamp) {
              const timestamp = new Date().toLocaleString();
              pg.drawText(`Edited: ${timestamp}`, {
                x: 50,
                y: 30,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5)
              });
            }
          });
          // Save the edited PDF
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          processed.push({
            name: file.name.replace(/\.pdf$/i, '_edited.pdf'),
            blob: blob
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          notify(`Error processing ${file.name}. Skipping this file.`, 'error');
        }
      }
      setProcessedFiles(processed);
      setIsProcessing(false);
      notify(`PDF editing completed! Processed ${processed.length} files.`, 'success');
    } catch (error) {
      console.error('Error editing PDFs:', error);
      setIsProcessing(false);
      notify('Error editing PDFs. Please try again.', 'error');
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
    { icon: <Edit3 className="h-6 w-6" />, title: 'Text Editing', description: 'Add, edit, or remove text from PDF documents' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure Processing', description: 'Files processed locally, privacy guaranteed' },
    { icon: <Zap className="h-6 w-6" />, title: 'Image Insertion', description: 'Add images and graphics to your PDFs' },
    { icon: <Users className="h-6 w-6" />, title: 'Batch Editing', description: 'Edit multiple PDFs at once' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Drag and drop or browse to select your PDF documents' },
    { step: '2', title: 'Configure Edits', description: 'Choose editing options and add content' },
    { step: '3', title: 'Edit & Download', description: 'Download your edited PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '300K+', label: 'PDFs Edited' },
    { icon: <Zap className="h-5 w-5" />, value: '< 30s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  // Placeholder for page thumbnails
  const pageThumbnails = files.length > 0 && numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : [];

  // Handle PDF load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  // Handle click on PDF canvas for Add Text
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (activeTool === 'addText' && files.length) {
      const rect = (e.target as HTMLDivElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setAddingText({ x, y });
      setInputText('');
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    if (activeTool === 'addImage' && files.length) {
      const rect = (e.target as HTMLDivElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setAddingImage({ x, y });
      setImagePreview(null);
      setImageSize({ width: 120, height: 120 });
      setTimeout(() => imageInputRef.current?.click(), 0);
      return;
    }
    if (activeTool === 'signature' && files.length) {
      const rect = (e.target as HTMLDivElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setAddingSignature({ x, y });
      setSignatureModalOpen(true);
      setSignatureTab('draw');
      setDrawnSignature(null);
      setTypedSignature('');
      setTypedFont('cursive');
      setUploadedSignature(null);
      setSignaturePreview(null);
      setSignatureSize({ width: 160, height: 60 });
      return;
    }
  };

  // Handle confirm add text
  const confirmAddText = () => {
    if (addingText && inputText.trim()) {
      setTextOverlays(prev => [...prev, { page: currentPage, x: addingText.x, y: addingText.y, text: inputText }]);
    }
    setAddingText(null);
    setInputText('');
  };

  // Handle cancel add text
  const cancelAddText = () => {
    setAddingText(null);
    setInputText('');
  };

  // Handle key events in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirmAddText();
    if (e.key === 'Escape') cancelAddText();
  };

  // Confirm add image
  const confirmAddImage = () => {
    if (addingImage && imagePreview) {
      setImageOverlays(prev => [
        ...prev,
        {
          page: currentPage,
          x: addingImage.x,
          y: addingImage.y,
          width: imageSize.width,
          height: imageSize.height,
          src: imagePreview
        }
      ]);
    }
    setAddingImage(null);
    setImagePreview(null);
    setImageSize({ width: 120, height: 120 });
  };

  // Cancel add image
  const cancelAddImage = () => {
    setAddingImage(null);
    setImagePreview(null);
    setImageSize({ width: 120, height: 120 });
  };

  // Drag and resize logic for image preview
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const handleImageDragStart = (e: React.MouseEvent) => {
    if (!addingImage) return;
    setDragging(true);
    setDragOffset({
      x: e.clientX - addingImage.x * zoom,
      y: e.clientY - addingImage.y * zoom
    });
  };
  const handleImageDrag = (e: React.MouseEvent) => {
    if (dragging && addingImage) {
      const newX = (e.clientX - dragOffset.x) / zoom;
      const newY = (e.clientY - dragOffset.y) / zoom;
      setAddingImage({ x: newX, y: newY });
    }
  };
  const handleImageDragEnd = () => {
    setDragging(false);
  };
  // Resize handle
  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = imageSize.width;
    const startHeight = imageSize.height;
    const onMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(30, startWidth + (moveEvent.clientX - startX) / zoom);
      const newHeight = Math.max(30, startHeight + (moveEvent.clientY - startY) / zoom);
      setImageSize({ width: newWidth, height: newHeight });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Signature modal logic
  // Draw tab: use a canvas for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#222';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };
  const handleCanvasMouseUp = () => {
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setDrawnSignature(dataUrl);
    }
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setDrawnSignature(null);
  };

  // Type tab: handle font and text
  const handleTypedSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedSignature(e.target.value);
  };
  const handleTypedFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypedFont(e.target.value);
  };
  const confirmTypedSignature = () => {
    if (typedSignature.trim()) {
      // Render to canvas for consistency
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `36px ${typedFont}`;
        ctx.fillStyle = '#222';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
        setSignaturePreview(canvas.toDataURL('image/png'));
      }
      setSignatureTab('preview');
    }
  };

  // Upload tab: handle image upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        setUploadedSignature(ev.target?.result as string);
        setSignaturePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      setSignatureTab('preview');
    }
  };

  // Confirm signature placement
  const confirmSignaturePlacement = () => {
    if (addingSignature && signaturePreview) {
      setSignatureOverlays(prev => [
        ...prev,
        {
          page: currentPage,
          x: addingSignature.x,
          y: addingSignature.y,
          width: signatureSize.width,
          height: signatureSize.height,
          src: signaturePreview
        }
      ]);
    }
    setAddingSignature(null);
    setSignatureModalOpen(false);
    setSignaturePreview(null);
    setSignatureSize({ width: 160, height: 60 });
  };
  // Cancel signature placement
  const cancelSignaturePlacement = () => {
    setAddingSignature(null);
    setSignatureModalOpen(false);
    setSignaturePreview(null);
    setSignatureSize({ width: 160, height: 60 });
  };
  // Drag and resize logic for signature preview
  const [draggingSignature, setDraggingSignature] = useState(false);
  const [dragOffsetSignature, setDragOffsetSignature] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const handleSignatureDragStart = (e: React.MouseEvent) => {
    if (!addingSignature) return;
    setDraggingSignature(true);
    setDragOffsetSignature({
      x: e.clientX - addingSignature.x * zoom,
      y: e.clientY - addingSignature.y * zoom
    });
  };
  const handleSignatureDrag = (e: React.MouseEvent) => {
    if (draggingSignature && addingSignature) {
      const newX = (e.clientX - dragOffsetSignature.x) / zoom;
      const newY = (e.clientY - dragOffsetSignature.y) / zoom;
      setAddingSignature({ x: newX, y: newY });
    }
  };
  const handleSignatureDragEnd = () => {
    setDraggingSignature(false);
  };
  // Resize handle for signature
  const handleSignatureResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = signatureSize.width;
    const startHeight = signatureSize.height;
    const onMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(30, startWidth + (moveEvent.clientX - startX) / zoom);
      const newHeight = Math.max(20, startHeight + (moveEvent.clientY - startY) / zoom);
      setSignatureSize({ width: newWidth, height: newHeight });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      <SEO 
        title="PDF Editor | Edit PDF Files Online Free"
        description="Edit your PDF documents easily with our free online PDF editor. Add text, images, annotations, and more without installing software."
        keywords="PDF editor, edit PDF, online PDF editor, free PDF editor"
        canonical="pdf-editor"
        ogImage="/images/pdf-editor-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Edit3 className="h-4 w-4" />
                <span>PDF Editor</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Edit PDF Documents
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Edit your PDF documents online with our powerful editor. Add text, insert images, and modify content without downloading any software.
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

              {/* Live Preview (real) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Edit3 className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center relative" style={{ minHeight: 480 }}>
                  {files.length === 0 ? (
                    <p className="text-gray-500">Upload a PDF to see a live preview of your edits.</p>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <Document
                        file={files[0]}
                        onLoadError={err => setPdfError(err.message)}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>Loading PDF...</div>}
                        error={<div className="text-red-500">{pdfError || 'Failed to load PDF.'}</div>}
                      >
                        <Page
                          pageNumber={currentPage}
                          width={480}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                      {/* Overlays: text, image, signature, etc. */}
                      <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: 480, height: '100%' }}>
                        {/* Text overlays */}
                        {textOverlays.filter(o => o.page === currentPage).map((o, i) => (
                          <div key={i} style={{ position: 'absolute', left: o.x, top: o.y, color: '#222', fontSize: 18, fontWeight: 500, background: 'rgba(255,255,255,0.7)', padding: 2, borderRadius: 2 }}>{o.text}</div>
                        ))}
                        {/* Image overlays */}
                        {imageOverlays.filter(o => o.page === currentPage).map((o, i) => (
                          <img key={i} src={o.src} alt="Overlay" style={{ position: 'absolute', left: o.x, top: o.y, width: o.width, height: o.height, borderRadius: 4, boxShadow: '0 2px 8px #0002' }} />
                        ))}
                        {/* Signature overlays */}
                        {signatureOverlays.filter(o => o.page === currentPage).map((o, i) => (
                          <img key={i} src={o.src} alt="Signature" style={{ position: 'absolute', left: o.x, top: o.y, width: o.width, height: o.height, opacity: 0.85, pointerEvents: 'none' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Editing Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Edit3 className="h-5 w-5 text-violet-600" />
                  <span>Editing Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Edit Mode</label>
                    <select
                      value={settings.editMode}
                      onChange={e => setSettings(prev => ({ ...prev, editMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="text">Add Text</option>
                      <option value="image">Add Image</option>
                      <option value="annotate">Annotate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Number</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.pageNumber}
                      onChange={e => setSettings(prev => ({ ...prev, pageNumber: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <select
                      value={settings.position}
                      onChange={e => setSettings(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  {settings.editMode === 'text' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Text to Add</label>
                      <textarea
                        value={settings.editText}
                        onChange={e => setSettings(prev => ({ ...prev, editText: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        rows={3}
                        placeholder="Enter text to add to the PDF..."
                      />
                    </div>
                  )}
                  {settings.editMode === 'image' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image to Add</label>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Choose Image
                        </button>
                        {settings.addImage && (
                          <span className="text-sm text-gray-600">{settings.addImage.name}</span>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Watermark</label>
                    <input
                      type="checkbox"
                      checked={settings.addWatermark}
                      onChange={e => setSettings(prev => ({ ...prev, addWatermark: e.target.checked }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Timestamp</label>
                    <input
                      type="checkbox"
                      checked={settings.addTimestamp}
                      onChange={e => setSettings(prev => ({ ...prev, addTimestamp: e.target.checked }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
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
                      <span>Editing PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-5 w-5" />
                      <span>Edit PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Edited Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Editor?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Powerful online PDF editing with text and image insertion capabilities</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Edit PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to edit your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Edit Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF editor for document modification</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Edit3 className="h-5 w-5" />
                    <span>Start Editing Now</span>
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

const PDFEditorWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFEditor />
  </NotificationProvider>
);
export default PDFEditorWithProvider; 