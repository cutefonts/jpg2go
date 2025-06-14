import React, { useState } from 'react';
import { 
  Upload, Settings, Zap, Download, CheckCircle, AlertCircle,
  FileText, HelpCircle, Wand2, Palette, RotateCw, Archive,
  Eye, Sparkles, ChevronDown, ChevronRight, Play
} from 'lucide-react';

const Guide: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />,
      title: "Upload Your Images",
      description: "Drag and drop images or click to browse. Support for batch uploads up to 100 images.",
      details: [
        "Supports 15+ formats: JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF, HEIC and more",
        "No file size limit - process images of any resolution up to 50MP",
        "Batch upload with intelligent file validation and error handling",
        "Automatic metadata extraction and EXIF data analysis"
      ],
      demo: "Drop files into the upload zone or click to select multiple images at once. Perfect for converting JPEG to PNG or PNG to JPG in bulk."
    },
    {
      icon: <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />,
      title: "Configure Advanced Settings",
      description: "Choose output format and fine-tune quality, filters, and transformations.",
      details: [
        "Quality control: 1-100% with smart compression algorithms optimized for each format",
        "Intelligent resizing with aspect ratio preservation and upscaling protection",
        "Professional color adjustments: brightness, contrast, saturation, and hue control",
        "Advanced filters: vintage, vivid, grayscale, sepia, blur, and sharpen effects"
      ],
      demo: "Use the tabbed interface to access Basic, Filters, and Transform settings. Perfect for JPEG to PNG conversion with custom quality settings."
    },
    {
      icon: <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600" />,
      title: "Apply AI Enhancements",
      description: "Let our AI analyze and optimize each image for the best results.",
      details: [
        "Smart compression that maintains visual quality while reducing file size",
        "Automatic noise reduction and intelligent sharpening algorithms",
        "Color space optimization for web (sRGB) and print (Adobe RGB) workflows",
        "Format-specific optimization (JPEG for photos, PNG for graphics, WebP for web)"
      ],
      demo: "AI processing happens automatically during conversion for optimal results. Great for PNG to JPG conversion with smart quality optimization."
    },
    {
      icon: <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />,
      title: "Convert with Lightning Speed",
      description: "Process images individually or use batch conversion for efficiency.",
      details: [
        "GPU-accelerated processing for maximum speed and performance",
        "Real-time progress tracking with detailed statistics and ETA",
        "Parallel processing for batch operations with queue management",
        "Instant preview with before/after comparison and compression metrics"
      ],
      demo: "Click 'Convert All' to process multiple images simultaneously. Perfect for bulk JPEG to PNG or WebP conversion workflows."
    },
    {
      icon: <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />,
      title: "Preview & Compare",
      description: "Review results with side-by-side comparison and quality metrics.",
      details: [
        "Full-screen preview with zoom capabilities and pixel-level inspection",
        "Compression ratio and file size comparison with savings calculator",
        "Processing time and performance metrics for optimization insights",
        "Quality assessment with visual indicators and SSIM/PSNR metrics"
      ],
      demo: "Click the eye icon on any processed image to open the preview modal. Compare original vs converted images side-by-side."
    },
    {
      icon: <Download className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />,
      title: "Download Results",
      description: "Download individual images or get everything in a convenient ZIP file.",
      details: [
        "Individual downloads with custom naming conventions and metadata preservation",
        "Batch ZIP download for multiple images with organized folder structure",
        "Automatic file organization and intelligent naming based on conversion settings",
        "Download history and session management for workflow continuity"
      ],
      demo: "Use 'Download All' for ZIP or individual download buttons for single files. Perfect for managing converted JPEG, PNG, and WebP files."
    }
  ];

  const faqs = [
    {
      question: "How do I convert JPEG to PNG with JPG2GO?",
      answer: "Simply upload your JPEG files, select PNG as the output format in the Basic settings tab, adjust quality if needed, and click Convert. JPG2GO will convert your JPEG images to PNG format while preserving transparency and quality. Perfect for graphics that need transparent backgrounds."
    },
    {
      question: "Can I convert PNG to JPG for smaller file sizes?",
      answer: "Yes! Upload your PNG files, select JPEG as the output format, and adjust the quality slider (80-90% recommended for photos). JPG2GO's AI optimization will convert PNG to JPG while maintaining visual quality and significantly reducing file size - perfect for web use."
    },
    {
      question: "What makes JPG2GO different from other image converters?",
      answer: "JPG2GO uses advanced AI algorithms for smart compression, offers professional-grade filters and transformations, processes everything locally for privacy, and provides detailed analytics. Our GPU acceleration makes it significantly faster than traditional converters, especially for JPEG to PNG and WebP conversions."
    },
    {
      question: "How does the AI-powered processing work?",
      answer: "Our AI analyzes each image's content, color distribution, and complexity to apply optimal compression settings. It automatically adjusts parameters like noise reduction, sharpening, and color space conversion to maintain the best possible quality while achieving maximum file size reduction - whether converting JPEG to PNG, PNG to JPG, or to WebP format."
    },
    {
      question: "Is there a limit to file size or number of images?",
      answer: "No file size limits! Process images of any resolution up to 50MP. You can upload up to 100 images simultaneously for batch processing. Perfect for bulk JPEG to PNG conversion or PNG to JPG optimization. The only limitation is your device's available memory and processing power."
    },
    {
      question: "Are my images completely private and secure?",
      answer: "Absolutely! All processing happens locally in your browser using WebAssembly and GPU acceleration. Your images never leave your device, are never uploaded to any server, and are automatically cleared from memory when you close the browser. Perfect for sensitive image conversion tasks."
    },
    {
      question: "Which formats are supported for input and output?",
      answer: "Input: JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF, HEIC, and more. Output: JPEG, PNG, WebP with plans to add AVIF and HEIC. We're constantly adding support for new formats. Perfect for all your conversion needs including JPEG to PNG, PNG to JPG, and WebP optimization."
    },
    {
      question: "Can I use this for commercial projects?",
      answer: "Yes! JPG2GO is perfect for commercial use. Many photographers, designers, and agencies use it for client work including bulk JPEG to PNG conversion, PNG to JPG optimization, and WebP creation. The offline processing ensures your client's images remain completely private and secure."
    },
    {
      question: "How do I achieve the best compression results?",
      answer: "For photos: Use JPEG with 80-90% quality and enable AI optimization. For graphics with transparency: Use PNG. For web use: Try WebP format for best compression. For JPEG to PNG conversion, use 100% quality. For PNG to JPG, use 85-90% quality. Let our AI handle the technical details!"
    },
    {
      question: "Does this work on mobile devices?",
      answer: "Yes! JPG2GO is fully responsive and works on tablets and modern smartphones. However, for best performance with large batches or high-resolution images (like bulk JPEG to PNG conversion), we recommend using a desktop or laptop with sufficient RAM."
    }
  ];

  const bestPractices = [
    {
      category: "Web Optimization",
      icon: <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />,
      tips: [
        "Convert JPEG to WebP for 25-35% better compression than traditional formats",
        "Use PNG to JPG conversion for photos with 80-85% quality for optimal web performance",
        "Resize images to actual display dimensions (don't rely on CSS scaling)",
        "Enable AI optimization for automatic quality adjustments and smart compression",
        "Use progressive JPEG for faster perceived loading on websites"
      ]
    },
    {
      category: "Print & Professional",
      icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />,
      tips: [
        "Use 95-100% quality for professional printing and archival purposes",
        "Maintain original resolution for print materials - avoid unnecessary resizing",
        "Choose PNG for graphics, logos, and images requiring transparency",
        "Use TIFF for archival and professional photography workflows",
        "Apply minimal compression for images that will be further edited or processed"
      ]
    },
    {
      category: "Social Media Optimization",
      icon: <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />,
      tips: [
        "Instagram: 1080x1080 (square), 1080x1350 (portrait), 1080x608 (landscape) - use JPEG to PNG for graphics",
        "Facebook: 1200x630 for shared links, 1080x1080 for posts - PNG to JPG for photos",
        "Twitter: 1200x675 for optimal display in timeline - WebP for best compression",
        "LinkedIn: 1200x627 for article headers, 1080x1080 for posts",
        "Use 85-90% quality with vivid filter for social media impact and engagement"
      ]
    }
  ];

  return (
    <section id="guide" className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4 sm:mb-6">
            <Play className="h-4 w-4" />
            <span>Complete Guide</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-violet-900 to-blue-900 bg-clip-text text-transparent mb-4 sm:mb-6 px-4">
            Master Image Conversion with JPG2GO
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Learn how to convert JPEG to PNG, PNG to JPG, WebP and more like a professional. 
            From basic conversion to advanced AI-powered optimization techniques and batch processing workflows.
          </p>
        </div>

        {/* Interactive Step Guide */}
        <div className="mb-16 sm:mb-20">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Step-by-Step Image Conversion Tutorial</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Step Navigation */}
            <div className="lg:col-span-1">
              <div className="space-y-2 lg:sticky lg:top-8">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-200 ${
                      activeStep === index
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        activeStep === index ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-sm sm:text-base">{index + 1}. {step.title}</div>
                        <div className={`text-xs sm:text-sm ${
                          activeStep === index ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg sm:rounded-xl text-white">
                    {steps[activeStep].icon}
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {steps[activeStep].title}
                    </h4>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {steps[activeStep].description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  {steps[activeStep].details.map((detail, index) => (
                    <div key={index} className="flex items-start space-x-2 sm:space-x-3">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base">{detail}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm sm:text-base">Quick Demo</span>
                  </div>
                  <p className="text-blue-800 text-xs sm:text-sm">{steps[activeStep].demo}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Professional Image Conversion Best Practices</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {bestPractices.map((practice, index) => (
              <div key={index} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  {practice.icon}
                  <h4 className="text-base sm:text-lg font-bold text-gray-900">{practice.category}</h4>
                </div>
                <ul className="space-y-2 sm:space-y-3">
                  {practice.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start space-x-2 text-xs sm:text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-violet-600 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-8 sm:mb-12">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently Asked Questions</h3>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h4>
                  {expandedFaq === index ? (
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-12 sm:mt-16 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-yellow-800 mb-2">Important Recommendations for Image Conversion</h4>
              <div className="text-yellow-700 space-y-1 sm:space-y-2 text-sm sm:text-base">
                <p>• Always keep backups of your original images before processing or conversion</p>
                <p>• Test settings on a single image before batch processing large collections</p>
                <p>• For critical work, compare results across different quality settings and formats</p>
                <p>• Use the preview feature to verify JPEG to PNG or PNG to JPG conversion results before downloading</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Guide;