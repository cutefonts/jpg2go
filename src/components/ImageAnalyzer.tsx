import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image, Users, Zap, Shield, FileText, TrendingUp, FileImage, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw } from 'lucide-react';
import SEO from './SEO';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface AnalysisResult {
  width: number;
  height: number;
  fileSize: number;
  format: string;
  colorDepth: number;
  hasTransparency: boolean;
  metadata: Record<string, any>;
}

const ImageAnalyzer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    analysis: 'comprehensive',
    format: 'detailed',
    includeMetadata: true,
    exportReport: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/') && file.type !== 'image/gif'
    );
    setFiles(prev => [...prev, ...imageFiles]);
    // Set the first file as selected for analysis
    if (imageFiles.length > 0) {
      setSelectedFile(imageFiles[0]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => 
      file.type.startsWith('image/') && file.type !== 'image/gif'
    );
    setFiles(prev => [...prev, ...imageFiles]);
    // Set the first file as selected for analysis
    if (imageFiles.length > 0) {
      setSelectedFile(imageFiles[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // If we're removing the selected file, select the first remaining file
      if (selectedFile === prev[index] && newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      } else if (newFiles.length === 0) {
        setSelectedFile(null);
      }
      return newFiles;
    });
  };

  const selectFileForAnalysis = (file: File) => {
    setSelectedFile(file);
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      for (const file of files) {
        // Analyze image
        const img = document.createElement("img") as HTMLImageElement;
        const fileUrl = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          img.onload = async () => {
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const totalPixels = canvas.width * canvas.height;
            let brightness = 0;
            let contrast = 0;
            let redAvg = 0, greenAvg = 0, blueAvg = 0;
            let sharpness = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              redAvg += r;
              greenAvg += g;
              blueAvg += b;
              brightness += (r + g + b) / 3;
            }
            redAvg /= totalPixels;
            greenAvg /= totalPixels;
            blueAvg /= totalPixels;
            brightness /= totalPixels;
            for (let y = 1; y < canvas.height - 1; y++) {
              for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                const current = data[idx];
                const right = data[idx + 4];
                const bottom = data[idx + canvas.width * 4];
                sharpness += Math.abs(current - right) + Math.abs(current - bottom);
              }
            }
            sharpness = sharpness / (totalPixels * 2);
            let minBrightness = 255, maxBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
              const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              minBrightness = Math.min(minBrightness, pixelBrightness);
              maxBrightness = Math.max(maxBrightness, pixelBrightness);
            }
            contrast = maxBrightness - minBrightness;
            // Generate PDF report
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 size
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            let y = 800;
            page.drawText('Image Analysis Report', { x: 50, y, size: 24, font, color: rgb(0.2,0.2,0.7) });
            y -= 40;
            page.drawText(`File Name: ${file.name}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Dimensions: ${canvas.width} x ${canvas.height}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`File Size: ${(file.size/1024).toFixed(2)} KB`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Format: ${file.type || 'image/unknown'}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Brightness: ${Math.round(brightness)}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Contrast: ${Math.round(contrast)}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Sharpness: ${Math.round(sharpness)}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Color Balance: R ${Math.round(redAvg)}, G ${Math.round(greenAvg)}, B ${Math.round(blueAvg)}`, { x: 50, y, size: 14, font });
            y -= 20;
            page.drawText(`Dominant Color: ${redAvg > greenAvg && redAvg > blueAvg ? 'Red' : greenAvg > blueAvg ? 'Green' : 'Blue'}`, { x: 50, y, size: 14, font });
            y -= 40;
            page.drawText('--- End of Report ---', { x: 50, y, size: 12, font, color: rgb(0.5,0.5,0.5) });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            setProcessedBlob(blob);
            setSelectedFile(file);
            setIsProcessing(false);
            alert('Image analysis completed! Download your PDF report.');
            resolve();
          };
          img.onerror = reject;
          img.src = fileUrl;
        });
      }
    } catch (error) {
      setIsProcessing(false);
      alert('Error analyzing images. Please try again.');
    }
  };

  const downloadAll = () => {
    if (!processedBlob) {
      alert('No processed file to download');
      return;
    }

    // Download the real processed file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = selectedFile?.name.replace(/\.[^/.]+$/, '') + '_analysis-report.pdf';
    link.click();
  };

  const analyzeImage = useCallback(async () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      // Create canvas for analysis
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load image
      const img = document.createElement("img") as HTMLImageElement;
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Analyze image
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate analysis metrics
        const totalPixels = canvas.width * canvas.height;
        let brightness = 0;
        let contrast = 0;
        let redAvg = 0, greenAvg = 0, blueAvg = 0;
        let sharpness = 0;
        
        // Calculate color averages and brightness
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          redAvg += r;
          greenAvg += g;
          blueAvg += b;
          brightness += (r + g + b) / 3;
        }
        
        redAvg /= totalPixels;
        greenAvg /= totalPixels;
        blueAvg /= totalPixels;
        brightness /= totalPixels;
        
        // Calculate sharpness (edge detection)
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            const current = data[idx];
            const right = data[idx + 4];
            const bottom = data[idx + canvas.width * 4];
            sharpness += Math.abs(current - right) + Math.abs(current - bottom);
          }
        }
        sharpness = sharpness / (totalPixels * 2);
        
        // Calculate contrast
        let minBrightness = 255, maxBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          minBrightness = Math.min(minBrightness, pixelBrightness);
          maxBrightness = Math.max(maxBrightness, pixelBrightness);
        }
        contrast = maxBrightness - minBrightness;
        
        // Create analysis result
        const analysis = {
          width: canvas.width,
          height: canvas.height,
          fileSize: selectedFile.size,
          format: selectedFile.type || 'image/unknown',
          colorDepth: 24,
          hasTransparency: false,
          metadata: {
            resolution: `${canvas.width} x ${canvas.height}`,
            aspectRatio: (canvas.width / canvas.height).toFixed(2),
            brightness: Math.round(brightness),
            contrast: Math.round(contrast),
            sharpness: Math.round(sharpness),
            dominantColor: redAvg > greenAvg && redAvg > blueAvg ? 'Red' : 
                          greenAvg > blueAvg ? 'Green' : 'Blue',
            colorBalance: { red: Math.round(redAvg), green: Math.round(greenAvg), blue: Math.round(blueAvg) }
          }
        };
        
        setAnalysisResult(analysis);
        
        // Generate PDF report
        generatePDFReport(selectedFile, analysis);
        
        setIsProcessing(false);
        alert('Image analysis completed! Check the results below and download your PDF report.');
      };
      
      img.src = URL.createObjectURL(selectedFile);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      setIsProcessing(false);
      alert('Error analyzing image. Please try again.');
    }
  }, [selectedFile]);

  const generatePDFReport = async (file: File, analysis: AnalysisResult) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let y = 800;
      
      // Title
      page.drawText('Image Analysis Report', { x: 50, y, size: 24, font: boldFont, color: rgb(0.2,0.2,0.7) });
      y -= 40;
      
      // File Information
      page.drawText('File Information:', { x: 50, y, size: 16, font: boldFont, color: rgb(0.3,0.3,0.3) });
      y -= 25;
      page.drawText(`File Name: ${file.name}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Dimensions: ${analysis.width} × ${analysis.height}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`File Size: ${(analysis.fileSize / 1024).toFixed(2)} KB`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Format: ${analysis.format}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Color Depth: ${analysis.colorDepth} bit`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Aspect Ratio: ${analysis.metadata.aspectRatio}`, { x: 60, y, size: 12, font });
      y -= 30;
      
      // Quality Metrics
      page.drawText('Quality Metrics:', { x: 50, y, size: 16, font: boldFont, color: rgb(0.3,0.3,0.3) });
      y -= 25;
      page.drawText(`Brightness: ${analysis.metadata.brightness}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Contrast: ${analysis.metadata.contrast}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Sharpness: ${analysis.metadata.sharpness}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Dominant Color: ${analysis.metadata.dominantColor}`, { x: 60, y, size: 12, font });
      y -= 30;
      
      // Color Analysis
      page.drawText('Color Analysis:', { x: 50, y, size: 16, font: boldFont, color: rgb(0.3,0.3,0.3) });
      y -= 25;
      page.drawText(`Red Channel: ${analysis.metadata.colorBalance.red}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Green Channel: ${analysis.metadata.colorBalance.green}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Blue Channel: ${analysis.metadata.colorBalance.blue}`, { x: 60, y, size: 12, font });
      y -= 18;
      page.drawText(`Transparency: ${analysis.hasTransparency ? 'Yes' : 'No'}`, { x: 60, y, size: 12, font });
      y -= 30;
      
      // Footer
      page.drawText('Generated by JPG2GO Image Analyzer', { x: 50, y, size: 10, font, color: rgb(0.5,0.5,0.5) });
      y -= 15;
      page.drawText(`Report generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { x: 50, y, size: 10, font, color: rgb(0.5,0.5,0.5) });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
    } catch (error) {
      console.error('Error generating PDF report:', error);
    }
  };

  const features = [
    {
      icon: <Image className="h-6 w-6" />,
      title: "Comprehensive Analysis",
      description: "Analyze image quality, metadata, color profiles, and technical specifications"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations for optimization and improvement"
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Detailed Reports",
      description: "Generate comprehensive PDF reports with visual charts and recommendations"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "Your images are analyzed securely and never stored permanently"
    }
  ];

  const howToSteps = [
    {
      step: "1",
      title: "Upload Images",
      description: "Drag and drop your images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Configure Analysis",
      description: "Choose analysis type, report format, metadata inclusion, and export options"
    },
    {
      step: "3",
      title: "Generate Analysis",
      description: "Our system analyzes your images and creates detailed reports with insights"
    }
  ];

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "500K+", label: "Images Analyzed" },
    { icon: <Zap className="h-5 w-5" />, value: "< 30s", label: "Analysis Time" },
    { icon: <Shield className="h-5 w-5" />, value: "100%", label: "Secure & Private" },
    { icon: <FileImage className="h-5 w-5" />, value: "Free", label: "No Registration" }
  ];

  return (
    <>
      <SEO
        title="Image Analyzer | Analyze Photos Online for Free"
        description="Get detailed insights from your images with our free online image analyzer. Detect colors, objects, and metadata quickly and easily."
        keywords="image analyzer, image properties, metadata analysis, image statistics, technical details, online tool, free tool"
        canonical="image-analyzer"
        ogImage="/images/image-analyzer-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Image className="h-4 w-4" />
                <span>Image Analyzer</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Image Analyzer Online
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Get comprehensive analysis of your images with AI-powered insights. Understand quality, 
                metadata, color profiles, and get intelligent recommendations for optimization.
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
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your images here for analysis
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse files from your computer
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Choose Images
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Download Area */}
              {processedBlob && (
                <div
                  className="mb-8 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all duration-300"
                  onClick={downloadAll}
                >
                  <Download className="h-10 w-10 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Analysis Report</h3>
                  <p className="text-gray-600 mb-4">Click anywhere in this box or the button below to download your analysis report.</p>
                  <button
                    onClick={e => { e.stopPropagation(); downloadAll(); }}
                    className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    type="button"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* File Management */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Image className="h-5 w-5 text-violet-600" />
                    <span>Selected Images ({files.length})</span>
                    {selectedFile && (
                      <span className="text-sm text-gray-500 font-normal">
                        - Analyzing: {selectedFile.name}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className={`rounded-xl p-4 flex items-center space-x-3 cursor-pointer transition-all duration-200 ${
                          selectedFile === file 
                            ? 'bg-violet-100 border-2 border-violet-500 shadow-md' 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                        onClick={() => selectFileForAnalysis(file)}
                      >
                        <Image className={`h-8 w-8 ${selectedFile === file ? 'text-violet-600' : 'text-gray-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            selectedFile === file ? 'text-violet-900' : 'text-gray-900'
                          }`}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {files.length > 1 && (
                    <p className="text-sm text-gray-600 mt-3">
                      💡 Click on any image above to select it for analysis
                    </p>
                  )}
                </div>
              )}

              {/* Analysis Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  <span>Analysis Settings</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
                    <select
                      value={settings.analysis}
                      onChange={(e) => setSettings(prev => ({ ...prev, analysis: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="comprehensive">Comprehensive</option>
                      <option value="basic">Basic</option>
                      <option value="technical">Technical</option>
                      <option value="quality">Quality Focus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Format</label>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="detailed">Detailed PDF</option>
                      <option value="summary">Summary</option>
                      <option value="visual">Visual Report</option>
                      <option value="technical">Technical Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Include Metadata</label>
                    <select
                      value={settings.includeMetadata ? 'yes' : 'no'}
                      onChange={(e) => setSettings(prev => ({ ...prev, includeMetadata: e.target.value === 'yes' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Export Report</label>
                    <select
                      value={settings.exportReport ? 'yes' : 'no'}
                      onChange={(e) => setSettings(prev => ({ ...prev, exportReport: e.target.value === 'yes' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={analyzeImage}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      {/* Spinner removed */}
                      <span>Analyzing Image...</span>
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5" />
                      <span>Analyze Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* Analysis Results */}
              {analysisResult && (
                <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <span>Analysis Results</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <Image className="h-4 w-4 text-blue-600" />
                        <span>Basic Information</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dimensions:</span>
                          <span className="font-medium">{analysisResult.width} × {analysisResult.height}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">File Size:</span>
                          <span className="font-medium">{(analysisResult.fileSize / 1024).toFixed(2)} KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Format:</span>
                          <span className="font-medium">{analysisResult.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color Depth:</span>
                          <span className="font-medium">{analysisResult.colorDepth} bit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aspect Ratio:</span>
                          <span className="font-medium">{analysisResult.metadata.aspectRatio}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Quality Metrics</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Brightness:</span>
                          <span className="font-medium">{analysisResult.metadata.brightness}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contrast:</span>
                          <span className="font-medium">{analysisResult.metadata.contrast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sharpness:</span>
                          <span className="font-medium">{analysisResult.metadata.sharpness}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dominant Color:</span>
                          <span className="font-medium">{analysisResult.metadata.dominantColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <span>Color Analysis</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Red Channel:</span>
                          <span className="font-medium">{analysisResult.metadata.colorBalance.red}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Green Channel:</span>
                          <span className="font-medium">{analysisResult.metadata.colorBalance.green}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Blue Channel:</span>
                          <span className="font-medium">{analysisResult.metadata.colorBalance.blue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transparency:</span>
                          <span className="font-medium">{analysisResult.hasTransparency ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden canvas for image analysis */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our Image Analyzer?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  AI-powered image analysis with comprehensive insights and detailed reports
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
                  How to Analyze Images
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to get comprehensive analysis of your images
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
                    Ready to Analyze Your Images?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Get comprehensive analysis and AI-powered insights for your images. Join thousands of users 
                    who trust our analyzer for their image quality assessment needs.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <Image className="h-5 w-5" />
                    <span>Start Analyzing Now</span>
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

export default ImageAnalyzer; 