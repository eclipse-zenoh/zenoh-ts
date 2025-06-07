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
              <h4>
                Subscriber
                <span v-if="!subscriberOptionsExpanded && subscriberParameters.key.value" class="header-keyexpr">
                  - {{ subscriberParameters.key.value }}
                </span>
              </h4>
              <div class="header-actions">
                <button @click="subscribe" :disabled="!isConnected || !subscriberParameters.key.value" class="operation-btn">
                  Declare
                </button>
                <CollapseButton
                  v-model:expanded="subscriberOptionsExpanded"
                />
              </div>
            </div>
            
            <!-- Subscriber Options Panel -->
            <div v-if="subscriberOptionsExpanded" class="options-panel">
              <div class="options-grid">
                <KeyExprInput 
                  v-model="subscriberParameters.key.value" 
                  label="Key Expression"
                  placeholder="Key expression (e.g., demo/example/**)"
                  :disabled="!isConnected"
                />
                <AllowedDestinationSelect
                  v-model="subscriberParameters.allowedOrigin.value"
                  :disabled="!isConnected"
                  :options="localityOptions"
                  label="Allowed Origin"
                />
              </div>
            </div>
            
            <!-- Active Subscribers List -->
            <div v-if="activeSubscribers.length > 0" class="active-items-list">
              <div class="item-entry" v-for="subscriberInfo in activeSubscribers" :key="subscriberInfo.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-key">{{ subscriberInfo.keyExpr }}</span>
                    <span class="item-id">{{ subscriberInfo.displayId }}</span>
                    <span class="item-time">{{ subscriberInfo.createdAt.toLocaleTimeString() }}</span>
                  </div>
                  <div class="item-actions">
                    <button 
                      @click="unsubscribe(subscriberInfo.displayId)" 
                      class="item-action-btn undeclare"
                      :disabled="!isConnected"
                    >
                      Undeclare
                    </button>
                    <CollapseButton
                      :expanded="expandedSubscriberDetails.has(subscriberInfo.displayId)"
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedSubscriberDetails.add(subscriberInfo.displayId) 
                      } else { 
                        expandedSubscriberDetails.delete(subscriberInfo.displayId) 
                      } }"
                    />
                  </div>
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedSubscriberDetails.has(subscriberInfo.displayId)" class="item-details">
                  <div class="details-content">
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'SubscriberOptions': subscriberInfo.options }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Put Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>
                Put
                <span v-if="!putOptionsExpanded && putParameters.key.value" class="header-keyexpr">
                  - {{ putParameters.key.value }}
                </span>
              </h4>
              <div class="header-actions">
                <button @click="performPut" :disabled="!isConnected || !putParameters.key.value || putParameters.valueEmpty.value" class="operation-btn">
                  Run
                </button>
                <CollapseButton
                  v-model:expanded="putOptionsExpanded"
                />
              </div>
            </div>
            
            <!-- Put Options Panel -->
            <div v-if="putOptionsExpanded" class="options-panel">
              <div class="options-grid">
                <KeyExprInput 
                  v-model="putParameters.key.value" 
                  label="Key Expression"
                  placeholder="Key expression (e.g., demo/example/test)"
                  :disabled="!isConnected"
                />
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
              <h4>
                Queryable
                <span v-if="!queryableOptionsExpanded && queryableParameters.key.value" class="header-keyexpr">
                  - {{ queryableParameters.key.value }}
                </span>
              </h4>
              <div class="header-actions">
                <button @click="declareQueryable" :disabled="!isConnected || !queryableParameters.key.value" class="operation-btn">
                  Declare
                </button>
                <CollapseButton
                  v-model:expanded="queryableOptionsExpanded"
                />
              </div>
            </div>
            
            <!-- Queryable Options Panel -->
            <div v-if="queryableOptionsExpanded" class="options-panel">
              <div class="options-grid">
                <KeyExprInput 
                  v-model="queryableParameters.key.value" 
                  label="Key Expression"
                  placeholder="Key expression (e.g., demo/example/computation/**)"
                  :disabled="!isConnected"
                />
                <TriStateCheckbox
                  v-model="queryableParameters.complete.value"
                  label="Complete"
                  :disabled="!isConnected"
                />
                
                <AllowedDestinationSelect
                  v-model="queryableParameters.allowedOrigin.value"
                  :disabled="!isConnected"
                  :options="localityOptions"
                  label="Allowed Origin"
                />
              </div>
            </div>
            
            <!-- Active Queryables List -->
            <div v-if="activeQueryables.length > 0" class="active-items-list">
              <div class="item-entry" v-for="queryableInfo in activeQueryables" :key="queryableInfo.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-key">{{ queryableInfo.keyExpr }}</span>
                    <span class="item-id">{{ queryableInfo.displayId }}</span>
                    <span class="item-time">{{ queryableInfo.createdAt.toLocaleTimeString() }}</span>
                  </div>
                  <div class="item-actions">
                    <CollapseButton
                      label="Edit reply"
                      :expanded="expandedResponseConfig.has(queryableInfo.displayId)"
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedResponseConfig.add(queryableInfo.displayId) 
                      } else { 
                        expandedResponseConfig.delete(queryableInfo.displayId) 
                      } }"
                    />
                    <button 
                      @click="undeclareQueryable(queryableInfo.displayId)" 
                      class="item-action-btn undeclare"
                      :disabled="!isConnected"
                    >
                      Undeclare
                    </button>
                    <CollapseButton
                      :expanded="expandedQueryableDetails.has(queryableInfo.displayId)"
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedQueryableDetails.add(queryableInfo.displayId) 
                      } else { 
                        expandedQueryableDetails.delete(queryableInfo.displayId) 
                      } }"
                    />
                  </div>
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedQueryableDetails.has(queryableInfo.displayId)" class="item-details">
                  <div class="details-content">
                    <!-- Edit Reply Section -->
                    <div class="edit-reply-section">
                      <!-- Individual Response Configuration Panel -->
                      <div v-if="expandedResponseConfig.has(queryableInfo.displayId)" class="response-config-content">
                        <div class="options-grid">
                            <!-- Response Type Selection -->
                            <ResponseTypeSelect
                              v-model="queryableInfo.responseParameters.replyType"
                              :name="`response-type-${queryableInfo.displayId}`"
                              :disabled="!isConnected"
                            />
                            
                            <!-- Reply Fields -->
                            <template v-if="queryableInfo.responseParameters.replyType === 'reply'">
                              <KeyExprInput 
                                v-model="queryableInfo.responseParameters.reply.keyExpr"
                                label="Key Expression"
                                placeholder="Normally the queryable keyexpr"
                                :disabled="!isConnected"
                              />
                              
                              <PayloadInput
                                v-model="queryableInfo.responseParameters.reply.payload"
                                v-model:is-empty="queryableInfo.responseParameters.reply.payloadEmpty"
                                label="Payload"
                                placeholder="Payload content for successful reply"
                                :disabled="!isConnected"
                              />
                              
                              <EncodingSelect 
                                v-model="queryableInfo.responseParameters.reply.encoding"
                                v-model:custom-encoding="queryableInfo.responseParameters.reply.customEncoding"
                                :encoding-options="encodingOptions"
                                :disabled="!isConnected"
                              />
                              
                              <PrioritySelect 
                                v-model="queryableInfo.responseParameters.reply.priority" 
                                :disabled="!isConnected"
                                :options="priorityOptions"
                              />
                              
                              <CongestionControlSelect
                                v-model="queryableInfo.responseParameters.reply.congestionControl"
                                :disabled="!isConnected"
                                :options="congestionControlOptions"
                              />
                              
                              <ExpressSelect
                                v-model="queryableInfo.responseParameters.reply.express"
                                :disabled="!isConnected"
                              />
                              
                              <PayloadInput
                                v-model="queryableInfo.responseParameters.reply.attachment"
                                v-model:is-empty="queryableInfo.responseParameters.reply.attachmentEmpty"
                                label="Attachment"
                                placeholder="Optional attachment data"
                                :disabled="!isConnected"
                              />
                            </template>
                            
                            <!-- ReplyErr Fields -->
                            <template v-if="queryableInfo.responseParameters.replyType === 'replyErr'">
                              <PayloadInput
                                v-model="queryableInfo.responseParameters.replyErr.payload"
                                v-model:is-empty="queryableInfo.responseParameters.replyErr.payloadEmpty"
                                label="Error Payload"
                                placeholder="Error message or payload"
                                :disabled="!isConnected"
                              />
                              
                              <EncodingSelect 
                                v-model="queryableInfo.responseParameters.replyErr.encoding"
                                v-model:custom-encoding="queryableInfo.responseParameters.replyErr.customEncoding"
                                :encoding-options="encodingOptions"
                                :disabled="!isConnected"
                              />
                            </template>
                          </div>
                        </div> <!-- End response-config-content -->
                    </div>

                    <!-- Queryable Options Display -->
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'QueryableOptions': queryableInfo.options }"
                    />

                    <!-- Display Reply Parameters when reply type is "reply" -->
                    <div v-if="queryableInfo.responseParameters.replyType === 'reply'" class="reply-parameters">
                      <!-- Key Expression Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'reply keyexpr': queryableInfo.responseParameters.reply.keyExpr }"
                      />
                      
                      <!-- Payload Parameter -->
                      <ParameterDisplay
                        v-if="!queryableInfo.responseParameters.reply.payloadEmpty"
                        type="neutral" 
                        :data="{ 'reply payload': queryableInfo.responseParameters.reply.payload }"
                      />
                      
                      <!-- ReplyOptions Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'ReplyOptions': queryableInfo.responseParameters.getReplyOptionsJSON() }"
                      />
                    </div>
                    
                    <!-- Display ReplyErr Parameters when reply type is "replyErr" -->
                    <div v-if="queryableInfo.responseParameters.replyType === 'replyErr'" class="reply-err-parameters">
                      <!-- Payload Parameter -->
                      <ParameterDisplay 
                        v-if="!queryableInfo.responseParameters.replyErr.payloadEmpty"
                        type="neutral" 
                        :data="{ 'reply error payload': queryableInfo.responseParameters.replyErr.payload }"
                      />
                      
                      <!-- ReplyErrOptions Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'ReplyErrOptions': queryableInfo.responseParameters.getReplyErrOptionsJSON() }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Get Operation -->
          <div class="operation-group">
            <div class="operation-header">
              <h4>
                Get
                <span v-if="!getOptionsExpanded && getParameters.key.value" class="header-keyexpr">
                  - {{ getParameters.key.value }}
                </span>
              </h4>
              <div class="header-actions">
                <button @click="performGet" :disabled="!isConnected || !getParameters.key.value" class="operation-btn">
                  Run
                </button>
                <CollapseButton
                  v-model:expanded="getOptionsExpanded"
                />
              </div>
            </div>
            
            <!-- Get Options Panel -->
            <div v-if="getOptionsExpanded" class="options-panel">
              <div class="options-grid">
                <KeyExprInput 
                  v-model="getParameters.key.value" 
                  label="Selector"
                  placeholder="Selector (e.g., demo/example/*)"
                  :disabled="!isConnected"
                />
                <EncodingSelect 
                  v-model="getParameters.encoding.value"
                  v-model:custom-encoding="getParameters.customEncoding.value"
                  :encoding-options="encodingOptions"
                  :disabled="!isConnected"
                />
                
                <PrioritySelect 
                  v-model="getParameters.priority.value" 
                  :disabled="!isConnected"
                  :options="priorityOptions"
                />
                
                <CongestionControlSelect
                  v-model="getParameters.congestionControl.value"
                  :disabled="!isConnected"
                  :options="congestionControlOptions"
                />
                
                <AllowedDestinationSelect
                  v-model="getParameters.allowedDestination.value"
                  :disabled="!isConnected"
                  :options="localityOptions"
                />
                
                <ExpressSelect
                  v-model="getParameters.express.value"
                  :disabled="!isConnected"
                />
                
                <PayloadInput
                  v-model="getParameters.payload.value"
                  v-model:is-empty="getParameters.payloadEmpty.value"
                  label="Payload"
                  placeholder="Optional query payload"
                  :disabled="!isConnected"
                />
                
                <PayloadInput
                  v-model="getParameters.attachment.value"
                  v-model:is-empty="getParameters.attachmentEmpty.value"
                  label="Attachment"
                  placeholder="Optional attachment data"
                  :disabled="!isConnected"
                />
                
                <div class="option-group">
                  <label>Timeout (ms):</label>
                  <input 
                    type="number" 
                    v-model="getParameters.timeout.value" 
                    placeholder="10000"
                    min="0"
                    :disabled="!isConnected"
                  >
                </div>
                
                <div class="option-group">
                  <label>Target:</label>
                  <select v-model="getParameters.target.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option value="BEST_MATCHING">BEST_MATCHING</option>
                    <option value="ALL">ALL</option>
                    <option value="ALL_COMPLETE">ALL_COMPLETE</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Consolidation:</label>
                  <select v-model="getParameters.consolidation.value" :disabled="!isConnected">
                    <option :value="undefined">(default)</option>
                    <option value="NONE">NONE</option>
                    <option value="MONOTONIC">MONOTONIC</option>
                    <option value="LATEST">LATEST</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Accept Replies:</label>
                  <select v-model="getParameters.acceptReplies.value" :disabled="!isConnected">
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
// Import components
import CollapseButton from './components/CollapseButton.vue'
import ResponseTypeSelect from './components/ResponseTypeSelect.vue'

