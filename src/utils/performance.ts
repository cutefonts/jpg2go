// Performance optimization utilities

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Optimized image processing with Web Workers
export class ImageProcessor {
  private worker: Worker | null = null;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker('/image-worker.js');
    }
  }

  // Process image with optimized canvas operations
  static async processImage(
    file: File,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          // Calculate optimal dimensions
          let { width, height } = img;
          const { maxWidth, maxHeight } = options;

          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Optimize canvas rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with optimized settings
          const quality = options.quality || 0.85;
          const format = options.format || 'jpeg';
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 
                          format === 'png' ? 'image/png' : 'image/webp';

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Batch process images with optimized memory management
  static async processBatch(
    files: File[],
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
      batchSize?: number;
    } = {}
  ): Promise<Blob[]> {
    const batchSize = options.batchSize || 3; // Process 3 images at a time
    const results: Blob[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => 
        this.processImage(file, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay to prevent blocking the main thread
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  // Clean up resources
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Memory management utilities
export class MemoryManager {
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private static cache = new Map<string, { blob: Blob; size: number; timestamp: number }>();

  static addToCache(key: string, blob: Blob) {
    const size = blob.size;
    
    // Check if adding this would exceed cache limit
    if (this.getCacheSize() + size > this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    this.cache.set(key, {
      blob,
      size,
      timestamp: Date.now()
    });
  }

  static getFromCache(key: string): Blob | null {
    const item = this.cache.get(key);
    if (item) {
      // Update timestamp for LRU
      item.timestamp = Date.now();
      return item.blob;
    }
    return null;
  }

  static removeFromCache(key: string) {
    this.cache.delete(key);
  }

  static cleanupCache() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    let currentSize = this.getCacheSize();
    const targetSize = this.MAX_CACHE_SIZE * 0.7; // Reduce to 70% of max

    for (const [key, item] of entries) {
      if (currentSize <= targetSize) break;
      
      this.cache.delete(key);
      currentSize -= item.size;
    }
  }

  private static getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((total, item) => total + item.size, 0);
  }

  static clearCache() {
    this.cache.clear();
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, number[]> = {};

  static startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.metrics[name]) {
        this.metrics[name] = [];
      }
      this.metrics[name].push(duration);
      
      // Keep only last 100 measurements
      if (this.metrics[name].length > 100) {
        this.metrics[name] = this.metrics[name].slice(-100);
      }
    };
  }

  static getAverageTime(name: string): number {
    const measurements = this.metrics[name];
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((total, time) => total + time, 0);
    return sum / measurements.length;
  }

  static getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    
    for (const [name, measurements] of Object.entries(this.metrics)) {
      result[name] = {
        average: this.getAverageTime(name),
        count: measurements.length
      };
    }
    
    return result;
  }

  static clearMetrics() {
    this.metrics = {};
  }
}

// Lazy loading utility
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
  } = {}
): () => Promise<T> {
  let cached: T | null = null;
  let loading: Promise<T> | null = null;
  const { timeout = 5000, retries = 3 } = options;

  return async (): Promise<T> => {
    if (cached) return cached;
    if (loading) return loading;

    loading = (async () => {
      let lastError: Error;
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const result = await Promise.race([
            loader(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
          
          cached = result;
          return result;
        } catch (error) {
          lastError = error as Error;
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      throw lastError!;
    })();

    return loading;
  };
}

/**
 * Load CSS file asynchronously to prevent render blocking
 */
export const loadCSSAsync = (href: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if CSS is already loaded
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) {
      resolve(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print'; // Prevent render blocking
    link.onload = () => {
      link.media = 'all'; // Apply styles after load
      resolve(true);
    };
    link.onerror = () => resolve(false);
    document.head.appendChild(link);
  });
};

/**
 * Preload critical resources
 */
export const preloadResource = (href: string, as: string, type?: string): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

/**
 * Load non-critical CSS with low priority
 */
export const loadNonCriticalCSS = (href: string): void => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
};

/**
 * Optimize font loading
 */
export const optimizeFontLoading = (fontUrl: string): void => {
  // Preload font
  preloadResource(fontUrl, 'style');
  
  // Load font with display=swap
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

/**
 * Measure and report performance metrics
 */
export const measurePerformance = (): void => {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        console.log('Performance Metrics:', {
          'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          'Load Complete': navigation.loadEventEnd - navigation.loadEventStart,
          'First Paint': paint.find(p => p.name === 'first-paint')?.startTime,
          'First Contentful Paint': paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        });
      }, 0);
    });
  }
};

/**
 * Optimize image loading
 */
export const optimizeImageLoading = (): void => {
  // Add loading="lazy" to images that are not in viewport
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });
};

/**
 * Initialize all performance optimizations
 */
export const initializePerformanceOptimizations = (): void => {
  // Measure performance
  measurePerformance();
  
  // Optimize image loading
  optimizeImageLoading();
  
  // Add intersection observer for lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });
    
    // Observe images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}; 