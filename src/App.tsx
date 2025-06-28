import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { PageType } from './types';
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
import SEO from './components/SEO';
import ConversionCounter from './components/Counter';

// Lazy load all tool components for better performance
const JPGToPDFCreator = lazy(() => import('./components/JPGToPDFCreator'));
const PDFToJPGConverter = lazy(() => import('./components/PDFToJPGConverter'));
const AIEnhancer = lazy(() => import('./components/AIEnhancer'));
const PNGToPDFCreator = lazy(() => import('./components/PNGToPDFCreator'));
const PDFToPNGConverter = lazy(() => import('./components/PDFToPNGConverter'));
const JPGOptimizer = lazy(() => import('./components/JPGOptimizer'));
const PNGOptimizer = lazy(() => import('./components/PNGOptimizer'));
const ImageResizer = lazy(() => import('./components/ImageResizer'));
const FormatConverter = lazy(() => import('./components/FormatConverter'));
const WatermarkTool = lazy(() => import('./components/WatermarkTool'));
const ColorAdjuster = lazy(() => import('./components/ColorAdjuster'));
const FilterStudio = lazy(() => import('./components/FilterStudio'));
const NoiseReducer = lazy(() => import('./components/NoiseReducer'));
const SharpeningTool = lazy(() => import('./components/SharpeningTool'));
const BackgroundRemover = lazy(() => import('./components/BackgroundRemover'));
const SmartCrop = lazy(() => import('./components/SmartCrop'));
const BatchProcessor = lazy(() => import('./components/BatchProcessor'));
const ImageAnalyzer = lazy(() => import('./components/ImageAnalyzer'));
const PDFMerger = lazy(() => import('./components/PDFMerger'));
const PDFSplitter = lazy(() => import('./components/PDFSplitter'));
const PDFCompressor = lazy(() => import('./components/PDFCompressor'));
const PDFProtector = lazy(() => import('./components/PDFProtector'));
const PDFUnlocker = lazy(() => import('./components/PDFUnlocker'));
const JPGMetadataEditor = lazy(() => import('./components/JPGMetadataEditor'));
const JPGQualityAnalyzer = lazy(() => import('./components/JPGQualityAnalyzer'));
const ProgressiveJPGCreator = lazy(() => import('./components/ProgressiveJPGCreator'));
const PNGTransparencyEditor = lazy(() => import('./components/PNGTransparencyEditor'));
const PNGToJPGConverter = lazy(() => import('./components/PNGToJPGConverter'));
const PNGSpriteGenerator = lazy(() => import('./components/PNGSpriteGenerator'));
const ExposureCorrector = lazy(() => import('./components/ExposureCorrector'));
const PerspectiveCorrector = lazy(() => import('./components/PerspectiveCorrector'));
const VintageEffects = lazy(() => import('./components/VintageEffects'));
const CollageMaker = lazy(() => import('./components/CollageMaker'));
const BorderTool = lazy(() => import('./components/BorderTool'));

