<template>
  <ClientOnly>
    <div class="zenoh-container">
      <!-- Server Connection Panel -->
      <div class="server-panel">
      <div class="connection-controls">
        <div class="input-group">
          <label for="server-url">Zenoh Server</label>
          <div class="input-row">
            <input 
              type="text" 
              id="server-url" 
              v-model="serverUrl" 
              :disabled="isConnected"
              placeholder="ws://localhost:10000"
            >
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
            <div class="operation-header">
              <h4>Declare Subscriber</h4>
              <button 
                @click="subscriberOptions.showOptions.value = !subscriberOptions.showOptions.value" 
                class="options-arrow-btn"
                :class="{ active: subscriberOptions.showOptions.value }"
                title="Toggle advanced options"
              >
                {{ subscriberOptions.showOptions.value ? '▲' : '▼' }}
              </button>
            </div>
            <div class="input-row">
              <input 
                type="text" 
                v-model="subscribeKey" 
                placeholder="Key expression (e.g., demo/example/**)"
                :disabled="!isConnected"
              >
              <button @click="subscribe" :disabled="!isConnected || !subscribeKey">
                Declare Subscriber
              </button>
            </div>
            
            <!-- Subscriber Options Panel -->
            <div v-if="subscriberOptions.showOptions.value" class="options-panel">
              <div class="options-grid">
                <div class="option-group">
                  <label>Allowed Origin:</label>
                  <select v-model="subscriberOptions.allowedOrigin.value" :disabled="!isConnected">
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
              </div>
            </div>
            
            <!-- Active Subscribers List -->
            <div v-if="activeSubscribers.length > 0" class="active-items-list">
              <div class="item-entry" v-for="subscriber in activeSubscribers" :key="subscriber.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-key">{{ subscriber.keyExpr }}</span>
                    <span class="item-id">{{ subscriber.displayId }}</span>
                    <span class="item-time">{{ subscriber.createdAt.toLocaleTimeString() }}</span>
                  </div>
                  <div class="item-actions">
                    <button 
                      @click="toggleSubscriberDetails(subscriber.displayId)" 
                      class="item-action-btn details"
                      :class="{ active: expandedSubscriberDetails.has(subscriber.displayId) }"
                      title="Toggle details"
                    >
                      Details
                    </button>
                    <button 
                      @click="unsubscribe(subscriber.displayId)" 
                      class="item-action-btn undeclare"
                      :disabled="!isConnected"
                    >
                      Undeclare
                    </button>
                  </div>
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedSubscriberDetails.has(subscriber.displayId)" class="item-details">
                  <div class="details-content">
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'SubscriberOptions': subscriber.options }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Put Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>Put</h4>
              <button 
                @click="putParameters.showOptions.value = !putParameters.showOptions.value" 
                class="options-arrow-btn"
                :class="{ active: putParameters.showOptions.value }"
                title="Toggle advanced options"
              >
                {{ putParameters.showOptions.value ? '▲' : '▼' }}
              </button>
            </div>
            <div class="input-row">
              <input 
                type="text" 
                v-model="putParameters.key.value" 
                placeholder="Key expression (e.g., demo/example/test)"
                :disabled="!isConnected"
              >
              <button @click="performPut" :disabled="!isConnected || !putParameters.key.value || putParameters.valueEmpty.value">
                Put
              </button>
            </div>
            
            <!-- Put Options Panel -->
            <div v-if="putParameters.showOptions.value" class="options-panel">
              <div class="options-grid">
                <PayloadInput
                  v-model="putParameters.value.value"
                  v-model:is-empty="putParameters.valueEmpty.value"
                  label="Payload"
                  placeholder="Value to put"
                  :disabled="!isConnected"
                />
                
                <EncodingSelect 
                  v-model="putParameters.encoding.value"
                  v-model:custom-encoding="putParameters.customEncoding.value"
                  :encoding-options="encodingOptions"
                  :disabled="!isConnected"
                />
                
                <PrioritySelect 
                  v-model="putParameters.priority.value" 
                  :disabled="!isConnected"
                  :options="priorityOptions"
                />
                
                <CongestionControlSelect
                  v-model="putParameters.congestionControl.value"
                  :disabled="!isConnected"
                  :options="congestionControlOptions"
                />
                
                <ReliabilitySelect
                  v-model="putParameters.reliability.value"
                  :disabled="!isConnected"
                  :options="reliabilityOptions"
                />
                
                <AllowedDestinationSelect
                  v-model="putParameters.allowedDestination.value"
                  :disabled="!isConnected"
                  :options="localityOptions"
                />
                
                <ExpressSelect
                  v-model="putParameters.express.value"
                  :disabled="!isConnected"
                />
                
                <PayloadInput
                  v-model="putParameters.attachment.value"
                  v-model:is-empty="putParameters.attachmentEmpty.value"
                  label="Attachment"
                  placeholder="Optional attachment data"
                  :disabled="!isConnected"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Query / Reply Block -->
        <div class="operation-block">
          <h3 class="block-title">Query / Reply Operations</h3>
          
          <!-- Declare Queryable Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>Declare Queryable</h4>
              <button 
                @click="queryableParameters.showOptions.value = !queryableParameters.showOptions.value" 
                class="options-arrow-btn"
                :class="{ active: queryableParameters.showOptions.value }"
                title="Toggle advanced options"
              >
                {{ queryableParameters.showOptions.value ? '▲' : '▼' }}
              </button>
            </div>
            <div class="input-row">
              <input 
                type="text" 
                v-model="queryableParameters.key.value" 
                placeholder="Key expression (e.g., demo/example/computation/**)"
                :disabled="!isConnected"
              >
              <button @click="declareQueryable" :disabled="!isConnected || !queryableParameters.key.value">
                Declare Queryable
              </button>
            </div>
            
            <!-- Queryable Options Panel -->
            <div v-if="queryableParameters.showOptions.value" class="options-panel">
              <div class="options-grid">
                <div class="option-group">
                  <label>Complete:</label>
                  <select v-model="queryableParameters.complete.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option :value="true">true</option>
                    <option :value="false">false</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Allowed Origin:</label>
                  <select v-model="queryableParameters.allowedOrigin.value" :disabled="!isConnected">
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
              </div>
              
              <!-- Reply Configuration Section -->
              <div class="reply-config-section">
                <h5 class="section-subtitle">Query Response Configuration</h5>
                
                <!-- Reply Type Selection -->
                <div class="reply-type-selection">
                  <label class="radio-group-label">Response Type:</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input 
                        type="radio" 
                        value="reply" 
                        v-model="queryableParameters.replyType.value"
                        :disabled="!isConnected"
                      >
                      <span>Reply</span>
                    </label>
                    <label class="radio-option">
                      <input 
                        type="radio" 
                        value="replyErr" 
                        v-model="queryableParameters.replyType.value"
                        :disabled="!isConnected"
                      >
                      <span>ReplyErr</span>
                    </label>
                  </div>
                </div>
                
                <!-- Reply Fields -->
                <div v-if="queryableParameters.replyType.value === 'reply'" class="reply-fields">
                  <div class="field-group">
                    <label>Key Expression:</label>
                    <input 
                      type="text" 
                      v-model="queryableParameters.replyKeyExpr.value"
                      placeholder="Key expression for reply (e.g., demo/example/result)"
                      :disabled="!isConnected"
                    >
                  </div>
                  <div class="field-group">
                    <label>Payload:</label>
                    <textarea 
                      v-model="queryableParameters.replyPayload.value"
                      placeholder="Payload content for successful reply"
                      :disabled="!isConnected"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <!-- Reply Options -->
                  <div class="reply-options-grid">
                    <EncodingSelect
                      v-model="queryableParameters.replyEncoding.value"
                      v-model:custom-encoding="queryableParameters.replyCustomEncoding.value"
                      :encoding-options="encodingOptions"
                      :disabled="!isConnected"
                    />
                    <PrioritySelect 
                      v-model="queryableParameters.replyPriority.value" 
                      :disabled="!isConnected"
                      :options="priorityOptions"
                    />
                    <CongestionControlSelect
                      v-model="queryableParameters.replyCongestionControl.value"
                      :disabled="!isConnected"
                      :options="congestionControlOptions"
                    />
                    
                    <ExpressSelect
                      v-model="queryableParameters.replyExpress.value"
                      :disabled="!isConnected"
                    />
                    
                    <PayloadInput
                      v-model="queryableParameters.replyAttachment.value"
                      v-model:is-empty="queryableParameters.replyAttachmentEmpty.value"
                      label="Attachment"
                      placeholder="Optional attachment data"
                      :disabled="!isConnected"
                    />
                  </div>
                </div>
                
                <!-- ReplyErr Fields -->
                <div v-if="queryableParameters.replyType.value === 'replyErr'" class="reply-err-fields">
                  <div class="field-group">
                    <label>Error Payload:</label>
                    <textarea 
                      v-model="queryableParameters.replyErrPayload.value"
                      placeholder="Error message or payload"
                      :disabled="!isConnected"
                      rows="2"
                    ></textarea>
                  </div>
                  <EncodingSelect
                    v-model="queryableParameters.replyErrEncoding.value"
                    v-model:custom-encoding="queryableParameters.replyErrCustomEncoding.value"
                    :encoding-options="encodingOptions"
                    :disabled="!isConnected"
                  />
                </div>
              </div>
            </div>
            
            <!-- Active Queryables List -->
            <div v-if="activeQueryables.length > 0" class="active-items-list">
              <div class="item-entry" v-for="queryable in activeQueryables" :key="queryable.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-key">{{ queryable.keyExpr }}</span>
                    <span class="item-id">{{ queryable.displayId }}</span>
                    <span class="item-time">{{ queryable.createdAt.toLocaleTimeString() }}</span>
                  </div>
                  <div class="item-actions">
                    <button 
                      @click="toggleQueryableDetails(queryable.displayId)" 
                      class="item-action-btn details"
                      :class="{ active: expandedQueryableDetails.has(queryable.displayId) }"
                      title="Toggle details"
                    >
                      Details
                    </button>
                    <button 
                      @click="undeclareQueryable(queryable.displayId)" 
                      class="item-action-btn undeclare"
                      :disabled="!isConnected"
                    >
                      Undeclare
                    </button>
                  </div>
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedQueryableDetails.has(queryable.displayId)" class="item-details">
                  <div class="details-content">
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'QueryableOptions': queryable.options }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Get Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>Get</h4>
              <button 
                @click="getOptions.showOptions.value = !getOptions.showOptions.value" 
                class="options-arrow-btn"
                :class="{ active: getOptions.showOptions.value }"
                title="Toggle advanced options"
              >
                {{ getOptions.showOptions.value ? '▲' : '▼' }}
              </button>
            </div>
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
            
            <!-- Get Options Panel -->
            <div v-if="getOptions.showOptions.value" class="options-panel">
              <div class="options-grid">
                <EncodingSelect 
                  v-model="getOptions.encoding.value"
                  v-model:custom-encoding="getOptions.customEncoding.value"
                  :encoding-options="encodingOptions"
                  :disabled="!isConnected"
                />
                
                <PrioritySelect 
                  v-model="getOptions.priority.value" 
                  :disabled="!isConnected"
                  :options="priorityOptions"
                />
                
                <CongestionControlSelect
                  v-model="getOptions.congestionControl.value"
                  :disabled="!isConnected"
                  :options="congestionControlOptions"
                />
                
                <AllowedDestinationSelect
                  v-model="getOptions.allowedDestination.value"
                  :disabled="!isConnected"
                  :options="localityOptions"
                />
                
                <ExpressSelect
                  v-model="getOptions.express.value"
                  :disabled="!isConnected"
                />
                
                <PayloadInput
                  v-model="getOptions.payload.value"
                  v-model:is-empty="getOptions.payloadEmpty.value"
                  label="Payload"
                  placeholder="Optional query payload"
                  :disabled="!isConnected"
                />
                
                <PayloadInput
                  v-model="getOptions.attachment.value"
                  v-model:is-empty="getOptions.attachmentEmpty.value"
                  label="Attachment"
                  placeholder="Optional attachment data"
                  :disabled="!isConnected"
                />
                
                <div class="option-group">
                  <label>Timeout (ms):</label>
                  <input 
                    type="number" 
                    v-model="getOptions.timeout.value" 
                    placeholder="10000"
                    min="0"
                    :disabled="!isConnected"
                  >
                </div>
                
                <div class="option-group">
                  <label>Target:</label>
                  <select v-model="getOptions.target.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option value="BEST_MATCHING">BEST_MATCHING</option>
                    <option value="ALL">ALL</option>
                    <option value="ALL_COMPLETE">ALL_COMPLETE</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Consolidation:</label>
                  <select v-model="getOptions.consolidation.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option value="NONE">NONE</option>
                    <option value="MONOTONIC">MONOTONIC</option>
                    <option value="LATEST">LATEST</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Accept Replies:</label>
                  <select v-model="getOptions.acceptReplies.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option value="MATCHING_TAG">MATCHING_TAG</option>
                    <option value="MATCHING_TAG_AND_REPLIES">MATCHING_TAG_AND_REPLIES</option>
                    <option value="REPLIES">REPLIES</option>
                  </select>
                </div>
              </div>
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
            <div class="log-message">
              <span>{{ entry.message }}</span>
              <ParameterDisplay 
                v-if="entry.data"
                :type="entry.type"
                :data="entry.data"
              />
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
  putParameters,
  getKey,
  subscribeKey,
  logEntries,
  activeSubscribers,
  activeQueryables,
  subscriberOptions,
  queryableParameters,
  getOptions,
  
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
  declareQueryable,
  undeclareQueryable,

  // App operations
  clearLog,
} = await useZenohDemo();

