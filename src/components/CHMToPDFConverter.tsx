import React, { useRef } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, HardHat, FileType, BarChart3 } from 'lucide-react';
import SEO from './SEO';

const features = [
  {
    icon: <Sparkles className="h-6 w-6" />, title: 'Accurate Conversion', description: 'Convert CHM help files to PDF with high fidelity.'
  },
  {
    icon: <Shield className="h-6 w-6" />, title: 'Secure & Private', description: 'Your files are processed securely and never stored.'
  },
  {
    icon: <Zap className="h-6 w-6" />, title: 'Fast Processing', description: 'Get your PDF in seconds, even for large CHM files.'
  },
  {
    icon: <CheckCircle className="h-6 w-6" />, title: 'Easy to Use', description: 'Simple drag-and-drop interface for everyone.'
  },
];

const howToSteps = [
  { step: '1', title: 'Upload CHM File', description: 'Drag and drop your CHM file or click to browse.' },
  { step: '2', title: 'Convert to PDF', description: 'Click convert to start the CHM to PDF process.' },
  { step: '3', title: 'Download PDF', description: 'Download your converted PDF instantly.' },
];

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '10K+', label: 'Users Served' },
  { icon: <Zap className="h-5 w-5" />, value: '< 1 min', label: 'Avg. Conversion Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' },
];

const CHMToPDFConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <SEO 
        title="CHM to PDF Converter - Convert CHM to PDF Online | JPG2GO"
        description="Convert Microsoft Compiled HTML Help (CHM) files to PDF documents online. High-quality CHM to PDF conversion. Free CHM to PDF."
        keywords="CHM to PDF, convert CHM, CHM converter, help file to PDF, online tool, free tool"
        canonical="chm-to-pdf-converter"
        ogImage="/images/chm-to-pdf-converter-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <HardHat className="h-4 w-4" />
                <span>CHM to PDF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert CHM to PDF <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Easily convert Microsoft Compiled HTML Help (CHM) files to PDF documents. Fast, secure, and free—no registration required.
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
              {/* File Upload Area (disabled) */}
              <div className="mb-8">
                <div
                  className="border-2 border-dashed rounded-2xl p-12 text-center border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">CHM to PDF Conversion Coming Soon</h3>
                  <p className="text-gray-600 mb-6">Our team is working hard to bring you this feature. Please check back soon!</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".chm"
                    disabled
                    className="hidden"
                  />
                  <button
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold mt-4 opacity-60 cursor-not-allowed"
                    disabled
                  >
                    Choose CHM File
                  </button>
                </div>
              </div>
              {/* Actions (disabled) */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8">
                <button
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow opacity-60 cursor-not-allowed"
                  disabled
                >
                  Convert to PDF
                </button>
                <button
                  className="bg-white border border-violet-600 text-violet-600 px-8 py-3 rounded-xl font-semibold shadow hover:bg-violet-50 transition-all duration-200 opacity-60 cursor-not-allowed"
                  disabled
                >
                  <Download className="inline h-4 w-4 mr-1" /> Download PDF
                </button>
              </div>
              {/* Coming Soon Banner */}
              <div className="flex items-center justify-center space-x-2 bg-violet-100 p-3 rounded-xl text-violet-700 font-semibold">
                <FileType className="h-5 w-5 text-violet-600" />
                <span>Feature Status:</span>
                <span className="font-bold">Coming Soon</span>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our CHM to PDF Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Fast, secure, and accurate CHM to PDF conversion—coming soon to JPG2GO!</p>
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

            {/* How to Use Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert CHM to PDF</h2>
                <p className="text-lg text-gray-600">This feature will be available soon. Here's how it will work:</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Want CHM to PDF Conversion?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Let us know if you need this feature urgently, or check back soon for updates!</p>
                  <button 
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto opacity-60 cursor-not-allowed"
                    disabled
                  >
                    <BarChart3 className="h-5 w-5" /> Coming Soon
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

export default CHMToPDFConverter; 