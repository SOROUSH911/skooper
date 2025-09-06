# Extension Adaptation Plan: Loom → Amplify Integration

## Overview
Minimal changes to redirect Loom extension uploads to your existing Amplify S3 bucket while keeping ALL recording functionality intact.

## 🎯 Goal
- ✅ Keep all Loom recording features (screen capture, camera, audio)
- ✅ Keep all UI components unchanged
- ✅ Only change: Upload destination from Loom → Your S3 bucket
- ✅ Use same upload pattern as your existing app (`videos/{userId}/{timestamp}-filename`)

## 📦 Required Changes (Minimal)

### 1. Add Amplify SDK to Extension

#### Package Installation:
```bash
cd extension
npm install aws-amplify
```

#### Create `amplify-config.js`:
```javascript
// extension/js/amplify-config.js
import { Amplify } from 'aws-amplify';
import { uploadData } from 'aws-amplify/storage';
import config from './amplifyconfiguration.json'; // Copy from your app

Amplify.configure(config);

// Export for use in service worker
export { uploadData };
```

### 2. Modify Service Worker ONLY

#### File: `extension/js/sw.js`

**Find the Loom upload function** (likely handling the recorded blob) and replace with:

```javascript
import { uploadData } from './amplify-config.js';
import { fetchAuthSession } from 'aws-amplify/auth';

// Replace Loom upload function with:
async function uploadVideoToS3(videoBlob, metadata) {
  try {
    // Get current user for folder structure
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub || 'anonymous';
    
    // Match your app's naming convention
    const timestamp = Date.now();
    const fileName = `${timestamp}-recording.webm`;
    const filePath = `videos/${userId}/${fileName}`;
    
    // Upload using same pattern as your app
    const result = await uploadData({
      path: filePath,
      data: videoBlob,
      options: {
        contentType: 'video/webm',
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (totalBytes) {
            const progress = Math.round((transferredBytes / totalBytes) * 100);
            // Update existing Loom progress UI
            updateUploadProgress(progress);
          }
        }
      }
    }).result;
    
    // Return S3 URL for playback
    return {
      url: result.path,
      key: filePath
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Find where Loom sends the recorded blob and replace with:
// Instead of: loomAPI.upload(blob)
// Use: await uploadVideoToS3(blob, metadata)
```

### 3. Copy Amplify Configuration

```bash
# Copy your existing Amplify config to extension
cp amplify-app/my-app/src/amplifyconfiguration.json extension/js/
```

### 4. Update Manifest.json (Minimal)

```json
{
  // Keep everything else unchanged, just add:
  "host_permissions": [
    // Keep existing Loom permissions...
    "https://*.amazonaws.com/*",  // For S3
    "https://cognito-idp.*.amazonaws.com/*"  // For Cognito
  ],
  "externally_connectable": {
    "matches": [
      "https://www.loom.com/*",  // Keep for compatibility
      "https://YOUR-APP-DOMAIN.com/*"  // Add your domain
    ]
  }
}
```

### 5. Authentication Integration

#### Option A: Piggyback on Your App's Auth (Simplest)
```javascript
// In sw.js - Check if user is logged into your main app
async function checkAuthStatus() {
  try {
    const session = await fetchAuthSession();
    return session.tokens !== undefined;
  } catch {
    // Open your app's login page in new tab
    chrome.tabs.create({ url: 'https://your-app.com/login' });
    return false;
  }
}
```

#### Option B: Embed Cognito Login (More Complex)
```javascript
// In popup.html/js - Add simple login form
import { signIn } from 'aws-amplify/auth';

async function handleLogin(username, password) {
  try {
    await signIn({ username, password });
    // Close popup and start recording
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

## 🚀 Implementation Steps (2-3 Days)

### Day 1: Setup
1. Clone Loom extension
2. Install aws-amplify package
3. Copy your `amplifyconfiguration.json`
4. Update manifest.json permissions

### Day 2: Integration
1. Find video upload function in `sw.js`
2. Replace with `uploadData` call
3. Test upload to S3
4. Verify file path matches your app's structure

### Day 3: Polish
1. Add error handling
2. Test with different video sizes
3. Ensure progress bar works
4. Package extension

## 📁 What Stays the Same

### ✅ Keep ALL These Unchanged:
- Recording logic (screen/tab/camera capture)
- Video processing (WebAssembly muxer)
- UI components (bubble, popup, controls)
- Keyboard shortcuts
- Video preview
- Audio processing
- All Chrome APIs usage
- Virtual background processing

### ❌ Only Change:
- Upload destination (Loom API → S3 via Amplify)
- Authentication check (Loom cookies → Cognito session)
- Video URL structure (loom.com → S3/CloudFront)

## 🔧 Testing Checklist

```javascript
// Test upload with your existing app's pattern
const testUpload = async () => {
  // 1. Record a video using extension
  // 2. Check S3 bucket for file at: videos/{userId}/{timestamp}-recording.webm
  // 3. Verify your app can play the video
  // 4. Confirm file permissions match your app's uploads
};
```

## 💡 Quick Integration Test

```javascript
// Add this to your service worker to test Amplify connection
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const session = await fetchAuthSession();
    console.log('Amplify connected! User:', session.tokens?.idToken?.payload?.email);
  } catch (error) {
    console.log('Not authenticated - user needs to login to main app first');
  }
});
```

## 🎯 Minimal File Changes Summary

| File | Changes | Lines of Code |
|------|---------|---------------|
| `sw.js` | Replace upload function | ~30-40 lines |
| `manifest.json` | Add AWS permissions | ~4 lines |
| `amplify-config.js` | New file | ~10 lines |
| **Total** | **Minimal changes** | **~50 lines** |

## 🔄 Alternative: Webhook Approach

If you want even LESS changes, keep Loom upload and add a webhook:

```javascript
// After Loom upload completes, notify your backend
async function notifyBackend(loomUrl) {
  await fetch('https://your-api.com/webhook/video-recorded', {
    method: 'POST',
    body: JSON.stringify({ 
      loomUrl,
      userId: currentUser.id,
      timestamp: Date.now()
    })
  });
}
```

Then your backend can download from Loom and re-upload to S3.

## ⚡ Environment Variables

Create `.env` for local development:
```bash
# extension/.env
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_IDENTITY_POOL_ID=your-identity-pool-id
VITE_S3_BUCKET=your-bucket-name
VITE_REGION=us-east-1
```

## 🚨 Important Notes

1. **CORS**: Ensure your S3 bucket has proper CORS settings for `chrome-extension://*`
2. **Cognito**: Add `chrome-extension://YOUR_EXTENSION_ID` to allowed callback URLs
3. **File Size**: S3 multipart upload automatically handles large files
4. **Existing Code**: The Loom extension is minified/bundled - you'll need to work with the compiled code

## 📊 Effort Estimate

- **Minimal Approach**: 2-3 days (just upload redirect)
- **Full Integration**: 5-7 days (with proper auth flow)
- **Webhook Approach**: 1 day (least changes to extension)

## 🎉 Result

You'll have a Chrome extension that:
- Records exactly like Loom
- Uploads to YOUR S3 bucket
- Works with YOUR existing app
- Requires minimal code changes (~50 lines)