// Import missing tool components with lazy loading
const PDFToWordConverter = lazy(() => import('./components/PDFToWordConverter'));
const WordToPDFConverter = lazy(() => import('./components/WordToPDFConverter'));
const PDFToPowerPointConverter = lazy(() => import('./components/PDFToPowerPointConverter'));
const PowerPointToPDFConverter = lazy(() => import('./components/PowerPointToPDFConverter'));
const PDFToExcelConverter = lazy(() => import('./components/PDFToExcelConverter'));
const ExcelToPDFConverter = lazy(() => import('./components/ExcelToPDFConverter'));
const HTMLToPDFConverter = lazy(() => import('./components/HTMLToPDFConverter'));
const PDFRepair = lazy(() => import('./components/PDFRepair'));
const PDFWatermark = lazy(() => import('./components/PDFWatermark'));
const PDFPageNumbers = lazy(() => import('./components/PDFPageNumbers'));
const PDFOCR = lazy(() => import('./components/PDFOCR'));
const PDFCompare = lazy(() => import('./components/PDFCompare'));
const PDFRedact = lazy(() => import('./components/PDFRedact'));
const PDFCrop = lazy(() => import('./components/PDFCrop'));
const PDFOrganize = lazy(() => import('./components/PDFOrganize'));
const PDFSign = lazy(() => import('./components/PDFSign'));
const EPUBToPDFConverter = lazy(() => import('./components/EPUBToPDFConverter'));
const PDFToEPUBConverter = lazy(() => import('./components/PDFToEPUBConverter'));
const DjVuToPDFConverter = lazy(() => import('./components/DjVuToPDFConverter'));
const TIFFToPDFConverter = lazy(() => import('./components/TIFFToPDFConverter'));
const TXTToPDFConverter = lazy(() => import('./components/TXTToPDFConverter'));
const ODTToPDFConverter = lazy(() => import('./components/ODTToPDFConverter'));
const SVGToPDFConverter = lazy(() => import('./components/SVGToPDFConverter'));
const CSVToPDFConverter = lazy(() => import('./components/CSVToPDFConverter'));
const RTFToPDFConverter = lazy(() => import('./components/RTFToPDFConverter'));
const MOBIToPDFConverter = lazy(() => import('./components/MOBIToPDFConverter'));
const XPSToPDFConverter = lazy(() => import('./components/XPSToPDFConverter'));
const XMLToPDFConverter = lazy(() => import('./components/XMLToPDFConverter'));
const PDFToTIFFConverter = lazy(() => import('./components/PDFToTIFFConverter'));
const PDFToODTConverter = lazy(() => import('./components/PDFToODTConverter'));
const PDFToSVGConverter = lazy(() => import('./components/PDFToSVGConverter'));
const PDFToCSVConverter = lazy(() => import('./components/PDFToCSVConverter'));
const PDFToRTFConverter = lazy(() => import('./components/PDFToRTFConverter'));
const PDFToGIFConverter = lazy(() => import('./components/PDFToGIFConverter'));
const PDFToBMPConverter = lazy(() => import('./components/PDFToBMPConverter'));
const PDFEditor = lazy(() => import('./components/PDFEditor'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));
const PDFResizePages = lazy(() => import('./components/PDFResizePages'));
const PDFDeletePages = lazy(() => import('./components/PDFDeletePages'));
const PDFFlatten = lazy(() => import('./components/PDFFlatten'));
const PDFExtractPages = lazy(() => import('./components/PDFExtractPages'));
const PDFAddText = lazy(() => import('./components/PDFAddText'));
const PDFExtractText = lazy(() => import('./components/PDFExtractText'));
const PDFExtractImages = lazy(() => import('./components/PDFExtractImages'));
const PDFAddImage = lazy(() => import('./components/PDFAddImage'));
const PDFAnnotate = lazy(() => import('./components/PDFAnnotate'));
const PDFHighlight = lazy(() => import('./components/PDFHighlight'));
const PDFRemoveMetadata = lazy(() => import('./components/PDFRemoveMetadata'));
const PDFEditMetadata = lazy(() => import('./components/PDFEditMetadata'));
const PDFWhiteout = lazy(() => import('./components/PDFWhiteout'));
const PDFGrayscale = lazy(() => import('./components/PDFGrayscale'));
const PDFHeaderFooter = lazy(() => import('./components/PDFHeaderFooter'));
const PDFFormFiller = lazy(() => import('./components/PDFFormFiller'));
const WebPToPDFConverter = lazy(() => import('./components/WebPToPDFConverter'));
const HEIFToPDFConverter = lazy(() => import('./components/HEIFToPDFConverter'));
const JFIFToPDFConverter = lazy(() => import('./components/JFIFToPDFConverter'));
const GIFToPDFConverter = lazy(() => import('./components/GIFToPDFConverter'));
const BMPToPDFConverter = lazy(() => import('./components/BMPToPDFConverter'));
const HWPToPDFConverter = lazy(() => import('./components/HWPToPDFConverter'));
const CHMToPDFConverter = lazy(() => import('./components/CHMToPDFConverter'));
const FB2ToPDFConverter = lazy(() => import('./components/FB2ToPDFConverter'));
const MDToPDFConverter = lazy(() => import('./components/MDToPDFConverter'));
const URLToPDFConverter = lazy(() => import('./components/URLToPDFConverter'));
const WPSToPDFConverter = lazy(() => import('./components/WPSToPDFConverter'));
const DXFToPDFConverter = lazy(() => import('./components/DXFToPDFConverter'));
const EMLToPDFConverter = lazy(() => import('./components/EMLToPDFConverter'));
const EbookToPDFConverter = lazy(() => import('./components/EbookToPDFConverter'));
const CBZToPDFConverter = lazy(() => import('./components/CBZToPDFConverter'));
const CBRToPDFConverter = lazy(() => import('./components/CBRToPDFConverter'));
const AIToPDFConverter = lazy(() => import('./components/AIToPDFConverter'));
const ZipToPDFConverter = lazy(() => import('./components/ZipToPDFConverter'));
const PDFRotator = lazy(() => import('./components/PDFRotator'));
const PDFExtract = lazy(() => import('./components/PDFExtract'));

