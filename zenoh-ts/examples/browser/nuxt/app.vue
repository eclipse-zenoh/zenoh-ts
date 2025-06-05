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
        
        <!-- Publish / Subscribe Block -->
        <div class="operation-block">
          <h3 class="block-title">Publish / Subscribe Operations</h3>
          
          <!-- Declare Subscriber Operation -->
          <div class="operation-group">
            <h4>Declare Subscriber</h4>
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

          <!-- Put Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>Put</h4>
              <button 
                @click="putOptions.showOptions.value = !putOptions.showOptions.value" 
                class="options-arrow-btn"
                :class="{ active: putOptions.showOptions.value }"
                title="Toggle advanced options"
              >
                {{ putOptions.showOptions.value ? '▲' : '▼' }}
              </button>
            </div>
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
            
            <!-- Put Options Panel -->
            <div v-if="putOptions.showOptions.value" class="options-panel">
              <div class="options-grid">
                <div class="option-group">
                  <div class="encoding-header">
                    <label>Encoding:</label>
                    <label class="custom-checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="putOptions.customEncoding.value" 
                        :disabled="!isConnected"
                        class="custom-encoding-checkbox"
                      >
                      Custom
                    </label>
                  </div>
                  
                  <!-- Predefined Encoding Dropdown -->
                  <select 
                    v-if="!putOptions.customEncoding.value"
                    v-model="putOptions.encoding.value" 
                    :disabled="!isConnected"
                    class="encoding-select"
                    title="Select a predefined encoding"
                  >
                    <option value="">(default)</option>
                    <option 
                      v-for="option in encodingOptions" 
                      :key="option.value" 
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  
                  <!-- Custom Encoding Input -->
                  <input 
                    v-else
                    type="text" 
                    v-model="putOptions.encoding.value" 
                    :disabled="!isConnected"
                    placeholder="e.g., application/json, text/plain, my-custom-format"
                    class="encoding-text-input"
                    title="Enter a custom encoding string"
                  >
                </div>
                
                <div class="option-group">
                  <label>Priority:</label>
                  <select v-model="putOptions.priority.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
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
                  <select v-model="putOptions.congestionControl.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
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
                  <select v-model="putOptions.reliability.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
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
                  <select v-model="putOptions.allowedDestination.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
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
                  <label>Express (no batching):</label>
                  <div class="triple-checkbox">
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        value="default" 
                        v-model="putOptions.express.value" 
                        :disabled="!isConnected"
                      >
                      (default)
                    </label>
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        value="true" 
                        v-model="putOptions.express.value" 
                        :disabled="!isConnected"
                      >
                      True
                    </label>
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        value="false" 
                        v-model="putOptions.express.value" 
                        :disabled="!isConnected"
                      >
                      False
                    </label>
                  </div>
                </div>
                
                <div class="option-group attachment-group">
                  <label>Attachment:</label>
                  <div class="attachment-controls">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="putOptions.attachmentEmpty.value" 
                        :disabled="!isConnected"
                      >
                      (empty)
                    </label>
                    <input 
                      type="text" 
                      v-model="putOptions.attachment.value" 
                      placeholder="Optional attachment data"
                      :disabled="!isConnected || putOptions.attachmentEmpty.value"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Query / Reply Block -->
        <div class="operation-block">
          <h3 class="block-title">Query / Reply Operations</h3>
          
          <!-- Declare Queryable Operation (Placeholder) -->
          <div class="operation-group">
            <h4>Declare Queryable</h4>
            <div class="input-row">
              <input 
                type="text" 
                placeholder="Key expression (e.g., demo/example/computation/**)"
                :disabled="true"
              >
              <button :disabled="true">
                Create Queryable
              </button>
            </div>
            <p class="placeholder-note">Coming soon...</p>
          </div>

          <!-- Get Operation -->
          <div class="operation-group">
            <h4>Get</h4>
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
        </div>
        
        <!-- Test Section -->
        <div class="operation-group test-section">
          <h4>Development & Testing</h4>
          <div class="test-controls">
            <button 
              @click="testJSONLogging && testJSONLogging()" 
              class="test-btn"
              title="Test HTML-formatted JSON logging display"
            >
              🧪 Test JSON Logging
            </button>
            <p class="test-description">
              Shows clean JSON samples with contextual info in string messages
            </p>
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
            <div class="log-message">
              <span>{{ entry.message }}</span>
              <div 
                v-if="entry.jsonData"
                v-html="formatJSONData(entry.type, entry.jsonData)"
              ></div>
            </div>
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
  
  // Option arrays (now part of the state)
  priorityOptions,
  congestionControlOptions,
  reliabilityOptions,
  localityOptions,
  encodingOptions,
  
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
  
  // Development/Testing
  testJSONLogging,
} = await useZenohDemo();

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

// Clear encoding field when switching between custom and predefined modes
watch(putOptions.customEncoding, (isCustom) => {
  if (isCustom) {
    // Switching to custom mode - clear the field for user input
    putOptions.encoding.value = '';
  } else {
    // Switching to predefined mode - clear the field so user can select from dropdown
    putOptions.encoding.value = '';
  }
}, { immediate: false })

