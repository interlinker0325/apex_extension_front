// Popup script for APEX Purchaser Chrome Extension
// This script now works directly with content.js for all automation

let sessionId = null;
let isAutomationRunning = false;

// DOM elements
const startScrapingBtn = document.getElementById('startScraping');
const extensionOptionsBtn = document.getElementById('extensionOptions');
const statusElement = document.getElementById('status');
const logsElement = document.getElementById('logs');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved settings and state
    await loadSettings();
    await loadPersistentState();
    
    // Set up event listeners
    startScrapingBtn.addEventListener('click', handleStartScraping);
    extensionOptionsBtn.addEventListener('click', openOptionsPage);
    
    // Set up real-time listeners
    setupRealTimeListeners();
});

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['settings']);
        if (result.settings) {
            console.log('Settings loaded:', result.settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load persistent state from storage
async function loadPersistentState() {
    try {
        const result = await chrome.storage.local.get(['popupState']);
        if (result.popupState) {
            const state = result.popupState;
            
            // Restore automation status
            isAutomationRunning = state.isAutomationRunning || false;
            sessionId = state.sessionId || null;
            
            // Restore logs
            if (state.logs && state.logs.length > 0) {
                logsElement.innerHTML = '';
                state.logs.forEach(log => {
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.textContent = log;
                    logsElement.appendChild(logEntry);
                });
                logsElement.scrollTop = logsElement.scrollHeight;
            }
            
            // Restore status
            if (state.status) {
                updateStatus(state.status, state.statusText || getStatusText(state.status));
            } else {
                updateStatus('ready', 'Extension ready. Configure settings and start scraping.');
            }
            
            // Update button state
            updateButtonState();
            
            console.log('Persistent state loaded:', state);
        } else {
            // Initialize with default state
            updateStatus('ready', 'Extension ready. Configure settings and start scraping.');
        }
    } catch (error) {
        console.error('Error loading persistent state:', error);
        updateStatus('ready', 'Extension ready. Configure settings and start scraping.');
    }
}

// Save persistent state to storage
async function savePersistentState() {
    try {
        const logs = Array.from(logsElement.children).map(entry => entry.textContent);
        const status = statusElement.className.split(' ')[1] || 'ready';
        const statusText = statusElement.textContent;
        
        const state = {
            isAutomationRunning,
            sessionId,
            logs,
            status,
            statusText,
            timestamp: Date.now()
        };
        
        await chrome.storage.local.set({ popupState: state });
    } catch (error) {
        console.error('Error saving persistent state:', error);
    }
}

// Set up real-time listeners for state updates
function setupRealTimeListeners() {
    // Listen for storage changes (from content script)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.popupState) {
            const newState = changes.popupState.newValue;
            if (newState) {
                // Update logs in real-time
                if (newState.logs && newState.logs.length > logsElement.children.length) {
                    const currentLogCount = logsElement.children.length;
                    newState.logs.slice(currentLogCount).forEach(log => {
                        const logEntry = document.createElement('div');
                        logEntry.className = 'log-entry';
                        logEntry.textContent = log;
                        logsElement.appendChild(logEntry);
                    });
                    logsElement.scrollTop = logsElement.scrollHeight;
                }
                
                // Update status in real-time
                if (newState.status && newState.status !== statusElement.className.split(' ')[1]) {
                    updateStatus(newState.status, newState.statusText || getStatusText(newState.status));
                }
                
                // Update automation running state
                isAutomationRunning = newState.isAutomationRunning || false;
                updateButtonState();
            }
        }
    });
}

// Update button state based on automation status
function updateButtonState() {
    if (isAutomationRunning) {
        startScrapingBtn.textContent = 'PROCESSING...';
        startScrapingBtn.disabled = true;
        startScrapingBtn.style.opacity = '0.6';
    } else {
        startScrapingBtn.textContent = 'START SCRAPING';
        startScrapingBtn.disabled = false;
        startScrapingBtn.style.opacity = '1';
    }
}

// Handle start scraping button click
// Backend configuration - loaded from config.js
let currentSessionId = null;
let statusCheckInterval = null;

