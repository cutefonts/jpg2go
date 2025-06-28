import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async'

// Performance optimizations
const preloadCriticalResources = () => {
  // Preload critical fonts with display=swap for better performance
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);
  
  // Load the font stylesheet
  const fontStylesheet = document.createElement('link');
  fontStylesheet.rel = 'stylesheet';
  fontStylesheet.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontStylesheet.crossOrigin = 'anonymous';
  document.head.appendChild(fontStylesheet);
  
  // Preload critical images with proper attributes
  const criticalImages = [
    { src: '/favicon.ico', type: 'image/x-icon' },
    { src: '/logo.png', type: 'image/png' }
  ];
  
  criticalImages.forEach(img => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = img.src;
    link.as = 'image';
    link.type = img.type;
    document.head.appendChild(link);
  });
};

// Initialize performance optimizations
preloadCriticalResources();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
