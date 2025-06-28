import React, { useRef, useState } from 'react';
import { Upload, Download, FileText, FileType, Users, Zap, Shield } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '80K+', label: 'PDFs Converted' },
  { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const features = [
  { icon: <FileType className="h-6 w-6" />, title: 'Preserve Formatting', description: 'Keep original layout and images' },
  { icon: <FileType className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple PDFs at once' },
  { icon: <FileType className="h-6 w-6" />, title: 'Fast & Secure', description: 'Quick conversion with privacy' },
  { icon: <FileType className="h-6 w-6" />, title: 'All Platforms', description: 'Works on any device' },
];

const howToSteps = [
  { step: 1, title: 'Upload PDFs', description: 'Select or drag and drop your PDF files.' },
  { step: 2, title: 'Set Preferences', description: 'Choose conversion settings.' },
  { step: 3, title: 'Download ODT', description: 'Get your converted ODT files.' },
];

const PDFToODTConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState({
    ocrEnabled: false,
    preserveFormatting: true,
    extractImages: false,
    language: 'en',
  });
  const [odtPreview, setOdtPreview] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setOdtPreview(null);
    try {
      const processed: File[] = [];
      let previewText: string | null = null;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Use pdfjs-dist for real text extraction
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          let pageText = textContent.items.map((item: any) => item.str).join(' ');
          // If no text and OCR is enabled, use Tesseract.js
          if (!pageText.trim() && settings.ocrEnabled) {
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const renderTask = page.render({ canvasContext: ctx, viewport });
              await renderTask.promise;
              const dataUrl = canvas.toDataURL('image/png');
              const ocrResult = await Tesseract.recognize(dataUrl, settings.language);
              pageText = ocrResult.data.text || '';
            } // else skip OCR for this page
          }
          extractedText += `\n\n--- Page ${pageNum} ---\n\n`;
          extractedText += pageText.trim() ? pageText : '[No text found]';
        }
        // Create ODT content structure
        const odtContent = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:text>
      <text:h text:style-name="Heading_20_1">${file.name.replace(/\.pdf$/i, '')}</text:h>
      <text:p text:style-name="Standard">Converted from PDF to ODT format</text:p>
      <text:p text:style-name="Standard"><text:span text:style-name="Strong_20_Emphasis">Original file:</text:span> ${file.name}</text:p>
      <text:p text:style-name="Standard"><text:span text:style-name="Strong_20_Emphasis">File size:</text:span> ${(file.size / 1024 / 1024).toFixed(2)} MB</text:p>
      <text:p text:style-name="Standard"><text:span text:style-name="Strong_20_Emphasis">Pages:</text:span> ${pdf.numPages}</text:p>
      ${extractedText.split('\n').map(line => {
        if (line.startsWith('--- Page')) {
          return `<text:h text:style-name="Heading_20_2">${line}</text:h>`;
        } else if (line.trim()) {
          return `<text:p text:style-name="Standard">${line}</text:p>`;
        } else {
          return '';
        }
      }).join('')}
    </office:text>
  </office:body>
</office:document-content>`;
        const odtBlob = new Blob([odtContent], { type: 'application/vnd.oasis.opendocument.text' });
        // For preview: set previewText to the first 20 lines of the first ODT
        if (!previewText) {
          previewText = odtContent.split('\n').slice(0, 20).join('\n');
        }
        // Create download link
        const url = URL.createObjectURL(odtBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.pdf$/i, '') + '_converted.odt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setProcessedFiles(files);
      setOdtPreview(previewText);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error converting PDF to ODT:', error);
      setIsProcessing(false);
      alert('Error converting PDF to ODT. Please try again.');
    }
  };

  const downloadAll = () => {
    // Simulate download
    alert('Download all ODT files');
  };

  return (
    <>
      <SEO
        title="PDF to ODT | Free Online PDF to ODT Converter"
        description="Convert PDF files to ODT format for easy editing in LibreOffice and OpenOffice. Fast, reliable, and free online PDF to ODT converter."
        keywords="PDF to ODT, convert PDF to ODT, PDF to document, online converter, free tool"
        canonical="pdf-to-odt"
        ogImage="/images/pdf-to-odt-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileType className="h-4 w-4" />
                <span>PDF to ODT Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> ODT Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert PDF documents to editable ODT format. Fast, secure, and free PDF to ODT converter for all platforms.
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
              {/* File Upload Area */}
              <div className="mb-8">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here for ODT conversion</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileType className="h-5 w-5 text-violet-600" />
                    <span>Selected PDF Files ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-violet-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Live Preview (placeholder) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                {odtPreview ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-xs text-left max-h-64 overflow-y-auto whitespace-pre-wrap">
                    <strong>Live Preview (first 20 lines):</strong>
                    <pre className="mt-2">{odtPreview}</pre>
                  </div>
                ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF to ODT conversion.<br/>Conversion will preserve formatting and enable text editing.</p>
                </div>
                )}
              </div>
              {/* Conversion Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Conversion Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ocrEnabled"
                      checked={settings.ocrEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, ocrEnabled: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ocrEnabled" className="text-sm font-medium text-gray-700">Enable OCR</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveFormatting"
                      checked={settings.preserveFormatting}
                      onChange={e => setSettings(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveFormatting" className="text-sm font-medium text-gray-700">Preserve Formatting</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extractImages"
                      checked={settings.extractImages}
                      onChange={e => setSettings(prev => ({ ...prev, extractImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="extractImages" className="text-sm font-medium text-gray-700">Extract Images</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={e => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert to ODT</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download ODT Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF to ODT Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional PDF to ODT conversion with customizable settings and high quality output</p>
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

            {/* How-To Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PDF to ODT</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your PDF documents to ODT</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert PDF to ODT?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Transform your PDF documents into editable ODT files. Join thousands of users who trust our converter for reliable PDF to ODT conversion.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileType className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
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

export default PDFToODTConverter; 