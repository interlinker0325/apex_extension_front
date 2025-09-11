// Configuration Manager for APEX Purchaser Extension
// Provides UI for managing backend configuration

class ConfigManager {
    constructor() {
        this.config = window.APEX_CONFIG || {};
        this.init();
    }
    
    init() {
        // Create config UI if it doesn't exist
        this.createConfigUI();
        this.loadCurrentConfig();
    }
    
    createConfigUI() {
        // Add config section to options page
        const optionsPage = document.querySelector('.options-container');
        if (!optionsPage) return;
        
        const configSection = document.createElement('div');
        configSection.className = 'config-section';
        configSection.innerHTML = `
            <h3>Backend Configuration</h3>
            <div class="config-form">
                <div class="form-group">
                    <label for="backendUrl">Backend URL:</label>
                    <input type="url" id="backendUrl" placeholder="http://localhost:5000 or https://abc123.ngrok.io">
                    <small>Enter the URL where your Python backend is running</small>
                </div>
                <div class="form-group">
                    <label for="connectionType">Connection Type:</label>
                    <select id="connectionType">
                        <option value="local">Local (localhost:5000)</option>
                        <option value="ngrok">ngrok Tunnel</option>
                        <option value="custom">Custom URL</option>
                    </select>
                </div>
                <div class="form-group">
                    <button id="testConnection" class="btn btn-secondary">Test Connection</button>
                    <button id="saveConfig" class="btn btn-primary">Save Configuration</button>
                </div>
                <div id="connectionStatus" class="connection-status"></div>
            </div>
        `;
        
        // Insert before the first form group
        const firstFormGroup = optionsPage.querySelector('.form-group');
        if (firstFormGroup) {
            optionsPage.insertBefore(configSection, firstFormGroup);
        } else {
            optionsPage.appendChild(configSection);
        }
        
        // Add event listeners
        this.addEventListeners();
    }
    
    addEventListeners() {
        const connectionType = document.getElementById('connectionType');
        const backendUrl = document.getElementById('backendUrl');
        const testConnection = document.getElementById('testConnection');
        const saveConfig = document.getElementById('saveConfig');
        
        if (connectionType) {
            connectionType.addEventListener('change', (e) => {
                this.handleConnectionTypeChange(e.target.value);
            });
        }
        
        if (testConnection) {
            testConnection.addEventListener('click', () => {
                this.testConnection();
            });
        }
        
        if (saveConfig) {
            saveConfig.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }
    }
    
    handleConnectionTypeChange(type) {
        const backendUrl = document.getElementById('backendUrl');
        if (!backendUrl) return;
        
        switch (type) {
            case 'local':
                backendUrl.value = 'http://localhost:5000';
                break;
            case 'ngrok':
                backendUrl.value = 'https://abc123.ngrok.io';
                backendUrl.placeholder = 'https://your-ngrok-url.ngrok.io';
                break;
            case 'custom':
                backendUrl.value = '';
                backendUrl.placeholder = 'Enter custom backend URL';
                break;
        }
    }
    
    loadCurrentConfig() {
        const backendUrl = document.getElementById('backendUrl');
        if (backendUrl && this.config.BACKEND_URL) {
            backendUrl.value = this.config.BACKEND_URL;
            
            // Set connection type based on URL
            const connectionType = document.getElementById('connectionType');
            if (connectionType) {
                if (this.config.BACKEND_URL.includes('localhost') || this.config.BACKEND_URL.includes('127.0.0.1')) {
                    connectionType.value = 'local';
                } else if (this.config.BACKEND_URL.includes('ngrok.io')) {
                    connectionType.value = 'ngrok';
                } else {
                    connectionType.value = 'custom';
                }
            }
        }
    }
    
    async testConnection() {
        const backendUrl = document.getElementById('backendUrl');
        const statusDiv = document.getElementById('connectionStatus');
        
        if (!backendUrl || !statusDiv) return;
        
        const url = backendUrl.value.trim();
        if (!url) {
            statusDiv.innerHTML = '<div class="status-error">Please enter a backend URL</div>';
            return;
        }
        
        statusDiv.innerHTML = '<div class="status-testing">Testing connection...</div>';
        
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                statusDiv.innerHTML = `<div class="status-success">✅ Connected! ${data.message}</div>`;
            } else {
                statusDiv.innerHTML = `<div class="status-error">❌ Connection failed: ${response.status}</div>`;
            }
        } catch (error) {
            statusDiv.innerHTML = `<div class="status-error">❌ Connection failed: ${error.message}</div>`;
        }
    }
    
    async saveConfiguration() {
        const backendUrl = document.getElementById('backendUrl');
        const statusDiv = document.getElementById('connectionStatus');
        
        if (!backendUrl || !statusDiv) return;
        
        const url = backendUrl.value.trim();
        if (!url) {
            statusDiv.innerHTML = '<div class="status-error">Please enter a backend URL</div>';
            return;
        }
        
        try {
            // Update the config object
            if (window.APEX_CONFIG) {
                window.APEX_CONFIG.setBackendUrl(url);
            }
            
            // Save to storage
            await chrome.storage.local.set({
                backendConfig: {
                    url: url,
                    lastUpdated: Date.now()
                }
            });
            
            statusDiv.innerHTML = '<div class="status-success">✅ Configuration saved!</div>';
            
            // Show instructions
            setTimeout(() => {
                this.showInstructions(url);
            }, 1000);
            
        } catch (error) {
            statusDiv.innerHTML = `<div class="status-error">❌ Failed to save: ${error.message}</div>`;
        }
    }
    
    showInstructions(url) {
        const statusDiv = document.getElementById('connectionStatus');
        if (!statusDiv) return;
        
        let instructions = '';
        
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            instructions = `
                <div class="instructions">
                    <h4>Local Backend Setup:</h4>
                    <ol>
                        <li>Open terminal in APEX_selenium_backend folder</li>
                        <li>Run: <code>pip install -r requirements.txt</code></li>
                        <li>Run: <code>python app.py</code></li>
                        <li>Backend should start on ${url}</li>
                    </ol>
                </div>
            `;
        } else if (url.includes('ngrok.io')) {
            instructions = `
                <div class="instructions">
                    <h4>ngrok Setup:</h4>
                    <ol>
                        <li>Install ngrok: <code>brew install ngrok</code> (macOS)</li>
                        <li>Start backend: <code>python app.py</code></li>
                        <li>In another terminal: <code>ngrok http 5000</code></li>
                        <li>Copy the https URL and update this config</li>
                    </ol>
                </div>
            `;
        }
        
        statusDiv.innerHTML = instructions;
    }
}

// Initialize config manager when options page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ConfigManager();
    });
} else {
    new ConfigManager();
}
