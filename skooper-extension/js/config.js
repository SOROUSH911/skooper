// Configuration for Skooper extension
class SkooperConfig {
  constructor() {
    // Default to localhost for development
    this.defaultUrls = {
      development: 'http://localhost:3000',
      production: null // Will be set when you deploy to Amplify
    };
    
    // Auto-detect environment or allow manual override
    this.currentEnv = this.detectEnvironment();
  }
  
  detectEnvironment() {
    // Check if we're in development or production
    // You can override this by setting chrome.storage
    return 'development'; // Default to development
  }
  
  async getTargetUrl() {
    try {
      // Check if user has set a custom URL in extension storage
      const stored = await chrome.storage.sync.get(['skooperTargetUrl', 'skooperEnvironment']);
      
      if (stored.skooperTargetUrl) {
        console.log('Using stored target URL:', stored.skooperTargetUrl);
        return stored.skooperTargetUrl;
      }
      
      // Use environment-based URL
      const env = stored.skooperEnvironment || this.currentEnv;
      const url = this.defaultUrls[env];
      
      if (!url) {
        throw new Error(`No URL configured for environment: ${env}`);
      }
      
      console.log(`Using ${env} URL:`, url);
      return url;
    } catch (error) {
      console.error('Error getting target URL:', error);
      // Fallback to localhost
      return this.defaultUrls.development;
    }
  }
  
  async setTargetUrl(url) {
    try {
      await chrome.storage.sync.set({ skooperTargetUrl: url });
      console.log('Target URL updated:', url);
    } catch (error) {
      console.error('Error setting target URL:', error);
    }
  }
  
  async setEnvironment(env) {
    try {
      await chrome.storage.sync.set({ skooperEnvironment: env });
      this.currentEnv = env;
      console.log('Environment updated:', env);
    } catch (error) {
      console.error('Error setting environment:', error);
    }
  }
  
  // Helper method to get full videos page URL
  async getVideosUrl() {
    const baseUrl = await this.getTargetUrl();
    return `${baseUrl}/videos`;
  }
  
  // Helper method to check if current page matches target domain
  async isTargetDomain(url) {
    const targetUrl = await this.getTargetUrl();
    const targetDomain = new URL(targetUrl).origin;
    return url.startsWith(targetDomain);
  }
  
  // Get URL patterns for manifest permissions
  getUrlPatterns() {
    return [
      'http://localhost:3000/*',
      'https://localhost:3000/*',
      'https://*.amplifyapp.com/*',
      'https://*.vercel.app/*',
      'https://*.netlify.app/*'
    ];
  }
}

// Create global instance
window.skooperConfig = new SkooperConfig();

// For use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkooperConfig;
}