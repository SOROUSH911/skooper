// Recorder page script - handles actual recording
console.log('Recorder page loaded');

class RecorderPage {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.startTime = null;
    this.timerInterval = null;
    
    this.setupEventListeners();
    this.initializeRecording();
  }

  async requestDesktopCapture(options) {
    try {
      console.log('Requesting desktop capture permission...');
      this.updateStatus('Please select a screen or window to record...');
      
      // Request desktop capture from the extension background
      chrome.runtime.sendMessage(
        { type: 'REQUEST_DESKTOP_CAPTURE' },
        async (response) => {
          console.log('Desktop capture response:', response);
          // We'll get the stream ID back
        }
      );
      
      // Actually, let's use the desktopCapture API directly
      chrome.desktopCapture.chooseDesktopMedia(
        ['screen', 'window', 'tab'],
        async (streamId) => {
          if (streamId) {
            console.log('Got desktop capture stream ID:', streamId);
            await this.startDesktopRecording(streamId, options);
          } else {
            console.error('User cancelled desktop capture');
            this.showError('Screen capture was cancelled. Please try again.');
            // Close the tab after showing error
            setTimeout(() => {
              window.close();
            }, 3000);
          }
        }
      );
    } catch (error) {
      console.error('Error requesting desktop capture:', error);
      this.showError(`Failed to request desktop capture: ${error.message}`);
    }
  }

  async startDesktopRecording(streamId, options) {
    try {
      console.log('Starting desktop recording with stream ID:', streamId);
      this.updateStatus('Starting recording...');
      
      // Get the media stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        },
        audio: false // Desktop audio not supported in Chrome extensions
      });
      
      console.log('Got desktop stream:', this.stream);
      
      // Add camera if requested
      if (options?.includeCamera) {
        try {
          console.log('Adding camera stream...');
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 } },
            audio: options?.includeAudio
          });
          
          // Combine streams
          const tracks = [...this.stream.getTracks(), ...cameraStream.getTracks()];
          this.stream = new MediaStream(tracks);
          console.log('Combined stream with camera');
        } catch (error) {
          console.warn('Could not add camera (optional):', error);
        }
      }
      
      // Show preview
      const preview = document.getElementById('preview');
      if (preview) {
        preview.srcObject = this.stream;
        console.log('Preview set');
      }
      
      // Start recording
      this.startRecording();
      
    } catch (error) {
      console.error('Error starting desktop recording:', error);
      this.showError(`Failed to start recording: ${error.message}`);
    }
  }

  async initializeRecording() {
    try {
      console.log('Initializing recording...');
      
      // Check if we're in screen mode from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const isScreenMode = urlParams.get('mode') === 'screen';
      
      // Get recording configuration from storage
      const data = await chrome.storage.session.get(['recordingStreamId', 'recordingOptions', 'recordingType']);
      
      console.log('Recording data from storage:', data);
      console.log('Is screen mode from URL:', isScreenMode);
      
      // For screen mode, we need to request desktop capture here
      if (isScreenMode || data.recordingType === 'screen') {
        console.log('Screen mode detected, requesting desktop capture...');
        await this.requestDesktopCapture(data.recordingOptions);
        return; // Desktop capture will handle the rest
      }
      
      if (!data.recordingStreamId) {
        throw new Error('No recording stream ID found');
      }

      this.updateStatus('Getting media stream...');
      
      // Get the media stream based on type
      if (data.recordingType === 'tab') {
        console.log('Getting tab media stream...');
        // Tab recording
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: data.recordingStreamId
            }
          },
          audio: data.recordingOptions?.includeAudio ? {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: data.recordingStreamId
            }
          } : false
        });
      } else {
        console.log('Getting desktop media stream with ID:', data.recordingStreamId);
        // Screen recording - use the stream ID directly
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: data.recordingStreamId,
                maxWidth: 1920,
                maxHeight: 1080
              }
            },
            audio: false
          });
        } catch (error) {
          console.error('Error getting stream, trying alternative approach:', error);
          // Try without constraints
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: data.recordingStreamId
              }
            }
          });
        }
      }

      console.log('Got media stream:', this.stream);
      console.log('Stream tracks:', this.stream.getTracks());

      // Add camera stream if enabled (optional, don't fail if camera not available)
      if (data.recordingOptions?.includeCamera) {
        try {
          console.log('Attempting to add camera...');
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 320 },
              height: { ideal: 240 }
            },
            audio: data.recordingOptions?.includeAudio
          });
          
          console.log('Got camera stream, combining with desktop stream');
          // Combine streams if we have camera
          const tracks = [...this.stream.getTracks(), ...cameraStream.getTracks()];
          this.stream = new MediaStream(tracks);
        } catch (error) {
          console.warn('Could not add camera (this is okay):', error);
        }
      }

      // Show preview
      const preview = document.getElementById('preview');
      if (preview) {
        preview.srcObject = this.stream;
        console.log('Preview video element set');
      }

      // Start recording
      this.startRecording();
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError(`Failed to initialize recording: ${error.message}`);
      
      // Try to provide more helpful error messages
      if (error.message.includes('Invalid state')) {
        this.showError('Failed to access screen. Please try again and make sure to select a screen or window.');
      } else if (error.message.includes('Permission denied')) {
        this.showError('Screen recording permission denied. Please allow screen recording and try again.');
      }
    }
  }

  startRecording() {
    try {
      console.log('Starting MediaRecorder...');
      
      // Check which mime types are supported
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      
      let selectedMimeType = 'video/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('Using mime type:', selectedMimeType);
          break;
        }
      }
      
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          console.log('Data chunk received:', event.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        this.handleRecordingComplete();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.showError('Recording error occurred: ' + event.error);
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.updateStatus('Recording...');
      
      // Start timer
      this.startTime = Date.now();
      this.startTimer();
      
      console.log('Recording started');
      
    } catch (error) {
      console.error('Start recording error:', error);
      this.showError(`Failed to start recording: ${error.message}`);
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const displaySeconds = seconds % 60;
      
      const timer = document.getElementById('timer');
      timer.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    }, 1000);
  }

  stopRecording() {
    console.log('Stopping recording...');
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.updateStatus('Processing recording...');
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
  }

  async handleRecordingComplete() {
    try {
      console.log('Handling recording completion...');
      console.log('Total chunks recorded:', this.recordedChunks.length);
      
      // Create blob from recorded chunks
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      console.log('Created blob:', blob.size, 'bytes');
      
      this.updateStatus('Preparing to upload...');
      
      // Convert blob to base64 for storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        const fileName = `recording-${Date.now()}.webm`;
        
        console.log('Storing video in chrome.storage...');
        // Store the video data in chrome.storage for the content script to access
        await chrome.storage.local.set({
          pendingVideoUpload: {
            base64data: base64data,
            fileName: fileName,
            size: blob.size,
            type: 'video/webm',
            timestamp: Date.now()
          }
        });
        
        console.log('Video stored, opening upload page...');
        // ALWAYS open localhost:3000/videos (don't check if it exists)
        const targetUrl = 'http://localhost:3000/videos';
        
        // Just create a new tab or focus existing one
        const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });
        let targetTab = tabs.find(tab => tab.url.includes('/videos'));
        
        if (targetTab) {
          console.log('Found existing videos tab, focusing and reloading...');
          // Focus existing tab and reload it
          await chrome.tabs.update(targetTab.id, { active: true });
          await chrome.tabs.reload(targetTab.id);
        } else {
          console.log('Creating new videos tab...');
          // Create new tab
          targetTab = await chrome.tabs.create({
            url: targetUrl,
            active: true
          });
        }
        
        
        this.updateStatus('Opening upload page...');
        
        // Close this recording tab after a delay
        setTimeout(() => {
          console.log('Closing recorder tab');
          window.close();
        }, 3000);
      };
      
      reader.onerror = (error) => {
        console.error('Error reading blob:', error);
        this.showError('Failed to process recording');
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Handle recording complete error:', error);
      this.showError(`Failed to process recording: ${error.message}`);
    }
  }

  setupEventListeners() {
    // Stop button
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        console.log('Stop button clicked');
        this.stopRecording();
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel the recording?')) {
          this.cancelRecording();
        }
      });
    }

    // Listen for stop message from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Recorder received message:', request.type);
      if (request.type === 'STOP_RECORDING') {
        this.stopRecording();
        sendResponse({ success: true });
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        e.preventDefault();
        e.returnValue = 'Recording in progress. Are you sure you want to leave?';
      }
    });
  }

  cancelRecording() {
    // Stop recording without saving
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clear recorded chunks
    this.recordedChunks = [];
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'RECORDING_CANCELLED'
    });
    
    // Close the tab
    window.close();
  }

  updateStatus(message) {
    const statusText = document.getElementById('status-text');
    statusText.textContent = message;
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    this.updateStatus('Error occurred');
  }
}

// Initialize recorder when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing recorder');
  new RecorderPage();
});