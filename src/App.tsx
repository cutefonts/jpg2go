import React, { useState } from 'react';
import Header from './components/Header';
import ImageConverter from './components/ImageConverter';
import Features from './components/Features';
import Guide from './components/Guide';
import Footer from './components/Footer';
import AboutUs from './components/AboutUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ContactUs from './components/ContactUs';
import AdvancedToolsHub from './components/AdvancedToolsHub';

type PageType = 'home' | 'about' | 'privacy' | 'terms' | 'contact' | 'advanced-tools';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  const handleNavigation = (page: PageType) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header currentPage={currentPage} onNavigate={handleNavigation} />
      
      <main>
        {currentPage === 'home' ? (
          <>
            <section id="converter">
              <ImageConverter />
            </section>
            <AdvancedToolsHub />
            <Features />
            <Guide />
          </>
        ) : currentPage === 'advanced-tools' ? (
          <AdvancedToolsHub />
        ) : currentPage === 'about' ? (
          <AboutUs />
        ) : currentPage === 'privacy' ? (
          <PrivacyPolicy onBack={handleBackToHome} />
        ) : currentPage === 'terms' ? (
          <TermsOfService onBack={handleBackToHome} />
        ) : currentPage === 'contact' ? (
          <ContactUs onBack={handleBackToHome} />
        ) : null}
      </main>
      
      <Footer onNavigate={handleNavigation} />
    </div>
  );
}

export default App;