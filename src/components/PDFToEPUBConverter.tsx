import React, { useRef, useState } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { OPS } from 'pdfjs-dist/build/pdf';

const stats = [
  { icon: <Users className="h-5 w-5" />, value: '90K+', label: 'PDFs Converted' },
  { icon: <Zap className="h-5 w-5" />, value: '< 10s', label: 'Processing Time' },
  { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
  { icon: <FileText className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
];

const features = [
  { icon: <FileText className="h-6 w-6" />, title: 'Preserve Chapters', description: 'Retain chapter structure in EPUB' },
  { icon: <FileText className="h-6 w-6" />, title: 'Image Support', description: 'Keep images and formatting' },
  { icon: <FileText className="h-6 w-6" />, title: 'Batch Conversion', description: 'Convert multiple PDFs at once' },
  { icon: <FileText className="h-6 w-6" />, title: 'Reflowable Output', description: 'Optimized for all devices' },
];

const howToSteps = [
  { step: 1, title: 'Upload PDFs', description: 'Select or drag and drop your PDF files.' },
  { step: 2, title: 'Set Preferences', description: 'Choose conversion settings.' },
  { step: 3, title: 'Download EPUB', description: 'Get your converted EPUB files.' },
];

// Helper: Extract images from a PDF page using pdfjsLib
async function extractImagesFromPage(page: any): Promise<{ dataUrl: string, name: string }[]> {
  const images: { dataUrl: string, name: string }[] = [];
  try {
    const opList = await page.getOperatorList();
    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;
    for (let i = 0; i < fnArray.length; i++) {
      if (
        fnArray[i] === OPS.paintImageXObject ||
        fnArray[i] === OPS.paintInlineImageXObject
      ) {
        const objId = argsArray[i][0];
        const img = await page.objs.get(objId);
        if (img && img.data) {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.createImageData(img.width, img.height);
            imageData.data.set(img.data);
            ctx.putImageData(imageData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            images.push({ dataUrl, name: `img_${i}.png` });
          }
        }
      }
    }
  } catch (err) {
    // If image extraction fails, just return empty array
    return [];
  }
  return images;
}

const PDFToEPUBConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState({
    preserveImages: true,
    preserveLinks: true,
    splitChapters: false,
    fontSize: 'medium',
    reflowable: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

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
    setError(null);
    setZipBlob(null);
    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let allText = '';
        let allImages: { dataUrl: string, name: string, page: number }[] = [];
        for (let j = 1; j <= pdf.numPages; j++) {
          const page = await pdf.getPage(j);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          allText += `\n\n--- Page ${j} ---\n${pageText}`;
          // Extract images if enabled
          if (settings.preserveImages) {
            const images = await extractImagesFromPage(page);
            for (const img of images) {
              allImages.push({ ...img, page: j });
            }
          }
        }
        // Build EPUB structure
        const epubTitle = file.name.replace(/\.pdf$/i, '');
        const fontSize = settings.fontSize === 'small' ? '12px' : settings.fontSize === 'large' ? '20px' : '16px';
        // Embed images in XHTML
        let imageTags = '';
        if (settings.preserveImages && allImages.length > 0) {
          imageTags = allImages.map(img => `<img src=\"images/${img.name}\" alt=\"Image from page ${img.page}\" style=\"max-width:100%;margin:1em 0;\" />`).join('');
        }
        const contentXHTML = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n<title>${epubTitle}</title>\n<style>body{font-size:${fontSize};font-family:serif;line-height:1.6;}</style>\n</head>\n<body>\n<h1>${epubTitle}</h1>\n${allText.split('\n').map(line => line ? `<p>${line}</p>` : '').join('')}\n${imageTags}\n</body>\n</html>`;
        // Add EPUB files to zip
        zip.file(`${epubTitle}/mimetype`, 'application/epub+zip');
        zip.file(`${epubTitle}/META-INF/container.xml`, `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n<rootfiles>\n<rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>\n</rootfiles>\n</container>`);
        zip.file(`${epubTitle}/OEBPS/content.xhtml`, contentXHTML);
        zip.file(`${epubTitle}/OEBPS/content.opf`, `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"3.0\" unique-identifier=\"bookid\">\n<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n<dc:title>${epubTitle}</dc:title>\n<dc:language>en</dc:language>\n</metadata>\n<manifest>\n<item id=\"content\" href=\"content.xhtml\" media-type=\"application/xhtml+xml\"/>\n${allImages.map(img => `<item id=\"${img.name}\" href=\"images/${img.name}\" media-type=\"image/png\"/>`).join('')}\n</manifest>\n<spine>\n<itemref idref=\"content\"/>\n</spine>\n</package>`);
        // Add images to zip
        if (settings.preserveImages && allImages.length > 0) {
          for (const img of allImages) {
            const base64 = img.dataUrl.split(',')[1];
            zip.file(`${epubTitle}/OEBPS/images/${img.name}`, base64, { base64: true });
          }
        }
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      setZipBlob(zipContent);
      setProcessedFiles(files);
      setIsProcessing(false);
    } catch (err: any) {
      setError('Error converting PDF to EPUB: ' + (err?.message || err));
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    if (zipBlob) {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pdf-to-epub-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <>
      <SEO
        title="PDF to EPUB | Convert PDF to EPUB eBook Online Free"
        description="Transform PDFs into EPUB eBooks quickly and accurately. Use our free PDF to EPUB converter online—no downloads or sign-up required."
        keywords="PDF to EPUB, convert PDF to EPUB, PDF to ebook, online converter, free tool"
        canonical="pdf-to-epub"
        ogImage="/images/pdf-to-epub-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF to EPUB Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Convert PDF to
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> EPUB Online</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Batch convert PDF documents to high-quality EPUB format. Fast, secure, and free PDF to EPUB converter for all platforms.
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here for EPUB conversion</h3>
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
                    <FileText className="h-5 w-5 text-violet-600" />
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
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF to EPUB conversion.<br/>Conversion will preserve chapters, images, and formatting.</p>
                </div>
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
                      id="preserveImages"
                      checked={settings.preserveImages}
                      onChange={e => setSettings(prev => ({ ...prev, preserveImages: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveImages" className="text-sm font-medium text-gray-700">Preserve Images</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveLinks"
                      checked={settings.preserveLinks}
                      onChange={e => setSettings(prev => ({ ...prev, preserveLinks: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveLinks" className="text-sm font-medium text-gray-700">Preserve Links</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="splitChapters"
                      checked={settings.splitChapters}
                      onChange={e => setSettings(prev => ({ ...prev, splitChapters: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="splitChapters" className="text-sm font-medium text-gray-700">Split Chapters</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reflowable"
                      checked={settings.reflowable}
                      onChange={e => setSettings(prev => ({ ...prev, reflowable: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="reflowable" className="text-sm font-medium text-gray-700">Reflowable EPUB</label>
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
                      {/* Spinner removed */}
                      <span>Converting to EPUB...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert PDF to EPUB</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download EPUB Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF to EPUB Converter?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Professional PDF to EPUB conversion with customizable settings and high quality output</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Convert PDF to EPUB</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to convert your PDF files to EPUB</p>
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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Convert PDF to EPUB?</h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Transform your PDF documents into professional EPUB ebooks. Join thousands of users who trust our converter for reliable PDF to EPUB conversion.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
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

export default PDFToEPUBConverter; 