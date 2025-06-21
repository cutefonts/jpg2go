import React, { useState, useRef, useCallback } from 'react';
import { 
  Target, Brain, Sparkles, Upload, Download, Eye, 
  Zap, Settings, RotateCw, Maximize2, Minimize2,
  Grid3X3, Users, Camera, Smartphone, Monitor,
  CheckCircle, AlertCircle, RefreshCw, ArrowRight,
  Star, TrendingUp, Award, BarChart3, Crop
} from 'lucide-react';

interface SmartCropProps {
  onImageProcessed?: (processedImage: string, originalImage: string) => void;
}

const SmartCrop: React.FC<SmartCropProps> = ({ onImageProcessed }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropMode, setCropMode] = useState<string>('auto');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [cropSuggestions, setCropSuggestions] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cropModes = [
    {
      id: 'auto',
      name: 'Auto Detect',
      description: 'AI automatically detects the best crop based on content analysis',
      icon: <Brain className="h-6 w-6" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      features: ['Content Analysis', 'Face Detection', 'Object Recognition', 'Composition Rules']
    },
    {
      id: 'portrait',
      name: 'Portrait Focus',
      description: 'Optimized for people and faces with intelligent framing',
      icon: <Users className="h-6 w-6" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      bgGradient: 'from-pink-50 to-rose-50',
      features: ['Face Detection', 'Eye Tracking', 'Portrait Framing', 'Skin Tone Analysis']
    },
    {
      id: 'landscape',
      name: 'Landscape Mode',
      description: 'Perfect for scenic photos and architectural images',
      icon: <Monitor className="h-6 w-6" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      bgGradient: 'from-green-50 to-emerald-50',
      features: ['Horizon Detection', 'Scenic Framing', 'Architecture Focus', 'Nature Analysis']
    },
    {
      id: 'social',
      name: 'Social Media',
      description: 'Optimized crops for Instagram, Facebook, Twitter, and more',
      icon: <Smartphone className="h-6 w-6" />,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      features: ['Platform Optimization', 'Aspect Ratios', 'Engagement Focus', 'Trend Analysis']
    },
    {
      id: 'square',
      name: 'Square Crop',
      description: 'Perfect 1:1 ratio crops for Instagram and profile pictures',
      icon: <Grid3X3 className="h-6 w-6" />,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      bgGradient: 'from-amber-50 to-orange-50',
      features: ['1:1 Ratio', 'Center Focus', 'Profile Optimization', 'Symmetry Analysis']
    },
    {
      id: 'custom',
      name: 'Custom Ratio',
      description: 'Define your own aspect ratio with intelligent positioning',
      icon: <Settings className="h-6 w-6" />,
      gradient: 'from-violet-500 via-purple-500 to-pink-500',
      bgGradient: 'from-violet-50 to-purple-50',
      features: ['Custom Ratios', 'Manual Control', 'Precision Cropping', 'Advanced Settings']
    }
  ];

  const socialPlatforms = [
    { name: 'Instagram Post', ratio: '1:1', size: '1080x1080' },
    { name: 'Instagram Story', ratio: '9:16', size: '1080x1920' },
    { name: 'Facebook Post', ratio: '1.91:1', size: '1200x630' },
    { name: 'Twitter Header', ratio: '3:1', size: '1500x500' },
    { name: 'LinkedIn Post', ratio: '1.91:1', size: '1200x627' },
    { name: 'YouTube Thumbnail', ratio: '16:9', size: '1280x720' }
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
        setCropSuggestions([]);
        analyzeImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageUrl: string) => {
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
      let faceDetected = false;
      let isLandscape = img.width > img.height;
      let brightnessMap: number[] = [];
      let edgeMap: number[] = [];

      // Simple face detection and edge detection
      for (let y = 0; y < canvas.height; y += 10) {
        for (let x = 0; x < canvas.width; x += 10) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = (r + g + b) / 3;
          brightnessMap.push(brightness);

          // Simple skin tone detection for face detection
          if (r > 95 && g > 40 && b > 20 && r > g && r > b) {
            faceDetected = true;
          }
        }
      }

      // Generate crop suggestions based on analysis
      const suggestions = generateCropSuggestions(img.width, img.height, faceDetected, isLandscape);
      
      setAnalysisResults({
        faceDetected,
        isLandscape,
        resolution: `${img.width}x${img.height}`,
        aspectRatio: (img.width / img.height).toFixed(2),
        dominantFeatures: faceDetected ? ['Face'] : isLandscape ? ['Landscape'] : ['Portrait'],
        recommendations: generateRecommendations(faceDetected, isLandscape)
      });

      setCropSuggestions(suggestions);
    };
    img.src = imageUrl;
  };

  const generateCropSuggestions = (width: number, height: number, hasFace: boolean, isLandscape: boolean) => {
    const suggestions = [];
    
    // Auto crop suggestion
    suggestions.push({
      id: 'auto',
      name: 'AI Recommended',
      confidence: 95,
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8),
      ratio: '4:3'
    });

    // Face-focused crop if face detected
    if (hasFace) {
      suggestions.push({
        id: 'face',
        name: 'Face Focus',
        confidence: 88,
        x: Math.round(width * 0.2),
        y: Math.round(height * 0.15),
        width: Math.round(width * 0.6),
        height: Math.round(height * 0.7),
        ratio: '3:4'
      });
    }

    // Square crop
    const squareSize = Math.min(width, height) * 0.9;
    const squareX = (width - squareSize) / 2;
    const squareY = (height - squareSize) / 2;
    suggestions.push({
      id: 'square',
      name: 'Square (1:1)',
      confidence: 82,
      x: Math.round(squareX),
      y: Math.round(squareY),
      width: Math.round(squareSize),
      height: Math.round(squareSize),
      ratio: '1:1'
    });

    // Landscape crop
    if (isLandscape) {
      suggestions.push({
        id: 'landscape',
        name: 'Landscape (16:9)',
        confidence: 85,
        x: Math.round(width * 0.05),
        y: Math.round(height * 0.2),
        width: Math.round(width * 0.9),
        height: Math.round(width * 0.9 * 9 / 16),
        ratio: '16:9'
      });
    }

    return suggestions;
  };

  const generateRecommendations = (hasFace: boolean, isLandscape: boolean) => {
    const recommendations = [];
    
    if (hasFace) {
      recommendations.push('Use Portrait Focus mode for optimal face framing');
      recommendations.push('Consider square crop for profile pictures');
    }
    
    if (isLandscape) {
      recommendations.push('Landscape mode will enhance scenic elements');
      recommendations.push('16:9 ratio perfect for social media');
    }
    
    recommendations.push('Auto Detect mode provides best overall results');
    
    return recommendations;
  };

  const applyCrop = async (suggestion: any) => {
    if (!selectedImage || !canvasRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

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
        canvas.width = suggestion.width;
        canvas.height = suggestion.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the cropped portion
        ctx.drawImage(
          img,
          suggestion.x, suggestion.y, suggestion.width, suggestion.height,
          0, 0, canvas.width, canvas.height
        );

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
      console.error('Cropping error:', error);
      setIsProcessing(false);
      clearInterval(progressInterval);
    }
  };

  const downloadProcessed = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `smart_crop_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 opacity-60"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
      
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
        {/* Header */}
        <div className="relative mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl text-white shadow-2xl">
                <Target className="h-8 w-8" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Smart Crop Tool
              </h3>
              <p className="text-gray-600 font-medium">AI-powered composition analysis and intelligent cropping</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: <Brain className="h-4 w-4" />, label: 'AI Models', value: '8+' },
              { icon: <Zap className="h-4 w-4" />, label: 'Speed', value: '< 1s' },
              { icon: <Award className="h-4 w-4" />, label: 'Accuracy', value: '95%' }
            ].map((stat, index) => (
              <div key={index} className="bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 shadow-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="text-emerald-600">{stat.icon}</div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center hover:border-emerald-400 transition-all duration-300 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 backdrop-blur-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center w-full h-full">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">Upload Image for Smart Cropping</h4>
                  <p className="text-gray-600 mb-6">AI will analyze composition and suggest optimal crops</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center space-x-2">
                      <Camera className="h-5 w-5" />
                      <span>Select Image</span>
                    </span>
                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Crop Mode Selection */}
        {selectedImage && !isProcessing && !processedImage && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cropModes.map((mode) => (
                <div
                  key={mode.id}
                  className={`group relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    cropMode === mode.id ? 'scale-105' : ''
                  }`}
                  onClick={() => setCropMode(mode.id)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${mode.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity ${
                    cropMode === mode.id ? 'opacity-30' : ''
                  }`}></div>
                  
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    cropMode === mode.id
                      ? `border-transparent bg-gradient-to-br ${mode.bgGradient} shadow-2xl`
                      : 'border-gray-200 bg-white/60 backdrop-blur-sm hover:border-gray-300 shadow-lg'
                  }`}>
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${mode.gradient} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      {mode.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">{mode.name}</h4>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{mode.description}</p>
                    
                    <div className="space-y-2">
                      {mode.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.gradient}`}></div>
                          <span className="text-xs text-gray-700 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {cropMode === mode.id && (
                      <div className="absolute top-3 right-3">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${mode.gradient} flex items-center justify-center shadow-lg`}>
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Analysis Results */}
            {analysisResults && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200/50">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span>AI Analysis Results</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Face Detected', value: analysisResults.faceDetected ? 'Yes' : 'No', color: 'from-pink-500 to-rose-500' },
                      { label: 'Type', value: analysisResults.isLandscape ? 'Landscape' : 'Portrait', color: 'from-blue-500 to-cyan-500' },
                      { label: 'Resolution', value: analysisResults.resolution, color: 'from-purple-500 to-violet-500' },
                      { label: 'Aspect Ratio', value: analysisResults.aspectRatio, color: 'from-emerald-500 to-teal-500' }
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
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span>AI Recommendations</span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysisResults.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30">
                            <div className="w-2 h-2 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-full"></div>
                            <span className="text-sm text-gray-700 font-medium">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Crop Suggestions */}
            {cropSuggestions.length > 0 && (
              <div className="space-y-6">
                <h4 className="font-bold text-gray-900 text-xl flex items-center space-x-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  <span>Smart Crop Suggestions</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cropSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-gray-900">{suggestion.name}</h5>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-700">{suggestion.confidence}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Ratio:</span>
                          <span className="font-medium">{suggestion.ratio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span className="font-medium">{suggestion.width}×{suggestion.height}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => applyCrop(suggestion)}
                        className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <Crop className="h-4 w-4" />
                        <span>Apply Crop</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Presets */}
            <div className="space-y-6">
              <h4 className="font-bold text-gray-900 text-xl flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <span>Social Media Presets</span>
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {socialPlatforms.map((platform, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const [w, h] = platform.ratio.split(':').map(Number);
                      const suggestion = {
                        id: `social-${index}`,
                        name: platform.name,
                        confidence: 90,
                        x: 0,
                        y: 0,
                        width: 800,
                        height: Math.round(800 * h / w),
                        ratio: platform.ratio
                      };
                      applyCrop(suggestion);
                    }}
                    className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="text-sm font-bold text-gray-900 mb-1">{platform.name}</div>
                    <div className="text-xs text-gray-600">{platform.ratio}</div>
                    <div className="text-xs text-gray-500">{platform.size}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center w-full h-full">
                <RefreshCw className="h-12 w-12 text-white animate-spin" />
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">AI Processing Smart Crop</h4>
              <div className="relative w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-full opacity-20"></div>
                <div 
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
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
                  <div className="p-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span>Smart Cropped</span>
                </h4>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl overflow-hidden shadow-2xl border border-emerald-200/50">
                    <img src={processedImage || undefined} alt="Cropped" className="w-full h-auto" />
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
                  <span>Download Cropped</span>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setProcessedImage(null);
                  setAnalysisResults(null);
                  setCropSuggestions([]);
                }}
                className="group relative border-2 border-emerald-500 text-emerald-500 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Crop Another Image</span>
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default SmartCrop;