import React, { useState } from 'react';
import { 
  Brain, Target, Scissors, BarChart3, Layers, Wand2,
  Sparkles, ArrowRight, Star, TrendingUp, Award,
  Zap, Eye, Settings, Download, Upload, Play,
  Palette, RotateCw, Maximize2, Minimize2, Grid3X3,
  Crop, Filter, Contrast, Sun, Moon, Droplets,
  Paintbrush, Eraser, Move, Copy, Shuffle, Sliders,
  Image as ImageIcon, FileImage, Camera, Video,
  Layers3, Blend, Focus, Aperture, Lightbulb,
  FileText, FilePlus, FileX, Merge, Split, Lock,
  Unlock, Compress, Archive, ScanLine, Type,
  Combine, Divide, Shield, Key, Search, Replace,
  RotateCcw, FlipHorizontal, FlipVertical, Crop as CropIcon,
  Transparency, Contrast2, Brightness, Saturation,
  Gamma, Histogram, ColorPicker, Eyedropper
} from 'lucide-react';
import AIEnhancer from './AIEnhancer';
import SmartCrop from './SmartCrop';
import BackgroundRemover from './BackgroundRemover';

const AdvancedToolsHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    // AI Tools
    {
      id: 'ai-enhancer',
      name: 'AI Image Enhancer',
      description: 'Transform your images with cutting-edge AI algorithms that analyze and enhance every pixel',
      icon: <Brain className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Super-resolution up to 4x', 'Intelligent noise reduction', 'Smart sharpening', 'Color optimization'],
      badge: 'AI Powered',
      component: AIEnhancer,
      category: 'AI Tools'
    },
    {
      id: 'smart-crop',
      name: 'Smart Crop Tool',
      description: 'AI-powered composition analysis with face detection and social media optimization',
      icon: <Target className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: ['Face & object detection', 'Rule of thirds analysis', 'Social media formats', 'Confidence scoring'],
      badge: 'Smart AI',
      component: SmartCrop,
      category: 'AI Tools'
    },
    {
      id: 'background-remover',
      name: 'Background Remover',
      description: 'Intelligent background removal with edge detection and replacement options',
      icon: <Scissors className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['AI background detection', 'Edge smoothing', 'Color replacement', 'Transparent output'],
      badge: 'Pro Tool',
      component: BackgroundRemover,
      category: 'AI Tools'
    },

    // PDF Tools
    {
      id: 'pdf-to-jpg',
      name: 'PDF to JPG Converter',
      description: 'Convert PDF pages to high-quality JPG images with custom DPI and quality settings',
      icon: <FileImage className="h-8 w-8" />,
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      features: ['High-resolution output', 'Custom DPI settings', 'Batch page conversion', 'Quality optimization'],
      badge: 'PDF Pro',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-to-png',
      name: 'PDF to PNG Converter',
      description: 'Extract PDF pages as PNG images with transparency support and lossless quality',
      icon: <FileText className="h-8 w-8" />,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      features: ['Transparency preservation', 'Lossless conversion', 'Vector graphics support', 'Text clarity'],
      badge: 'Lossless',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'jpg-to-pdf',
      name: 'JPG to PDF Creator',
      description: 'Combine multiple JPG images into a single PDF with custom page layouts and compression',
      icon: <FilePlus className="h-8 w-8" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['Multi-image PDF creation', 'Custom page layouts', 'Compression options', 'Metadata support'],
      badge: 'Creator',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'png-to-pdf',
      name: 'PNG to PDF Creator',
      description: 'Convert PNG images to PDF while preserving transparency and image quality',
      icon: <Combine className="h-8 w-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      features: ['Transparency handling', 'Quality preservation', 'Batch conversion', 'Custom sizing'],
      badge: 'Quality',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-merger',
      name: 'PDF Merger',
      description: 'Merge multiple PDF files into one document with custom page ordering',
      icon: <Merge className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      features: ['Drag & drop ordering', 'Page range selection', 'Bookmark preservation', 'Metadata merging'],
      badge: 'Combine',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-splitter',
      name: 'PDF Splitter',
      description: 'Split PDF documents into individual pages or custom page ranges',
      icon: <Split className="h-8 w-8" />,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      features: ['Page range splitting', 'Individual page extraction', 'Batch processing', 'Custom naming'],
      badge: 'Divide',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-compressor',
      name: 'PDF Compressor',
      description: 'Reduce PDF file size while maintaining quality using advanced compression algorithms',
      icon: <Compress className="h-8 w-8" />,
      gradient: 'from-slate-500 via-gray-500 to-zinc-500',
      features: ['Smart compression', 'Quality presets', 'Size optimization', 'Batch compression'],
      badge: 'Optimize',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-protector',
      name: 'PDF Password Protector',
      description: 'Add password protection and security features to your PDF documents',
      icon: <Lock className="h-8 w-8" />,
      gradient: 'from-red-600 via-rose-600 to-pink-600',
      features: ['Password encryption', 'Permission controls', 'Digital signatures', 'Security levels'],
      badge: 'Secure',
      component: null,
      category: 'PDF Tools'
    },
    {
      id: 'pdf-unlocker',
      name: 'PDF Password Remover',
      description: 'Remove password protection from PDF files you own with proper authorization',
      icon: <Unlock className="h-8 w-8" />,
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      features: ['Password removal', 'Permission unlocking', 'Batch processing', 'Security validation'],
      badge: 'Unlock',
      component: null,
      category: 'PDF Tools'
    },

    // JPG Specific Tools
    {
      id: 'jpg-optimizer',
      name: 'JPG Optimizer',
      description: 'Advanced JPG compression with quality analysis and progressive encoding options',
      icon: <Zap className="h-8 w-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      features: ['Progressive JPEG', 'Quality analysis', 'Huffman optimization', 'Chroma subsampling'],
      badge: 'Optimize',
      component: null,
      category: 'JPG Tools'
    },
    {
      id: 'jpg-metadata-editor',
      name: 'JPG EXIF Editor',
      description: 'Edit, remove, or add EXIF metadata to JPG images for privacy and organization',
      icon: <Type className="h-8 w-8" />,
      gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
      features: ['EXIF data editing', 'GPS removal', 'Copyright info', 'Batch metadata'],
      badge: 'Privacy',
      component: null,
      category: 'JPG Tools'
    },
    {
      id: 'jpg-quality-analyzer',
      name: 'JPG Quality Analyzer',
      description: 'Analyze JPG compression artifacts and quality metrics with detailed reports',
      icon: <BarChart3 className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Quality scoring', 'Artifact detection', 'Compression analysis', 'Optimization tips'],
      badge: 'Analysis',
      component: null,
      category: 'JPG Tools'
    },
    {
      id: 'jpg-progressive-converter',
      name: 'Progressive JPG Creator',
      description: 'Convert standard JPG to progressive format for faster web loading',
      icon: <ScanLine className="h-8 w-8" />,
      gradient: 'from-teal-500 via-cyan-500 to-blue-500',
      features: ['Progressive encoding', 'Web optimization', 'Loading preview', 'Batch conversion'],
      badge: 'Web Ready',
      component: null,
      category: 'JPG Tools'
    },

    // PNG Specific Tools
    {
      id: 'png-optimizer',
      name: 'PNG Optimizer',
      description: 'Lossless PNG compression with palette optimization and transparency handling',
      icon: <Transparency className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      features: ['Lossless compression', 'Palette optimization', 'Transparency preservation', 'Chunk optimization'],
      badge: 'Lossless',
      component: null,
      category: 'PNG Tools'
    },
    {
      id: 'png-transparency-editor',
      name: 'PNG Transparency Editor',
      description: 'Edit transparency channels, create alpha masks, and manage transparent regions',
      icon: <Eyedropper className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['Alpha channel editing', 'Color to transparency', 'Transparency masks', 'Edge smoothing'],
      badge: 'Alpha Pro',
      component: null,
      category: 'PNG Tools'
    },
    {
      id: 'png-to-jpg-converter',
      name: 'PNG to JPG Converter',
      description: 'Convert PNG to JPG with background color options and quality control',
      icon: <Replace className="h-8 w-8" />,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      features: ['Background color selection', 'Quality control', 'Transparency handling', 'Batch conversion'],
      badge: 'Convert',
      component: null,
      category: 'PNG Tools'
    },
    {
      id: 'png-sprite-generator',
      name: 'PNG Sprite Generator',
      description: 'Combine multiple PNG images into sprite sheets for web development',
      icon: <Grid3X3 className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      features: ['Sprite sheet creation', 'CSS generation', 'Optimization', 'Custom layouts'],
      badge: 'Web Dev',
      component: null,
      category: 'PNG Tools'
    },

    // Enhanced Image Tools
    {
      id: 'batch-processor',
      name: 'Batch Processor',
      description: 'Process hundreds of images simultaneously with consistent settings and quality',
      icon: <Layers className="h-8 w-8" />,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      features: ['Process up to 1000 images', 'Consistent quality settings', 'Progress tracking', 'ZIP download'],
      badge: 'High Volume',
      component: null,
      category: 'Productivity'
    },
    {
      id: 'image-analyzer',
      name: 'Image Analyzer',
      description: 'Comprehensive analysis including color palettes, quality metrics, and optimization tips',
      icon: <BarChart3 className="h-8 w-8" />,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      features: ['Color palette extraction', 'Quality metrics', 'Metadata analysis', 'Optimization suggestions'],
      badge: 'Deep Insights',
      component: null,
      category: 'Analysis'
    },
    {
      id: 'format-converter',
      name: 'Universal Format Converter',
      description: 'Convert between 20+ image formats with advanced compression and quality controls',
      icon: <FileImage className="h-8 w-8" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['20+ format support', 'Smart compression', 'Quality presets', 'Lossless options'],
      badge: 'Universal',
      component: null,
      category: 'Conversion'
    },
    {
      id: 'image-resizer',
      name: 'Smart Resizer',
      description: 'Intelligent image resizing with aspect ratio preservation and quality optimization',
      icon: <Maximize2 className="h-8 w-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      features: ['Smart scaling algorithms', 'Aspect ratio lock', 'Batch resizing', 'Custom dimensions'],
      badge: 'Precision',
      component: null,
      category: 'Transform'
    },
    {
      id: 'color-adjuster',
      name: 'Color Adjuster',
      description: 'Professional color correction with HSL controls, curves, and color grading',
      icon: <Palette className="h-8 w-8" />,
      gradient: 'from-pink-500 via-purple-500 to-violet-500',
      features: ['HSL adjustments', 'Color curves', 'White balance', 'Selective color editing'],
      badge: 'Pro Color',
      component: null,
      category: 'Color'
    },
    {
      id: 'filter-studio',
      name: 'Filter Studio',
      description: 'Apply professional filters and effects with real-time preview and custom presets',
      icon: <Filter className="h-8 w-8" />,
      gradient: 'from-red-500 via-pink-500 to-purple-500',
      features: ['50+ professional filters', 'Custom presets', 'Real-time preview', 'Blend modes'],
      badge: 'Creative',
      component: null,
      category: 'Effects'
    },
    {
      id: 'watermark-tool',
      name: 'Watermark Tool',
      description: 'Add text or image watermarks with advanced positioning and transparency controls',
      icon: <Paintbrush className="h-8 w-8" />,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      features: ['Text & image watermarks', 'Position controls', 'Transparency settings', 'Batch watermarking'],
      badge: 'Protection',
      component: null,
      category: 'Branding'
    },
    {
      id: 'noise-reducer',
      name: 'Noise Reducer',
      description: 'Advanced noise reduction using AI algorithms to clean up grainy or low-light images',
      icon: <Droplets className="h-8 w-8" />,
      gradient: 'from-teal-500 via-cyan-500 to-blue-500',
      features: ['AI noise detection', 'Luminance & color noise', 'Detail preservation', 'Batch processing'],
      badge: 'AI Clean',
      component: null,
      category: 'Enhancement'
    },
    {
      id: 'sharpening-tool',
      name: 'Sharpening Tool',
      description: 'Intelligent sharpening with edge detection to enhance details without artifacts',
      icon: <Focus className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      features: ['Edge-aware sharpening', 'Unsharp mask', 'Smart radius detection', 'Preview comparison'],
      badge: 'Sharp',
      component: null,
      category: 'Enhancement'
    },
    {
      id: 'exposure-corrector',
      name: 'Exposure Corrector',
      description: 'Fix overexposed or underexposed images with intelligent tone mapping',
      icon: <Sun className="h-8 w-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      features: ['Auto exposure correction', 'Highlight recovery', 'Shadow lifting', 'HDR tone mapping'],
      badge: 'Auto Fix',
      component: null,
      category: 'Correction'
    },
    {
      id: 'perspective-corrector',
      name: 'Perspective Corrector',
      description: 'Correct perspective distortion and keystone effects in architectural photos',
      icon: <Grid3X3 className="h-8 w-8" />,
      gradient: 'from-slate-500 via-gray-500 to-zinc-500',
      features: ['Keystone correction', 'Perspective guides', 'Auto detection', 'Manual adjustment'],
      badge: 'Geometry',
      component: null,
      category: 'Correction'
    },
    {
      id: 'vintage-effects',
      name: 'Vintage Effects',
      description: 'Create authentic vintage looks with film emulation and retro color grading',
      icon: <Camera className="h-8 w-8" />,
      gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      features: ['Film emulation', 'Vintage color grading', 'Grain effects', 'Light leaks'],
      badge: 'Retro',
      component: null,
      category: 'Effects'
    },
    {
      id: 'collage-maker',
      name: 'Collage Maker',
      description: 'Create stunning photo collages with customizable layouts and spacing',
      icon: <Grid3X3 className="h-8 w-8" />,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      features: ['Multiple layouts', 'Custom spacing', 'Background options', 'Auto arrangement'],
      badge: 'Creative',
      component: null,
      category: 'Composition'
    },
    {
      id: 'border-tool',
      name: 'Border & Frame Tool',
      description: 'Add professional borders, frames, and edge effects to your images',
      icon: <Copy className="h-8 w-8" />,
      gradient: 'from-rose-500 via-pink-500 to-purple-500',
      features: ['Custom borders', 'Frame styles', 'Shadow effects', 'Rounded corners'],
      badge: 'Styling',
      component: null,
      category: 'Styling'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: <Layers3 className="h-4 w-4" /> },
    { id: 'AI Tools', name: 'AI Tools', icon: <Brain className="h-4 w-4" /> },
    { id: 'PDF Tools', name: 'PDF Tools', icon: <FileText className="h-4 w-4" /> },
    { id: 'JPG Tools', name: 'JPG Tools', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'PNG Tools', name: 'PNG Tools', icon: <Transparency className="h-4 w-4" /> },
    { id: 'Enhancement', name: 'Enhancement', icon: <Wand2 className="h-4 w-4" /> },
    { id: 'Transform', name: 'Transform', icon: <RotateCw className="h-4 w-4" /> },
    { id: 'Color', name: 'Color', icon: <Palette className="h-4 w-4" /> },
    { id: 'Effects', name: 'Effects', icon: <Filter className="h-4 w-4" /> },
    { id: 'Correction', name: 'Correction', icon: <Sliders className="h-4 w-4" /> },
    { id: 'Conversion', name: 'Conversion', icon: <FileImage className="h-4 w-4" /> },
    { id: 'Analysis', name: 'Analysis', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'Productivity', name: 'Productivity', icon: <Layers className="h-4 w-4" /> }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);

  const stats = [
    { icon: <TrendingUp className="h-5 w-5" />, value: "98%", label: "Accuracy Rate" },
    { icon: <Zap className="h-5 w-5" />, value: "< 2s", label: "Processing Time" },
    { icon: <Award className="h-5 w-5" />, value: "35+", label: "Professional Tools" },
    { icon: <Star className="h-5 w-5" />, value: "4.9/5", label: "User Rating" }
  ];

  if (activeTool) {
    const tool = tools.find(t => t.id === activeTool);
    if (tool && tool.component) {
      const ToolComponent = tool.component;
      return (
        <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => setActiveTool(null)}
                className="inline-flex items-center space-x-2 text-violet-600 hover:text-violet-700 mb-6 transition-colors hover:bg-violet-50 px-3 py-2 rounded-lg"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Tools</span>
              </button>
              
              <div className="text-center mb-8">
                <div className={`inline-flex p-4 bg-gradient-to-br ${tool.gradient} rounded-2xl text-white shadow-lg mb-4`}>
                  {tool.icon}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{tool.name}</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">{tool.description}</p>
              </div>
            </div>
            
            <ToolComponent />
          </div>
        </section>
      );
    }
  }

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Professional Tool Suite</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
            Complete Image & PDF Suite
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Comprehensive collection of AI-powered tools for PDF processing, JPG optimization, PNG editing, 
            and advanced image enhancement. Everything you need for professional results.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
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

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
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
              className="group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden transform hover:-translate-y-2 cursor-pointer"
              onClick={() => tool.component ? setActiveTool(tool.id) : null}
            >
              {/* Animated Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              {/* Floating Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1 bg-gradient-to-r ${tool.gradient} text-white text-xs font-bold rounded-full shadow-lg`}>
                  {tool.badge}
                </span>
              </div>

              {/* Coming Soon Overlay for tools without components */}
              {!tool.component && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="relative p-8">
                {/* Icon & Header */}
                <div className="mb-6">
                  <div className={`inline-flex p-4 bg-gradient-to-br ${tool.gradient} rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                    {tool.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tool.name}</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">
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
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full bg-gradient-to-r ${tool.gradient} text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-105 relative overflow-hidden ${
                    !tool.component ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  disabled={!tool.component}
                >
                  <span className="relative z-10">
                    {tool.component ? `Try ${tool.name}` : 'Coming Soon'}
                  </span>
                  {tool.component && (
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  )}
                  
                  {/* Button shine effect */}
                  {tool.component && (
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
                <Transparency className="h-8 w-8 text-white" />
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
                  onClick={() => {
                    const element = document.getElementById('converter');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start with Basic Converter
                </button>
                <button 
                  onClick={() => setActiveTool('ai-enhancer')}
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
  );
};

export default AdvancedToolsHub;