// Get backend URL from config
function getBackendUrl() {
    return window.APEX_CONFIG ? window.APEX_CONFIG.getBackendUrl() : 'http://localhost:5000';
}

// Get API URL for specific endpoint
function getApiUrl(endpoint) {
    if (window.APEX_CONFIG) {
        return window.APEX_CONFIG.getApiUrl(endpoint);
    }
    return `http://localhost:5000${endpoint}`;
}

async function handleStartScraping() {
    try {
        if (isAutomationRunning) {
            addLog('Automation already running, please wait...');
            return;
        }
        
        // Get settings from storage
        const result = await chrome.storage.sync.get(['settings']);
        const settings = result.settings;
        
        if (!settings) {
            addLog('Error: Please configure settings first');
            openOptionsPage();
            return;
        }
        
        // Validate required settings
        if (!settings.cardNumber || !settings.cvv) {
            addLog('Error: Please fill in payment details in settings');
            openOptionsPage();
            return;
        }
        
        updateStatus('processing', 'Starting automation in current window...');
        addLog('🚀 Starting APEX automation in current browser window...');
        
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            addLog('❌ No active tab found');
            updateStatus('error', 'Error');
            return;
        }
        
        // Check if we're on APEX dashboard
        if (!tab.url.includes('apextraderfunding.com')) {
            addLog('❌ Please navigate to APEX dashboard first');
            addLog('💡 Go to: https://dashboard.apextraderfunding.com/member');
            updateStatus('error', 'Navigate to APEX first');
            return;
        }
        
        addLog('✅ Found APEX dashboard, starting automation...');
        
        // Inject content script for same-window automation
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            addLog('✅ Content script injected');
        } catch (error) {
            addLog('⚠️ Content script might already be loaded');
        }
        
        // Wait for content script to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send automation command to content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'startAutomation',
                data: {
                    ...settings,
                    sessionId: sessionId
                }
            });
            
            if (response && response.success) {
                addLog('✅ Automation started in current window');
                updateStatus('processing', 'Processing accounts...');
            } else {
                throw new Error(response ? response.error : 'No response from content script');
            }
        } catch (error) {
            addLog(`❌ Error starting automation: ${error.message}`);
            updateStatus('error', 'Error');
            isAutomationRunning = false;
            updateButtonState();
            await savePersistentState();
            return;
        }
        
        // Start backend processing (optional - for logging and status)
        try {
            const backendUrl = getBackendUrl();
            addLog(`🔗 Connecting to backend for status updates: ${backendUrl}`);
            
            const response = await fetch(getApiUrl('START_AUTOMATION'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            currentSessionId = data.session_id;
            sessionId = currentSessionId;
            isAutomationRunning = true;
            
            // Update button state and save state
            updateButtonState();
            await savePersistentState();
            
            addLog(`✅ Automation started! Session: ${currentSessionId.substring(0, 8)}...`);
            updateStatus('processing', 'Processing accounts...');
            
            // Start polling for status updates
            startStatusPolling();
            
        } catch (error) {
            addLog(`❌ Error starting automation: ${error.message}`);
            
            // Check if backend is running
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                const backendUrl = getBackendUrl();
                addLog('💡 Make sure Python backend is running!');
                addLog(`💡 Backend URL: ${backendUrl}`);
                
                if (window.APEX_CONFIG && window.APEX_CONFIG.isLocalBackend()) {
                    addLog('💡 1. Open terminal in APEX_selenium_backend folder');
                    addLog('💡 2. Run: pip install -r requirements.txt');
                    addLog('💡 3. Run: python app.py');
                } else if (window.APEX_CONFIG && window.APEX_CONFIG.isNgrokBackend()) {
                    addLog('💡 1. Make sure ngrok is running: ngrok http 5000');
                    addLog('💡 2. Update BACKEND_URL in config.js with ngrok URL');
                } else {
                    addLog('💡 Check if backend server is accessible at the configured URL');
                }
            }
            
            updateStatus('error', 'Backend connection failed');
            isAutomationRunning = false;
            updateButtonState();
            await savePersistentState();
        }
        
    } catch (error) {
        console.error('Error starting scraping:', error);
        addLog(`Error: ${error.message}`);
        updateStatus('error', 'Error');
        isAutomationRunning = false;
        updateButtonState();
        await savePersistentState();
    }
}

