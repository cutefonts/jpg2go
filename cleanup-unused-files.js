import fs from 'fs';
import path from 'path';

// List of files to remove
const filesToRemove = [
  // Test files
  'test-enhanced-pdf-to-jpg.js',
  'test-pdf-to-jpg.js',
  'test-pdf-annotate.js',
  'test-pdf-crop.js',
  'test-pdf-header-footer.js',
  'test-pdf-edit-metadata.js',
  'test-pdf-remove-metadata.js',
  'test-pdf-form-filler.js',
  'test-pdf-rotator.js',
  'test-mobile-responsive.js',
  'test-image-formats.js',
  
  // Test PDF files
  'test-metadata-selective-removed.pdf',
  'test-metadata-all-removed.pdf',
  'test-metadata-original.pdf',
  'test-updated-metadata.pdf',
  'test-original-metadata.pdf',
  'test-right-alignment.pdf',
  'test-center-alignment.pdf',
  'test-left-alignment.pdf',
  'test-with-headers-footers.pdf',
  'test-multipage.pdf',
  'test-document.pdf',
  
  // Utility scripts
  'multi-format-update.js',
  'remove-console-logs.js',
  
  // Unused type definitions
  'src/psd-js.d.ts',
  'src/gifjs.d.ts',
  
  // Verification documentation
  'JPG_TO_PDF_SETTINGS_VERIFICATION.md',
  'PDF_FORM_FILLER_VERIFICATION.md',
  'PDF_EXTRACT_VERIFICATION.md',
  'TXT_TO_PDF_VERIFICATION.md',
  'SVG_CONVERSION_SETTINGS_VERIFICATION.md',
  'SVG_CONVERSION_VERIFICATION.md',
  'CSV_CONVERSION_SETTINGS_VERIFICATION.md',
  'DEPLOYMENT_GUIDE.md',
  'CLEANUP_SUMMARY.md'
];

// Directories to remove (if empty after file removal)
const dirsToCheck = [
  'server'
];

function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing ${filePath}:`, error.message);
    return false;
  }
}

function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`✅ Removed empty directory: ${dirPath}`);
        return true;
      } else {
        console.log(`⚠️  Directory not empty, keeping: ${dirPath}`);
        return false;
      }
    } else {
      console.log(`⚠️  Directory not found: ${dirPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing directory ${dirPath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Starting cleanup of unused files...\n');
  
  let removedCount = 0;
  let errorCount = 0;
  
  // Remove files
  for (const file of filesToRemove) {
    if (removeFile(file)) {
      removedCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n📁 Checking directories...\n');
  
  // Check directories
  for (const dir of dirsToCheck) {
    removeDirectory(dir);
  }
  
  console.log('\n📊 Cleanup Summary:');
  console.log(`✅ Files removed: ${removedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total files processed: ${filesToRemove.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Cleanup completed successfully!');
  } else {
    console.log('\n⚠️  Cleanup completed with some errors.');
  }
}

// Run the cleanup
main(); 