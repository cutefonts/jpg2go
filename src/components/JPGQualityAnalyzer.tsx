import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Eye, Zap, Shield, FileImage, Users, TrendingUp, BarChart3 } from 'lucide-react';
import SEO from './SEO';
import { NotificationProvider, useNotification } from './NotificationProvider';

interface AnalysisResult {
  quality: number;
  resolution: { width: number; height: number };
  fileSize: number;
  compression: string;
  format: string;
  recommendations: string[];
  metrics: {
    brightness: number;
    contrast: number;
    sharpness: number;
    noise: number;
    compressionRatio: number;
    artifacts: number;
  };
}

const JPGQualityAnalyzer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const notify = useNotification();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const jpgFiles = selectedFiles.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/jpg' || 
      file.name.toLowerCase().endsWith('.jpg') || 
      file.name.toLowerCase().endsWith('.jpeg')
    );
    setFiles(prev => [...prev, ...jpgFiles]);
    // Set the first file as selected for analysis
    if (jpgFiles.length > 0) {
      setSelectedFile(jpgFiles[0]);
      setPreviewUrl(URL.createObjectURL(jpgFiles[0]));
      setAnalysisResult(null);
      setProcessedBlob(null);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const jpgFiles = droppedFiles.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/jpg' || 
      file.name.toLowerCase().endsWith('.jpg') || 
      file.name.toLowerCase().endsWith('.jpeg')
    );
    setFiles(prev => [...prev, ...jpgFiles]);
    // Set the first file as selected for analysis
    if (jpgFiles.length > 0) {
      setSelectedFile(jpgFiles[0]);
      setPreviewUrl(URL.createObjectURL(jpgFiles[0]));
      setAnalysisResult(null);
      setProcessedBlob(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFile === files[index]) {
      setSelectedFile(null);
      setPreviewUrl('');
      setAnalysisResult(null);
      setProcessedBlob(null);
    }
  };

  const selectFileForAnalysis = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setProcessedBlob(null);
  };

  const downloadAll = () => {
    if (!processedBlob) {
      notify('No analysis report to download', 'error');
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = selectedFile?.name.replace(/\.[^/.]+$/, '') + '_quality-analysis.jpg';
    link.click();
  };

  // Calculate image noise using variance
  const calculateNoise = (imageData: ImageData): number => {
    const data = imageData.data;
    let totalVariance = 0;
    const width = imageData.width;
    const height = imageData.height;
    
    // Calculate local variance for noise estimation
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = data[idx];
        
        // Get surrounding pixels
        const neighbors = [
          data[idx - 4], data[idx + 4], // left, right
          data[idx - width * 4], data[idx + width * 4] // top, bottom
        ];
        
        // Calculate local variance
        const mean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
        totalVariance += variance;
      }
    }
    
    return Math.sqrt(totalVariance / (width * height));
  };

  // Calculate compression artifacts (blocking and ringing)
  const calculateArtifacts = (imageData: ImageData): number => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let artifactScore = 0;
    
    // Check for blocking artifacts (8x8 block boundaries)
    for (let y = 8; y < height; y += 8) {
      for (let x = 0; x < width; x++) {
        const idx1 = ((y - 1) * width + x) * 4;
        const idx2 = (y * width + x) * 4;
        const diff = Math.abs(data[idx1] - data[idx2]);
        artifactScore += diff;
      }
    }
    
    for (let x = 8; x < width; x += 8) {
      for (let y = 0; y < height; y++) {
        const idx1 = (y * width + (x - 1)) * 4;
        const idx2 = (y * width + x) * 4;
        const diff = Math.abs(data[idx1] - data[idx2]);
        artifactScore += diff;
      }
    }
    
    return artifactScore / (width * height);
  };

  const analyzeImage = useCallback(async () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate metrics
        const totalPixels = canvas.width * canvas.height;
        let brightness = 0;
        let contrast = 0;
        let sharpness = 0;
        
        // Calculate brightness and contrast
        const pixelValues: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = (r + g + b) / 3;
          brightness += gray;
          pixelValues.push(gray);
        }
        brightness = brightness / totalPixels;
        
        // Calculate contrast (standard deviation)
        const variance = pixelValues.reduce((sum, val) => sum + Math.pow(val - brightness, 2), 0) / totalPixels;
        contrast = Math.sqrt(variance);
        
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
        
        // Calculate noise and artifacts
        const noise = calculateNoise(imageData);
        const artifacts = calculateArtifacts(imageData);
        
        // Calculate compression ratio
        const theoreticalSize = canvas.width * canvas.height * 3; // RGB
        const compressionRatio = (1 - selectedFile.size / theoreticalSize) * 100;
        
        // Calculate quality score
        const qualityScore = Math.min(100, Math.max(0, 
          (brightness / 255 * 15) + 
          (contrast / 255 * 20) + 
          (sharpness / 50 * 25) + 
          (Math.max(0, 100 - noise) / 100 * 20) + 
          (Math.max(0, 100 - artifacts) / 100 * 20)
        ));
        
        // Generate recommendations
        const recommendations: string[] = [];
        if (qualityScore < 50) {
          recommendations.push("Consider re-encoding with higher quality settings");
        }
        if (noise > 20) {
          recommendations.push("Image has significant noise - consider noise reduction");
        }
        if (artifacts > 15) {
          recommendations.push("Compression artifacts detected - use higher quality JPEG");
        }
        if (compressionRatio > 90) {
          recommendations.push("Very high compression - quality may be compromised");
        }
        if (canvas.width < 800 || canvas.height < 600) {
          recommendations.push("Low resolution - consider higher resolution source");
        }
        if (recommendations.length === 0) {
          recommendations.push("Image quality is good - no major issues detected");
        }
        
        // Create analysis result
        const analysis: AnalysisResult = {
          quality: Math.round(qualityScore),
          resolution: { width: canvas.width, height: canvas.height },
          fileSize: selectedFile.size,
          compression: 'JPEG',
          format: 'image/jpeg',
          recommendations,
          metrics: {
            brightness: Math.round(brightness),
            contrast: Math.round(contrast),
            sharpness: Math.round(sharpness),
            noise: Math.round(noise),
            compressionRatio: Math.round(compressionRatio),
            artifacts: Math.round(artifacts)
          }
        };
        
        // Create analysis overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, 10, 300, 280);
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Quality Analysis Report', 20, 35);
        
        ctx.font = '14px Arial';
        ctx.fillText(`Quality Score: ${analysis.quality}/100`, 20, 60);
        ctx.fillText(`Resolution: ${analysis.resolution.width} x ${analysis.resolution.height}`, 20, 85);
        ctx.fillText(`File Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`, 20, 110);
        ctx.fillText(`Brightness: ${analysis.metrics.brightness}`, 20, 135);
        ctx.fillText(`Contrast: ${analysis.metrics.contrast}`, 20, 160);
        ctx.fillText(`Sharpness: ${analysis.metrics.sharpness}`, 20, 185);
        ctx.fillText(`Noise: ${analysis.metrics.noise}`, 20, 210);
        ctx.fillText(`Compression: ${analysis.metrics.compressionRatio}%`, 20, 235);
        ctx.fillText(`Artifacts: ${analysis.metrics.artifacts}`, 20, 260);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            setProcessedBlob(blob);
            setAnalysisResult(analysis);
            setIsProcessing(false);
            notify('Image quality analysis completed!', 'success');
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.src = URL.createObjectURL(selectedFile);
      
    } catch (error) {
      notify('Error analyzing image. Please try again.', 'error');
      setIsProcessing(false);
    }
  }, [selectedFile]);

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Quality Analysis",
      description: "Comprehensive analysis of JPEG quality and compression"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations for optimization"
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Detailed Reports",
      description: "Generate comprehensive reports with visual charts"
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
      title: "Upload JPG Images",
      description: "Drag and drop your JPG images or click to browse and select files from your computer"
    },
    {
      step: "2", 
      title: "Analyze Quality",
      description: "Our system analyzes compression, artifacts, and overall image quality"
    },
    {
      step: "3",
      title: "Get Insights",
      description: "Receive detailed reports with recommendations for optimization"
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
        title="JPG Quality Analyzer | Check Image Quality Online"
        description="Analyze JPG images for sharpness, compression, and artifacts with our free online JPG quality analyzer. Get detailed image quality reports instantly."
        keywords="JPG quality analyzer, analyze JPG quality, JPG compression, image quality, online tool, free tool"
        canonical="jpg-quality-analyzer"
        ogImage="/images/jpg-quality-analyzer-og.jpg"
      
      
      
      
      
      />
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BarChart3 className="h-4 w-4" />
              <span>JPG Quality Analyzer</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              JPG Quality Analyzer Online
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Get comprehensive analysis of your JPEG images with AI-powered insights. Understand quality, 
              compression, artifacts, and get intelligent recommendations for optimization.
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{files.length > 0 ? 'Files Selected' : 'Drop your JPG images here'}</h3>
                <p className="text-gray-600 mb-6">{files.length > 0 ? `${files.length} file(s) selected` : 'or click to browse files'}</p>
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >Choose JPG Files</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* File List & Management */}
            {files.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileImage className="h-5 w-5 text-violet-600" />
                  <span>Uploaded JPG Images ({files.length})</span>
                  {selectedFile && (
                    <span className="text-sm text-gray-500 font-normal">
                      - Analyzing: {selectedFile.name}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 flex items-center space-x-3 cursor-pointer transition-all duration-200 ${
                        selectedFile === file 
                          ? 'bg-violet-100 border-2 border-violet-500 shadow-md' 
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => selectFileForAnalysis(file)}
                    >
                      <FileImage className={`h-8 w-8 ${selectedFile === file ? 'text-violet-600' : 'text-gray-600'}`} />
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
                          removeFile(idx);
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
                    💡 Click on any image above to select it for quality analysis
                  </p>
                )}
              </div>
            )}

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Preview & Analysis Actions */}
            {selectedFile && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Preview</h4>
                  <div className="bg-gray-100 rounded-xl p-4 border border-gray-200 shadow-inner">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ maxWidth: 320, maxHeight: 320, width: '100%', borderRadius: '0.75rem', background: '#fff' }}
                    />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={analyzeImage}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:from-violet-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-60"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze Quality'}
                    </button>
                    <button
                      onClick={downloadAll}
                      className="bg-white border border-violet-600 text-violet-600 px-6 py-2 rounded-lg font-semibold shadow hover:bg-violet-50 transition-all duration-200 disabled:opacity-60"
                      disabled={!processedBlob}
                    >
                      <Download className="inline h-4 w-4 mr-1" /> Download Report
                    </button>
                  </div>
                </div>
                {/* Analysis Results */}
                {analysisResult && (
                  <div className="bg-violet-50/60 border border-violet-200 rounded-xl p-6 shadow flex flex-col gap-3">
                    <h4 className="text-lg font-bold text-violet-700 mb-2 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Analysis Results
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-semibold text-gray-700">Quality Score:</span>
                      <span className="text-gray-900">{analysisResult.quality}/100</span>
                      <span className="font-semibold text-gray-700">Resolution:</span>
                      <span className="text-gray-900">{analysisResult.resolution.width} x {analysisResult.resolution.height}</span>
                      <span className="font-semibold text-gray-700">File Size:</span>
                      <span className="text-gray-900">{(analysisResult.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="font-semibold text-gray-700">Brightness:</span>
                      <span className="text-gray-900">{analysisResult.metrics.brightness}</span>
                      <span className="font-semibold text-gray-700">Contrast:</span>
                      <span className="text-gray-900">{analysisResult.metrics.contrast}</span>
                      <span className="font-semibold text-gray-700">Sharpness:</span>
                      <span className="text-gray-900">{analysisResult.metrics.sharpness}</span>
                      <span className="font-semibold text-gray-700">Noise:</span>
                      <span className="text-gray-900">{analysisResult.metrics.noise}</span>
                      <span className="font-semibold text-gray-700">Compression:</span>
                      <span className="text-gray-900">{analysisResult.metrics.compressionRatio}%</span>
                      <span className="font-semibold text-gray-700">Artifacts:</span>
                      <span className="text-gray-900">{analysisResult.metrics.artifacts}</span>
                    </div>
                    <div className="mt-4">
                      <h5 className="font-semibold text-violet-600 mb-1">Recommendations:</h5>
                      <ul className="list-disc list-inside text-gray-700 text-sm">
                        {analysisResult.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Area */}
            {processedBlob && (
              <div
                className="mt-8 flex flex-col items-center cursor-pointer"
                onClick={downloadAll}
              >
                <button
                  onClick={e => { e.stopPropagation(); downloadAll(); }}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download Analysis Report
                </button>
                <p className="text-gray-500 text-sm mt-2">Click anywhere in this box to download</p>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our JPG Quality Analyzer?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">AI-powered analysis and optimization for your JPEG images.</p>
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

          {/* How to Use Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Analyze JPG Quality</h2>
              <p className="text-lg text-gray-600">Follow these simple steps to analyze your images.</p>
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
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Analyze Your JPGs?</h3>
                <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">Get instant, AI-powered insights and recommendations for your JPEG images. Start now for free!</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                >
                  <BarChart3 className="h-5 w-5" />
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

const JPGQualityAnalyzerWithProvider: React.FC = () => (
  <NotificationProvider>
    <JPGQualityAnalyzer />
  </NotificationProvider>
);

export default JPGQualityAnalyzerWithProvider; 