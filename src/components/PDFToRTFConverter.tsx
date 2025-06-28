import React, { useState, useRef, useCallback } from 'react';
import { Download, Upload, Settings, Eye, CheckCircle, Sparkles, Zap, Shield, FileText, RotateCcw, X } from 'lucide-react';
import SEO from './SEO';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import Tesseract from 'tesseract.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFToRTFConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<{ name: string, blob: Blob }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState({
    preserveFormatting: true,
    includeImages: true,
    encoding: 'utf-8',
    fontSize: 12,
    preserveFontsColors: true,
    preserveLayout: true,
    preserveTables: true,
    enableOCR: false,
  });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(event.target.files || []);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) setError('Please select valid PDF files.');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    setError(null);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) setError('Please drop valid PDF files.');
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- Advanced Feature: Font and Color Preservation ---
  // Utility: Map font names to RTF font table indices
  const getOrAddFont = (fontTable: string[], fontMap: Record<string, number>, fontName: string) => {
    // Returns the index of the font in the RTF font table, adding if new
    if (fontMap[fontName] !== undefined) return fontMap[fontName];
    fontTable.push(fontName);
    fontMap[fontName] = fontTable.length - 1;
    return fontMap[fontName];
  };
  // Utility: Map RGB color to RTF color table indices
  const getOrAddColor = (colorTable: string[], colorMap: Record<string, number>, rgb: string) => {
    // Returns the index of the color in the RTF color table, adding if new
    if (colorMap[rgb] !== undefined) return colorMap[rgb];
    colorTable.push(rgb);
    colorMap[rgb] = colorTable.length;
    return colorMap[rgb];
  };
  // Utility: Convert PDF.js color array to RTF RGB string
  const pdfColorToRtfRgb = (color: number[] | undefined) => {
    // Converts [r,g,b] in 0-1 to 'r,g,b' in 0-255
    if (!color || color.length < 3) return '0,0,0';
    return `${Math.round(color[0]*255)},${Math.round(color[1]*255)},${Math.round(color[2]*255)}`;
  };
  // Enhanced RTF content generator with font/color preservation
  const generateRTFContent = (
    textContent: any,
    settings: { preserveFormatting: boolean; preserveFontsColors: boolean; preserveLayout: boolean; preserveTables: boolean },
    fontTable: string[],
    fontMap: Record<string, number>,
    colorTable: string[],
    colorMap: Record<string, number>
  ) => {
    let rtfContent = '';
    if (settings.preserveLayout) {
      const lines = groupTextItemsByLine(textContent.items);
      // --- Table output if enabled and table detected ---
      if (settings.preserveTables) {
        const { xPositions, tableRows } = detectTableRows(lines);
        if (xPositions.length > 1) {
          // Output as RTF table
          tableRows.forEach(row => {
            rtfContent += '\\trowd ';
            row.forEach(cell => {
              rtfContent += cell ? (() => {
                let text = cell.str;
                text = text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par ');
                let runPrefix = '';
                let runSuffix = '';
                if (settings.preserveFontsColors) {
                  const fontName = cell.fontName || 'Times New Roman';
                  const fontIdx = getOrAddFont(fontTable, fontMap, fontName);
                  runPrefix += `\\f${fontIdx} `;
                  const rgb = pdfColorToRtfRgb(cell.color);
                  const colorIdx = getOrAddColor(colorTable, colorMap, rgb);
                  runPrefix += `\\cf${colorIdx} `;
                }
      if (settings.preserveFormatting) {
                  if (cell.fontName && cell.fontName.includes('Bold')) runPrefix += '\\b ';
                  if (cell.fontName && cell.fontName.includes('Italic')) runPrefix += '\\i ';
                  if (cell.fontName && cell.fontName.includes('Underline')) runPrefix += '\\ul ';
                  if (cell.fontName && (cell.fontName.includes('Bold') || cell.fontName.includes('Italic') || cell.fontName.includes('Underline'))) runSuffix += ' \\b0\\i0\\ul0';
                }
                return `${runPrefix}${text}${runSuffix} \\cell `;
              })() : '\\cell ';
            });
            rtfContent += '\\row ';
          });
          return rtfContent;
        }
      }
      // --- End Table output ---
      // Fallback: line grouping
      lines.forEach((line, idx) => {
        let lineText = '';
        line.items.forEach((item: any) => {
          let text = item.str;
          text = text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par ');
          let runPrefix = '';
          let runSuffix = '';
          if (settings.preserveFontsColors) {
            const fontName = item.fontName || 'Times New Roman';
            const fontIdx = getOrAddFont(fontTable, fontMap, fontName);
            runPrefix += `\\f${fontIdx} `;
            const rgb = pdfColorToRtfRgb(item.color);
            const colorIdx = getOrAddColor(colorTable, colorMap, rgb);
            runPrefix += `\\cf${colorIdx} `;
          }
          if (settings.preserveFormatting) {
            if (item.fontName && item.fontName.includes('Bold')) runPrefix += '\\b ';
            if (item.fontName && item.fontName.includes('Italic')) runPrefix += '\\i ';
            if (item.fontName && item.fontName.includes('Underline')) runPrefix += '\\ul ';
            if (item.fontName && (item.fontName.includes('Bold') || item.fontName.includes('Italic') || item.fontName.includes('Underline'))) runSuffix += ' \\b0\\i0\\ul0';
          }
          lineText += `${runPrefix}${text}${runSuffix}`;
        });
        rtfContent += lineText;
        if (idx < lines.length - 1) rtfContent += '\\line ';
      });
    } else {
      // Fallback: flat output
      textContent.items.forEach((item: any) => {
        let text = item.str;
        text = text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par ');
        let runPrefix = '';
        let runSuffix = '';
        if (settings.preserveFontsColors) {
          const fontName = item.fontName || 'Times New Roman';
          const fontIdx = getOrAddFont(fontTable, fontMap, fontName);
          runPrefix += `\\f${fontIdx} `;
          const rgb = pdfColorToRtfRgb(item.color);
          const colorIdx = getOrAddColor(colorTable, colorMap, rgb);
          runPrefix += `\\cf${colorIdx} `;
        }
        if (settings.preserveFormatting) {
          if (item.fontName && item.fontName.includes('Bold')) runPrefix += '\\b ';
          if (item.fontName && item.fontName.includes('Italic')) runPrefix += '\\i ';
          if (item.fontName && item.fontName.includes('Underline')) runPrefix += '\\ul ';
          if (item.fontName && (item.fontName.includes('Bold') || item.fontName.includes('Italic') || item.fontName.includes('Underline'))) runSuffix += ' \\b0\\i0\\ul0';
        }
        rtfContent += `${runPrefix}${text}${runSuffix}`;
      });
    }
    return rtfContent;
  };
  // --- End Advanced Feature: Font and Color Preservation ---

  // --- Advanced Feature: Layout Preservation ---
  // Utility: Group text items into lines based on y-position (tolerance for line grouping)
  const groupTextItemsByLine = (items: any[], yTolerance = 2) => {
    // Sort items by y (descending, PDF.js origin is bottom-left)
    const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
    const lines: { y: number, items: any[] }[] = [];
    sorted.forEach(item => {
      const y = item.transform[5];
      let line = lines.find(l => Math.abs(l.y - y) < yTolerance);
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    });
    // Sort items in each line by x (left to right)
    lines.forEach(line => line.items.sort((a, b) => a.transform[4] - b.transform[4]));
    // Sort lines by y (top to bottom)
    lines.sort((a, b) => b.y - a.y);
    return lines;
  };
  // --- End Advanced Feature: Layout Preservation ---

  const extractImagesFromPage = async (page: any): Promise<string[]> => {
    const images: string[] = [];
    const opList = await page.getOperatorList();
    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;
    for (let i = 0; i < fnArray.length; i++) {
      if (
        fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
        fnArray[i] === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        const objId = argsArray[i][0];
        const img = await page.objs.get(objId);
        if (img && img.data) {
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.createImageData(img.width, img.height);
            imageData.data.set(img.data);
            ctx.putImageData(imageData, 0, 0);
            // Get PNG data URL
            const dataUrl = canvas.toDataURL('image/png');
            images.push(dataUrl);
          }
        }
      }
    }
    return images;
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setPreviewText(null);
    setImageWarning(null);
    try {
      const processed: { name: string, blob: Blob }[] = [];
      for (const [fileIdx, file] of files.entries()) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          // --- Font and color tables ---
          let fontTable: string[] = ['Times New Roman'];
          let fontMap: Record<string, number> = { 'Times New Roman': 0 };
          let colorTable: string[] = ['0,0,0'];
          let colorMap: Record<string, number> = { '0,0,0': 1 };
          let rtfContent = '';
          let foundImages = false;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            if (pageNum > 1) rtfContent += '\\page ';
            if (textContent.items.length === 0 && settings.enableOCR) {
              // If page has no text items and OCR is enabled, use Tesseract.js to OCR the page image
              const images = await extractImagesFromPage(page);
              if (images.length > 0) {
                setImageWarning('OCR was used for one or more scanned pages. Results may be less accurate.');
                for (const imgDataUrl of images) {
                  try {
                    const result = await Tesseract.recognize(imgDataUrl, 'eng');
                    let ocrText = result.data.text || '';
                    ocrText = ocrText.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par ');
                    rtfContent += ocrText + '\\par ';
                  } catch (err) {
                    rtfContent += '\\par [OCR failed] \\par ';
            }
                }
              }
            } else if (textContent.items.length === 0) {
              // If page has no text items and OCR is not enabled, embed image as before
              const images = await extractImagesFromPage(page);
              for (const imgDataUrl of images) {
                const base64 = imgDataUrl.split(',')[1];
                const binary = atob(base64);
                let hex = '';
                for (let i = 0; i < binary.length; i++) {
                  hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
                }
                rtfContent += `\\par \\pict\\pngblip\\picwgoal${300*15}\\pichgoal${200*15} ${hex} \\par `;
              }
            } else {
              rtfContent += generateRTFContent(
                textContent,
                settings,
                fontTable,
                fontMap,
                colorTable,
                colorMap
              );
            rtfContent += '\\par ';
              // --- Image embedding ---
              if (settings.includeImages) {
                const images = await extractImagesFromPage(page);
                for (const imgDataUrl of images) {
                  const base64 = imgDataUrl.split(',')[1];
                  const binary = atob(base64);
                  let hex = '';
                  for (let i = 0; i < binary.length; i++) {
                    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
                  }
                  rtfContent += `\\par \\pict\\pngblip\\picwgoal${300*15}\\pichgoal${200*15} ${hex} \\par `;
                }
              } else {
                const images = await extractImagesFromPage(page);
                if (images.length > 0) foundImages = true;
              }
              if (fileIdx === 0 && pageNum === 1) setPreviewText(textContent.items.map((item: any) => item.str).join(' '));
            }
            if (fileIdx === 0 && pageNum === 1 && textContent.items.length === 0) setImageWarning('This PDF contains scanned text, but image embedding is disabled. Enable "Include Images" to embed them in the RTF.');
          }
          if (foundImages && !settings.includeImages) setImageWarning('This PDF contains images, but image embedding is disabled. Enable "Include Images" to embed them in the RTF.');
          // --- Build RTF header with font/color tables ---
          let rtfHeader = '{\\rtf1\\ansi\\deff0 ';
          // Font table
          rtfHeader += '{\\fonttbl ' + fontTable.map((f, i) => `{\\f${i} ${f};}`).join('') + '}';
          // Color table
          rtfHeader += '{\\colortbl ;' + colorTable.map(rgb => {
            const [r,g,b] = rgb.split(',');
            return `\\red${r}\\green${g}\\blue${b};`;
          }).join('') + '}';
          // Font size
          rtfHeader += `\\f0\\fs${settings.fontSize * 2} `;
          // ---
          let fullRtf = rtfHeader + rtfContent + '}';
          let rtfBlob: Blob;
          if (settings.encoding === 'utf-8') {
            rtfBlob = new Blob([new TextEncoder().encode(fullRtf)], { type: 'application/rtf' });
          } else if (settings.encoding === 'utf-16') {
            const utf16le = new Uint8Array(fullRtf.length * 2);
            for (let i = 0; i < fullRtf.length; i++) {
              const code = fullRtf.charCodeAt(i);
              utf16le[i * 2] = code & 0xff;
              utf16le[i * 2 + 1] = code >> 8;
            }
            rtfBlob = new Blob([utf16le], { type: 'application/rtf' });
          } else if (settings.encoding === 'latin1') {
            const latin1 = new Uint8Array(fullRtf.length);
            for (let i = 0; i < fullRtf.length; i++) {
              latin1[i] = fullRtf.charCodeAt(i) & 0xff;
            }
            rtfBlob = new Blob([latin1], { type: 'application/rtf' });
          } else {
            rtfBlob = new Blob([new TextEncoder().encode(fullRtf)], { type: 'application/rtf' });
          }
          processed.push({ name: file.name.replace(/\.pdf$/i, '.rtf'), blob: rtfBlob });
        } catch (error) {
          setError(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setProcessedFiles(processed);
      if (processed.length === 0) setError('No files were successfully processed.');
    } catch (error) {
      setError('Error converting PDF files to RTF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFiles = async () => {
    if (processedFiles.length === 0) {
      alert('No processed files to download');
      return;
    }
    if (processedFiles.length === 1) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(processedFiles[0].blob);
      link.download = processedFiles[0].name;
      link.click();
    } else {
      // Download all as ZIP
      const zip = new JSZip();
      processedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'converted-rtfs.zip';
      link.click();
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stats = [
    { label: 'Rich Text Format', value: 'RTF Standard', icon: <FileText className="h-5 w-5" /> },
    { label: 'Format Preservation', value: 'Text & Layout', icon: <Shield className="h-5 w-5" /> },
    { label: 'Word Compatible', value: 'Microsoft Office', icon: <Zap className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Rich Text Format Output',
      description: 'Convert PDF documents to RTF format with preserved formatting, fonts, and text styling for easy editing.',
      icon: <FileText className="h-6 w-6" />
    },
    {
      title: 'Format Preservation',
      description: 'Maintain original document formatting including fonts, colors, bold, italic, and paragraph styles.',
      icon: <Settings className="h-6 w-6" />
    },
    {
      title: 'Image Integration',
      description: 'Include and preserve images from PDF documents in the converted RTF files for complete document integrity.',
      icon: <Eye className="h-6 w-6" />
    },
    {
      title: 'Word Processor Compatibility',
      description: 'Generate RTF files that are perfectly compatible with Microsoft Word, LibreOffice, and other word processors.',
      icon: <Sparkles className="h-6 w-6" />
    }
  ];

  const howToSteps = [
    {
      step: 1,
      title: 'Upload PDF Files',
      description: 'Drag and drop your PDF files or click to browse. Works best with text-based PDFs and documents.'
    },
    {
      step: 2,
      title: 'Configure RTF Settings',
      description: 'Choose formatting preservation, image inclusion, table extraction, and encoding options for your RTF output.'
    },
    {
      step: 3,
      title: 'Process & Convert',
      description: 'Click process to convert your PDFs to RTF format with preserved formatting and styling.'
    },
    {
      step: 4,
      title: 'Download RTF Files',
      description: 'Download your RTF files ready for editing in Microsoft Word, LibreOffice, or any compatible word processor.'
    }
  ];

  // --- Advanced Feature: Table Detection ---
  // Utility: Attempt to group lines into table rows/columns by x/y alignment
  const detectTableRows = (lines: { y: number, items: any[] }[], xTolerance = 10) => {
    // Find unique x positions (column anchors)
    const xPositions: number[] = [];
    lines.forEach(line => {
      line.items.forEach(item => {
        const x = item.transform[4];
        if (!xPositions.some(px => Math.abs(px - x) < xTolerance)) xPositions.push(x);
      });
    });
    xPositions.sort((a, b) => a - b);
    // Build table rows: each line becomes a row, each cell is closest x anchor
    const tableRows = lines.map(line => {
      const cells = xPositions.map(() => null as null | any);
      line.items.forEach(item => {
        const x = item.transform[4];
        const colIdx = xPositions.findIndex(px => Math.abs(px - x) < xTolerance);
        if (colIdx !== -1) cells[colIdx] = item;
      });
      return cells;
    });
    return { xPositions, tableRows };
  };
  // --- End Advanced Feature: Table Detection ---

  return (
    <>
      <SEO
        title="PDF to RTF | Free Online PDF to RTF Converter"
        description="Convert your PDFs to RTF files for seamless editing in any word processor. Fast, reliable, and free online PDF to RTF converter."
        keywords="PDF to RTF, convert PDF to RTF, PDF to Rich Text Format, online tool, free tool"
        canonical="pdf-to-rtf"
        ogImage="/images/pdf-to-rtf-converter-og.jpg"
      
      
      
      
      
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                <span>PDF to RTF Converter</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Free PDF to RTF Converter
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Convert PDF documents to RTF format with preserved formatting, fonts, and styling. 
                Perfect for document editing, word processing, and text formatting workflows.
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
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    dragActive ? 'border-violet-500 bg-violet-50/50' : files.length > 0 ? 'border-violet-500 bg-violet-50/50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleDropZoneClick}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here for RTF conversion
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click anywhere to browse files from your computer
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  >
                    Choose PDF Files
                  </label>
                </div>
                {error && (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
                )}
                {previewText && (
                  <div className="mt-4 p-4 bg-blue-50 text-blue-900 rounded-lg max-h-40 overflow-y-auto text-xs">
                    <strong>Preview (first page text):</strong>
                    <div>{previewText}</div>
                  </div>
                )}
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">✓ {files.length} PDF file(s) selected</p>
                  </div>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Files</h3>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Settings */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">RTF Conversion Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Encoding
                      <span className="ml-1 text-xs text-gray-400" title="UTF-8 is recommended. UTF-16 and Latin-1 are for compatibility with legacy editors.">?</span>
                    </label>
                    <select
                      value={settings.encoding}
                      onChange={(e) => setSettings({...settings, encoding: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      title="UTF-8 is recommended. UTF-16 and Latin-1 are for compatibility with legacy editors."
                    >
                      <option value="utf-8">UTF-8</option>
                      <option value="utf-16">UTF-16</option>
                      <option value="latin1">Latin-1</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Size: {settings.fontSize}pt
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="72"
                      value={settings.fontSize}
                      onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.preserveFormatting}
                      onChange={e => setSettings({...settings, preserveFormatting: e.target.checked})}
                      className="mr-2"
                    />
                    Preserve Formatting
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.includeImages}
                      onChange={e => setSettings({...settings, includeImages: e.target.checked})}
                      className="mr-2"
                    />
                    Include Images (PNG, JPEG)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.preserveFontsColors}
                      onChange={e => setSettings({...settings, preserveFontsColors: e.target.checked})}
                      className="mr-2"
                    />
                    Preserve Fonts and Colors
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.preserveLayout}
                      onChange={e => setSettings({...settings, preserveLayout: e.target.checked})}
                      className="mr-2"
                    />
                    Preserve Layout (line breaks)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.preserveTables}
                      onChange={e => setSettings({...settings, preserveTables: e.target.checked})}
                      className="mr-2"
                    />
                    Preserve Tables (experimental)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.enableOCR}
                      onChange={e => setSettings({...settings, enableOCR: e.target.checked})}
                      className="mr-2"
                    />
                    Enable OCR for scanned PDFs (Tesseract.js)
                  </label>
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
                      <span>Converting to RTF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Convert to RTF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={clearFiles}
                  className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>

              {/* Download */}
              {processedFiles.length > 0 && (
                <div className="mt-8 text-center flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={downloadFiles}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="h-5 w-5" />
                    <span>{processedFiles.length > 1 ? 'Download All as ZIP' : 'Download RTF File'}</span>
                  </button>
                  {processedFiles.length > 1 && (
                    <div className="flex flex-col gap-2">
                      {processedFiles.map((file, idx) => (
                        <button
                          key={file.name}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(file.blob);
                            link.download = file.name;
                            link.click();
                          }}
                          className="bg-white border border-green-600 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-all duration-200 flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download {file.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Why Choose Our PDF to RTF Converter?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Rich text conversion with preserved formatting and editing capabilities
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
                  How to Convert PDF to RTF
                </h2>
                <p className="text-lg text-gray-600">
                  Follow these simple steps to convert your PDF documents to RTF format
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
                    Ready to Convert PDF to RTF?
                  </h3>
                  <p className="text-violet-100 mb-8 text-lg max-w-2xl mx-auto">
                    Transform your PDF documents into editable RTF files. Join thousands of users 
                    who trust our tool for document conversion and editing.
                  </p>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-white text-violet-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                  >
                    <FileText className="h-5 w-5" />
                    <span>Start Converting Now</span>
                  </button>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              </div>
            </div>

            {imageWarning && (
              <div className="mt-4 p-4 bg-yellow-100 text-yellow-900 rounded-lg">{imageWarning}</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default PDFToRTFConverter; 