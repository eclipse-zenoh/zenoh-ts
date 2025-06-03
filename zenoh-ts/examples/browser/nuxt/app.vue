<template>
  <ClientOnly>
    <div class="zenoh-container">
      <!-- Server Connection Panel -->
      <div class="server-panel">
      <div class="connection-controls">
        <div class="input-group">
          <label for="server-url">Zenoh Server</label>
          <input 
            type="text" 
            id="server-url" 
            v-model="serverUrl" 
            :disabled="isConnected"
            placeholder="ws://localhost:10000"
          >
        </div>
        <div class="button-group">
          <button 
            @click="connect" 
            :disabled="isConnecting || isConnected"
            class="connect-btn"
          >
            {{ isConnecting ? 'Connecting...' : 'Connect' }}
          </button>
          <button 
            @click="disconnect" 
            :disabled="!isConnected"
            class="disconnect-btn"
          >
            Disconnect
          </button>
        </div>
      </div>
      
      <!-- Connection Status -->
      <div class="status-indicator" :class="{ connected: isConnected, connecting: isConnecting }">
        <span class="status-dot"></span>
        <span class="status-text">
          {{ isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- Main Operations Panel -->
    <div class="main-panel">
      <!-- Operations Controls -->
      <div class="operations-panel" :class="{ disabled: !isConnected }">
        <h3>Zenoh Operations</h3>
        
        <!-- Put Operation -->
        <div class="operation-group">
          <h4>Put Operation</h4>
          <div class="input-row">
            <input 
              type="text" 
              v-model="putKey" 
              placeholder="Key expression (e.g., demo/example/test)"
              :disabled="!isConnected"
            >
            <input 
              type="text" 
              v-model="putValue" 
              placeholder="Value"
              :disabled="!isConnected"
            >
            <button @click="performPut" :disabled="!isConnected || !putKey || !putValue">
              Put
            </button>
          </div>
          
          <!-- Put Options Toggle -->
          <div class="options-toggle">
            <button 
              @click="putOptions.showOptions = !putOptions.showOptions" 
              class="options-toggle-btn"
              :class="{ active: putOptions.showOptions }"
            >
              {{ putOptions.showOptions ? '▼' : '▶' }} Advanced Options
            </button>
          </div>
          
          <!-- Put Options Panel -->
          <div v-if="putOptions.showOptions" class="options-panel">
            <div class="options-grid">
              <div class="option-group">
                <label>Encoding:</label>
                <select v-model="putOptions.encoding" :disabled="!isConnected">
                  <option value="text/plain">text/plain</option>
                  <option value="application/json">application/json</option>
                  <option value="application/xml">application/xml</option>
                  <option value="zenoh/string">zenoh/string</option>
                  <option value="zenoh/bytes">zenoh/bytes</option>
                  <option value="application/octet-stream">application/octet-stream</option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Priority:</label>
                <select v-model.number="putOptions.priority" :disabled="!isConnected">
                  <option 
                    v-for="option in priorityOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Congestion Control:</label>
                <select v-model.number="putOptions.congestionControl" :disabled="!isConnected">
                  <option 
                    v-for="option in congestionControlOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Reliability:</label>
                <select v-model.number="putOptions.reliability" :disabled="!isConnected">
                  <option 
                    v-for="option in reliabilityOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Allowed Destination:</label>
                <select v-model.number="putOptions.allowedDestination" :disabled="!isConnected">
                  <option 
                    v-for="option in localityOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="option-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="putOptions.express" 
                    :disabled="!isConnected"
                  >
                  Express (no batching)
                </label>
              </div>
              
              <div class="option-group attachment-group">
                <label>Attachment:</label>
                <input 
                  type="text" 
                  v-model="putOptions.attachment" 
                  placeholder="Optional attachment data"
                  :disabled="!isConnected"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Get Operation -->
        <div class="operation-group">
          <h4>Get Operation</h4>
          <div class="input-row">
            <input 
              type="text" 
              v-model="getKey" 
              placeholder="Selector (e.g., demo/example/*)"
              :disabled="!isConnected"
            >
            <button @click="performGet" :disabled="!isConnected || !getKey">
              Get
            </button>
          </div>
        </div>

        <!-- Subscribe Operation -->
        <div class="operation-group">
          <h4>Subscribe Operation</h4>
          <div class="input-row">
            <input 
              type="text" 
              v-model="subscribeKey" 
              placeholder="Key expression (e.g., demo/example/**)"
              :disabled="!isConnected"
            >
            <button @click="subscribe" :disabled="!isConnected || !subscribeKey">
              Subscribe
            </button>
          </div>
          
          <!-- Active Subscribers List -->
          <div v-if="activeSubscribers.length > 0" class="subscribers-list">
            <h5>Active Subscribers ({{ activeSubscribers.length }})</h5>
            <div class="subscriber-item" v-for="subscriber in activeSubscribers" :key="subscriber.displayId">
              <div class="subscriber-info">
                <span class="subscriber-key">{{ subscriber.keyExpr }}</span>
                <div class="subscriber-meta">
                  <span class="subscriber-id">{{ subscriber.displayId }}</span>
                  <span class="subscriber-time">Since: {{ subscriber.createdAt.toLocaleTimeString() }}</span>
                </div>
              </div>
              <button 
                @click="unsubscribe(subscriber.displayId)" 
                class="unsubscribe-btn"
                :disabled="!isConnected"
              >
                Unsubscribe
              </button>
            </div>
            <div class="subscribers-actions">
              <button 
                @click="unsubscribeAll" 
                class="unsubscribe-all-btn"
                :disabled="!isConnected"
              >
                Unsubscribe All
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Log Panel -->
      <div class="log-panel">
        <div class="log-header">
          <h3>Operations Log</h3>
          <button @click="clearLog" class="clear-btn">Clear</button>
        </div>
        <div class="log-content" ref="logContent">
          <div 
            v-for="(entry, index) in logEntries" 
            :key="index" 
            class="log-entry"
            :class="entry.type"
          >
            <span class="timestamp">{{ entry.timestamp.toLocaleTimeString() }}</span>
            <span class="log-type">[{{ entry.type.toUpperCase() }}]</span>
            <span class="log-message">{{ entry.message }}</span>
          </div>
          <div v-if="logEntries.length === 0" class="empty-log">
            No operations logged yet. Connect to Zenoh and try some operations!
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <template #fallback>
    <div class="loading-container">
      <div class="loading-message">
        <h2>Loading Zenoh Demo...</h2>
        <p>Initializing WASM modules...</p>
      </div>
    </div>
  </template>
  </ClientOnly>
</template>

<script setup lang="ts">
// Import option arrays as global variables
import { 
  priorityOptions, 
  congestionControlOptions, 
  reliabilityOptions, 
  localityOptions 
} from "./composables/zenohDemo"

// Use the Zenoh composable
const {
  // State
  serverUrl,
  isConnected,
  isConnecting,
  putKey,
  putValue,
  getKey,
  subscribeKey,
  logEntries,
  activeSubscribers,
  putOptions,
  
  // Operations
  connect,
  disconnect,
  performPut,
  performGet,
  subscribe,
  unsubscribe,
  unsubscribeAll,

  // App operations
  clearLog,
} = await useZenoh()

// Template ref for log content
const logContent = ref<HTMLElement>()

// Auto-scroll to bottom when new log entries are added
watch(logEntries, () => {
  nextTick(() => {
    if (logContent.value) {
      logContent.value.scrollTop = logContent.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<style scoped>
.zenoh-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 10px;
  font-family: Arial, sans-serif;
  box-sizing: border-box;
}

.server-panel {
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.connection-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.input-group label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.input-group input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 10px;
}

.connect-btn, .disconnect-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.connect-btn {
  background-color: #4CAF50;
  color: white;
}

.connect-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.disconnect-btn {
  background-color: #f44336;
  color: white;
}

.disconnect-btn:hover:not(:disabled) {
  background-color: #da190b;
}

.connect-btn:disabled, .disconnect-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ccc;
  transition: background-color 0.3s;
}

.status-indicator.connecting .status-dot {
  background-color: #ff9800;
  animation: pulse 1s infinite;
}

.status-indicator.connected .status-dot {
  background-color: #4CAF50;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-weight: bold;
  color: #333;
}

.main-panel {
  display: flex;
  flex: 1;
  gap: 10px;
  overflow: hidden;
}

.operations-panel {
  width: 40%;
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  overflow-y: auto;
}

.operations-panel.disabled {
  opacity: 0.6;
}

.operations-panel h3 {
  margin-top: 0;
  color: #333;
}

.operation-group {
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.operation-group h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-row input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.input-row button {
  padding: 6px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.input-row button:hover:not(:disabled) {
  background-color: #0b7dda;
}

.input-row button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.subscribers-list {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ddd;
}

.subscribers-list h5 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 14px;
}

.subscriber-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin-bottom: 8px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.subscriber-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  margin-right: 10px;
}

.subscriber-key {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #333;
  flex: 1;
}

.subscriber-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: right;
}

.subscriber-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
  font-weight: bold;
  min-width: 40px;
}

.subscriber-time {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.unsubscribe-btn {
  padding: 4px 8px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.unsubscribe-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.unsubscribe-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.subscribers-actions {
  margin-top: 10px;
  text-align: center;
}

.unsubscribe-all-btn {
  padding: 6px 12px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.unsubscribe-all-btn:hover:not(:disabled) {
  background-color: #5a6268;
}

.unsubscribe-all-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.log-panel {
  width: 60%;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #ddd;
}

.log-header h3 {
  margin: 0;
  color: #333;
}

.clear-btn {
  padding: 6px 12px;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.clear-btn:hover {
  background-color: #e68900;
}

.log-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background-color: white;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-entry:last-child {
  border-bottom: none;
}

.timestamp {
  color: #666;
  min-width: 80px;
}

.log-type {
  font-weight: bold;
  min-width: 60px;
}

.log-entry.info .log-type {
  color: #2196F3;
}

.log-entry.success .log-type {
  color: #4CAF50;
}

.log-entry.error .log-type {
  color: #f44336;
}

.log-entry.data .log-type {
  color: #ff9800;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.empty-log {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 40px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-message {
  text-align: center;
  color: white;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.loading-message h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.loading-message p {
  margin: 0;
  opacity: 0.8;
}

/* PUT Options Styling */
.options-toggle {
  margin: 10px 0;
}

.options-toggle-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.options-toggle-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.options-toggle-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.options-panel {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.option-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.option-group select,
.option-group input[type="text"] {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.option-group select:disabled,
.option-group input[type="text"]:disabled {
  background: #f8f9fa;
  color: #6c757d;
}

.checkbox-label {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  font-weight: 600 !important;
  color: #495057 !important;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.attachment-group {
  grid-column: 1 / -1; /* Span full width */
}

.attachment-group input[type="text"] {
  width: 100%;
}
</style>