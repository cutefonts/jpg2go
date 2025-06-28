import React, { useState, useEffect } from 'react';
import { Image, Menu, X, Sparkles, Brain } from 'lucide-react';
import { PageType } from '../types';

interface HeaderProps {
  currentPage?: PageType;
  onNavigate?: (page: PageType) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage = 'home', onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (currentPage !== 'home' && onNavigate) {
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
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (page: PageType) => {
    if (onNavigate) {
      onNavigate(page);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200/50' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          <button 
            onClick={() => handleNavigation('home')}
            className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-lg">
                <Image className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-400 animate-pulse" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                JPG2GO
              </h1>
              <p className="text-xs text-gray-500 font-medium hidden sm:block">Image Converter</p>
            </div>
          </button>
          
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button 
              onClick={() => handleNavigation('home')}
              className={`transition-colors font-medium ${
                currentPage === 'home' 
                  ? 'text-violet-600' 
                  : 'text-gray-700 hover:text-violet-600'
              }`}
            >
              Home
            </button>
            
            <button 
              onClick={() => scrollToSection('converter')}
              className="text-gray-700 hover:text-violet-600 transition-colors font-medium"
            >
              Converter
            </button>
            
            <button 
              onClick={() => handleNavigation('advanced-tools')}
              className={`transition-colors font-medium flex items-center space-x-1 ${
                currentPage === 'advanced-tools' 
                  ? 'text-violet-600' 
                  : 'text-gray-700 hover:text-violet-600'
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>Tools</span>
            </button>
            
            <button 
              onClick={() => scrollToSection('features')}
              className="text-gray-700 hover:text-violet-600 transition-colors font-medium"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('guide')}
              className="text-gray-700 hover:text-violet-600 transition-colors font-medium"
            >
              Guide
            </button>
            <button 
              onClick={() => handleNavigation('about')}
              className={`transition-colors font-medium ${
                currentPage === 'about' 
                  ? 'text-violet-600' 
                  : 'text-gray-700 hover:text-violet-600'
              }`}
            >
              About Us
            </button>
            <button 
              onClick={() => handleNavigation('contact')}
              className={`transition-colors font-medium ${
                currentPage === 'contact' 
                  ? 'text-violet-600' 
                  : 'text-gray-700 hover:text-violet-600'
              }`}
            >
              Contact
            </button>
          </nav>

          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 shadow-lg overflow-y-auto max-h-[80vh]">
            <div className="px-4 py-6 space-y-4">
              <button 
                onClick={() => handleNavigation('home')}
                className={`block w-full text-left transition-colors font-medium py-2 ${
                  currentPage === 'home' 
                    ? 'text-violet-600' 
                    : 'text-gray-700 hover:text-violet-600'
                }`}
              >
                Home
              </button>
              
              <button 
                onClick={() => scrollToSection('converter')}
                className="block w-full text-left text-gray-700 hover:text-violet-600 transition-colors font-medium py-2"
              >
                Converter
              </button>
              
              <button 
                onClick={() => handleNavigation('advanced-tools')}
                className={`block w-full text-left transition-colors font-medium py-2 flex items-center space-x-2 ${
                  currentPage === 'advanced-tools' 
                    ? 'text-violet-600' 
                    : 'text-gray-700 hover:text-violet-600'
                }`}
              >
                <Brain className="h-4 w-4" />
                <span>Tools</span>
              </button>
              
              <button 
                onClick={() => scrollToSection('features')}
                className="block w-full text-left text-gray-700 hover:text-violet-600 transition-colors font-medium py-2"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('guide')}
                className="block w-full text-left text-gray-700 hover:text-violet-600 transition-colors font-medium py-2"
              >
                Guide
              </button>
              <button 
                onClick={() => handleNavigation('about')}
                className={`block w-full text-left transition-colors font-medium py-2 ${
                  currentPage === 'about' 
                    ? 'text-violet-600' 
                    : 'text-gray-700 hover:text-violet-600'
                }`}
              >
                About Us
              </button>
              <button 
                onClick={() => handleNavigation('contact')}
                className={`block w-full text-left transition-colors font-medium py-2 ${
                  currentPage === 'contact' 
                    ? 'text-violet-600' 
                    : 'text-gray-700 hover:text-violet-600'
                }`}
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;