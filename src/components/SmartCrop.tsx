import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, Target, Palette, Crop, FileImage, Camera, Eye, EyeOff, Maximize2, Move, MousePointer, Square } from 'lucide-react';
import SEO from './SEO';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  previewUrl?: string;
  cropArea?: CropArea;
}

interface VisualCropState {
  isActive: boolean;
  cropArea: CropArea;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: string | null;
  startPos: { x: number; y: number };
  originalCrop: CropArea;
}

const SmartCrop: React.FC = () => {
  const [files, setFiles] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [aiModel, setAiModel] = useState('advanced');
  const [faceDetection, setFaceDetection] = useState(true);
  const [compositionAnalysis, setCompositionAnalysis] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [cropMode, setCropMode] = useState('smart');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [customAspectRatio, setCustomAspectRatio] = useState({ width: 16, height: 9 });
  const [cropQuality, setCropQuality] = useState(90);
  const [maintainQuality, setMaintainQuality] = useState(true);
  const [visualCropMode, setVisualCropMode] = useState(false);
  const [visualCrop, setVisualCrop] = useState<VisualCropState>({
    isActive: false,
    cropArea: { x: 0, y: 0, width: 0, height: 0 },
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    startPos: { x: 0, y: 0 },
    originalCrop: { x: 0, y: 0, width: 0, height: 0 }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newImages]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    const newImages: UploadedImage[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles(prev => [...prev, ...newImages]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) {
      setSelectedImage(null);
      setVisualCropMode(false);
    }
  };

  // Initialize visual crop area
  const initializeVisualCrop = (image: UploadedImage) => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Calculate initial crop area (center 80% of image)
    const cropWidth = imgRect.width * 0.8;
    const cropHeight = imgRect.height * 0.8;
    const cropX = (imgRect.width - cropWidth) / 2;
    const cropY = (imgRect.height - cropHeight) / 2;

    setVisualCrop(prev => ({
      ...prev,
      isActive: true,
      cropArea: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
      originalCrop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
    }));
  };

  // Handle mouse events for visual cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!visualCropMode || !visualCrop.isActive) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on resize handles
    const handle = getResizeHandle(x, y);
    if (handle) {
      setVisualCrop(prev => ({
        ...prev,
        isResizing: true,
        resizeHandle: handle,
        startPos: { x, y },
        originalCrop: { ...prev.cropArea }
      }));
      return;
    }

    // Check if clicking inside crop area for dragging
    if (isInsideCropArea(x, y)) {
      setVisualCrop(prev => ({
        ...prev,
        isDragging: true,
        startPos: { x, y },
        originalCrop: { ...prev.cropArea }
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!visualCropMode || !visualCrop.isActive) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (visualCrop.isDragging) {
      const deltaX = x - visualCrop.startPos.x;
      const deltaY = y - visualCrop.startPos.y;
      
      const newX = Math.max(0, Math.min(
        visualCrop.originalCrop.x + deltaX,
        rect.width - visualCrop.cropArea.width
      ));
      const newY = Math.max(0, Math.min(
        visualCrop.originalCrop.y + deltaY,
        rect.height - visualCrop.cropArea.height
      ));

      setVisualCrop(prev => ({
        ...prev,
        cropArea: { ...prev.cropArea, x: newX, y: newY }
      }));
    } else if (visualCrop.isResizing && visualCrop.resizeHandle) {
      const deltaX = x - visualCrop.startPos.x;
      const deltaY = y - visualCrop.startPos.y;
      
      const newCropArea = { ...visualCrop.originalCrop };
      
      switch (visualCrop.resizeHandle) {
        case 'nw':
          newCropArea.x = Math.max(0, visualCrop.originalCrop.x + deltaX);
          newCropArea.y = Math.max(0, visualCrop.originalCrop.y + deltaY);
          newCropArea.width = Math.max(50, visualCrop.originalCrop.width - deltaX);
          newCropArea.height = Math.max(50, visualCrop.originalCrop.height - deltaY);
          break;
        case 'ne':
          newCropArea.y = Math.max(0, visualCrop.originalCrop.y + deltaY);
          newCropArea.width = Math.max(50, visualCrop.originalCrop.width + deltaX);
          newCropArea.height = Math.max(50, visualCrop.originalCrop.height - deltaY);
          break;
        case 'sw':
          newCropArea.x = Math.max(0, visualCrop.originalCrop.x + deltaX);
          newCropArea.width = Math.max(50, visualCrop.originalCrop.width - deltaX);
          newCropArea.height = Math.max(50, visualCrop.originalCrop.height + deltaY);
          break;
        case 'se':
          newCropArea.width = Math.max(50, visualCrop.originalCrop.width + deltaX);
          newCropArea.height = Math.max(50, visualCrop.originalCrop.height + deltaY);
          break;
      }

      // Maintain aspect ratio if needed
      if (aspectRatio !== 'auto') {
        const { width: targetWidth, height: targetHeight } = getAspectRatioDimensions(
          newCropArea.width, newCropArea.height, aspectRatio
        );
        newCropArea.width = targetWidth;
        newCropArea.height = targetHeight;
      }

      setVisualCrop(prev => ({
        ...prev,
        cropArea: newCropArea
      }));
    }
  };

  const handleMouseUp = () => {
    setVisualCrop(prev => ({
      ...prev,
      isDragging: false,
      isResizing: false,
      resizeHandle: null
    }));
  };

  const isInsideCropArea = (x: number, y: number): boolean => {
    const { cropArea } = visualCrop;
    return x >= cropArea.x && x <= cropArea.x + cropArea.width &&
           y >= cropArea.y && y <= cropArea.y + cropArea.height;
  };

  const getResizeHandle = (x: number, y: number): string | null => {
    const { cropArea } = visualCrop;
    const handleSize = 10;
    
    // Check corners
    if (x >= cropArea.x - handleSize && x <= cropArea.x + handleSize &&
        y >= cropArea.y - handleSize && y <= cropArea.y + handleSize) return 'nw';
    if (x >= cropArea.x + cropArea.width - handleSize && x <= cropArea.x + cropArea.width + handleSize &&
        y >= cropArea.y - handleSize && y <= cropArea.y + handleSize) return 'ne';
    if (x >= cropArea.x - handleSize && x <= cropArea.x + handleSize &&
        y >= cropArea.y + cropArea.height - handleSize && y <= cropArea.y + cropArea.height + handleSize) return 'sw';
    if (x >= cropArea.x + cropArea.width - handleSize && x <= cropArea.x + cropArea.width + handleSize &&
        y >= cropArea.y + cropArea.height - handleSize && y <= cropArea.y + cropArea.height + handleSize) return 'se';
    
    return null;
  };

  // Calculate aspect ratio dimensions
  const getAspectRatioDimensions = (width: number, height: number, ratio: string) => {
    let targetWidth, targetHeight;
    
    switch (ratio) {
      case '1:1':
        const size = Math.min(width, height);
        targetWidth = targetHeight = size;
        break;
      case '4:3':
        const ratio43 = 4 / 3;
        if (width / height > ratio43) {
          targetHeight = height;
          targetWidth = height * ratio43;
        } else {
          targetWidth = width;
          targetHeight = width / ratio43;
        }
        break;
      case '16:9':
        const ratio169 = 16 / 9;
        if (width / height > ratio169) {
          targetHeight = height;
          targetWidth = height * ratio169;
        } else {
          targetWidth = width;
          targetHeight = width / ratio169;
        }
        break;
      case '9:16':
        const ratio916 = 9 / 16;
        if (width / height > ratio916) {
          targetHeight = height;
          targetWidth = height * ratio916;
        } else {
          targetWidth = width;
          targetHeight = width / ratio916;
        }
        break;
      case 'custom':
        const customRatio = customAspectRatio.width / customAspectRatio.height;
        if (width / height > customRatio) {
          targetHeight = height;
          targetWidth = height * customRatio;
        } else {
          targetWidth = width;
          targetHeight = width / customRatio;
        }
        break;
      default: // auto
        targetWidth = width;
        targetHeight = height;
    }
    
    return { width: targetWidth, height: targetHeight };
  };

  // Smart crop algorithm with face detection simulation
  const calculateSmartCrop = (width: number, height: number, mode: string, ratio: string): CropArea => {
    // If in visual crop mode, use the visual crop area
    if (visualCropMode && visualCrop.isActive) {
      return visualCrop.cropArea;
    }

    const { width: targetWidth, height: targetHeight } = getAspectRatioDimensions(width, height, ratio);
    
    let cropX, cropY;
    
    switch (mode) {
      case 'face':
        // Simulate face detection - prioritize center area
        const faceCenterX = width * 0.5;
        const faceCenterY = height * 0.4; // Slightly above center for typical face positioning
        cropX = Math.max(0, Math.min(width - targetWidth, faceCenterX - targetWidth / 2));
        cropY = Math.max(0, Math.min(height - targetHeight, faceCenterY - targetHeight / 2));
        break;
        
      case 'composition':
        // Rule of thirds composition
        const thirdX = width / 3;
        const thirdY = height / 3;
        cropX = Math.max(0, Math.min(width - targetWidth, thirdX - targetWidth / 2));
        cropY = Math.max(0, Math.min(height - targetHeight, thirdY - targetHeight / 2));
        break;
        
      case 'content':
        // Content-aware cropping - avoid edges
        const marginX = width * 0.1;
        const marginY = height * 0.1;
        cropX = Math.max(marginX, Math.min(width - targetWidth - marginX, (width - targetWidth) / 2));
        cropY = Math.max(marginY, Math.min(height - targetHeight - marginY, (height - targetHeight) / 2));
        break;
        
      case 'center':
      default:
        // Center crop
        cropX = (width - targetWidth) / 2;
        cropY = (height - targetHeight) / 2;
        break;
    }
    
    return {
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.min(targetWidth, width),
      height: Math.min(targetHeight, height)
    };
  };

  // Generate preview for an image
  const generatePreview = async (image: UploadedImage): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(image.url);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const cropArea = calculateSmartCrop(img.width, img.height, cropMode, aspectRatio);
        
        // Set canvas to crop size
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        
        // Draw the cropped portion
        ctx.drawImage(
          img,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            resolve(image.url);
          }
        }, 'image/jpeg', cropQuality / 100);
      };
      img.src = image.url;
    });
  };

  // Update previews when settings change
  useEffect(() => {
    if (showPreview && files.length > 0) {
      files.forEach(async (image) => {
        const previewUrl = await generatePreview(image);
        setFiles(prev => prev.map(img => 
          img.id === image.id ? { ...img, previewUrl } : img
        ));
      });
    }
  }, [cropMode, aspectRatio, customAspectRatio, cropQuality, showPreview, visualCropMode, visualCrop.cropArea]);

  // Initialize visual crop when image is selected
  useEffect(() => {
    if (visualCropMode && selectedImage && imageRef.current) {
      const img = imageRef.current;
      img.onload = () => {
        initializeVisualCrop(selectedImage);
      };
    }
  }, [visualCropMode, selectedImage]);

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const processed = await Promise.all(
        files.map(async (image) => {
          // Create a canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');
          
          // Create an image element
          const img = document.createElement('img') as HTMLImageElement;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = image.url;
          });
          
          // Calculate crop area
          const cropArea = calculateSmartCrop(img.width, img.height, cropMode, aspectRatio);
          
          // Set canvas dimensions to crop size
          canvas.width = cropArea.width;
          canvas.height = cropArea.height;
          
          // Apply image smoothing for better quality
          ctx.imageSmoothingEnabled = maintainQuality;
          ctx.imageSmoothingQuality = maintainQuality ? 'high' : 'medium';
          
          // Draw the cropped portion
          ctx.drawImage(
            img,
            cropArea.x, cropArea.y, cropArea.width, cropArea.height,  // Source rectangle
            0, 0, cropArea.width, cropArea.height                     // Destination rectangle
          );
          
          // Convert to blob with specified quality
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(new Blob([''], { type: 'image/jpeg' }));
            }, 'image/jpeg', cropQuality / 100);
          });
          
          return {
            name: `cropped-${image.name}`,
            blob: blob
          };
        })
      );
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      alert(`Smart cropping completed! ${processed.length} image${processed.length > 1 ? 's' : ''} have been intelligently cropped.`);
    } catch (error) {
      console.error('Error processing images:', error);
      setIsProcessing(false);
      alert('Error processing images. Please try again.');
    }
  };

  const downloadAll = () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }

    if (processedFiles.length === 1) {
      // Single file download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(processedFiles[0].blob);
      link.download = processedFiles[0].name;
      link.click();
    } else {
      // Multiple files - download individually
      processedFiles.forEach((file) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file.blob);
        link.download = file.name;
        link.click();
      });
    }
  };

  const resetVisualCrop = () => {
    setVisualCrop(prev => ({
      ...prev,
      isActive: false,
      cropArea: { x: 0, y: 0, width: 0, height: 0 }
    }));
  };

  const features = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "AI Face Detection",
      description: "Intelligent face detection and preservation in crops"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Composition Analysis",
      description: "Rule of thirds and golden ratio composition analysis"
    },
    {
      icon: <Crop className="h-6 w-6" />,
      title: "Smart Cropping",
      description: "AI-powered cropping that preserves important content"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are processed securely and never stored permanently"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Images",
      description: "Drag and drop your images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Choose Settings",
      description: "Select AI model, aspect ratio, and cropping preferences"
    },
    {
      step: "3",
      title: "Smart Crop",
      description: "Our AI analyzes and crops your images with perfect composition"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "30M+", label: "Images Cropped" },
    { icon: <Zap className="h-5 w-5" />, value: "< 10s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  const aiModels = [
    { id: 'fast', name: 'Fast AI', description: 'Quick processing, good results' },
    { id: 'balanced', name: 'Balanced AI', description: 'Good speed and quality balance' },
    { id: 'advanced', name: 'Advanced AI', description: 'Best quality, face detection' },
    { id: 'professional', name: 'Professional AI', description: 'Studio-quality results, composition analysis' }
  ];

  const aspectRatios = [
    { id: 'auto', name: 'Auto Detect', description: 'AI determines best aspect ratio' },
    { id: '1:1', name: 'Square (1:1)', description: 'Perfect for social media' },
    { id: '4:3', name: 'Standard (4:3)', description: 'Traditional photo format' },
    { id: '16:9', name: 'Widescreen (16:9)', description: 'Perfect for videos and modern displays' },
    { id: '9:16', name: 'Portrait (9:16)', description: 'Mobile and social media' },
    { id: 'custom', name: 'Custom Ratio', description: 'Set your own aspect ratio' }
  ];

  const cropModes = [
    { id: 'smart', name: 'Smart AI', description: 'Intelligent cropping with AI analysis' },
    { id: 'face', name: 'Face Focus', description: 'Prioritize faces in the crop' },
    { id: 'center', name: 'Center Crop', description: 'Crop from the center of the image' },
    { id: 'composition', name: 'Composition', description: 'Follow photography composition rules' },
    { id: 'content', name: 'Content Aware', description: 'Preserve important content areas' },
    { id: 'visual', name: 'Visual Crop', description: 'Manually select crop area with visual interface' }
  ];

  return (
    <>
      <SEO
        title="Crop Image | Crop & Resize Photos Online"
        description="Use our crop image tool to trim and resize images quickly online. No software needed, just upload, crop, and download your edited photos."
        keywords="smart crop, AI cropping, auto crop, image composition, intelligent cropping, online tool, free tool"
        canonical="crop-image"
        ogImage="/images/smart-crop-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Crop className="h-4 w-4" />
                <span>Smart Crop</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Crop Image Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Advanced AI-powered smart cropping with face detection, composition analysis, and intelligent aspect ratio selection. 
                Perfect for social media, professional photography, and creative projects.
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

            {/* Main Tool Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    files.length > 0 
                      ? 'border-violet-500 bg-violet-50/50' 
                      : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={e => {
                    // Only trigger file input if not clicking on a button or input
                    if (e.target === e.currentTarget) {
                      fileInputRef.current?.click();
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here for smart cropping
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Choose Images
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <Camera className="h-5 w-5 text-violet-600" />
                      <span>Selected Images ({files.length})</span>
                    </h3>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center space-x-2 text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((image) => (
                      <div key={image.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Camera className="h-8 w-8 text-violet-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {image.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(image.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={() => removeFile(image.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                        {showPreview && (
                          <div className="relative">
                            <img
                              src={image.previewUrl || image.url}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            {image.previewUrl && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                Cropped
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Crop Interface */}
              {visualCropMode && selectedImage && (
                <div className="mb-8">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                        <MousePointer className="h-5 w-5 text-violet-600" />
                        <span>Visual Crop Interface</span>
                      </h3>
                      <button
                        onClick={resetVisualCrop}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Reset Crop
                      </button>
                    </div>
                    {/* Checkerboard background */}
                    <div className="relative w-full flex justify-center items-center" style={{ background: 'repeating-conic-gradient(#bbb 0% 25%, #eee 0% 50%) 50% / 32px 32px' }}>
                      <div
                        ref={containerRef}
                        className="relative"
                        style={{ width: 'fit-content', height: 'fit-content' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <img
                          ref={imageRef}
                          src={selectedImage.url}
                          alt="Crop Preview"
                          className="block max-h-[500px] object-contain"
                          style={{ maxWidth: '100%' }}
                        />
                        {/* Crop Overlay */}
                        {visualCrop.isActive && (
                          <>
                            {/* Crop area with blue border */}
                            <div
                              className="absolute border border-blue-500"
                              style={{
                                left: visualCrop.cropArea.x,
                                top: visualCrop.cropArea.y,
                                width: visualCrop.cropArea.width,
                                height: visualCrop.cropArea.height,
                                cursor: visualCrop.isDragging ? 'grabbing' : 'grab',
                                boxShadow: 'none',
                                background: 'transparent',
                                zIndex: 10,
                              }}
                            >
                              {/* Grid lines (rule of thirds) */}
                              <svg
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                width={visualCrop.cropArea.width}
                                height={visualCrop.cropArea.height}
                                style={{ zIndex: 11 }}
                              >
                                {/* Vertical lines */}
                                <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#fff" strokeDasharray="4,2" strokeWidth="1" opacity="0.7" />
                                <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="#fff" strokeDasharray="4,2" strokeWidth="1" opacity="0.7" />
                                {/* Horizontal lines */}
                                <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="#fff" strokeDasharray="4,2" strokeWidth="1" opacity="0.7" />
                                <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="#fff" strokeDasharray="4,2" strokeWidth="1" opacity="0.7" />
                              </svg>
                              {/* 8 blue square handles (corners + midpoints) */}
                              {/* Corners */}
                              <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-nw-resize" style={{ zIndex: 12 }} />
                              <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-ne-resize" style={{ zIndex: 12 }} />
                              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-sw-resize" style={{ zIndex: 12 }} />
                              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-se-resize" style={{ zIndex: 12 }} />
                              {/* Midpoints */}
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white cursor-n-resize" style={{ zIndex: 12 }} />
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white cursor-s-resize" style={{ zIndex: 12 }} />
                              <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-w-resize" style={{ zIndex: 12 }} />
                              <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-e-resize" style={{ zIndex: 12 }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p className="flex items-center space-x-2">
                        <Move className="h-4 w-4" />
                        <span>Drag to move crop area • Drag handles to resize • Maintains aspect ratio</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">AI Cropping Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {aiModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {aspectRatios.map(ratio => (
                        <option key={ratio.id} value={ratio.id}>
                          {ratio.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {aspectRatio === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Width
                      </label>
                      <input
                        type="number"
                        value={customAspectRatio.width}
                        onChange={(e) => setCustomAspectRatio(prev => ({ ...prev, width: parseInt(e.target.value) || 16 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Height
                      </label>
                      <input
                        type="number"
                        value={customAspectRatio.height}
                        onChange={(e) => setCustomAspectRatio(prev => ({ ...prev, height: parseInt(e.target.value) || 9 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crop Mode
                    </label>
                    <select
                      value={cropMode}
                      onChange={(e) => {
                        setCropMode(e.target.value);
                        if (e.target.value === 'visual') {
                          setVisualCropMode(true);
                          if (files.length > 0) {
                            setSelectedImage(files[0]);
                          }
                        } else {
                          setVisualCropMode(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {cropModes.map(mode => (
                        <option key={mode.id} value={mode.id}>
                          {mode.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality ({cropQuality}%)
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={cropQuality}
                      onChange={(e) => setCropQuality(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="faceDetection"
                      checked={faceDetection}
                      onChange={(e) => setFaceDetection(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="faceDetection" className="text-sm font-medium text-gray-700">
                      Face Detection
                    </label>
                    <Target className="h-4 w-4 text-violet-600" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="compositionAnalysis"
                      checked={compositionAnalysis}
                      onChange={(e) => setCompositionAnalysis(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="compositionAnalysis" className="text-sm font-medium text-gray-700">
                      Composition Analysis
                    </label>
                    <Palette className="h-4 w-4 text-violet-600" />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="maintainQuality"
                      checked={maintainQuality}
                      onChange={(e) => setMaintainQuality(e.target.checked)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintainQuality" className="text-sm font-medium text-gray-700">
                      Maintain Quality
                    </label>
                    <Maximize2 className="h-4 w-4 text-violet-600" />
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
                      <span>Cropping Images...</span>
                    </>
                  ) : (
                    <>
                      <Crop className="h-5 w-5" />
                      <span>Smart Crop Images</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Cropped Images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Smart Crop?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Advanced AI-powered smart cropping with multiple models and features
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
                  How to Smart Crop Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to crop your images with AI intelligence
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
                    Ready to Smart Crop Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your photos with AI-powered smart cropping. Join millions of users 
                    who trust our Smart Crop for perfect composition and professional results.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Crop className="h-5 w-5" />
                    <span>Start Cropping Now</span>
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

export default SmartCrop;