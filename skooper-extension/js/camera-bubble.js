// Camera Bubble Component for Screen Recording
class CameraBubble {
  constructor(cameraStream) {
    this.cameraStream = cameraStream;
    this.container = null;
    this.video = null;
    this.isDragging = false;
    this.currentPosition = { x: null, y: null };
    this.dragOffset = { x: 0, y: 0 };
    this.size = 'medium'; // small, medium, large
    this.position = 'bottom-right'; // Position preset
    this.isHidden = false;

    this.init();
  }

  init() {
    this.createBubble();
    this.attachEventListeners();
    this.startCamera();
  }

  createBubble() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = `camera-bubble-container ${this.size} ${this.position}`;
    this.container.id = 'skooper-camera-bubble';

    // Create video element
    this.video = document.createElement('video');
    this.video.className = 'camera-bubble-video';
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;

    // Create recording indicator
    const indicator = document.createElement('div');
    indicator.className = 'camera-recording-indicator';

    // Create resize handle (optional, can be removed if not needed)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'camera-bubble-resize';

    // Assemble the bubble
    this.container.appendChild(this.video);
    this.container.appendChild(indicator);
    this.container.appendChild(resizeHandle);

    // Add to page
    document.body.appendChild(this.container);
  }

  attachEventListeners() {
    // Dragging functionality
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch support for dragging
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Keyboard shortcuts for size only
    document.addEventListener('keydown', (e) => {
      // Alt + 1,2,3 for size
      if (e.altKey) {
        if (e.key === '1') this.setSize('small');
        if (e.key === '2') this.setSize('medium');
        if (e.key === '3') this.setSize('large');
      }
    });

    // Double click to cycle through positions
    this.container.addEventListener('dblclick', () => {
      this.cyclePosition();
    });
  }

  handleMouseDown(e) {
    // Ignore if clicking on resize handle
    if (e.target.closest('.camera-bubble-resize')) {
      return;
    }

    this.isDragging = true;
    this.container.classList.add('dragging');

    const rect = this.container.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    e.preventDefault();
    e.stopPropagation();
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    this.moveToPosition(x, y);
  }

  handleMouseUp() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.container.classList.remove('dragging');

    // Snap to nearest corner if close
    this.snapToCorner();
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;

    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseMove(mouseEvent);
    e.preventDefault();
  }

  handleTouchEnd() {
    this.handleMouseUp();
  }

  moveToPosition(x, y) {
    // Constrain to viewport
    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';

    // Remove position class when custom positioning
    this.container.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
    this.position = 'custom';

    this.currentPosition = { x, y };
  }

  snapToCorner() {
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    // Determine closest corner
    let newPosition = '';

    if (centerX < halfWidth && centerY < halfHeight) {
      newPosition = 'top-left';
    } else if (centerX >= halfWidth && centerY < halfHeight) {
      newPosition = 'top-right';
    } else if (centerX < halfWidth && centerY >= halfHeight) {
      newPosition = 'bottom-left';
    } else {
      newPosition = 'bottom-right';
    }

    // Only snap if within 100px of corner
    const threshold = 100;
    const shouldSnap = (
      rect.left < threshold || rect.right > window.innerWidth - threshold ||
      rect.top < threshold || rect.bottom > window.innerHeight - threshold
    );

    if (shouldSnap && newPosition !== this.position) {
      this.setPosition(newPosition);
    }
  }

  cyclePosition() {
    const positions = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    const currentIndex = positions.indexOf(this.position);
    const nextIndex = (currentIndex + 1) % positions.length;
    this.setPosition(positions[nextIndex]);
  }

  setPosition(position) {
    this.position = position;
    this.container.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
    this.container.classList.add(position);

    // Reset inline styles
    this.container.style.left = '';
    this.container.style.top = '';
    this.container.style.right = '';
    this.container.style.bottom = '';
  }

  setSize(size) {
    this.size = size;
    this.container.classList.remove('small', 'medium', 'large');
    this.container.classList.add(size);
  }

  toggleVisibility() {
    this.isHidden = !this.isHidden;
    if (this.isHidden) {
      this.container.classList.add('hidden');
    } else {
      this.container.classList.remove('hidden');
    }
  }

  startCamera() {
    if (this.cameraStream && this.video) {
      this.video.srcObject = this.cameraStream;
    }
  }

  stopCamera() {
    if (this.video) {
      this.video.srcObject = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
  }

  destroy() {
    this.stopCamera();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  // Get the video element for canvas compositing
  getVideoElement() {
    return this.video;
  }

  // Get current position and size for compositing
  getBounds() {
    const rect = this.container.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }
}

// Export for use in recorder
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraBubble;
}