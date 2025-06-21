import React, { useState, useRef, useCallback } from 'react';
import { 
  Brain, Wand2, Layers, Zap, Eye, Palette, 
  RotateCw, Crop, Maximize2, Minimize2, Target,
  Sparkles, Settings, Download, Upload, Play,
  Pause, SkipForward, Rewind, Volume2, VolumeX,
  Camera, Video, Mic, MicOff, Monitor, Smartphone,
  Tablet, Globe, Share2, Link, QrCode, Hash,
  FileImage, Image as ImageIcon, Film, Music,
  Headphones, Speaker, Wifi, WifiOff, Bluetooth,
  Cpu, HardDrive, MemoryStick, Battery, Gauge,
  ArrowRight, Star, TrendingUp, Award, Shield,
  CheckCircle, Clock, Users, BarChart3, X
} from 'lucide-react';

const AdvancedFeatures: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const advancedTools = [
    {
      id: 'ai-enhancer',
      title: 'AI Image Enhancer',
      subtitle: 'Neural Network Enhancement',
      description: 'Transform your images with cutting-edge AI algorithms that analyze and enhance every pixel for professional results.',
      icon: <Brain className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: [
        'Super-resolution up to 4x enhancement',
        'Intelligent noise reduction',
        'Smart sharpening and detail enhancement',
        'Color space optimization',
        'Real-time quality metrics'
      ],
      stats: {
        accuracy: '98%',
        speed: '< 2s',
        formats: '15+'
      },
      useCases: [
        'Upscale low-resolution photos',
        'Restore old or damaged images',
        'Enhance social media content',
        'Prepare images for print'
      ],
      badge: 'AI Powered',
      color: 'purple'
    },
    {
      id: 'smart-crop',
      title: 'Smart Crop Tool',
      subtitle: 'AI-Powered Composition',
      description: 'Let AI analyze your images and suggest perfect crops using face detection, object recognition, and composition rules.',
      icon: <Target className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: [
        'Face and object detection',
        'Rule of thirds analysis',
        'Social media format optimization',
        'Multiple crop suggestions',
        'Confidence scoring system'
      ],
      stats: {
        accuracy: '95%',
        speed: '< 1s',
        formats: '10+'
      },
      useCases: [
        'Create social media content',
        'Focus on important subjects',
        'Generate multiple aspect ratios',
        'Optimize for different platforms'
      ],
      badge: 'Smart AI',
      color: 'emerald'
    },
    {
      id: 'real-time-editor',
      title: 'Real-Time Editor',
      subtitle: 'Live Preview Editing',
      description: 'Professional-grade editing with instant preview. Adjust colors, apply filters, and transform images with real-time feedback.',
      icon: <Wand2 className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: [
        'Real-time preview updates',
        'Professional color grading',
        'Advanced filter system',
        'Non-destructive editing',
        'Unlimited undo/redo'
      ],
      stats: {
        accuracy: '100%',
        speed: 'Real-time',
        formats: '12+'
      },
      useCases: [
        'Professional photo editing',
        'Creative filter application',
        'Color correction and grading',
        'Artistic image enhancement'
      ],
      badge: 'Pro Editor',
      color: 'pink'
    },
    {
      id: 'comparison',
      title: 'Comparison Tool',
      subtitle: 'Side-by-Side Analysis',
      description: 'Compare images with precision using advanced analysis tools, quality metrics, and visual difference detection.',
      icon: <Eye className="h-8 w-8" />,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      features: [
        'Side-by-side comparison',
        'Quality metrics analysis',
        'Compression ratio calculation',
        'Visual difference highlighting',
        'Export comparison reports'
      ],
      stats: {
        accuracy: '99%',
        speed: '< 0.5s',
        formats: 'All'
      },
      useCases: [
        'Quality assessment',
        'Compression optimization',
        'Before/after analysis',
        'Format comparison'
      ],
      badge: 'Analytics',
      color: 'blue'
    },
    {
      id: 'analyzer',
      title: 'Image Analyzer',
      subtitle: 'Comprehensive Analysis',
      description: 'Get detailed insights about your images including color analysis, technical quality assessment, and optimization recommendations.',
      icon: <BarChart3 className="h-8 w-8" />,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      features: [
        'Color palette extraction',
        'Technical quality metrics',
        'Metadata analysis',
        'Optimization suggestions',
        'Web performance scoring'
      ],
      stats: {
        accuracy: '97%',
        speed: '< 1s',
        formats: '20+'
      },
      useCases: [
        'Image quality assessment',
        'Color scheme extraction',
        'Web optimization analysis',
        'Technical documentation'
      ],
      badge: 'Deep Insights',
      color: 'orange'
    },
    {
      id: 'batch-processor',
      title: 'Batch Processor',
      subtitle: 'Mass Processing Power',
      description: 'Process hundreds of images simultaneously with consistent settings. Perfect for photographers and content creators.',
      icon: <Layers className="h-8 w-8" />,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: [
        'Process up to 1000 images',
        'Consistent quality settings',
        'Progress tracking',
        'ZIP download packaging',
        'Custom naming conventions'
      ],
      stats: {
        accuracy: '100%',
        speed: 'Parallel',
        formats: '15+'
      },
      useCases: [
        'Bulk image conversion',
        'Consistent processing',
        'Workflow automation',
        'Large project handling'
      ],
      badge: 'High Volume',
      color: 'green'
    }
  ];

  const handleToolClick = (toolId: string) => {
    // This would be handled by the parent component's navigation
    console.log(`Navigate to ${toolId}`);
  };

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Advanced Tools</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
            Professional Image Processing Suite
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Unlock the full potential of your images with our advanced AI-powered tools. 
            From intelligent enhancement to batch processing, everything you need for professional results.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { icon: <Users className="h-5 w-5" />, value: "50K+", label: "Active Users" },
            { icon: <TrendingUp className="h-5 w-5" />, value: "2M+", label: "Images Processed" },
            { icon: <Award className="h-5 w-5" />, value: "99.9%", label: "Accuracy Rate" },
            { icon: <Clock className="h-5 w-5" />, value: "< 2s", label: "Avg Processing" }
          ].map((stat, index) => (
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

        {/* Modern Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {advancedTools.map((tool, index) => (
            <div
              key={tool.id}
              className="group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden transform hover:-translate-y-2"
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
            >
              {/* Animated Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              {/* Floating Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1 bg-gradient-to-r ${tool.gradient} text-white text-xs font-bold rounded-full shadow-lg`}>
                  {tool.badge}
                </span>
              </div>

              {/* Content */}
              <div className="relative p-8">
                {/* Icon & Header */}
                <div className="mb-6">
                  <div className={`inline-flex p-4 bg-gradient-to-br ${tool.gradient} rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                    {tool.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-600 font-medium">{tool.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-6 leading-relaxed text-sm">
                  {tool.description}
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-3 bg-gray-50/80 rounded-xl backdrop-blur-sm">
                    <div className="text-lg font-bold text-gray-900">{tool.stats.accuracy}</div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50/80 rounded-xl backdrop-blur-sm">
                    <div className="text-lg font-bold text-gray-900">{tool.stats.speed}</div>
                    <div className="text-xs text-gray-600">Speed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50/80 rounded-xl backdrop-blur-sm">
                    <div className="text-lg font-bold text-gray-900">{tool.stats.formats}</div>
                    <div className="text-xs text-gray-600">Formats</div>
                  </div>
                </div>

                {/* Key Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Key Features</span>
                  </h4>
                  <div className="space-y-2">
                    {tool.features.slice(0, 3).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 bg-gradient-to-r ${tool.gradient} rounded-full`} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {tool.features.length > 3 && (
                      <div className="text-sm text-gray-500 ml-4">
                        +{tool.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                {/* Use Cases Tags */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Perfect For:</h4>
                  <div className="flex flex-wrap gap-2">
                    {tool.useCases.slice(0, 2).map((useCase, useCaseIndex) => (
                      <span
                        key={useCaseIndex}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border"
                      >
                        {useCase}
                      </span>
                    ))}
                    {tool.useCases.length > 2 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full border">
                        +{tool.useCases.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleToolClick(tool.id)}
                  className={`w-full bg-gradient-to-r ${tool.gradient} text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-105 relative overflow-hidden`}
                >
                  <span className="relative z-10">Try {tool.title}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>

                {/* Hover Indicator */}
                {hoveredTool === tool.id && (
                  <div className="absolute top-4 left-4">
                    <div className={`w-3 h-3 bg-gradient-to-r ${tool.gradient} rounded-full animate-pulse shadow-lg`} />
                  </div>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Our Advanced Tools?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Compare our advanced features with traditional image processing tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Traditional Tools</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Manual adjustments required</li>
                <li>• Limited format support</li>
                <li>• No AI optimization</li>
                <li>• Time-consuming process</li>
                <li>• Requires expertise</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">JPG2GO Advanced</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AI-powered automation</li>
                <li>• 15+ format support</li>
                <li>• Intelligent optimization</li>
                <li>• Lightning-fast processing</li>
                <li>• User-friendly interface</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Privacy & Security</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 100% local processing</li>
                <li>• No data upload required</li>
                <li>• Complete privacy protection</li>
                <li>• Secure by design</li>
                <li>• GDPR compliant</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to Experience Professional Image Processing?
              </h3>
              <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                Join thousands of professionals who trust JPG2GO for their image processing needs. 
                Start with our basic converter or dive into advanced tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Start with Basic Converter
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-violet-600 transition-all duration-200">
                  Explore Advanced Tools
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

export default AdvancedFeatures;