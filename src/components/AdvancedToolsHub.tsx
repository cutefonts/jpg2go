import React, { useState } from 'react';
import { 
  Brain, Target, Scissors, BarChart3, Layers, Wand2,
  Sparkles, ArrowRight, Star, TrendingUp, Award,
  Zap, Eye, Settings, Download, Upload, Play
} from 'lucide-react';
import AIEnhancer from './AIEnhancer';
import SmartCrop from './SmartCrop';
import BackgroundRemover from './BackgroundRemover';

const AdvancedToolsHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'ai-enhancer',
      name: 'AI Image Enhancer',
      description: 'Transform your images with cutting-edge AI algorithms that analyze and enhance every pixel',
      icon: <Brain className="h-8 w-8" />,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      features: ['Super-resolution up to 4x', 'Intelligent noise reduction', 'Smart sharpening', 'Color optimization'],
      badge: 'AI Powered',
      component: AIEnhancer
    },
    {
      id: 'smart-crop',
      name: 'Smart Crop Tool',
      description: 'AI-powered composition analysis with face detection and social media optimization',
      icon: <Target className="h-8 w-8" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      features: ['Face & object detection', 'Rule of thirds analysis', 'Social media formats', 'Confidence scoring'],
      badge: 'Smart AI',
      component: SmartCrop
    },
    {
      id: 'background-remover',
      name: 'Background Remover',
      description: 'Intelligent background removal with edge detection and replacement options',
      icon: <Scissors className="h-8 w-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      features: ['AI background detection', 'Edge smoothing', 'Color replacement', 'Transparent output'],
      badge: 'Pro Tool',
      component: BackgroundRemover
    }
  ];

  const stats = [
    { icon: <TrendingUp className="h-5 w-5" />, value: "98%", label: "Accuracy Rate" },
    { icon: <Zap className="h-5 w-5" />, value: "< 2s", label: "Processing Time" },
    { icon: <Award className="h-5 w-5" />, value: "15+", label: "AI Models" },
    { icon: <Star className="h-5 w-5" />, value: "4.9/5", label: "User Rating" }
  ];

  if (activeTool) {
    const tool = tools.find(t => t.id === activeTool);
    if (tool) {
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
            <span>Advanced AI Tools</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-6">
            Professional AI Suite
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Unlock the full potential of your images with our advanced AI-powered tools. 
            From intelligent enhancement to smart cropping, everything you need for professional results.
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

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden transform hover:-translate-y-2 cursor-pointer"
              onClick={() => setActiveTool(tool.id)}
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
                  className={`w-full bg-gradient-to-r ${tool.gradient} text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-105 relative overflow-hidden`}
                >
                  <span className="relative z-10">Try {tool.name}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to Experience Professional AI Processing?
              </h3>
              <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                Join thousands of professionals who trust JPG2GO for their image processing needs. 
                Start with our basic converter or dive into advanced AI tools.
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