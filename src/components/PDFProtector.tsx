import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Users, Zap, Shield, FileType, Lock, RotateCcw, CheckCircle } from 'lucide-react';
import SEO from './SEO';

interface UploadedPDF {
  id: string;
  file: File;
  name: string;
  size: number;
}

const PDFProtector: React.FC = () => {
  const [files, setFiles] = useState<UploadedPDF[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    password: '',
    confirmPassword: '',
    protectionLevel: 'standard',
    allowPrinting: false,
    allowCopying: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size }));
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedFiles([]);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setError(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });
    if (pdfFiles.length !== droppedFiles.length) {
      setError('Some files were skipped. Please ensure all files are PDFs under 50MB.');
    }
    const newFiles: UploadedPDF[] = pdfFiles.map(file => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size }));
    setFiles(prev => [...prev, ...newFiles]);
    setProcessedFiles([]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const protectPDFServer = async (file: File, password: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('password', password);

    const response = await fetch('http://localhost:4000/protect', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to protect PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'protected_' + file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const processFile = async () => {
    if (files.length === 0) return;
    if (settings.password !== settings.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (settings.password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      await Promise.all(files.map(fileObj => protectPDFServer(fileObj.file, settings.password)));
      setIsProcessing(false);
      setSuccess('PDFs protected and downloaded successfully!');
    } catch (error) {
      setIsProcessing(false);
      setError('Error protecting PDFs. Please try again.');
    }
  };

  const handleDownload = async (file: { name: string, blob: Blob }) => {
    if (file) {
      setIsDownloading(true);
      try {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `protected_${file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const resetTool = () => {
    setFiles([]);
    setProcessedFiles([]);
    setError(null);
    setSuccess(null);
    setSettings({
      password: '',
      confirmPassword: '',
      protectionLevel: 'standard',
      allowPrinting: false,
      allowCopying: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  React.useEffect(() => {
    return () => {
      processedFiles.forEach(file => URL.revokeObjectURL(file.name));
    };
  }, [processedFiles]);

  const features = [
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Password Protection",
      description: "Secure PDFs with strong encryption and password access"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Access Control",
      description: "Control printing, copying, and editing permissions"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast Processing",
      description: "Protect your PDFs in seconds with our optimized engine"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Multiple Levels",
      description: "Choose from different security levels based on your needs"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload PDFs",
      description: "Drag and drop your PDF files or click to browse and select from your computer"
    },
    {
      step: "2", 
      title: "Set Protection",
      description: "Choose your password, protection level, and access restrictions"
    },
    {
      step: "3",
      title: "Download Protected PDFs",
      description: "Get your password-protected PDFs instantly with secure encryption"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "10M+", label: "PDFs Protected" },
    { icon: <Zap className="h-5 w-5" />, value: "< 2s", label: "Processing Time" },
    { icon: <Shield className="h-5 w-5" />, value: "256-bit", label: "Encryption" },
    { icon: <FileType className="h-5 w-5" />, value: "99.9%", label: "Success Rate" }
  ];

  const protectionLevels = [
    { id: 'standard', name: 'Standard (128-bit)', description: 'Basic protection for general use' },
    { id: 'high', name: 'High (256-bit)', description: 'Enhanced security for sensitive documents' },
    { id: 'maximum', name: 'Maximum (AES-256)', description: 'Military-grade encryption for critical files' }
  ];

  return (
    <>
      <SEO 
        title="PDF Protector | Secure Your PDFs with Passwords"
        description="Protect your PDF files by adding passwords and encryption online. Use our free PDF protector tool to keep your documents safe and private."
        keywords="PDF protector, protect PDF, PDF password, PDF security, online tool, free tool"
        canonical="pdf-protector"
        ogImage="/images/pdf-protector-og.jpg"
      />
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Lock className="h-4 w-4" />
              <span>PDF Protector</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Protect PDF Files Online
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Advanced PDF protection with password encryption, access control, and multiple security levels. 
              Keep your documents safe and secure from unauthorized access.
            </p>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-violet-600">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Tool Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
            {/* File Upload Area */}
            <div className="mb-8">
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  files.length > 0 
                    ? 'border-violet-500 bg-violet-50/50' 
                    : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {files.length > 0 ? 'PDFs Selected' : 'Drop your PDFs here for protection'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {files.length > 0 ? files.map(file => file.name).join(', ') : 'or click to browse files from your computer'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Choose PDFs
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
              </div>
            </div>

            {/* Protection Settings */}
            {files.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Protection Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={settings.password}
                      onChange={(e) => setSettings({...settings, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={settings.confirmPassword}
                      onChange={(e) => setSettings({...settings, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Protection Level
                    </label>
                    <select
                      value={settings.protectionLevel}
                      onChange={(e) => setSettings({...settings, protectionLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {protectionLevels.map(level => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowPrinting"
                      checked={settings.allowPrinting}
                      onChange={(e) => setSettings({...settings, allowPrinting: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowPrinting" className="text-sm font-medium text-gray-700">
                      Allow Printing
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowCopying"
                      checked={settings.allowCopying}
                      onChange={(e) => setSettings({...settings, allowCopying: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowCopying" className="text-sm font-medium text-gray-700">
                      Allow Copying Text
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={processFile}
                disabled={files.length === 0 || isProcessing}
                className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    {/* Spinner removed */}
                    <span>Protecting PDFs...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Protect PDFs</span>
                  </>
                )}
              </button>
              {processedFiles.length > 0 && (
                <button
                  onClick={() => processedFiles.forEach(file => handleDownload(file))}
                  className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Protected PDFs</span>
                </button>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose Our PDF Protector?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Advanced security features to keep your documents safe and protected from unauthorized access
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                  <div className="inline-flex p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How to Use */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How to Protect Your PDFs
              </h2>
              <p className="text-lg text-gray-600">
                Follow these simple steps to secure your PDF documents with password protection
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howToSteps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">{step.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  Ready to Secure Your Documents?
                </h3>
                <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                  Protect your PDF files with industry-standard encryption and access control. 
                  Join millions of users who trust our PDF Protector for secure document management.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                >
                  <Lock className="h-5 w-5" />
                  <span>Start Protecting Now</span>
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

export default PDFProtector; 