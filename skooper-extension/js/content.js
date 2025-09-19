// Content script for Skooper extension on localhost:3000
console.log('Skooper content script loaded on:', window.location.href);

class SkooperContent {
  constructor() {
    console.log('SkooperContent initializing...');
    this.setupMessageListener();
    this.injectRecorderInterface();
    this.checkForPendingUpload();
  }

  setupMessageListener() {
    // Listen for messages from background/recorder
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      console.log('Content script received message:', request.type);
      switch (request.type) {
        case 'TOGGLE_RECORDER':
          this.toggleRecorderInterface();
          break;
        case 'UPLOAD_RECORDED_VIDEO':
          await this.handleVideoUpload(request.videoData);
          break;
        case 'SHOW_UPLOAD_SUCCESS':
          this.showUploadSuccess(request.videoUrl);
          break;
      }
      return true;
    });

    // Listen for messages from the web page
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'SKOOPER_UPLOAD_REQUEST') {
        console.log('Received upload request from page');
        this.handleUploadRequest(event.data.videoBlob);
      }
    });
  }

  async checkForPendingUpload() {
    console.log('Checking for pending upload...');
    // Check if we're on the videos page and have a pending upload
    if (window.location.pathname === '/videos') {
      try {
        const data = await chrome.storage.local.get('pendingVideoUpload');
        console.log('Pending upload data:', data);
        
        if (data.pendingVideoUpload) {
          console.log('Found pending upload, processing...');
          // Wait for page to fully load and React to initialize
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              setTimeout(() => {
                this.handleVideoUpload(data.pendingVideoUpload);
              }, 2000); // Wait 2 seconds for React to mount
            });
          } else {
            // Page already loaded, wait for React to render
            setTimeout(() => {
              this.handleVideoUpload(data.pendingVideoUpload);
            }, 3000); // Wait 3 seconds for React components
          }
        } else {
          console.log('No pending upload found');
        }
      } catch (error) {
        console.error('Error checking for pending upload:', error);
      }
    }
  }

  async handleVideoUpload(videoData) {
    console.log('Starting video upload process...');
    try {
      // Get the stored video data
      const stored = await chrome.storage.local.get('pendingVideoUpload');
      if (!stored.pendingVideoUpload) {
        console.error('No pending video upload found in storage');
        return;
      }

      const uploadData = stored.pendingVideoUpload;
      console.log('Upload data retrieved:', { 
        fileName: uploadData.fileName, 
        size: uploadData.size,
        hasBase64: !!uploadData.base64data 
      });
      
      // Show upload notification
      this.showUploadProgress('Preparing upload...', 0);

      // Convert base64 back to blob
      console.log('Converting base64 to blob...');
      const base64Response = await fetch(uploadData.base64data);
      const blob = await base64Response.blob();
      console.log('Blob created:', blob.size, 'bytes');

      // Create a File object from the blob
      const file = new File([blob], uploadData.fileName, {
        type: uploadData.type || 'video/webm',
        lastModified: uploadData.timestamp
      });

      console.log('Created file object:', file.name, file.size);
      console.log('Video duration:', uploadData.duration, 'seconds');

      // Store duration metadata in localStorage for the upload handler to use
      if (uploadData.duration) {
        const metadataKey = `video-metadata-${uploadData.fileName}`;
        localStorage.setItem(metadataKey, JSON.stringify({
          duration: uploadData.duration,
          timestamp: uploadData.timestamp,
          fileName: uploadData.fileName
        }));
        console.log('Stored video metadata in localStorage:', metadataKey);
      }

      // Find the upload button on the page and trigger it
      console.log('Looking for upload input...');
      let uploadButton = document.querySelector('input[type="file"][accept="video/*"]');

      // If not found, try a broader search
      if (!uploadButton) {
        uploadButton = document.querySelector('input[type="file"]');
        console.log('Fallback: Found file input:', uploadButton);
      }

      if (uploadButton) {
        console.log('Found upload input, triggering upload...', uploadButton);

        // Create a DataTransfer object to simulate file selection
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        uploadButton.files = dataTransfer.files;

        // Trigger the change event
        const changeEvent = new Event('change', { bubbles: true });
        uploadButton.dispatchEvent(changeEvent);
        
        // Clear the pending upload
        await chrome.storage.local.remove('pendingVideoUpload');
        console.log('Cleared pending upload from storage');
        
        // Hide our upload overlay since the page's upload will take over
        setTimeout(() => {
          const overlay = document.getElementById('skooper-upload-overlay');
          if (overlay) overlay.remove();
        }, 1000);
        
      } else {
        console.error('Could not find upload input on page');
        console.log('Available inputs:', document.querySelectorAll('input'));
        console.log('Available buttons:', document.querySelectorAll('button'));
        
        // Try waiting a bit longer and search again
        console.log('Waiting 2 seconds and trying again...');
        setTimeout(async () => {
          let retryUploadButton = document.querySelector('input[type="file"]');
          if (retryUploadButton) {
            console.log('Found upload input on retry:', retryUploadButton);
            
            // Create a DataTransfer object to simulate file selection
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            retryUploadButton.files = dataTransfer.files;
            
            // Trigger the change event
            const changeEvent = new Event('change', { bubbles: true });
            retryUploadButton.dispatchEvent(changeEvent);
            
            // Clear the pending upload
            await chrome.storage.local.remove('pendingVideoUpload');
            console.log('Upload triggered on retry');
            
            // Hide overlay
            setTimeout(() => {
              const overlay = document.getElementById('skooper-upload-overlay');
              if (overlay) overlay.remove();
            }, 1000);
            
            return;
          }
          
          // Fallback: try to click the upload button to open file picker
          const uploadBtn = document.querySelector('button');
          if (uploadBtn && uploadBtn.textContent && uploadBtn.textContent.includes('Choose Video')) {
            console.log('Found upload button, storing file for manual selection');
            
            // Store the file temporarily
            window.skooperPendingFile = file;
            
            // Show instruction to user
            this.showUploadError('Please click the "Choose Video to Upload" button and the video will be automatically selected.');
            
            // Clear storage
            await chrome.storage.local.remove('pendingVideoUpload');
          } else {
            this.showUploadError('Could not find upload interface on this page. Make sure you are on the /videos page and signed in.');
            await chrome.storage.local.remove('pendingVideoUpload');
          }
        }, 2000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      this.showUploadError(error.message);
      
      // Clear the pending upload on error
      await chrome.storage.local.remove('pendingVideoUpload');
    }
  }

  injectRecorderInterface() {
    console.log('Injecting recorder interface...');
    // Only inject on videos page
    if (window.location.pathname === '/videos') {
      this.createFloatingRecorderButton();
    }
  }

  createFloatingRecorderButton() {
    // Check if button already exists
    if (document.getElementById('skooper-floating-btn')) {
      console.log('Floating button already exists');
      return;
    }

    console.log('Creating floating recorder button...');
    const button = document.createElement('div');
    button.id = 'skooper-floating-btn';
    button.innerHTML = `
      <div class="skooper-fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="currentColor"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #skooper-floating-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        cursor: pointer;
      }
      
      .skooper-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
      }
      
      .skooper-fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
      }
      
      .skooper-fab:active {
        transform: translateY(0);
      }
      
      /* Upload progress overlay */
      .skooper-upload-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .skooper-upload-modal {
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      }
      
      .skooper-upload-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .skooper-upload-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
      }
      
      .skooper-upload-message {
        font-size: 14px;
        color: #666;
        margin-bottom: 24px;
      }
      
      .skooper-progress-bar {
        width: 100%;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      
      .skooper-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
      }
      
      .skooper-progress-text {
        font-size: 14px;
        color: #667eea;
        font-weight: 600;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(button);

    // Add click handler
    button.addEventListener('click', () => {
      console.log('Floating button clicked');
      // Send message to open popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });

    console.log('Floating button created successfully');
  }

  toggleRecorderInterface() {
    const existingButton = document.getElementById('skooper-floating-btn');
    if (existingButton) {
      existingButton.remove();
    } else {
      this.createFloatingRecorderButton();
    }
  }

  showUploadProgress(message, percent = 0) {
    console.log('Showing upload progress:', message, percent);
    // Remove existing overlay
    const existing = document.getElementById('skooper-upload-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'skooper-upload-overlay';
    overlay.className = 'skooper-upload-overlay';
    overlay.innerHTML = `
      <div class="skooper-upload-modal">
        <div class="skooper-upload-icon">📤</div>
        <div class="skooper-upload-title">Uploading Video</div>
        <div class="skooper-upload-message">${message}</div>
        <div class="skooper-progress-bar">
          <div class="skooper-progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="skooper-progress-text">${Math.round(percent)}%</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Simulate progress if not provided
    if (percent === 0) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 90) {
          clearInterval(interval);
          progress = 90;
        }
        const fill = overlay.querySelector('.skooper-progress-fill');
        const text = overlay.querySelector('.skooper-progress-text');
        if (fill) fill.style.width = `${progress}%`;
        if (text) text.textContent = `${Math.round(progress)}%`;
      }, 300);
    }
  }

  showUploadSuccess(fileName) {
    console.log('Showing upload success for:', fileName);
    const overlay = document.getElementById('skooper-upload-overlay');
    if (overlay) {
      const modal = overlay.querySelector('.skooper-upload-modal');
      modal.innerHTML = `
        <div class="skooper-upload-icon">✅</div>
        <div class="skooper-upload-title">Upload Complete!</div>
        <div class="skooper-upload-message">
          Your video "${fileName}" has been uploaded successfully.
          <br><br>
          Refreshing page...
        </div>
      `;
    }
  }

  showUploadError(errorMessage) {
    console.error('Showing upload error:', errorMessage);
    const overlay = document.getElementById('skooper-upload-overlay');
    if (overlay) {
      const modal = overlay.querySelector('.skooper-upload-modal');
      modal.innerHTML = `
        <div class="skooper-upload-icon">❌</div>
        <div class="skooper-upload-title">Upload Failed</div>
        <div class="skooper-upload-message">
          ${errorMessage}
          <br><br>
          <button onclick="document.getElementById('skooper-upload-overlay').remove()" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          ">Close</button>
        </div>
      `;
    } else {
      // Create error notification if no overlay exists
      alert(`Upload failed: ${errorMessage}`);
    }
  }
}

// Initialize content script
// Simple localhost check for now
if (window.location.hostname === 'localhost' && window.location.port === '3000') {
  console.log('Initializing SkooperContent on localhost:3000');
  new SkooperContent();
} else {
  console.log('Not on localhost:3000, skipping content script initialization');
}