import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Users, Zap, Shield, CheckCircle, Sparkles, ArrowRight, Settings, RotateCcw, AlertCircle } from 'lucide-react';
import SEO from './SEO';

const PDFFormFiller: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [fields, setFields] = useState<{ name: string, value: string, type: string, required?: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      // Automatically extract form fields on file selection
      extractFormFields(selectedFile);
    } else if (selectedFile) {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      setSuccess(null);
      extractFormFields(droppedFile);
    } else if (droppedFile) {
      setError('Please drop a valid PDF file.');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const extractFormFields = async (pdfFile: File) => {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const fileBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const form = pdfDoc.getForm();
      const formFields = form.getFields();
      
      if (formFields.length === 0) {
        setError('No fillable form fields found in this PDF. Please ensure it is a fillable PDF form.');
        setFields([]);
        return;
      }
      
      const extractedFields = formFields.map(field => {
        const fieldType = field.constructor.name;
        let value = '';
        let type = 'text';
        
        try {
          if (fieldType.includes('TextField')) {
            const textField = field as any;
            value = textField.getText() || '';
            type = 'text';
          } else if (fieldType.includes('CheckBox')) {
            const checkBox = field as any;
            value = checkBox.isChecked() ? 'true' : 'false';
            type = 'checkbox';
          } else if (fieldType.includes('RadioGroup')) {
            const radioGroup = field as any;
            value = radioGroup.getSelected() || '';
            type = 'radio';
          } else if (fieldType.includes('Dropdown')) {
            const dropdown = field as any;
            value = dropdown.getSelected() || '';
            type = 'dropdown';
          }
        } catch (err) {
          console.warn(`Could not get value for field: ${field.getName()}`);
        }
        
        return {
          name: field.getName(),
          value,
          type,
          required: false // PDF-lib doesn't expose required property, but we could add validation
        };
      });
      
      setFields(extractedFields);
      setSuccess(`Found ${extractedFields.length} form field(s).`);
      
    } catch (error) {
      console.error('Error extracting form fields:', error);
      setError('Error extracting form fields. Please ensure it is a fillable PDF.');
      setFields([]);
    }
  };

  const handleFieldChange = (index: number, value: string) => {
    setFields(prev => prev.map((field, i) => i === index ? { ...field, value } : field));
  };

  const validateForm = (): boolean => {
    const requiredFields = fields.filter(field => field.required && !field.value.trim());
    if (requiredFields.length > 0) {
      setError(`Please fill in all required fields: ${requiredFields.map(f => f.name).join(', ')}`);
      return false;
    }
    return true;
  };

  const processFile = async () => {
    if (!file) return;
    
    if (!validateForm()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { PDFDocument } = await import('pdf-lib');
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const form = pdfDoc.getForm();
      
      let filledFields = 0;
      
      // Fill form fields
      fields.forEach(field => {
        try {
          if (field.type === 'text') {
            const textField = form.getTextField(field.name);
            textField.setText(field.value);
            filledFields++;
          } else if (field.type === 'checkbox') {
            const checkBox = form.getCheckBox(field.name);
            if (field.value === 'true') {
              checkBox.check();
            } else {
              checkBox.uncheck();
            }
            filledFields++;
          } else if (field.type === 'radio') {
            const radioGroup = form.getRadioGroup(field.name);
            if (field.value) {
              radioGroup.select(field.value);
              filledFields++;
            }
          } else if (field.type === 'dropdown') {
            const dropdown = form.getDropdown(field.name);
            if (field.value) {
              dropdown.select(field.value);
              filledFields++;
            }
          }
        } catch (error) {
          console.warn(`Could not fill field: ${field.name}`, error);
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedFile(blob);
      setIsProcessing(false);
      setSuccess(`PDF form filled successfully! ${filledFields} field(s) updated.`);
      
    } catch (error) {
      console.error('Error filling PDF form:', error);
      setIsProcessing(false);
      setError('Error filling PDF form. Please try again.');
    }
  };

  const downloadFile = () => {
    if (processedFile) {
      const url = URL.createObjectURL(processedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = file?.name.replace(/\.pdf$/i, '_filled.pdf') || 'filled.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const clearForm = () => {
    setFile(null);
    setFields([]);
    setProcessedFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const features = [
    { icon: <FileText className="h-6 w-6" />, title: 'Automatic Field Detection', description: 'Automatically detects and lists all fillable form fields' },
    { icon: <Zap className="h-6 w-6" />, title: 'Easy & Fast Filling', description: 'Quickly fill out your PDF forms online' },
    { icon: <Shield className="h-6 w-6" />, title: 'Secure & Private', description: 'Files are processed in your browser, ensuring privacy' },
    { icon: <Users className="h-6 w-6" />, title: 'Free to Use', description: 'Fill PDF forms for free, no registration required' }
  ];

  const howToSteps = [
    { step: '1', title: 'Upload PDF', description: 'Select the fillable PDF form you want to complete' },
    { step: '2', title: 'Fill Form', description: 'Enter your information into the detected form fields' },
    { step: '3', title: 'Download Filled PDF', description: 'Download your completed PDF form' }
  ];

  return (
    <>
      <SEO 
        title="PDF Filler | Fill PDF Forms Online Free"
        description="Quickly fill out PDF forms online with our free PDF filler tool. Easy to use, no downloads needed, perfect for contracts, applications, and surveys."
        keywords="PDF form filler, fill PDF form, online PDF filler, fillable PDF, PDF form, free tool"
        canonical="pdf-filler"
        ogImage="/images/pdf-form-filler-og.jpg"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF Form Filler</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Fill Out PDF Forms
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Instantly</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Easily fill out your PDF forms online. Our tool automatically detects form fields, making it simple to complete and download your documents.
              </p>
            </div>

            {/* Main Tool Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-16">
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}

              {/* File Upload Area */}
              <div className="mb-8">
                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}
                
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">{success}</span>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    file ? 'border-violet-500 bg-violet-50/50' : 
                    isDragOver ? 'border-violet-400 bg-violet-50/30' :
                    'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your fillable PDF here</h3>
                  <p className="text-gray-600 mb-6">or click to browse from your computer</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                  >Choose PDF File</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Fields Section */}
              {fields.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-violet-600" />
                      <span>Detected Form Fields ({fields.length})</span>
                    </h3>
                    <button
                      onClick={clearForm}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Clear Form
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field, index) => (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.name}
                          <span className="text-xs text-gray-500 ml-2">({field.type})</span>
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => handleFieldChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder={`Enter value for ${field.name}`}
                          />
                        )}
                        
                        {field.type === 'checkbox' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value === 'true'}
                              onChange={e => handleFieldChange(index, e.target.checked ? 'true' : 'false')}
                              className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Check this box</span>
                          </div>
                        )}
                        
                        {field.type === 'radio' && (
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => handleFieldChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder={`Enter radio option for ${field.name}`}
                          />
                        )}
                        
                        {field.type === 'dropdown' && (
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => handleFieldChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder={`Enter dropdown selection for ${field.name}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processFile}
                  disabled={!file || isProcessing || fields.length === 0}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Filling Form...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Fill PDF Form</span>
                    </>
                  )}
                </button>
                {processedFile && (
                  <button
                    onClick={downloadFile}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Filled PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our PDF Form Filler?</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Smart, secure, and simple way to complete your PDF forms</p>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Fill PDF Forms</h2>
                <p className="text-lg text-gray-600">Follow these simple steps to complete your PDF forms</p>
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
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Fill Your Forms?</h2>
                  <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">Start filling out your PDF forms quickly and securely</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Filling Now</span>
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

export default PDFFormFiller; 