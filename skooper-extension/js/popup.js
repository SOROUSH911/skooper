// Popup script for Skooper extension
class SkooperPopup {
  constructor() {
    this.isRecording = false;
    this.recordingTabId = null;
    this.recordingOptions = {
      recordingType: 'screen',
      includeCamera: true,
      includeAudio: true,
      selectedCameraId: null,
      selectedMicrophoneId: null
    };

    this.availableDevices = {
      cameras: [],
      microphones: []
    };

    this.initializeUI();
    this.setupEventListeners();
    this.checkRecordingStatus();
    this.loadAvailableDevices();
  }

  initializeUI() {
    // Get UI elements
    this.elements = {
      cameraBtn: document.getElementById('camera-btn'),
      cameraMain: document.getElementById('camera-main'),
      cameraToggle: document.getElementById('camera-toggle'),
      microphoneBtn: document.getElementById('microphone-btn'),
      microphoneMain: document.getElementById('microphone-main'),
      microphoneToggle: document.getElementById('microphone-toggle'),
      recordBtn: document.getElementById('start-record-btn'),
      closeBtn: document.getElementById('close-btn'),
      statusMessage: document.getElementById('status-message'),
      uploadProgress: document.getElementById('upload-progress'),
      progressFill: document.getElementById('progress-fill'),
      deviceModal: document.getElementById('device-modal'),
      deviceModalTitle: document.getElementById('device-modal-title'),
      deviceModalClose: document.getElementById('device-modal-close'),
      deviceList: document.getElementById('device-list')
    };

    // Update initial states
    this.updateButtonStates();
  }

  setupEventListeners() {
    // Camera main area click - for device selection (but not when clicking toggle)
    this.elements.cameraMain.addEventListener('click', (e) => {
      // Don't open device selection if clicking on toggle oval
      if (e.target.closest('.toggle-oval')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.showDeviceSelection('camera');
    });

    // Camera toggle click - for on/off toggle only
    this.elements.cameraToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCamera();
    });

    // Microphone main area click - for device selection (but not when clicking toggle)
    this.elements.microphoneMain.addEventListener('click', (e) => {
      // Don't open device selection if clicking on toggle oval
      if (e.target.closest('.toggle-oval')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.showDeviceSelection('microphone');
    });

    // Microphone toggle click - for on/off toggle only
    this.elements.microphoneToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMicrophone();
    });

    // Record button
    this.elements.recordBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    // Close button
    this.elements.closeBtn.addEventListener('click', () => {
      window.close();
    });

    // Device modal close
    this.elements.deviceModalClose.addEventListener('click', () => {
      this.hideDeviceSelection();
    });

    // Close modal when clicking outside
    this.elements.deviceModal.addEventListener('click', (e) => {
      if (e.target === this.elements.deviceModal) {
        this.hideDeviceSelection();
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

  async loadAvailableDevices() {
    try {
      // Request camera devices
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get all available devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.availableDevices.cameras = devices.filter(device => device.kind === 'videoinput');
      this.availableDevices.microphones = devices.filter(device => device.kind === 'audioinput');

      // Set default selections if none exist
      if (!this.recordingOptions.selectedCameraId && this.availableDevices.cameras.length > 0) {
        this.recordingOptions.selectedCameraId = this.availableDevices.cameras[0].deviceId;
      }

      if (!this.recordingOptions.selectedMicrophoneId && this.availableDevices.microphones.length > 0) {
        this.recordingOptions.selectedMicrophoneId = this.availableDevices.microphones[0].deviceId;
      }

      // Stop the streams
      cameraStream.getTracks().forEach(track => track.stop());
      audioStream.getTracks().forEach(track => track.stop());

    } catch (error) {
      console.error('Error loading devices:', error);
    }
  }

  toggleCamera() {
    this.recordingOptions.includeCamera = !this.recordingOptions.includeCamera;
    this.updateButtonStates();
  }

  toggleMicrophone() {
    this.recordingOptions.includeAudio = !this.recordingOptions.includeAudio;
    this.updateButtonStates();
  }

  updateButtonStates() {
    // Update camera button
    const cameraStatus = this.elements.cameraBtn.querySelector('.toggle-text');
    cameraStatus.textContent = this.recordingOptions.includeCamera ? 'On' : 'Off';

    // Remove all state classes first
    this.elements.cameraBtn.classList.remove('active', 'inactive');

    if (this.recordingOptions.includeCamera) {
      this.elements.cameraBtn.classList.add('active');
    } else {
      this.elements.cameraBtn.classList.add('inactive');
    }

    // Update microphone button
    const micStatus = this.elements.microphoneBtn.querySelector('.toggle-text');
    micStatus.textContent = this.recordingOptions.includeAudio ? 'On' : 'Off';

    // Remove all state classes first
    this.elements.microphoneBtn.classList.remove('active', 'inactive');

    if (this.recordingOptions.includeAudio) {
      this.elements.microphoneBtn.classList.add('active');
    } else {
      this.elements.microphoneBtn.classList.add('inactive');
    }
  }

  showDeviceSelection(deviceType) {
    const isCamera = deviceType === 'camera';
    const devices = isCamera ? this.availableDevices.cameras : this.availableDevices.microphones;
    const selectedId = isCamera ? this.recordingOptions.selectedCameraId : this.recordingOptions.selectedMicrophoneId;

    // Update modal title
    this.elements.deviceModalTitle.textContent = isCamera ? 'Select Camera' : 'Select Microphone';

    // Clear device list
    this.elements.deviceList.innerHTML = '';

    // Populate device list
    devices.forEach(device => {
      const deviceItem = document.createElement('div');
      deviceItem.className = 'device-item';
      if (device.deviceId === selectedId) {
        deviceItem.classList.add('selected');
      }

      deviceItem.innerHTML = `
        <span class="device-name">${device.label || `${isCamera ? 'Camera' : 'Microphone'} ${devices.indexOf(device) + 1}`}</span>
        <div class="device-check"></div>
      `;

      deviceItem.addEventListener('click', () => {
        // Update selection
        if (isCamera) {
          this.recordingOptions.selectedCameraId = device.deviceId;
          this.recordingOptions.includeCamera = true;
        } else {
          this.recordingOptions.selectedMicrophoneId = device.deviceId;
          this.recordingOptions.includeAudio = true;
        }

        // Update UI and close modal
        this.updateButtonStates();
        this.hideDeviceSelection();
      });

      this.elements.deviceList.appendChild(deviceItem);
    });

    // Show modal
    this.elements.deviceModal.style.display = 'flex';
  }

  hideDeviceSelection() {
    this.elements.deviceModal.style.display = 'none';
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

      // Disable buttons during recording
      this.elements.cameraMain.style.pointerEvents = 'none';
      this.elements.cameraToggle.style.pointerEvents = 'none';
      this.elements.cameraBtn.style.opacity = '0.6';
      this.elements.microphoneMain.style.pointerEvents = 'none';
      this.elements.microphoneToggle.style.pointerEvents = 'none';
      this.elements.microphoneBtn.style.opacity = '0.6';
    } else {
      this.elements.recordBtn.classList.remove('recording');
      recordBtnContent.textContent = 'Start Recording';

      // Re-enable buttons
      this.elements.cameraMain.style.pointerEvents = 'auto';
      this.elements.cameraToggle.style.pointerEvents = 'auto';
      this.elements.cameraBtn.style.opacity = '1';
      this.elements.microphoneMain.style.pointerEvents = 'auto';
      this.elements.microphoneToggle.style.pointerEvents = 'auto';
      this.elements.microphoneBtn.style.opacity = '1';
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