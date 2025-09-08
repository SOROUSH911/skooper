// Background service worker for Skooper extension
console.log('Skooper background script loaded');

class SkooperRecorder {
  constructor() {
    this.isRecording = false;
    this.recordingTabId = null;
    this.recordedChunks = [];
    this.setupEventListeners();
    console.log('SkooperRecorder initialized');
  }

  setupEventListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Background received message:', request.type);
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension icon click
    chrome.action.onClicked.addListener(() => {
      console.log('Extension icon clicked');
      chrome.action.openPopup();
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'START_RECORDING':
          console.log('Starting recording with options:', request.options);
          await this.startRecording(request.options, sendResponse);
          break;
        
        case 'STOP_RECORDING':
          console.log('Stopping recording');
          await this.stopRecording(sendResponse);
          break;
        
        case 'GET_RECORDING_STATUS':
          sendResponse({ isRecording: this.isRecording });
          break;

        case 'UPLOAD_VIDEO_BLOB':
          console.log('Uploading video blob');
          await this.uploadVideoBlob(request.blob, request.fileName, sendResponse);
          break;

        case 'RECORDING_CANCELLED':
          console.log('Recording cancelled');
          this.isRecording = false;
          this.recordingTabId = null;
          break;

        default:
          console.warn('Unknown message type:', request.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async startRecording(options, sendResponse) {
    try {
      if (this.isRecording) {
        throw new Error('Recording already in progress');
      }

      if (options.recordingType === 'tab') {
        console.log('Starting tab recording');
        // Record current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
          throw new Error('No active tab found');
        }

        const tab = tabs[0];
        this.recordingTabId = tab.id;

        // Create offscreen document for recording
        await this.createOffscreenForRecording(tab.id, options);
        
        this.isRecording = true;
        sendResponse({ success: true, message: 'Tab recording started' });

      } else {
        console.log('Starting screen recording');
        
        // For screen recording, we need to handle it differently
        // First create the recorder tab, then it will request desktop capture
        const recorderTab = await chrome.tabs.create({
          url: chrome.runtime.getURL('html/recorder.html?mode=screen'),
          active: true  // Make it active so user can see the recording
        });

        console.log('Created recorder tab for screen recording:', recorderTab.id);
        this.recordingTabId = recorderTab.id;
        
        // Store the recording options
        await chrome.storage.session.set({
          recordingOptions: options,
          recordingType: 'screen'
        });
        
        this.isRecording = true;
        sendResponse({ success: true, message: 'Screen recording setup started' });
      }
    } catch (error) {
      console.error('Start recording error:', error);
      sendResponse({ error: error.message });
    }
  }

  async createOffscreenForRecording(tabId, options) {
    console.log('Creating offscreen for tab recording');
    // For tab recording, we'll use tab capture API
    try {
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId
      });

      console.log('Got tab capture stream ID:', streamId);

      // Store the stream ID for the recording tab to use
      await chrome.storage.session.set({
        recordingStreamId: streamId,
        recordingOptions: options,
        recordingType: 'tab'
      });

      // Open a new tab with our recorder page
      const recorderTab = await chrome.tabs.create({
        url: chrome.runtime.getURL('html/recorder.html'),
        active: false
      });

      console.log('Created recorder tab:', recorderTab.id);
      this.recordingTabId = recorderTab.id;
    } catch (error) {
      console.error('Error creating offscreen recording:', error);
      throw error;
    }
  }

  async createRecordingTab(streamId, options) {
    console.log('Creating recording tab with stream ID:', streamId);
    // Store the stream ID for the recording tab to use
    await chrome.storage.session.set({
      recordingStreamId: streamId,
      recordingOptions: options,
      recordingType: 'screen'
    });

    // Open a new tab with our recorder page
    const recorderTab = await chrome.tabs.create({
      url: chrome.runtime.getURL('html/recorder.html'),
      active: false
    });

    console.log('Created recorder tab:', recorderTab.id);
    this.recordingTabId = recorderTab.id;
  }

  async stopRecording(sendResponse) {
    try {
      if (!this.isRecording) {
        throw new Error('No recording in progress');
      }

      console.log('Sending stop message to recorder tab:', this.recordingTabId);
      // Send stop message to recorder tab
      if (this.recordingTabId) {
        try {
          await chrome.tabs.sendMessage(this.recordingTabId, { 
            type: 'STOP_RECORDING' 
          });
        } catch (error) {
          console.warn('Could not send stop message to recorder tab:', error);
          // Tab might have been closed already
        }
      }

      this.isRecording = false;
      sendResponse({ success: true, message: 'Recording stopped' });

    } catch (error) {
      console.error('Stop recording error:', error);
      sendResponse({ error: error.message });
    }
  }

  async uploadVideoBlob(blob, fileName, sendResponse) {
    try {
      console.log('Processing video upload:', fileName);
      // Create form data with the blob
      const timestamp = Date.now();
      const videoFileName = fileName || `recording-${timestamp}.webm`;
      
      // We need to pass the blob data to a content script or make the upload directly
      // For now, we'll store it and open the upload page
      const blobUrl = URL.createObjectURL(blob);
      
      await chrome.storage.local.set({
        pendingUpload: {
          blobUrl,
          fileName: videoFileName,
          timestamp,
          size: blob.size
        }
      });

      console.log('Stored pending upload, opening videos page');
      // Open localhost:3000 to handle the upload
      chrome.tabs.create({
        url: 'http://localhost:3000/videos?upload=pending'
      });

      sendResponse({ 
        success: true, 
        message: 'Opening upload page...'
      });

    } catch (error) {
      console.error('Upload error:', error);
      sendResponse({ error: error.message });
    }
  }
}

// Initialize the recorder
const recorder = new SkooperRecorder();

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  if (details.reason === 'install') {
    console.log('Skooper extension installed');
    // Set default settings
    chrome.storage.sync.set({
      includeCamera: true,
      includeAudio: true,
      recordingQuality: 'high'
    });
  }
});

// Clean up storage on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, clearing session storage');
  chrome.storage.session.clear();
});