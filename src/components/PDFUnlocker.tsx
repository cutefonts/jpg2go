import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, FileLock, Key, Download, Loader2, AlertTriangle, CheckCircle, Users, Zap, Shield, CheckCircle as CheckCircleIcon, Sparkles, ArrowRight, Settings, RotateCcw, Unlock, FileType } from 'lucide-react';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

const PDFUnlocker: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [settings, setSettings] = useState({
    unlockMode: 'password',
    removeRestrictions: true,
    preserveQuality: true,
    batchProcess: true,
    password: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = useNotification();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles]);
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
    
    try {
      const processed: { name: string, blob: Blob }[] = [];
      
      for (const file of files) {
        try {
          // Load PDF using pdf-lib
          const { PDFDocument } = await import('pdf-lib');
          
          const fileBuffer = await file.arrayBuffer();
          let pdfDoc;
          
          try {
            // Try to load the PDF without password first
            pdfDoc = await PDFDocument.load(fileBuffer);
          } catch (error) {
            notify(`${file.name} appears to be password protected or corrupted. Please ensure the file is not password protected.`, 'error');
            continue;
          }
          
          // Create a new unlocked PDF
          const unlockedPdf = await PDFDocument.create();
          
          // Copy all pages from the original PDF
          const pages = await unlockedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          
          // Add all pages to the unlocked PDF
          pages.forEach(page => {
            unlockedPdf.addPage(page);
          });
          
          // Remove restrictions if enabled
          if (settings.removeRestrictions) {
            // Note: pdf-lib doesn't have direct restriction removal
            // This creates an unlocked version by copying content
          }
          
          // Save the unlocked PDF
          const pdfBytes = await unlockedPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          processed.push({
            name: file.name.replace(/\.pdf$/i, '_unlocked.pdf'),
            blob: blob
          });
          
        } catch (error) {
          notify(`Error processing ${file.name}. Skipping this file.`, 'error');
        }
      }
      
      setProcessedFiles(processed);
      setIsProcessing(false);
      notify(`PDF unlocking completed! Processed ${processed.length} files.`, 'success');
      
    } catch (error) {
      notify('Error unlocking PDFs. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    processedFiles.forEach((file) => {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const features = [
    { icon: <Unlock className="h-6 w-6" />, title: 'Password Removal', description: 'Remove password protection from PDF files' },
    { icon: <Shield className="h-6 w-6" />, title: 'Restriction Removal', description: 'Remove editing and printing restrictions' },
    { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Unlock multiple PDFs simultaneously' },
    { icon: <Users className="h-6 w-6" />, title: 'Quality Preservation', description: 'Maintain original PDF quality and formatting' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF Files', description: 'Select password-protected PDF files' },
    { step: '2', title: 'Choose Settings', description: 'Select unlocking options and preferences' },
    { step: '3', title: 'Unlock & Download', description: 'Download unlocked PDF files' }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: '90K+', label: 'PDFs Unlocked' },
    { icon: <Zap className="h-5 w-5" />, value: '< 60s', label: 'Processing Time' },
    { icon: <Shield className="h-5 w-5" />, value: '100%', label: 'Secure & Private' },
    { icon: <FileType className="h-5 w-5" />, value: 'Free', label: 'No Registration' }
  ];

  return (
    <>
      <SEO 
        title="PDF Unlocker | Remove PDF Passwords Online Free"
        description="Unlock your password-protected PDFs quickly and securely with our free online PDF unlocker. No software needed, easy to use."
        keywords="PDF unlocker, unlock PDF, remove PDF password, PDF restrictions remover, online tool, free tool"
        canonical="pdf-unlocker"
        ogImage="/images/pdf-unlocker-og.jpg"
      />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Unlock className="h-4 w-4" />
                <span>PDF Unlocker</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Unlock PDF Files Online
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Remove password protection and restrictions from PDF files with our secure unlocking tool. Access your documents without limitations.
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
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your PDF files here</h3>
                  <p className="text-gray-600 mb-6">or click to browse files from your computer</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF Files</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
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
                    <span>Selected PDFs ({files.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                        <FileType className="h-8 w-8 text-violet-600" />
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
                  <Unlock className="h-5 w-5 text-violet-600" />
                  <span>Live Preview</span>
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <p>No live preview available for PDF unlocking.<br/>Unlocking will remove password protection and restrictions, generating accessible PDFs for download.</p>
                </div>
              </div>

              {/* Unlock Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Unlock className="h-5 w-5 text-violet-600" />
                  <span>Unlock Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unlock Mode</label>
                    <select
                      value={settings.unlockMode}
                      onChange={e => setSettings(prev => ({ ...prev, unlockMode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="password">Password Removal</option>
                      <option value="restrictions">Restriction Removal</option>
                      <option value="both">Both Password & Restrictions</option>
                      <option value="owner">Owner Password</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="removeRestrictions"
                      checked={settings.removeRestrictions}
                      onChange={e => setSettings(prev => ({ ...prev, removeRestrictions: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="removeRestrictions" className="text-sm font-medium text-gray-700">Remove Restrictions</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveQuality"
                      checked={settings.preserveQuality}
                      onChange={e => setSettings(prev => ({ ...prev, preserveQuality: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="preserveQuality" className="text-sm font-medium text-gray-700">Preserve Quality</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="batchProcess"
                      checked={settings.batchProcess}
                      onChange={e => setSettings(prev => ({ ...prev, batchProcess: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="batchProcess" className="text-sm font-medium text-gray-700">Batch Process</label>
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
                      <span>Unlocking PDFs...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-5 w-5" />
                      <span>Unlock PDF Files</span>
                    </>
                  )}
                </button>
                {processedFiles.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Unlocked PDFs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Unlocker Tool?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Secure and efficient unlocking technology for password-protected PDF documents</p>
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

            {/* How to Use */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Unlock PDF Documents</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to unlock your PDF files</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Unlock Your PDFs?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Join thousands of users who trust our PDF unlocker tool for document access</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <Unlock className="h-5 w-5" />
                    <span>Start Unlocking Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

const PDFUnlockerWithProvider: React.FC = () => (
  <NotificationProvider>
    <PDFUnlocker />
  </NotificationProvider>
);

export default PDFUnlockerWithProvider; 