// JSON formatting functions moved from zenohUtils
const LOG_COLORS: Record<string, string> = {
  info: "#2563eb",      // blue
  success: "#16a34a",   // green
  error: "#dc2626",     // red
  data: "#7c3aed",      // purple
  warning: "#ea580c",   // orange
};

const JSON_COLORS = {
  key: "#059669",       // emerald
  string: "#dc2626",    // red
  number: "#2563eb",    // blue
  boolean: "#7c3aed",   // purple
  null: "#6b7280",      // gray
  bracket: "#374151",   // dark gray
};

/**
 * Pretty formats JSON with syntax highlighting for browser display
 */
function formatJSONWithColors(obj: any, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);
  const nextIndentStr = "  ".repeat(indent + 1);

  if (obj === null) {
    return `<span style="color: ${JSON_COLORS.null}">null</span>`;
  }

  if (typeof obj === "string") {
    return `<span style="color: ${JSON_COLORS.string}">"${obj}"</span>`;
  }

  if (typeof obj === "number") {
    return `<span style="color: ${JSON_COLORS.number}">${obj}</span>`;
  }

  if (typeof obj === "boolean") {
    return `<span style="color: ${JSON_COLORS.boolean}">${obj}</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">[]</span>`;
    }

    const items = obj.map((item, index) => {
      const formattedItem = formatJSONWithColors(item, indent + 1);
      const comma = index < obj.length - 1 ? "," : "";
      return `${nextIndentStr}${formattedItem}${comma}`;
    }).join('\n');

    return `<span style="color: ${JSON_COLORS.bracket}">[</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">]</span>`;
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">{}</span>`;
    }

    const items = keys.map((key, index) => {
      const formattedKey = `<span style="color: ${JSON_COLORS.key}">"${key}"</span>`;
      const formattedValue = formatJSONWithColors(obj[key], indent + 1);
      const comma = index < keys.length - 1 ? "," : "";
      return `${nextIndentStr}${formattedKey}: ${formattedValue}${comma}`;
    }).join('\n');

    return `<span style="color: ${JSON_COLORS.bracket}">{</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">}</span>`;
  }

  return String(obj);
}

/**
 * Formats JSON data with syntax highlighting for display
 */
function formatJSONData(type: string, jsonData: object): string {
  const typeColor = LOG_COLORS[type] || LOG_COLORS["info"];
  return `<pre style="margin: 8px 0 0 0; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid ${typeColor}; font-size: 0.9em;">${formatJSONWithColors(jsonData)}</pre>`;
}
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

.operation-block {
  margin-bottom: 24px;
  padding: 0;
  background: transparent;
}

.block-title {
  color: #495057;
  font-size: 1.1em;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
  letter-spacing: 0.5px;
}

.placeholder-note {
  font-size: 13px;
  color: #6c757d;
  font-style: italic;
  margin: 8px 0 0 0;
  text-align: center;
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

/* Styles for HTML-formatted JSON log messages */
.log-message div[style*="margin: 4px 0"] {
  margin: 0 !important;
  padding: 0;
}

.log-message pre {
  margin: 8px 0 !important;
  padding: 12px !important;
  background: #f8f9fa !important;
  border-radius: 6px !important;
  border-left: 3px solid var(--log-color, #ccc) !important;
  font-family: 'Courier New', Consolas, monospace !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  overflow-x: auto !important;
  white-space: pre-wrap !important;
}

/* Set CSS variables for log type colors */
.log-entry.info .log-message pre {
  --log-color: #2563eb;
}

.log-entry.success .log-message pre {
  --log-color: #16a34a;
}

.log-entry.error .log-message pre {
  --log-color: #dc2626;
}

.log-entry.data .log-message pre {
  --log-color: #7c3aed;
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
.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.operation-header h4 {
  margin: 0;
}

.options-arrow-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.options-arrow-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.options-arrow-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

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
  box-sizing: border-box;
  overflow: hidden;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  box-sizing: border-box;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-sizing: border-box;
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

/* Compact Encoding Field Styling */
.encoding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.encoding-header label:first-child {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.custom-checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #6c757d;
  cursor: pointer;
  user-select: none;
}

.custom-encoding-checkbox {
  margin: 0;
  cursor: pointer;
}

.encoding-select,
.encoding-text-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.encoding-select:disabled,
.encoding-text-input:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.encoding-select:focus,
.encoding-text-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Remove old encoding container styles */
.encoding-input-container {
  display: none;
}

.encoding-dropdown {
  display: none;
}

.encoding-help-text {
  display: none;
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
  box-sizing: border-box;
  max-width: 100%;
}

/* Triple checkbox styles for express option */
.triple-checkbox {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #495057;
  cursor: pointer;
  user-select: none;
}

.radio-label input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

/* Attachment controls */
.attachment-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-controls .checkbox-label {
  font-size: 13px;
  margin-bottom: 0;
}

.attachment-controls input[type="text"] {
  width: 100%;
}

/* Test section styles */
.test-section {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  background-color: #f8f9fa;
  margin-top: 16px;
}

.test-section h4 {
  color: #6c757d;
  margin-bottom: 12px;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-btn {
  background: linear-gradient(135deg, #6f42c1, #8b5cf6);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.test-btn:hover {
  background: linear-gradient(135deg, #5a2d91, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
}

.test-btn:active {
  transform: translateY(0);
}

.test-description {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
  font-style: italic;
}


</style>