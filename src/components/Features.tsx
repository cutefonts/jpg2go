import React from 'react';
import { 
  Settings, Download, Shield, Smartphone, Layers,
  Gauge, Wand2, Palette, RotateCw,
  Archive, Eye, Sparkles, CloudOff
} from 'lucide-react';
import SEO from './SEO';

const Features: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const features = [
    {
      icon: <Wand2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />,
      title: "Smart Image Processing",
      description: "Advanced algorithms automatically optimize your images for the best quality-to-size ratio.",
    },
    {
      icon: <Palette className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />,
      title: "Color Enhancement",
      description: "Fine-tune brightness, contrast, and saturation with real-time preview and precision controls.",
    },
    {
      icon: <RotateCw className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />,
      title: "Advanced Transformations",
      description: "Rotate, flip, crop, and resize with intelligent aspect ratio preservation.",
    },
    {
      icon: <Archive className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />,
      title: "Batch ZIP Download",
      description: "Process multiple images and download them all in a single ZIP file for convenience.",
    },
    {
      icon: <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />,
      title: "Live Preview",
      description: "See changes in real-time with instant preview before committing to conversions.",
    },
    {
      icon: <CloudOff className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />,
      title: "100% Offline",
      description: "All processing happens locally. No internet required after initial load, complete privacy.",
    },
    {
      icon: <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />,
      title: "Format Versatility",
      description: "Support for 15+ formats including JPEG, PNG, WebP, AVIF, HEIC, and more.",
    },
    {
      icon: <Gauge className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />,
      title: "Fast Processing",
      description: "Optimized algorithms ensure quick processing times even for large images.",
    },
    {
      icon: <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />,
      title: "Complete Privacy",
      description: "Your images never leave your device. All processing happens locally in your browser.",
    },
    {
      icon: <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />,
      title: "Mobile Friendly",
      description: "Fully responsive design works perfectly on desktop, tablet, and mobile devices.",
    },
    {
      icon: <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />,
      title: "Advanced Controls",
      description: "Professional-grade settings for quality, compression, and image optimization.",
    },
    {
      icon: <Download className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />,
      title: "Easy Downloads",
      description: "Download individual images or batch download multiple files as a ZIP archive.",
    }
  ];

  return (
    <>
      <SEO 
        title="Features - JPG2GO Image Converter"
        description="Easily convert images to JPG, PNG, GIF, WebP, and more with our simple online image converter. No downloads, no sign-up just fast and secure conversion."
        keywords="image converter features, smart processing, privacy, batch processing, online tool, free tool"
        canonical="features"
        ogImage="/images/features-og.jpg"
      />
      <section id="features" className="py-16 sm:py-20 bg-gradient-to-br from-white via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-4 sm:mb-6 px-4">
              Why Choose JPG2GO?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Professional-grade image processing with advanced features, 
              complete privacy, and lightning-fast performance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group relative bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 hover:scale-105 min-w-0">
                <div className="mb-4 sm:mb-6 min-w-0">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 break-words">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base break-words">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center relative">
              <div className="absolute inset-0 bg-black/10 rounded-2xl sm:rounded-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                  Ready to Transform Your Images?
                </h3>
                <p className="text-violet-100 mb-6 sm:mb-8 text-base sm:text-lg max-w-2xl mx-auto px-4">
                  Start converting your images with our powerful, free image converter. 
                  No registration required, complete privacy guaranteed.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="bg-white text-violet-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    Start Converting Now
                  </button>
                  <button 
                    onClick={() => scrollToSection('guide')}
                    className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:bg-white hover:text-violet-600 transition-all duration-200 text-sm sm:text-base"
                  >
                    Learn How
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;
