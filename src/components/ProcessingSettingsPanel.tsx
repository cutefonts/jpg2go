import React from 'react';
import { Settings, Palette, RotateCw, Sparkles, Play, Download } from 'lucide-react';

const tabs = [
  { id: 'basic', label: 'Basic', icon: Settings },
  { id: 'filters', label: 'Filters', icon: Palette },
  { id: 'transform', label: 'Transform', icon: RotateCw },
  { id: 'advanced', label: 'Advanced', icon: Sparkles }
];

interface ProcessingSettings {
  format: string;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sharpen: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  removeBackground: boolean;
  addWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
}

interface ProcessingSettingsPanelProps {
  settings: ProcessingSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProcessingSettings>>;
  activeTab: 'basic' | 'filters' | 'transform' | 'advanced';
  setActiveTab: React.Dispatch<React.SetStateAction<'basic' | 'filters' | 'transform' | 'advanced'>>;
  onConvertAll?: () => void;
  onDownloadAll?: () => void;
  disableConvertAll?: boolean;
  disableDownloadAll?: boolean;
}

const ProcessingSettingsPanel: React.FC<ProcessingSettingsPanelProps> = ({
  settings,
  setSettings,
  activeTab,
  setActiveTab,
  onConvertAll,
  onDownloadAll,
  disableConvertAll,
  disableDownloadAll
}) => {
  const updateSettings = (newSettings: Partial<ProcessingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Dynamic card padding: full width for filters, normal for others
  const cardPadding = activeTab === 'filters' ? 'pt-7 pb-7 px-0' : 'p-7';

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl mb-4 border border-gray-100 max-w-full ${cardPadding}`}>
      {/* Mobile-Optimized Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-2 px-4 sm:px-7 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
          <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Processing Settings</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onConvertAll}
            disabled={disableConvertAll}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <Play className="h-4 w-4" /> Convert All
          </button>
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={disableDownloadAll}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base bg-green-400 text-white shadow hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <Download className="h-4 w-4" /> Download All
          </button>
        </div>
      </div>
      
      {/* Mobile-Optimized Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-gray-200 mb-4 px-4 sm:px-7 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-1 px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base border-b-2 transition-all duration-150 whitespace-nowrap touch-manipulation ${isActive ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-violet-600'}`}
              onClick={() => setActiveTab(tab.id as any)}
              type="button"
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-violet-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Mobile-Optimized Controls Grid */}
      {activeTab === 'filters' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full px-4 sm:px-0" style={{ paddingLeft: '15px', paddingRight: '10px' }}>
          {/* Brightness */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Brightness: {settings.brightness}</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.brightness}
              onChange={e => updateSettings({ brightness: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>Dark</span>
              <span>Bright</span>
            </div>
          </div>
          {/* Contrast */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contrast: {settings.contrast}</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.contrast}
              onChange={e => updateSettings({ contrast: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
          {/* Saturation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Saturation: {settings.saturation}</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.saturation}
              onChange={e => updateSettings({ saturation: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>Muted</span>
              <span>Vivid</span>
            </div>
          </div>
          {/* Hue */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hue: {settings.hue}&deg;</label>
            <input
              type="range"
              min="-180"
              max="180"
              value={settings.hue}
              onChange={e => updateSettings({ hue: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>-180&deg;</span>
              <span>+180&deg;</span>
            </div>
          </div>
          {/* Blur */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Blur: {settings.blur}px</label>
            <input
              type="range"
              min="0"
              max="20"
              value={settings.blur}
              onChange={e => updateSettings({ blur: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>Sharp</span>
              <span>Blurred</span>
            </div>
          </div>
          {/* Sharpen */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sharpen: {settings.sharpen}</label>
            <input
              type="range"
              min="0"
              max="10"
              value={settings.sharpen}
              onChange={e => updateSettings({ sharpen: Number(e.target.value) })}
              className="w-full h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
              style={{ accentColor: '#8b5cf6', height: '8px' }}
            />
            <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
              <span>None</span>
              <span>Sharp</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 relative px-4 sm:px-0">
          {/* Left Column */}
          <div className="space-y-6">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start">
                {/* Output Format */}
                <div className="flex flex-col sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Output Format</label>
                  <select
                    value={settings.format}
                    onChange={e => updateSettings({ format: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 text-gray-900 font-medium text-sm sm:text-base touch-manipulation"
                  >
                    <optgroup label="Web Formats">
                      <option value="jpeg">JPEG - Best for photos</option>
                      <option value="png">PNG - Best for graphics with transparency</option>
                      <option value="webp">WebP - Modern format with excellent compression</option>
                      <option value="avif">AVIF - Next-gen format with superior compression</option>
                    </optgroup>
                    <optgroup label="Professional Formats">
                      <option value="tiff">TIFF - High-quality professional format</option>
                      <option value="bmp">BMP - Uncompressed bitmap format</option>
                      <option value="gif">GIF - Animated images and simple graphics</option>
                    </optgroup>
                    <optgroup label="Specialized Formats">
                      <option value="ico">ICO - Windows icon format</option>
                      <option value="svg">SVG - Scalable vector graphics</option>
                      <option value="heic">HEIC - High Efficiency Image Format</option>
                      <option value="tga">TGA - Targa format for gaming</option>
                    </optgroup>
                    <optgroup label="Print Formats">
                      <option value="pdf">PDF - Portable Document Format</option>
                      <option value="eps">EPS - Encapsulated PostScript</option>
                    </optgroup>
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    {settings.format === 'jpeg' && 'Lossy compression, small file size, widely supported'}
                    {settings.format === 'png' && 'Lossless compression, supports transparency'}
                    {settings.format === 'webp' && 'Modern format, excellent compression, transparency support'}
                    {settings.format === 'avif' && 'Next-generation format, superior compression'}
                    {settings.format === 'tiff' && 'High quality, lossless, professional use'}
                    {settings.format === 'bmp' && 'Uncompressed, large file size, universal compatibility'}
                    {settings.format === 'gif' && 'Supports animation, limited colors, transparency'}
                    {settings.format === 'ico' && 'Windows icon format, multiple sizes'}
                    {settings.format === 'svg' && 'Vector format, scalable, small file size'}
                    {settings.format === 'heic' && 'Apple format, high efficiency, iOS/macOS'}
                    {settings.format === 'tga' && 'Gaming format, supports alpha channel'}
                    {settings.format === 'pdf' && 'Document format, print-ready, multi-page'}
                    {settings.format === 'eps' && 'PostScript format, print industry standard'}
                  </div>
                </div>
                {/* Quality + Slider + Checkbox */}
                <div className="flex flex-col sm:col-span-2">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                      <span>Quality</span>
                      <span className="text-violet-600 font-bold">{settings.quality}%</span>
                    </label>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 mr-2">Low</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.quality}
                        onChange={e => updateSettings({ quality: Number(e.target.value) })}
                        className="flex-1 h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
                        style={{ accentColor: '#8b5cf6', height: '8px' }}
                      />
                      <span className="text-xs text-gray-400 ml-2">High</span>
                    </div>
                  </div>
                  <div className="flex items-center mt-3 sm:mt-4">
                    <input
                      type="checkbox"
                      checked={settings.maintainAspectRatio}
                      onChange={e => updateSettings({ maintainAspectRatio: e.target.checked })}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-700">Maintain Aspect Ratio</label>
                  </div>
                </div>
                {/* Width */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Width (px)</label>
                  <input
                    type="number"
                    value={String(settings.width ?? '')}
                    onChange={e => updateSettings({ width: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 text-gray-900 font-medium text-sm sm:text-base touch-manipulation"
                    placeholder="Auto"
                  />
                </div>
                {/* Height */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Height (px)</label>
                  <input
                    type="number"
                    value={String(settings.height ?? '')}
                    onChange={e => updateSettings({ height: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 text-gray-900 font-medium text-sm sm:text-base touch-manipulation"
                    placeholder="Auto"
                  />
                </div>
              </div>
            )}
            {activeTab === 'transform' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start">
                {/* Rotation */}
                <div className="flex flex-col sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rotation (degrees)</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 mr-2">-180</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={settings.rotation}
                      onChange={e => updateSettings({ rotation: Number(e.target.value) })}
                      className="flex-1 h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
                      style={{ accentColor: '#8b5cf6', height: '8px' }}
                    />
                    <span className="text-xs text-gray-400 ml-2">180</span>
                  </div>
                </div>
                {/* Flip checkboxes */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.flipHorizontal}
                      onChange={e => updateSettings({ flipHorizontal: e.target.checked })}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-700">Flip Horizontal</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.flipVertical}
                      onChange={e => updateSettings({ flipVertical: e.target.checked })}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-700">Flip Vertical</label>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'advanced' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start">
                {/* Remove Background and Add Watermark checkboxes */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.removeBackground}
                      onChange={e => updateSettings({ removeBackground: e.target.checked })}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-700">Remove Background</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.addWatermark}
                      onChange={e => updateSettings({ addWatermark: e.target.checked })}
                      className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-700">Add Watermark</label>
                  </div>
                </div>
                {/* Watermark Text and Opacity (if enabled) */}
                {settings.addWatermark && (
                  <>
                    <div className="flex flex-col sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Watermark Text</label>
                      <input
                        type="text"
                        value={settings.watermarkText}
                        onChange={e => updateSettings({ watermarkText: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 text-gray-900 font-medium text-sm sm:text-base touch-manipulation"
                        placeholder="Enter watermark text"
                      />
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                        <span>Watermark Opacity</span>
                        <span className="text-violet-600 font-bold">{settings.watermarkOpacity}%</span>
                      </label>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-2">Low</span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={settings.watermarkOpacity}
                          onChange={e => updateSettings({ watermarkOpacity: Number(e.target.value) })}
                          className="flex-1 h-3 sm:h-2 rounded-lg appearance-none accent-violet-600 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 touch-manipulation"
                          style={{ accentColor: '#8b5cf6', height: '8px' }}
                        />
                        <span className="text-xs text-gray-400 ml-2">High</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Vertical Divider and Right Column */}
          <div className="flex flex-col items-start sm:items-end justify-start lg:pl-8 lg:col-span-1 mt-6 lg:mt-0">
            {activeTab === 'basic' && (
              <div className="flex items-center gap-2 w-full sm:justify-end">
                <input
                  type="checkbox"
                  checked={settings.maintainAspectRatio}
                  onChange={e => updateSettings({ maintainAspectRatio: e.target.checked })}
                  className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 touch-manipulation"
                />
                <label className="text-sm font-semibold text-gray-700">Maintain Aspect Ratio</label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingSettingsPanel; 