// Loading component for lazy-loaded tools
const ToolLoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      {/* Spinner removed */}
      <p className="text-gray-600">Loading tool...</p>
    </div>
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  // Handle URL routing
  useEffect(() => {
    const path = window.location.pathname.substring(1); // Remove leading slash
    if (path && path !== '') {
      setCurrentPage(path as PageType);
    } else {
      setCurrentPage('home');
    }
  }, []);

  const handleNavigation = (page: PageType) => {
    setCurrentPage(page);
    // Update URL without page reload
    window.history.pushState({}, '', page === 'home' ? '/' : `/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      setCurrentPage(path === '' ? 'home' : (path as PageType));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <SEO
              title="JPG2GO - Online Image & PDF Converter"
              description="Easily convert images to JPG, PNG, GIF, WebP, and more with our simple online image converter. No downloads, no sign-up just fast and secure conversion."
              keywords="image converter, pdf converter, jpg to pdf, png to jpg, online converter, free converter"
              canonical="home"
              ogImage="/og-image.png"
            />
            <section id="converter">
              <ImageConverter />
            </section>
            <AdvancedToolsHub onNavigate={handleNavigation} />
            <Features />
            <Guide />
          </>
        );
      case 'advanced-tools':
        return <AdvancedToolsHub onNavigate={handleNavigation} />;
      case 'about':
        return <AboutUs />;
      case 'privacy':
        return <PrivacyPolicy onBack={handleBackToHome} />;
      case 'terms':
        return <TermsOfService onBack={handleBackToHome} />;
      case 'contact':
        return <ContactUs onBack={handleBackToHome} />;
      
      // Individual tool pages
      case 'jpg-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><JPGToPDFCreator /></Suspense>;
      case 'pdf-to-jpg':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToJPGConverter /></Suspense>;
      case 'ai-enhancer':
        return <Suspense fallback={<ToolLoadingFallback />}><AIEnhancer /></Suspense>;
      case 'png-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><PNGToPDFCreator /></Suspense>;
      case 'pdf-to-png':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToPNGConverter /></Suspense>;
      case 'jpeg-optimizer':
        return <Suspense fallback={<ToolLoadingFallback />}><JPGOptimizer /></Suspense>;
      case 'png-optimizer':
        return <Suspense fallback={<ToolLoadingFallback />}><PNGOptimizer /></Suspense>;
      case 'image-resizer':
        return <Suspense fallback={<ToolLoadingFallback />}><ImageResizer /></Suspense>;
      case 'format-converter':
        return <Suspense fallback={<ToolLoadingFallback />}><FormatConverter /></Suspense>;
      case 'watermark-tool':
        return <Suspense fallback={<ToolLoadingFallback />}><WatermarkTool /></Suspense>;
      case 'color-adjuster':
        return <Suspense fallback={<ToolLoadingFallback />}><ColorAdjuster /></Suspense>;
      case 'filter-studio':
        return <Suspense fallback={<ToolLoadingFallback />}><FilterStudio /></Suspense>;
      case 'noise-reducer':
        return <Suspense fallback={<ToolLoadingFallback />}><NoiseReducer /></Suspense>;
      case 'sharpening-tool':
        return <Suspense fallback={<ToolLoadingFallback />}><SharpeningTool /></Suspense>;
      case 'background-remover':
        return <Suspense fallback={<ToolLoadingFallback />}><BackgroundRemover /></Suspense>;
      case 'crop-image':
        return <Suspense fallback={<ToolLoadingFallback />}><SmartCrop /></Suspense>;
      case 'batch-processor':
        return <Suspense fallback={<ToolLoadingFallback />}><BatchProcessor /></Suspense>;
      case 'image-analyzer':
        return <Suspense fallback={<ToolLoadingFallback />}><ImageAnalyzer /></Suspense>;
      case 'pdf-merger':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFMerger /></Suspense>;
      case 'pdf-splitter':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFSplitter /></Suspense>;
      case 'pdf-compressor':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFCompressor /></Suspense>;
      case 'pdf-protector':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFProtector /></Suspense>;
      case 'pdf-unlocker':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFUnlocker /></Suspense>;
      case 'jpg-metadata-editor':
        return <Suspense fallback={<ToolLoadingFallback />}><JPGMetadataEditor /></Suspense>;
      case 'jpg-quality-analyzer':
        return <Suspense fallback={<ToolLoadingFallback />}><JPGQualityAnalyzer /></Suspense>;
      case 'progressive-jpg-creator':
        return <Suspense fallback={<ToolLoadingFallback />}><ProgressiveJPGCreator /></Suspense>;
      case 'png-transparency-editor':
        return <Suspense fallback={<ToolLoadingFallback />}><PNGTransparencyEditor /></Suspense>;
      case 'png-to-jpg':
        return <Suspense fallback={<ToolLoadingFallback />}><PNGToJPGConverter /></Suspense>;
      case 'png-sprite-generator':
        return <Suspense fallback={<ToolLoadingFallback />}><PNGSpriteGenerator /></Suspense>;
      case 'exposure-corrector':
        return <Suspense fallback={<ToolLoadingFallback />}><ExposureCorrector /></Suspense>;
      case 'perspective-corrector':
        return <Suspense fallback={<ToolLoadingFallback />}><PerspectiveCorrector /></Suspense>;
      case 'vintage-effects':
        return <Suspense fallback={<ToolLoadingFallback />}><VintageEffects /></Suspense>;
      case 'collage-maker':
        return <Suspense fallback={<ToolLoadingFallback />}><CollageMaker /></Suspense>;
      case 'photo-border':
        return <Suspense fallback={<ToolLoadingFallback />}><BorderTool /></Suspense>;
      
      // PDF Conversion Tools
      case 'pdf-to-word':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToWordConverter /></Suspense>;
      case 'word-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><WordToPDFConverter /></Suspense>;
      case 'pdf-to-powerpoint':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToPowerPointConverter /></Suspense>;
      case 'powerpoint-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><PowerPointToPDFConverter /></Suspense>;
      case 'pdf-to-excel':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToExcelConverter /></Suspense>;
      case 'excel-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><ExcelToPDFConverter /></Suspense>;
      case 'html-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><HTMLToPDFConverter /></Suspense>;
      case 'pdf-repair':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFRepair /></Suspense>;
      case 'pdf-watermark':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFWatermark /></Suspense>;
      case 'pdf-page-numbers':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFPageNumbers /></Suspense>;
      case 'pdf-ocr':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFOCR /></Suspense>;
      case 'pdf-compare':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFCompare /></Suspense>;
      case 'pdf-redact':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFRedact /></Suspense>;
      case 'pdf-crop':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFCrop /></Suspense>;
      case 'pdf-organize':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFOrganize /></Suspense>;
      case 'pdf-sign':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFSign /></Suspense>;
      
      // Document Conversion Tools
      case 'epub-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><EPUBToPDFConverter /></Suspense>;
      case 'pdf-to-epub':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToEPUBConverter /></Suspense>;
      case 'djvu-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><DjVuToPDFConverter /></Suspense>;
      case 'tiff-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><TIFFToPDFConverter /></Suspense>;
      case 'txt-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><TXTToPDFConverter /></Suspense>;
      case 'odt-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><ODTToPDFConverter /></Suspense>;
      case 'svg-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><SVGToPDFConverter /></Suspense>;
      case 'csv-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><CSVToPDFConverter /></Suspense>;
      case 'rtf-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><RTFToPDFConverter /></Suspense>;
      case 'mobi-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><MOBIToPDFConverter /></Suspense>;
      case 'xps-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><XPSToPDFConverter /></Suspense>;
      case 'xml-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><XMLToPDFConverter /></Suspense>;
      
      // PDF to Other Formats
      case 'pdf-to-tiff':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToTIFFConverter /></Suspense>;
      case 'pdf-to-odt':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToODTConverter /></Suspense>;
      case 'pdf-to-svg':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToSVGConverter /></Suspense>;
      case 'pdf-to-csv':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToCSVConverter /></Suspense>;
      case 'pdf-to-rtf':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToRTFConverter /></Suspense>;
      case 'pdf-to-gif':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToGIFConverter /></Suspense>;
      case 'pdf-to-bmp':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFToBMPConverter /></Suspense>;
      
      // PDF Editing Tools
      case 'pdf-editor':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFEditor /></Suspense>;
      case 'pdf-viewer':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFViewer /></Suspense>;
      case 'pdf-resize-pages':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFResizePages /></Suspense>;
      case 'pdf-delete-pages':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFDeletePages /></Suspense>;
      case 'pdf-flatten':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFFlatten /></Suspense>;
      case 'pdf-extract-pages':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFExtractPages /></Suspense>;
      case 'pdf-add-text':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFAddText /></Suspense>;
      case 'pdf-extract-text':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFExtractText /></Suspense>;
      case 'pdf-extract-images':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFExtractImages /></Suspense>;
      case 'pdf-add-image':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFAddImage /></Suspense>;
      case 'pdf-annotate':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFAnnotate /></Suspense>;
      case 'pdf-highlight':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFHighlight /></Suspense>;
      case 'pdf-remove-metadata':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFRemoveMetadata /></Suspense>;
      case 'pdf-edit-metadata':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFEditMetadata /></Suspense>;
      case 'pdf-whiteout':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFWhiteout /></Suspense>;
      case 'pdf-grayscale':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFGrayscale /></Suspense>;
      case 'pdf-header-footer':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFHeaderFooter /></Suspense>;
      case 'pdf-filler':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFFormFiller /></Suspense>;
      case 'pdf-rotator':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFRotator /></Suspense>;
      case 'pdf-extract':
        return <Suspense fallback={<ToolLoadingFallback />}><PDFExtract /></Suspense>;
      
      // Image to PDF Tools
      case 'webp-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><WebPToPDFConverter /></Suspense>;
      case 'heif-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><HEIFToPDFConverter /></Suspense>;
      case 'jfif-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><JFIFToPDFConverter /></Suspense>;
      case 'gif-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><GIFToPDFConverter /></Suspense>;
      case 'bmp-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><BMPToPDFConverter /></Suspense>;
      
      // Specialized Document Tools
      case 'hwp-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><HWPToPDFConverter /></Suspense>;
      case 'chm-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><CHMToPDFConverter /></Suspense>;
      case 'fb2-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><FB2ToPDFConverter /></Suspense>;
      case 'md-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><MDToPDFConverter /></Suspense>;
      case 'url-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><URLToPDFConverter /></Suspense>;
      case 'wps-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><WPSToPDFConverter /></Suspense>;
      case 'dxf-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><DXFToPDFConverter /></Suspense>;
      case 'eml-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><EMLToPDFConverter /></Suspense>;
      case 'ebook-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><EbookToPDFConverter /></Suspense>;
      case 'cbz-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><CBZToPDFConverter /></Suspense>;
      case 'cbr-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><CBRToPDFConverter /></Suspense>;
      case 'ai-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><AIToPDFConverter /></Suspense>;
      case 'zip-to-pdf':
        return <Suspense fallback={<ToolLoadingFallback />}><ZipToPDFConverter /></Suspense>;
      default:
        return (
          <>
            <section id="converter">
              <ImageConverter />
            </section>
            <AdvancedToolsHub onNavigate={handleNavigation} />
            <Features />
            <Guide />
          </>
        );
    }
  };

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-white">
        <Header currentPage={currentPage} onNavigate={handleNavigation} />
        
        <main>
          {renderPage()}
        </main>
        
        <Footer onNavigate={handleNavigation} />
      </div>
    </HelmetProvider>
  );
}

export default App;