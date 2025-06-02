<template>
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
            <button @click="toggleSubscribe" :disabled="!isConnected || !subscribeKey">
              {{ isSubscribed ? 'Unsubscribe' : 'Subscribe' }}
            </button>
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
            <span class="timestamp">{{ formatTime(entry.timestamp) }}</span>
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
</template>

<script setup lang="ts">
// Import Zenoh only on client side to avoid SSR issues with WASM
let zenohModule: any = null;
let Config: any, Session: any, KeyExpr: any, Publisher: any, Subscriber: any, ZBytes: any;

if (process.client) {
  zenohModule = await import('@eclipse-zenoh/zenoh-ts');
  ({ Config, Session, KeyExpr, Publisher, Subscriber, ZBytes } = zenohModule);
}

// Reactive state
const serverUrl = ref('ws://localhost:10000');
const isConnected = ref(false);
const isConnecting = ref(false);
const isSubscribed = ref(false);

// Operation inputs
const putKey = ref('demo/example/test');
const putValue = ref('Hello Zenoh!');
const getKey = ref('demo/example/*');
const subscribeKey = ref('demo/example/**');

// Log entries
interface LogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'data';
  message: string;
}

const logEntries = ref<LogEntry[]>([]);
const logContent = ref<HTMLElement>();

// Zenoh objects
let zenohSession: Session | null = null;
let subscriber: Subscriber | null = null;

// Methods
function addLogEntry(type: LogEntry['type'], message: string) {
  logEntries.value.push({
    timestamp: new Date(),
    type,
    message
  });
  
  // Auto-scroll to bottom
  nextTick(() => {
    if (logContent.value) {
      logContent.value.scrollTop = logContent.value.scrollHeight;
    }
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString();
}

function clearLog() {
  logEntries.value = [];
}

async function connect() {
  if (isConnecting.value || isConnected.value || !process.client || !Config || !Session) return;
  
  isConnecting.value = true;
  addLogEntry('info', `Attempting to connect to ${serverUrl.value}`);
  
  try {
    const config = new Config(serverUrl.value);
    
    zenohSession = await Session.open(config);
    isConnected.value = true;
    addLogEntry('success', `Successfully connected to ${serverUrl.value}`);
  } catch (error) {
    addLogEntry('error', `Failed to connect: ${error}`);
    zenohSession = null;
  } finally {
    isConnecting.value = false;
  }
}

async function disconnect() {
  if (!zenohSession) return;
  
  try {
    // Unsubscribe if active
    if (subscriber) {
      await subscriber.undeclare();
      subscriber = null;
      isSubscribed.value = false;
      addLogEntry('info', 'Unsubscribed from all subscriptions');
    }
    
    await zenohSession.close();
    zenohSession = null;
    isConnected.value = false;
    addLogEntry('success', 'Disconnected from Zenoh');
  } catch (error) {
    addLogEntry('error', `Error during disconnect: ${error}`);
  }
}

async function performPut() {
  if (!zenohSession || !putKey.value || !putValue.value || !process.client || !KeyExpr || !ZBytes) return;
  
  try {
    const keyExpr = KeyExpr.tryFrom(putKey.value);
    if (!keyExpr) {
      addLogEntry('error', `Invalid key expression: ${putKey.value}`);
      return;
    }
    
    const bytes = ZBytes.from(putValue.value);
    await zenohSession.put(keyExpr, bytes);
    addLogEntry('success', `PUT: ${putKey.value} = "${putValue.value}"`);
  } catch (error) {
    addLogEntry('error', `PUT failed: ${error}`);
  }
}

async function performGet() {
  if (!zenohSession || !getKey.value || !process.client) return;
  
  try {
    const selector = getKey.value;
    addLogEntry('info', `GET: Querying ${selector}`);
    
    const receiver = await zenohSession.get(selector);
    let resultCount = 0;
    
    while (true) {
      const reply = await receiver.recv();
      if (!reply) break;
      
      if (reply.result.tag === 'Sample') {
        const sample = reply.result.value;
        const keyStr = sample.keyExpr.toString();
        const valueStr = sample.payload.toString();
        addLogEntry('data', `GET result: ${keyStr} = "${valueStr}"`);
        resultCount++;
      } else {
        addLogEntry('error', `GET error: ${reply.result.value}`);
      }
    }
    
    addLogEntry('success', `GET completed: ${resultCount} results received`);
  } catch (error) {
    addLogEntry('error', `GET failed: ${error}`);
  }
}

async function toggleSubscribe() {
  if (!zenohSession || !subscribeKey.value || !process.client || !KeyExpr) return;
  
  if (isSubscribed.value && subscriber) {
    // Unsubscribe
    try {
      await subscriber.undeclare();
      subscriber = null;
      isSubscribed.value = false;
      addLogEntry('success', `Unsubscribed from ${subscribeKey.value}`);
    } catch (error) {
      addLogEntry('error', `Unsubscribe failed: ${error}`);
    }
  } else {
    // Subscribe
    try {
      const keyExpr = KeyExpr.tryFrom(subscribeKey.value);
      if (!keyExpr) {
        addLogEntry('error', `Invalid key expression: ${subscribeKey.value}`);
        return;
      }
      
      subscriber = await zenohSession.subscribe(keyExpr);
      isSubscribed.value = true;
      addLogEntry('success', `Subscribed to ${subscribeKey.value}`);
      
      // Handle incoming data
      (async () => {
        if (!subscriber) return;
        
        while (true) {
          const sample = await subscriber.recv();
          if (!sample) break;
          
          const keyStr = sample.keyExpr.toString();
          const valueStr = sample.payload.toString();
          const kindStr = sample.kind === 0 ? 'PUT' : sample.kind === 1 ? 'DELETE' : 'UNKNOWN';
          
          addLogEntry('data', `SUBSCRIPTION [${kindStr}]: ${keyStr} = "${valueStr}"`);
        }
      })().catch(error => {
        addLogEntry('error', `Subscription error: ${error}`);
      });
    } catch (error) {
      addLogEntry('error', `Subscribe failed: ${error}`);
    }
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (zenohSession) {
    disconnect();
  }
});

// Initial log entry
onMounted(() => {
  if (process.client) {
    addLogEntry('info', 'Zenoh-TS Demo initialized. Connect to a Zenoh router to start.');
  }
});
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
</style>