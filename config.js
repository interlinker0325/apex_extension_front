// APEX Purchaser Configuration
// This file contains all configurable settings for the Chrome extension

window.APEX_CONFIG = {
    // Backend Configuration
    BACKEND_URL: 'https://cfc94055a296.ngrok-free.app',  // Your ngrok URL
    // For local: Use 'http://localhost:5001'
    
    // Coupon Code (mandatory)
    COUPON_CODE: 'JAYPELLE',
    
    // Fallback URLs (in case primary fails)
    FALLBACK_URLS: [
        'https://cfc94055a296.ngrok-free.app',
        'http://localhost:5001',
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ],
    
    // API Endpoints
    ENDPOINTS: {
        START_AUTOMATION: '/start_automation',
        GET_STATUS: '/get_status',
        STOP_AUTOMATION: '/stop_automation',
        HEALTH_CHECK: '/health'
    },
    
    // Polling Configuration
    STATUS_POLL_INTERVAL: 2000,  // 2 seconds
    MAX_POLL_ATTEMPTS: 150,       // 5 minutes max
    
    // Extension Settings
    EXTENSION: {
        VERSION: '2.0.0',
        NAME: 'APEX Purchaser',
        DESCRIPTION: 'Automated APEX Trader Funding account creation'
    },
    
    // Debug Settings
    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'INFO',  // DEBUG, INFO, WARN, ERROR
        SHOW_BACKEND_URL: true
    }
};

// Helper functions for configuration
window.APEX_CONFIG.getBackendUrl = function() {
    return this.BACKEND_URL;
};

window.APEX_CONFIG.getApiUrl = function(endpoint) {
    const baseUrl = this.getBackendUrl();
    const endpointPath = this.ENDPOINTS[endpoint];
    if (!endpointPath) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    return `${baseUrl}${endpointPath}`;
};

window.APEX_CONFIG.setBackendUrl = function(url) {
    this.BACKEND_URL = url;
    console.log(`Backend URL updated to: ${url}`);
};

window.APEX_CONFIG.isLocalBackend = function() {
    return this.BACKEND_URL.includes('localhost') || this.BACKEND_URL.includes('127.0.0.1');
};

window.APEX_CONFIG.isNgrokBackend = function() {
    return this.BACKEND_URL.includes('ngrok.io') || this.BACKEND_URL.includes('ngrok-free.app');
};

// Auto-detect ngrok URL (if available)
window.APEX_CONFIG.autoDetectNgrok = function() {
    // This could be enhanced to automatically detect ngrok URLs
    // For now, it's manual configuration
    console.log('To use ngrok:');
    console.log('1. Install ngrok: https://ngrok.com/download');
    console.log('2. Run: ngrok http 5000');
    console.log('3. Copy the https URL and update BACKEND_URL in this file');
};

console.log('APEX Configuration loaded:', window.APEX_CONFIG);