// Poll backend for status updates
function startStatusPolling() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    statusCheckInterval = setInterval(async () => {
        if (!currentSessionId || !isAutomationRunning) {
            clearInterval(statusCheckInterval);
            return;
        }
        
        try {
            const response = await fetch(`${getApiUrl('GET_STATUS')}/${currentSessionId}`);
            
            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update status
            if (data.current_account > 0) {
                updateStatus('processing', `Processing account ${data.current_account}/${data.total_accounts}`);
            }
            
            // Add new logs
            if (data.logs && data.logs.length > 0) {
                const lastLogCount = parseInt(localStorage.getItem('lastLogCount') || '0');
                const newLogs = data.logs.slice(lastLogCount);
                
                newLogs.forEach(log => addLog(log));
                localStorage.setItem('lastLogCount', data.logs.length.toString());
            }
            
            // Check if completed
            if (data.status === 'completed') {
                addLog('🎉 All accounts processed successfully!');
                updateStatus('completed', 'Completed');
                isAutomationRunning = false;
                updateButtonState();
                await savePersistentState();
                clearInterval(statusCheckInterval);
                currentSessionId = null;
            } else if (data.status === 'completed_with_errors') {
                addLog('⚠️ Automation completed with some errors');
                updateStatus('completed', 'Completed with errors');
                isAutomationRunning = false;
                updateButtonState();
                await savePersistentState();
                clearInterval(statusCheckInterval);
                currentSessionId = null;
            } else if (data.status === 'error') {
                addLog('❌ Automation failed');
                updateStatus('error', 'Error');
                isAutomationRunning = false;
                updateButtonState();
                await savePersistentState();
                clearInterval(statusCheckInterval);
                currentSessionId = null;
            }
            
        } catch (error) {
            console.error('Status check error:', error);
            addLog(`⚠️ Status check error: ${error.message}`);
        }
    }, 2000); // Check every 2 seconds
}

// Stop automation
async function stopAutomation() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`${getApiUrl('STOP_AUTOMATION')}/${currentSessionId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            addLog('🛑 Automation stopped');
            updateStatus('stopped', 'Stopped');
            isAutomationRunning = false;
            updateButtonState();
            await savePersistentState();
            clearInterval(statusCheckInterval);
            currentSessionId = null;
        }
    } catch (error) {
        addLog(`Error stopping automation: ${error.message}`);
    }
}

// Open options page
function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}

// Update status display
function updateStatus(status, text) {
    statusElement.textContent = text;
    statusElement.className = `status ${status}`;
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'ready': return 'Ready';
        case 'processing': return 'Processing...';
        case 'stopped': return 'Stopped';
        case 'completed': return 'Completed';
        case 'error': return 'Error';
        default: return 'Ready';
    }
}

// Add log entry
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logsElement.appendChild(logEntry);
    logsElement.scrollTop = logsElement.scrollHeight;
    
    // Save state after adding log
    savePersistentState();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'updateStatus') {
        updateStatus(message.status, getStatusText(message.status));
        
        // Reset automation running flag when process completes
        if (['completed', 'stopped', 'error'].includes(message.status)) {
            isAutomationRunning = false;
            updateButtonState();
            
            if (message.status === 'completed') {
                addLog('✅ Process completed successfully');
            } else if (message.status === 'stopped') {
                addLog('🛑 Process stopped');
            } else if (message.status === 'error') {
                addLog('❌ Process failed');
            }
            
            // Save state after status change
            await savePersistentState();
            
            // Reset status after delay
            setTimeout(async () => {
                updateStatus('ready', 'Extension ready. Configure settings and start scraping.');
                await savePersistentState();
            }, 3000);
        }
    } else if (message.action === 'addLog') {
        addLog(message.message);
    }
});