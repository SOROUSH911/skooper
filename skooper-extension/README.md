# Skooper Chrome Extension

A Chrome extension for screen recording that uploads videos directly to your Skooper Amplify app.

## Features

- 🎬 Screen and tab recording
- 📹 Optional camera overlay
- 🎤 Audio recording
- ☁️ Direct upload to your Amplify app
- 🎨 Loom-inspired UI design

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `skooper-extension` folder
4. The Skooper extension should now appear in your toolbar

## Usage

### Starting a Recording

1. Click the Skooper icon in your Chrome toolbar
2. Choose your recording options:
   - **Full Screen**: Record your entire screen
   - **Current Tab**: Record just the active browser tab
   - Toggle camera and microphone as needed
3. Click "Start Recording"
4. Select the screen/window you want to record
5. Recording will begin automatically

### Stopping and Uploading

1. Click the Skooper icon again and click "Stop Recording"
2. The video will automatically upload to your Skooper app at `localhost:3000`
3. You'll be redirected to your videos page when upload completes

### Keyboard Shortcuts

- `Alt + Shift + L` - Open recorder popup
- Extension supports all standard Chrome extension shortcuts

## Configuration

The extension is configured to work with:
- **Target URL**: `http://localhost:3000` (your Amplify app)
- **Upload Endpoint**: `/api/upload-recording`
- **Video Format**: WebM with VP8/Opus codecs

## File Structure

```
skooper-extension/
├── manifest.json          # Extension configuration
├── html/
│   └── popup.html         # Main popup interface
├── css/
│   └── popup.css         # Popup styling
├── js/
│   ├── background.js     # Service worker for recording
│   ├── popup.js         # Popup UI logic
│   └── content.js       # Content script for localhost:3000
├── icons/               # Extension icons (16, 32, 48, 128px)
└── README.md           # This file
```

## Integration with Amplify App

The extension integrates with your Amplify app through:

1. **API Endpoint**: `POST /api/upload-recording`
   - Accepts FormData with video file
   - Handles authentication via Amplify Auth
   - Uploads to S3 using Amplify Storage

2. **Content Script**: Runs on `localhost:3000`
   - Adds floating record button
   - Shows upload notifications
   - Handles page integration

3. **Storage Path**: Videos are stored at `videos/{userId}/{filename}`

## Permissions

The extension requires these permissions:
- `activeTab` - Access to current tab for recording
- `desktopCapture` - Screen recording capability
- `tabCapture` - Tab recording capability  
- `storage` - Save user preferences
- `scripting` - Inject content scripts
- `http://localhost:3000/*` - Access to your Amplify app

## Development

### Prerequisites
- Chrome browser
- Your Amplify app running on `localhost:3000`
- Valid Amplify authentication setup

### Local Development
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the reload icon next to Skooper extension
4. Test your changes

### Debugging
- Use Chrome DevTools for popup debugging
- Check `chrome://extensions/` for background script logs
- Console logs appear in the service worker inspector

## Troubleshooting

### Recording Issues
- Ensure you grant screen recording permissions
- Check that microphone/camera permissions are enabled
- Try refreshing the page and extension

### Upload Issues  
- Verify your Amplify app is running on `localhost:3000`
- Check that you're logged in to your Amplify app
- Ensure the `/api/upload-recording` endpoint is working
- Check network tab for upload errors

### Extension Issues
- Reload the extension in `chrome://extensions/`
- Check the service worker logs for errors
- Ensure all required permissions are granted

## Security Notes

- Extension only connects to `localhost:3000`
- Uses Amplify Auth for secure uploads
- No data is sent to external services
- Recordings are processed locally before upload

## Browser Support

- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)
- Requires Manifest V3 support