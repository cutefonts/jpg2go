import React from 'react';
import { 
  Image, Heart, Shield, Zap, Github, Twitter, 
  Mail, Globe, Sparkles, Award, Users, TrendingUp
} from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: 'home' | 'about' | 'privacy' | 'terms' | 'contact') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const scrollToSection = (sectionId: string) => {
    if (onNavigate) {
      onNavigate('home');
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const headerHeight = 80;
          const elementPosition = element.offsetTop - headerHeight;
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerHeight = 80;
        const elementPosition = element.offsetTop - headerHeight;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleNavigation = (page: 'home' | 'about' | 'privacy' | 'terms' | 'contact') => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const stats = [
    { icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />, value: "50K+", label: "Active Users" },
    { icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />, value: "2M+", label: "Images Processed" },
    { icon: <Award className="h-4 w-4 sm:h-5 sm:w-5" />, value: "99.9%", label: "Uptime" },
    { icon: <Zap className="h-4 w-4 sm:h-5 sm:w-5" />, value: "< 500ms", label: "Avg Processing" },
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-300 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10">
        {/* Stats Section */}
        <div className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-violet-400">
                      {stat.icon}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="relative">
                  <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg">
                    <Image className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                    JPG2GO
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400">Image Converter</p>
                </div>
              </div>
              
              <p className="text-gray-400 leading-relaxed mb-4 sm:mb-6 max-w-md text-sm sm:text-base">
                The most advanced online image converter with professional-grade features 
                and uncompromising privacy standards. Trusted by professionals worldwide.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">100% Secure & Private</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-400 font-medium">Lightning Fast</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Features</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Image Conversion</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Format Support</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Batch Processing</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Quality Control</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Image Filters</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('converter')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Resize & Transform</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Resources</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToSection('guide')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Complete Guide</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('guide')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Best Practices</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('guide')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>FAQ</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('about')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>About Us</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('features')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Features</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('contact')}
                    className="hover:text-violet-400 transition-colors flex items-center space-x-2 text-left"
                  >
                    <span>•</span><span>Contact Us</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-xs sm:text-sm text-gray-400 text-center md:text-left">
                © 2025 JPG2GO. All rights reserved. Processing happens locally in your browser.
              </div>
              
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-violet-400 transition-colors">
                    <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-violet-400 transition-colors">
                    <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  <button 
                    onClick={() => handleNavigation('contact')}
                    className="text-gray-400 hover:text-violet-400 transition-colors"
                  >
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <a href="#" className="text-gray-400 hover:text-violet-400 transition-colors">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                </div>
                
                <div className="h-4 w-px bg-gray-700 hidden sm:block"></div>
                
                <div className="flex space-x-4 sm:space-x-6 text-xs sm:text-sm">
                  <button 
                    onClick={() => handleNavigation('privacy')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Privacy
                  </button>
                  <button 
                    onClick={() => handleNavigation('terms')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Terms
                  </button>
                  <button 
                    onClick={() => handleNavigation('contact')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;