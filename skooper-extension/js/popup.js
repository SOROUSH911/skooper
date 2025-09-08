// Popup script for Skooper extension
class SkooperPopup {
  constructor() {
    this.isRecording = false;
    this.recordingTabId = null;
    this.recordingOptions = {
      recordingType: 'screen', // 'screen' or 'tab'
      includeCamera: true,
      includeAudio: true
    };
    
    this.initializeUI();
    this.setupEventListeners();
    this.checkRecordingStatus();
  }

  initializeUI() {
    // Get UI elements
    this.elements = {
      fullScreenBtn: document.getElementById('full-screen-btn'),
      currentTabBtn: document.getElementById('current-tab-btn'),
      cameraToggle: document.getElementById('camera-toggle'),
      micToggle: document.getElementById('mic-toggle'),
      recordBtn: document.getElementById('start-record-btn'),
      statusMessage: document.getElementById('status-message'),
      uploadProgress: document.getElementById('upload-progress'),
      progressFill: document.getElementById('progress-fill'),
      closeBtn: document.getElementById('close-btn')
    };

    // Set initial UI state
    this.updateToggleText();
  }

  setupEventListeners() {
    // Recording type selection
    this.elements.fullScreenBtn.addEventListener('click', () => {
      this.selectRecordingType('screen');
    });

    this.elements.currentTabBtn.addEventListener('click', () => {
      this.selectRecordingType('tab');
    });

    // Toggle switches
    this.elements.cameraToggle.addEventListener('change', (e) => {
      this.recordingOptions.includeCamera = e.target.checked;
      this.updateToggleText();
    });

    this.elements.micToggle.addEventListener('change', (e) => {
      this.recordingOptions.includeAudio = e.target.checked;
      this.updateToggleText();
    });

    // Record button
    this.elements.recordBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    // Close button - disabled during recording
    this.elements.closeBtn.addEventListener('click', () => {
      if (!this.isRecording) {
        window.close();
      } else {
        this.showStatus('Please stop recording first', 'info');
      }
    });

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'RECORDING_COMPLETED') {
        this.handleRecordingCompleted();
      } else if (request.type === 'RECORDING_CANCELLED') {
        this.updateUIForRecording(false);
        this.showStatus('Recording cancelled', 'info');
      }
    });

    // Check recording status periodically
    setInterval(() => {
      if (this.isRecording) {
        this.checkRecordingStatus();
      }
    }, 1000);
  }

  selectRecordingType(type) {
    this.recordingOptions.recordingType = type;
    
    // Update button states
    this.elements.fullScreenBtn.classList.toggle('active', type === 'screen');
    this.elements.currentTabBtn.classList.toggle('active', type === 'tab');
  }

  updateToggleText() {
    const cameraText = this.elements.cameraToggle.parentElement.querySelector('.toggle-text');
    const micText = this.elements.micToggle.parentElement.querySelector('.toggle-text');
    
    cameraText.textContent = this.recordingOptions.includeCamera ? 'On' : 'Off';
    micText.textContent = this.recordingOptions.includeAudio ? 'On' : 'Off';
  }

  async checkRecordingStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_RECORDING_STATUS' 
      });
      
      if (response.isRecording !== this.isRecording) {
        this.updateUIForRecording(response.isRecording);
      }
    } catch (error) {
      console.error('Error checking recording status:', error);
    }
  }

  async startRecording() {
    try {
      this.showStatus('Requesting screen access...', 'info');
      
      // Send recording options to background
      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        options: this.recordingOptions
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Keep track of recording tab
      if (response.recordingTabId) {
        this.recordingTabId = response.recordingTabId;
      }

      this.updateUIForRecording(true);
      this.showStatus('Recording in progress...', 'success');
      
      // Start a timer to show recording duration
      this.startRecordingTimer();

    } catch (error) {
      console.error('Error starting recording:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
      this.updateUIForRecording(false);
    }
  }

  async stopRecording() {
    try {
      this.showStatus('Stopping recording...', 'info');

      const response = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.updateUIForRecording(false);
      this.showStatus('Processing recording... Will upload to localhost:3000', 'info');
      
      // Stop the timer
      this.stopRecordingTimer();

    } catch (error) {
      console.error('Error stopping recording:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
      this.updateUIForRecording(false);
    }
  }

  handleRecordingCompleted() {
    this.updateUIForRecording(false);
    this.showStatus('Recording saved! Opening upload page...', 'success');
    this.stopRecordingTimer();
    
    // The popup can stay open or close after a delay
    setTimeout(() => {
      this.showStatus('You can close this window or start a new recording', 'info');
    }, 3000);
  }

  updateUIForRecording(recording) {
    this.isRecording = recording;
    
    const recordBtnContent = this.elements.recordBtn.querySelector('.record-btn-content span');
    
    if (recording) {
      this.elements.recordBtn.classList.add('recording');
      recordBtnContent.textContent = 'Stop Recording';
      
      // Disable option buttons during recording
      this.elements.fullScreenBtn.disabled = true;
      this.elements.currentTabBtn.disabled = true;
      this.elements.cameraToggle.disabled = true;
      this.elements.micToggle.disabled = true;
      
      // Change close button appearance
      this.elements.closeBtn.style.opacity = '0.5';
      this.elements.closeBtn.style.cursor = 'not-allowed';
    } else {
      this.elements.recordBtn.classList.remove('recording');
      recordBtnContent.textContent = 'Start Recording';
      
      // Re-enable option buttons
      this.elements.fullScreenBtn.disabled = false;
      this.elements.currentTabBtn.disabled = false;
      this.elements.cameraToggle.disabled = false;
      this.elements.micToggle.disabled = false;
      
      // Restore close button
      this.elements.closeBtn.style.opacity = '1';
      this.elements.closeBtn.style.cursor = 'pointer';
    }
  }

  startRecordingTimer() {
    this.recordingStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const displaySeconds = seconds % 60;
      
      const timerText = `Recording: ${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
      
      // Update status with timer
      const statusEl = this.elements.statusMessage;
      if (statusEl.style.display === 'block' && statusEl.classList.contains('success')) {
        statusEl.textContent = timerText;
      }
    }, 1000);
  }

  stopRecordingTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  showStatus(message, type = 'info') {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.style.display = 'block';
    
    // Don't auto-hide if recording
    if (!this.isRecording && type !== 'error') {
      setTimeout(() => {
        if (!this.isRecording) {
          this.hideStatus();
        }
      }, 5000);
    }
  }

  hideStatus() {
    this.elements.statusMessage.style.display = 'none';
  }

  showUploadProgress(percent) {
    this.elements.uploadProgress.style.display = 'block';
    this.elements.progressFill.style.width = `${percent}%`;
    
    const progressPercent = this.elements.uploadProgress.querySelector('.progress-percent');
    if (progressPercent) {
      progressPercent.textContent = `${Math.round(percent)}%`;
    }
  }

  hideUploadProgress() {
    setTimeout(() => {
      this.elements.uploadProgress.style.display = 'none';
    }, 1000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SkooperPopup();
});