// Use the Zenoh composable
const {
  // State
  serverUrl,
  isConnected,
  isConnecting,
  putParameters,
  logEntries,
  activeSubscribers,
  activeQueryables,
  subscriberParameters,
  queryableParameters,
  getParameters,
  
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
const expandedResponseConfig = ref<Set<string>>(new Set())

// State to track expanded options panels for operations
const subscriberOptionsExpanded = ref(false)
const putOptionsExpanded = ref(false)
const queryableOptionsExpanded = ref(false)
const getOptionsExpanded = ref(false)

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

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.input-row .option-group {
  flex: 1;
  margin-bottom: 0;
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

/* Add spacing between operation-header and any following content */
.operation-header + * {
  margin-top: 8px;
}

/* Remove the extra padding-bottom that was added to options-panel */

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

/* Edit reply section styling */
.edit-reply-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.response-config-content {
  margin-top: 8px;
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
  margin: 0;
  padding: 0;
}

.operation-header h4 {
  margin: 0;
}

.header-keyexpr {
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  font-weight: 500;
  color: #6c757d;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Container-specific sizing for CollapseButton components */
.header-actions .collapse-btn {
  width: 28px;
  height: 28px;
  padding: 6px 8px;
}

.item-actions .collapse-btn {
  height: 24px;
  padding: 2px 6px;
  font-size: 12px;
  min-width: auto;
}

.item-actions .collapse-btn .collapse-btn-label {
  font-size: 12px;
  font-weight: 500;
}

.item-actions .collapse-btn .collapse-btn-triangle {
  font-size: 10px;
}

.operation-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.operation-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.operation-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
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

/* Individual Response Configuration Styles */
.individual-response-config {
  margin-top: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.individual-response-config .reply-fields,
.individual-response-config .reply-err-fields {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  margin-bottom: 0;
}
</style>