// Template ref for log content
const logContent = ref<HTMLElement>()

// State to track expanded details for subscribers and queryables
const expandedSubscriberDetails = ref<Set<string>>(new Set())
const expandedQueryableDetails = ref<Set<string>>(new Set())

// Functions to toggle details expansion
function toggleSubscriberDetails(displayId: string) {
  if (expandedSubscriberDetails.value.has(displayId)) {
    expandedSubscriberDetails.value.delete(displayId)
  } else {
    expandedSubscriberDetails.value.add(displayId)
  }
}

function toggleQueryableDetails(displayId: string) {
  if (expandedQueryableDetails.value.has(displayId)) {
    expandedQueryableDetails.value.delete(displayId)
  } else {
    expandedQueryableDetails.value.add(displayId)
  }
}

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
  white-space: nowrap;
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
  margin-bottom: 12px;
  padding: 8px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.operation-block {
  margin-bottom: 16px;
  padding: 0;
  background: transparent;
}

.block-title {
  color: #495057;
  font-size: 1.1em;
  font-weight: 600;
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #e9ecef;
  letter-spacing: 0.5px;
}

.operation-group h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

/* Button group styling - app-specific */
.active-items-list {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
}

.item-entry {
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.item-entry:hover {
  background: linear-gradient(135deg, #f1f3f4, #f8f9fa);
  border-color: #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.item-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.item-key {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.item-id {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-weight: 500;
  font-size: 12px;
  color: #6c757d;
}

.item-time {
  font-style: italic;
  font-size: 12px;
  color: #6c757d;
}

.item-action-btn {
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.item-action-btn.undeclare {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
}

.item-action-btn.undeclare:hover {
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(220, 38, 38, 0.3);
}

.item-action-btn.details {
  background: white;
  border: 1px solid #dee2e6;
  color: #495057;
}

.item-action-btn.details:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(233, 236, 239, 0.3);
}

.item-action-btn.details.active {
  background: #f8f9fa;
  color: #495057;
  border-color: #dee2e6;
  box-shadow: 0 2px 6px rgba(248, 249, 250, 0.4);
}

.item-action-btn:active {
  transform: translateY(0);
}

.item-action-btn:disabled {
  background: #cccccc !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Details expansion section */
.item-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
  background: rgba(248, 249, 250, 0.5);
  border-radius: 4px;
  padding: 8px;
}

.details-header {
  font-weight: 600;
  font-size: 13px;
  color: #495057;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  margin-bottom: 8px;
}

.operation-header h4 {
  margin: 0;
}

.options-arrow-btn {
  background: white;
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
  background: #f8f9fa;
  color: #495057;
  border-color: #dee2e6;
}

.options-toggle {
  margin: 10px 0;
}

.options-toggle-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
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

/* App-specific styles that extend the shared components */

/* Reply configuration styles */
.reply-config-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #dee2e6;
}

.section-subtitle {
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  margin: 0 0 12px 0;
}

.reply-type-selection {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.radio-group-label {
  font-weight: 600;
  color: #495057;
  margin-right: 12px;
  min-width: 120px;
}

.radio-group {
  display: flex;
  gap: 15px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.radio-option:hover {
  background-color: #e9ecef;
}

.radio-option input[type="radio"] {
  cursor: pointer;
  margin: 0;
  accent-color: #2196F3;
}

.radio-option span {
  font-weight: 500;
  color: #495057;
}

.reply-fields, .reply-err-fields {
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.field-group {
  margin-bottom: 10px;
}

.field-group label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
  font-size: 0.8rem;
}

.field-group input,
.field-group textarea {
  width: 100%;
  padding: 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.field-group textarea {
  resize: vertical;
  font-family: inherit;
}

.reply-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>