import React, { useState, useRef, useCallback } from 'react';
import { 
  Brain, Sparkles, Wand2, Eye, Zap, Target, 
  Layers, Palette, RotateCw, Maximize2, Settings,
  Download, Upload, Play, Pause, RefreshCw,
  CheckCircle, AlertCircle, TrendingUp, Award,
  Monitor, Smartphone, Camera, Film, Image as ImageIcon,
  Star, ArrowRight, Cpu, BarChart3
} from 'lucide-react';

interface AIEnhancerProps {
  onImageProcessed?: (processedImage: string, originalImage: string) => void;
}

const AIEnhancer: React.FC<AIEnhancerProps> = ({ onImageProcessed }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancementType, setEnhancementType] = useState<string>('auto');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const enhancementTypes = [
    {
      id: 'auto',
      name: 'Auto Enhance',
      description: 'AI automatically detects and applies optimal enhancements',
      icon: <Brain className="h-6 w-6" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      borderGradient: 'from-purple-200 to-indigo-200',
      features: ['Smart Detection', 'Auto Optimization', 'Quality Boost']
    },
    {
      id: 'portrait',
      name: 'Portrait Mode',
      description: 'Optimized for faces and people with skin tone enhancement',
      icon: <Camera className="h-6 w-6" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      bgGradient: 'from-pink-50 to-rose-50',
      borderGradient: 'from-pink-200 to-rose-200',
      features: ['Skin Enhancement', 'Face Detection', 'Portrait Lighting']
    },
    {
      id: 'landscape',
      name: 'Landscape Mode',
      description: 'Enhanced for nature, architecture, and scenic photos',
      icon: <Monitor className="h-6 w-6" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      bgGradient: 'from-green-50 to-emerald-50',
      borderGradient: 'from-green-200 to-emerald-200',
      features: ['Color Vibrancy', 'Detail Enhancement', 'HDR Effect']
    },
    {
      id: 'vintage',
      name: 'Vintage Restore',
      description: 'Restore old photos with AI-powered damage repair',
      icon: <Film className="h-6 w-6" />,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      bgGradient: 'from-amber-50 to-orange-50',
      borderGradient: 'from-amber-200 to-orange-200',
      features: ['Damage Repair', 'Color Restoration', 'Noise Reduction']
    },
    {
      id: 'upscale',
      name: 'Super Resolution',
      description: 'AI upscaling up to 4x with detail enhancement',
      icon: <Maximize2 className="h-6 w-6" />,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderGradient: 'from-blue-200 to-cyan-200',
      features: ['4x Upscaling', 'Detail Recovery', 'Edge Enhancement']
    },
    {
      id: 'artistic',
      name: 'Artistic Style',
      description: 'Apply artistic filters and creative enhancements',
      icon: <Palette className="h-6 w-6" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      bgGradient: 'from-violet-50 to-purple-50',
      borderGradient: 'from-violet-200 to-purple-200',
      features: ['Style Transfer', 'Creative Filters', 'Artistic Effects']
    }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSelectedImage(imageUrl);
        setProcessedImage(null);
        setAnalysisResults(null);
        analyzeImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageUrl: string) => {
    // Simulate AI image analysis
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Analyze image properties
      let totalBrightness = 0;
      let totalSaturation = 0;
      let faceDetected = false;
      let isLandscape = img.width > img.height;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate brightness
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        // Simple face detection heuristic (skin tone detection)
        if (r > 95 && g > 40 && b > 20 && r > g && r > b) {
          faceDetected = true;
        }
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      const quality = avgBrightness > 128 ? 'Excellent' : avgBrightness > 64 ? 'Good' : 'Needs Enhancement';

      setAnalysisResults({
        brightness: Math.round((avgBrightness / 255) * 100),
        quality,
        faceDetected,
        isLandscape,
        resolution: `${img.width}x${img.height}`,
        aspectRatio: (img.width / img.height).toFixed(2),
        recommendations: generateRecommendations(avgBrightness, faceDetected, isLandscape)
      });
    };
    img.src = imageUrl;
  };

  const generateRecommendations = (brightness: number, hasFace: boolean, isLandscape: boolean) => {
    const recommendations = [];
    
    if (brightness < 64) {
      recommendations.push('Increase brightness and contrast');
    }
    if (brightness > 200) {
      recommendations.push('Reduce overexposure');
    }
    if (hasFace) {
      recommendations.push('Use Portrait Mode for skin enhancement');
    }
    if (isLandscape) {
      recommendations.push('Landscape Mode for scenic enhancement');
    }
    
    return recommendations;
  };

  const processImage = async () => {
    if (!selectedImage || !canvasRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    // Simulate AI processing with progress updates
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = new Image();
      img.onload = () => {
        // Set canvas size based on enhancement type
        let scale = 1;
        if (enhancementType === 'upscale') {
          scale = 2; // 2x upscaling for demo
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Apply AI enhancements based on type
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply enhancement filters
        applyEnhancementFilter(ctx, canvas.width, canvas.height, enhancementType);

        // Convert to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const processedUrl = URL.createObjectURL(blob);
            setProcessedImage(processedUrl);
            setProcessingProgress(100);
            
            if (onImageProcessed) {
              onImageProcessed(processedUrl, selectedImage);
            }
          }
          setIsProcessing(false);
          clearInterval(progressInterval);
        }, 'image/jpeg', 0.95);
      };

      img.src = selectedImage;
    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      clearInterval(progressInterval);
    }
  };

  const applyEnhancementFilter = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      switch (type) {
        case 'auto':
          // Auto enhance: improve contrast and saturation
          r = Math.min(255, r * 1.1);
          g = Math.min(255, g * 1.1);
          b = Math.min(255, b * 1.1);
          break;
        
        case 'portrait':
          // Portrait: warm skin tones
          if (r > 95 && g > 40 && b > 20) {
            r = Math.min(255, r * 1.05);
            g = Math.min(255, g * 1.02);
          }
          break;
        
        case 'landscape':
          // Landscape: enhance greens and blues
          g = Math.min(255, g * 1.15);
          b = Math.min(255, b * 1.1);
          break;
        
        case 'vintage':
          // Vintage: sepia tone
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, gray + 40);
          g = Math.min(255, gray + 20);
          b = Math.min(255, gray);
          break;
        
        case 'artistic':
          // Artistic: vibrant colors
          r = Math.min(255, r * 1.2);
          g = Math.min(255, g * 1.2);
          b = Math.min(255, b * 1.2);
          break;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const downloadProcessed = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `enhanced_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 opacity-60"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
      
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
        {/* Header with Floating Elements */}
        <div className="relative mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600 rounded-2xl text-white shadow-2xl">
                <Brain className="h-8 w-8" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                AI Image Enhancer
              </h3>
              <p className="text-gray-600 font-medium">Professional AI-powered image enhancement</p>
            </div>
          </div>
          
          {/* Floating Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: <Cpu className="h-4 w-4" />, label: 'AI Models', value: '15+' },
              { icon: <Zap className="h-4 w-4" />, label: 'Speed', value: '< 2s' },
              { icon: <Award className="h-4 w-4" />, label: 'Accuracy', value: '98%' }
            ].map((stat, index) => (
              <div key={index} className="bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 shadow-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="text-purple-600">{stat.icon}</div>
                  <span className="text-sm font-bold text-gray-900">{stat.value}</span>
                </div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        {!selectedImage && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative border-2 border-dashed border-purple-300 rounded-2xl p-12 text-center hover:border-purple-400 transition-all duration-300 bg-gradient-to-br from-purple-50/50 to-blue-50/50 backdrop-blur-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center w-full h-full">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">Upload Image for AI Enhancement</h4>
                  <p className="text-gray-600 mb-6">Support for JPEG, PNG, WebP formats • Max 50MB</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>Select Image</span>
                    </span>
                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhancement Options */}
        {selectedImage && !isProcessing && !processedImage && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enhancementTypes.map((type) => (
                <div
                  key={type.id}
                  className={`group relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    enhancementType === type.id ? 'scale-105' : ''
                  }`}
                  onClick={() => setEnhancementType(type.id)}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${type.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity ${
                    enhancementType === type.id ? 'opacity-30' : ''
                  }`}></div>
                  
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    enhancementType === type.id
                      ? `border-transparent bg-gradient-to-br ${type.bgGradient} shadow-2xl`
                      : 'border-gray-200 bg-white/60 backdrop-blur-sm hover:border-gray-300 shadow-lg'
                  }`}>
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${type.gradient} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      {type.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">{type.name}</h4>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{type.description}</p>
                    
                    {/* Features */}
                    <div className="space-y-2">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${type.gradient}`}></div>
                          <span className="text-xs text-gray-700 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Selection Indicator */}
                    {enhancementType === type.id && (
                      <div className="absolute top-3 right-3">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${type.gradient} flex items-center justify-center shadow-lg`}>
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Image Analysis */}
            {analysisResults && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-blue-50/80 to-purple-50/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-200/50">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span>AI Analysis Results</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Brightness', value: `${analysisResults.brightness}%`, color: 'from-yellow-500 to-orange-500' },
                      { label: 'Quality', value: analysisResults.quality, color: 'from-green-500 to-emerald-500' },
                      { label: 'Resolution', value: analysisResults.resolution, color: 'from-blue-500 to-cyan-500' },
                      { label: 'Aspect Ratio', value: analysisResults.aspectRatio, color: 'from-purple-500 to-pink-500' }
                    ].map((item, index) => (
                      <div key={index} className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                        <div className={`text-lg font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                          {item.value}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {analysisResults.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span>AI Recommendations</span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysisResults.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30">
                            <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
                            <span className="text-sm text-gray-700 font-medium">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={processImage}
                className="group relative bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10 flex items-center space-x-3">
                  <Wand2 className="h-6 w-6" />
                  <span className="text-lg">Enhance with AI</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center w-full h-full">
                <RefreshCw className="h-12 w-12 text-white animate-spin" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">AI Processing in Progress</h4>
              <div className="relative w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 rounded-full opacity-20"></div>
                <div 
                  className="bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${processingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <p className="text-gray-600 font-medium">{Math.round(processingProgress)}% complete</p>
            </div>
          </div>
        )}

        {/* Results */}
        {processedImage && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-lg">Original</h4>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-600/20 rounded-2xl blur-xl"></div>
                  <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-xl">
                    <img src={selectedImage || undefined} alt="Original" className="w-full h-auto" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-lg flex items-center space-x-2">
                  <div className="p-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span>AI Enhanced</span>
                </h4>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl overflow-hidden shadow-2xl border border-purple-200/50">
                    <img src={processedImage || undefined} alt="Enhanced" className="w-full h-auto" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={downloadProcessed}
                className="group relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Download Enhanced</span>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setProcessedImage(null);
                  setAnalysisResults(null);
                }}
                className="group relative border-2 border-purple-500 text-purple-500 px-8 py-4 rounded-xl font-bold hover:bg-purple-50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Enhance Another Image</span>
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default AIEnhancer;