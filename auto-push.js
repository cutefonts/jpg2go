import { exec } from 'child_process';
import { watch } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

let isCommitting = false;
let commitTimeout = null;

async function autoCommit() {
  if (isCommitting) return;
  
  isCommitting = true;
  
  try {
    console.log('🔄 Changes detected, committing...');
    
    // Stage all changes
    await execAsync('git add -A');
    
    // Commit with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await execAsync(`git commit -m "Auto-commit: ${timestamp}"`);
    
    // Push to GitHub
    console.log('📤 Pushing to GitHub...');
    await execAsync('git push origin main');
    
    console.log('✅ Successfully pushed to GitHub!');
  } catch (error) {
    console.error('❌ Error during auto-commit:', error.message);
  } finally {
    isCommitting = false;
  }
}

function debouncedCommit() {
  if (commitTimeout) {
    clearTimeout(commitTimeout);
  }
  
  commitTimeout = setTimeout(autoCommit, 2000); // Wait 2 seconds after last change
}

console.log('👀 Watching for file changes...');
console.log('Press Ctrl+C to stop');

// Watch the src directory for changes
watch('./src', { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
    console.log(`📝 File changed: ${filename}`);
    debouncedCommit();
  }
});

// Watch the root directory for config changes
watch('./', { recursive: false }, (eventType, filename) => {
  if (filename && ['package.json', 'vite.config.ts', 'tailwind.config.js'].includes(filename)) {
    console.log(`📝 Config changed: ${filename}`);
    debouncedCommit();
  }
}); 