<template>
  <ClientOnly>
    <div class="zenoh-container">
      <!-- Main Operations Panel -->
    <div class="main-panel">
      <!-- Operations Controls -->
      <div class="operations-panel">
        
        <!-- Session Section -->
        <OperationSection 
          title="Session" 
          icon="🔗" 
          section-class="session-section"
        >
          <!-- Open Operation -->
          <OperationGroup 
            title="Open" 
            :key-expr="serverUrl"
            v-model:options-expanded="sessionOptionsExpanded"
          >
            <template #actions>
              <button 
                @click="connect" 
                :disabled="isConnecting"
                class="compact-button btn-success"
              >
                <span v-if="isConnecting">Connecting...</span>
                <span v-else>Connect</span>
              </button>
            </template>
            
            <template #options>
              <ServerInput 
                v-model="serverUrl"
                :disabled="false"
              />
            </template>
            
            <!-- Active Sessions List -->
            <div v-if="activeSessions.length > 0" class="active-items-list">
              <div class="item-entry" v-for="sessionState in activeSessions" :key="sessionState.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-id">{{ sessionState.displayId }}</span>
                    <span class="item-key">{{ sessionState.serverUrl }}</span>
                    <span v-if="selectedSessionId === sessionState.displayId" class="item-selected">(selected)</span>
                  </div>
                  <div class="item-actions">
                    <button 
                      @click="selectSession(sessionState.displayId)"
                      :disabled="selectedSessionId === sessionState.displayId"
                      class="compact-button btn-info"
                    >
                      Select
                    </button>
                    <button 
                      @click="disconnect(sessionState.displayId)" 
                      class="compact-button btn-danger"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </OperationGroup>
          
          <!-- Info Operation -->
          <OperationGroup 
            title="Info"
            :show-options-toggle="false"
          >
            <template #actions>
              <button 
                @click="getSessionInfo" 
                :disabled="!selectedSessionId"
                class="compact-button btn-primary"
              >
                Run
              </button>
            </template>
          </OperationGroup>
        </OperationSection>

        <!-- Publish/Subscribe Section -->
        <OperationSection 
          title="Publish / Subscribe" 
          icon="📡" 
          section-class="pubsub-section"
          :disabled="!selectedSessionId"
        >
          <!-- Declare Subscriber Operation -->
          <OperationGroup 
            title="Subscriber" 
            :key-expr="subscriberParameters.key.value"
            v-model:options-expanded="subscriberOptionsExpanded"
          >
            <template #actions>
              <button @click="subscribe" :disabled="!selectedSessionId || !subscriberParameters.key.value" class="compact-button btn-primary">
                Declare
              </button>
            </template>
            
            <template #options>
              <KeyExprInput 
                v-model="subscriberParameters.key.value" 
                label="Key Expression"
                placeholder="Key expression (e.g., demo/example/**)"
                :disabled="!selectedSessionId"
              />
              <AllowedDestinationSelect
                v-model="subscriberParameters.allowedOrigin.value"
                :disabled="!selectedSessionId"
                :options="localityOptions"
                label="Allowed Origin"
              />
            </template>
            
            <!-- Active Subscribers List -->
            <div v-if="activeSubscribers.length > 0" class="active-items-list">
              <div class="item-entry" v-for="subscriberState in activeSubscribers" :key="subscriberState.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-session">{{ subscriberState.sessionId }}</span>
                    <span class="item-id">{{ subscriberState.displayId }}</span>
                    <span class="item-key">{{ subscriberState.keyExpr }}</span>
                  </div>
                  <div class="item-actions">
                    <CollapseButton
                      collapsedText="Info..."
                      expandedText="Close info"
                      :expanded="expandedSubscriberDetails.has(subscriberState.displayId)"
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedSubscriberDetails.add(subscriberState.displayId) 
                      } else { 
                        expandedSubscriberDetails.delete(subscriberState.displayId) 
                      } }"
                    />
                    <button 
                      @click="unsubscribe(subscriberState.displayId)" 
                      class="compact-button btn-danger"
                      :disabled="!selectedSessionId"
                    >
                      Undeclare
                    </button>
                  </div>
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedSubscriberDetails.has(subscriberState.displayId)" class="item-details">
                  <div class="details-content">
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'SubscriberOptions': subscriberState.options }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </OperationGroup>

          <!-- Put Operation -->
          <OperationGroup 
            title="Put" 
            :key-expr="putParameters.key.value"
            v-model:options-expanded="putOptionsExpanded"
          >
            <template #actions>
              <button @click="performPut" :disabled="!selectedSessionId || !putParameters.key.value || putParameters.valueEmpty.value" class="compact-button btn-primary">
                Run
              </button>
            </template>
            
            <template #options>
              <KeyExprInput 
                v-model="putParameters.key.value" 
                label="Key Expression"
                placeholder="Key expression (e.g., demo/example/test)"
                :disabled="!selectedSessionId"
              />
              <PayloadInput
                v-model="putParameters.value.value"
                v-model:is-empty="putParameters.valueEmpty.value"
                label="Payload"
                placeholder="Value to put"
                :disabled="!selectedSessionId"
              />
              
              <EncodingSelect 
                v-model="putParameters.encoding.value"
                v-model:custom-encoding="putParameters.customEncoding.value"
                :encoding-options="encodingOptions"
                :disabled="!selectedSessionId"
              />
              
              <PrioritySelect 
                v-model="putParameters.priority.value" 
                :disabled="!selectedSessionId"
                :options="priorityOptions"
              />
              
              <CongestionControlSelect
                v-model="putParameters.congestionControl.value"
                :disabled="!selectedSessionId"
                :options="congestionControlOptions"
              />
              
              <ReliabilitySelect
                v-model="putParameters.reliability.value"
                :disabled="!selectedSessionId"
                :options="reliabilityOptions"
              />
              
              <AllowedDestinationSelect
                v-model="putParameters.allowedDestination.value"
                :disabled="!selectedSessionId"
                :options="localityOptions"
              />
              
              <ExpressSelect
                v-model="putParameters.express.value"
                :disabled="!selectedSessionId"
              />
              
              <PayloadInput
                v-model="putParameters.attachment.value"
                v-model:is-empty="putParameters.attachmentEmpty.value"
                label="Attachment"
                placeholder="Optional attachment data"
                :disabled="!selectedSessionId"
              />
            </template>
          </OperationGroup>
        </OperationSection>

        <!-- Query/Reply Section -->
        <OperationSection 
          title="Query / Reply" 
          icon="🔍" 
          section-class="query-section"
          :disabled="!selectedSessionId"
        >
          <!-- Declare Queryable Operation -->
          <OperationGroup 
            title="Queryable" 
            :key-expr="queryableParameters.key.value"
            v-model:options-expanded="queryableOptionsExpanded"
          >
            <template #actions>
              <button @click="declareQueryable" :disabled="!selectedSessionId || !queryableParameters.key.value" class="compact-button btn-primary">
                Declare
              </button>
            </template>
            
            <template #options>
              <KeyExprInput 
                v-model="queryableParameters.key.value" 
                label="Key Expression"
                placeholder="Key expression (e.g., demo/example/computation/**)"
                :disabled="!selectedSessionId"
              />
              <TriStateCheckbox
                v-model="queryableParameters.complete.value"
                label="Complete"
                :disabled="!selectedSessionId"
              />
              
              <AllowedDestinationSelect
                v-model="queryableParameters.allowedOrigin.value"
                :disabled="!selectedSessionId"
                :options="localityOptions"
                label="Allowed Origin"
              />
            </template>
            
            <!-- Active Queryables List -->
            <div v-if="activeQueryables.length > 0" class="active-items-list">
              <div class="item-entry" v-for="queryableState in activeQueryables" :key="queryableState.displayId">
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-session">{{ queryableState.sessionId }}</span>
                    <span class="item-id">{{ queryableState.displayId }}</span>
                    <span class="item-key">{{ queryableState.keyExpr }}</span>
                  </div>
                  <div class="item-actions">
                    <CollapseButton
                      collapsedText="Info..."
                      expandedText="Close info"
                      :expanded="expandedQueryableDetails.has(queryableState.displayId)"
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedQueryableDetails.add(queryableState.displayId) 
                      } else { 
                        expandedQueryableDetails.delete(queryableState.displayId) 
                      } }"
                    />
                    <CollapseButton
                      label="Edit reply"
                      :expanded="expandedResponseConfig.has(queryableState.displayId)"
                      expanded-text="Close edit"
                      collapsed-text=""
                      @update:expanded="(value: boolean) => { if (value) { 
                        expandedResponseConfig.add(queryableState.displayId) 
                      } else { 
                        expandedResponseConfig.delete(queryableState.displayId) 
                      } }"
                    />
                    <button 
                      @click="undeclareQueryable(queryableState.displayId)" 
                      class="compact-button btn-danger"
                      :disabled="!selectedSessionId"
                    >
                      Undeclare
                    </button>
                  </div>
                </div>
                
                <!-- Edit Reply Section (Independent) -->
                <div v-if="expandedResponseConfig.has(queryableState.displayId)" class="edit-reply-section">
                  <div class="response-config-content">
                    <div class="options-grid">
                        <!-- Response Type Selection -->
                        <ResponseTypeSelect
                          v-model="queryableState.responseParameters.replyType"
                          :name="`response-type-${queryableState.displayId}`"
                          :disabled="!selectedSessionId"
                        />
                        
                        <!-- Reply Fields -->
                        <template v-if="queryableState.responseParameters.replyType === 'reply'">
                          <KeyExprInput 
                            v-model="queryableState.responseParameters.reply.keyExpr"
                            label="Key Expression"
                            placeholder="Normally the queryable keyexpr"
                            :disabled="!selectedSessionId"
                          />
                          
                          <PayloadInput
                            v-model="queryableState.responseParameters.reply.payload"
                            v-model:is-empty="queryableState.responseParameters.reply.payloadEmpty"
                            label="Payload"
                            placeholder="Payload content for successful reply"
                            :disabled="!selectedSessionId"
                          />
                          
                          <EncodingSelect 
                            v-model="queryableState.responseParameters.reply.encoding"
                            v-model:custom-encoding="queryableState.responseParameters.reply.customEncoding"
                            :encoding-options="encodingOptions"
                            :disabled="!selectedSessionId"
                          />
                          
                          <PrioritySelect 
                            v-model="queryableState.responseParameters.reply.priority" 
                            :disabled="!selectedSessionId"
                            :options="priorityOptions"
                          />
                          
                          <CongestionControlSelect
                            v-model="queryableState.responseParameters.reply.congestionControl"
                            :disabled="!selectedSessionId"
                            :options="congestionControlOptions"
                          />
                          
                          <ExpressSelect
                            v-model="queryableState.responseParameters.reply.express"
                            :disabled="!selectedSessionId"
                          />
                          
                          <CheckBox
                            v-model="queryableState.responseParameters.reply.useTimestamp"
                            label="Use timestamp"
                            :disabled="!selectedSessionId"
                            :three-state="false"
                          />
                          
                          <PayloadInput
                            v-model="queryableState.responseParameters.reply.attachment"
                            v-model:is-empty="queryableState.responseParameters.reply.attachmentEmpty"
                            label="Attachment"
                            placeholder="Optional attachment data"
                            :disabled="!selectedSessionId"
                          />
                        </template>
                        
                        <!-- ReplyErr Fields -->
                        <template v-if="queryableState.responseParameters.replyType === 'replyErr'">
                          <PayloadInput
                            v-model="queryableState.responseParameters.replyErr.payload"
                            v-model:is-empty="queryableState.responseParameters.replyErr.payloadEmpty"
                            label="Error Payload"
                            placeholder="Error message or payload"
                            :disabled="!selectedSessionId"
                          />
                          
                          <EncodingSelect 
                            v-model="queryableState.responseParameters.replyErr.encoding"
                            v-model:custom-encoding="queryableState.responseParameters.replyErr.customEncoding"
                            :encoding-options="encodingOptions"
                            :disabled="!selectedSessionId"
                          />
                        </template>
                        
                        <!-- Ignore Fields -->
                        <template v-if="queryableState.responseParameters.replyType === 'ignore'">
                          <div class="ignore-info">
                            <p class="ignore-description">
                              When <strong>Ignore</strong> is selected, queries will be received but no reply will be sent. 
                              Only <code>query.finalize()</code> will be called to acknowledge the query.
                            </p>
                          </div>
                        </template>
                      </div>
                    </div> <!-- End response-config-content -->
                </div>
                
                <!-- Expanded Details Section -->
                <div v-if="expandedQueryableDetails.has(queryableState.displayId)" class="item-details">
                  <div class="details-content">

                    <!-- Queryable Options Display -->
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'QueryableOptions': queryableState.options }"
                    />

                    <!-- Display Reply Parameters when reply type is "reply" -->
                    <div v-if="queryableState.responseParameters.replyType === 'reply'" class="reply-parameters">
                      <!-- Key Expression Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'reply keyexpr': queryableState.responseParameters.reply.keyExpr }"
                      />
                      
                      <!-- Payload Parameter -->
                      <ParameterDisplay
                        v-if="!queryableState.responseParameters.reply.payloadEmpty"
                        type="neutral" 
                        :data="{ 'reply payload': queryableState.responseParameters.reply.payload }"
                      />
                      
                      <!-- ReplyOptions Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'ReplyOptions': queryableState.responseParameters.reply.replyOptionsJSON }"
                      />
                    </div>
                    
                    <!-- Display ReplyErr Parameters when reply type is "replyErr" -->
                    <div v-if="queryableState.responseParameters.replyType === 'replyErr'" class="reply-err-parameters">
                      <!-- Payload Parameter -->
                      <ParameterDisplay 
                        v-if="!queryableState.responseParameters.replyErr.payloadEmpty"
                        type="neutral" 
                        :data="{ 'reply error payload': queryableState.responseParameters.replyErr.payload }"
                      />
                      
                      <!-- ReplyErrOptions Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'ReplyErrOptions': queryableState.responseParameters.replyErr.replyErrOptionsJSON }"
                      />
                    </div>
                    
                    <!-- Display Ignore Parameters when reply type is "ignore" -->
                    <div v-if="queryableState.responseParameters.replyType === 'ignore'" class="ignore-parameters">
                      <!-- Info Parameter -->
                      <ParameterDisplay 
                        type="neutral" 
                        :data="{ 'behavior': 'Queries will be received but no reply will be sent (only query.finalize() is called)' }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </OperationGroup>

          <!-- Get Operation -->
          <OperationGroup 
            title="Get" 
            :key-expr="getParameters.key.value"
            v-model:options-expanded="getOptionsExpanded"
          >
            <template #actions>
              <button @click="performGet" :disabled="!selectedSessionId || !getParameters.key.value" class="compact-button btn-primary">
                Run
              </button>
            </template>
            
            <template #options>
              <KeyExprInput 
                v-model="getParameters.key.value" 
                label="Selector"
                placeholder="Selector (e.g., demo/example/*)"
                :disabled="!selectedSessionId"
              />
              <EncodingSelect 
                v-model="getParameters.encoding.value"
                v-model:custom-encoding="getParameters.customEncoding.value"
                :encoding-options="encodingOptions"
                :disabled="!selectedSessionId"
              />
              
              <PrioritySelect 
                v-model="getParameters.priority.value" 
                :disabled="!selectedSessionId"
                :options="priorityOptions"
              />
              
              <CongestionControlSelect
                v-model="getParameters.congestionControl.value"
                :disabled="!selectedSessionId"
                :options="congestionControlOptions"
              />
              
              <AllowedDestinationSelect
                v-model="getParameters.allowedDestination.value"
                :disabled="!selectedSessionId"
                :options="localityOptions"
              />
              
              <ExpressSelect
                v-model="getParameters.express.value"
                :disabled="!selectedSessionId"
              />
              
              <PayloadInput
                v-model="getParameters.payload.value"
                v-model:is-empty="getParameters.payloadEmpty.value"
                label="Payload"
                placeholder="Optional query payload"
                :disabled="!selectedSessionId"
              />
              
              <PayloadInput
                v-model="getParameters.attachment.value"
                v-model:is-empty="getParameters.attachmentEmpty.value"
                label="Attachment"
                placeholder="Optional attachment data"
                :disabled="!selectedSessionId"
              />
              
              <TimeoutInput
                v-model="getParameters.timeout.value"
                v-model:is-empty="getParameters.timeoutEmpty.value"
                placeholder="Timeout (ms)"
                :disabled="!selectedSessionId"
              />
              
              <TargetSelect
                v-model="getParameters.target.value"
                :disabled="!selectedSessionId"
                :options="targetOptions"
              />
              
              <ConsolidationSelect
                v-model="getParameters.consolidation.value"
                :disabled="!selectedSessionId"
                :options="consolidationOptions"
              />
              
              <AcceptRepliesSelect
                v-model="getParameters.acceptReplies.value"
                :disabled="!selectedSessionId"
                :options="acceptRepliesOptions"
              />
            </template>
          </OperationGroup>
        </OperationSection>
        
      </div>

      <!-- Log Panel -->
      <div class="log-panel">
        <div class="log-header">
          <h3>
            <span class="status-dot" :class="{ connected: isConnected, connecting: isConnecting }"></span>
            Activity Log
          </h3>
          <button @click="clearLog" class="compact-button btn-warning">Clear</button>
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
import { onBeforeUnmount, onUnmounted } from 'vue'

// Import components
import CollapseButton from './components/CollapseButton.vue'
import ResponseTypeSelect from './components/ResponseTypeSelect.vue'
import ServerInput from './components/ServerInput.vue'
import TimeoutInput from './components/TimeoutInput.vue'
import TargetSelect from './components/TargetSelect.vue'
import ConsolidationSelect from './components/ConsolidationSelect.vue'
import AcceptRepliesSelect from './components/AcceptRepliesSelect.vue'
import KeyExprInput from './components/KeyExprInput.vue'
import AllowedDestinationSelect from './components/AllowedDestinationSelect.vue'
import PayloadInput from './components/PayloadInput.vue'
import EncodingSelect from './components/EncodingSelect.vue'
import PrioritySelect from './components/PrioritySelect.vue'
import CongestionControlSelect from './components/CongestionControlSelect.vue'
import ReliabilitySelect from './components/ReliabilitySelect.vue'
import ExpressSelect from './components/ExpressSelect.vue'
import TriStateCheckbox from './components/TriStateCheckbox.vue'
import CheckBox from './components/CheckBox.vue'
import ParameterDisplay from './components/ParameterDisplay.vue'

// Use the Zenoh composable
const {
  // State
  serverUrl,
  isConnected,
  isConnecting,
  activeSessions,
  selectedSessionId,
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
  targetOptions,
  consolidationOptions,
  acceptRepliesOptions,
  
  // Operations
  connect,
  getSessionInfo,
  disconnect,
  selectSession,
  performPut,
  performGet,
  subscribe,
  unsubscribe,
  declareQueryable,
  undeclareQueryable,

  // App operations
  clearLog,
} = await useZenohDemo();

// Cleanup function to ensure proper disconnection
const cleanup = async () => {
  if (activeSessions.value.length > 0) {
    try {
      // Disconnect all active sessions
      for (const session of activeSessions.value) {
        await disconnect(session.displayId)
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Vue lifecycle hooks for cleanup
onBeforeUnmount(cleanup)

// Handle browser page unloads and HMR scenarios
if (import.meta.client) {
  // Clean up on page unload (covers browser refresh, tab close, etc.)
  window.addEventListener('beforeunload', cleanup)
  // Handle HMR module replacement (development only)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanup()
    })
  }
  // Clean up event listeners when component is destroyed
  onUnmounted(() => {
    window.removeEventListener('beforeunload', cleanup)
  })
}

// Template ref for log content
const logContent = ref<HTMLElement>()

// State to track expanded details for subscribers and queryables
const expandedSubscriberDetails = ref<Set<string>>(new Set())
const expandedQueryableDetails = ref<Set<string>>(new Set())
const expandedResponseConfig = ref<Set<string>>(new Set())

// State to track expanded options panels for operations
const sessionOptionsExpanded = ref(false)
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

// Watchers to update replyOptionsJSON and replyErrOptionsJSON when corresponding fields changes
watch(activeQueryables, (queryables) => {
  queryables.forEach(queryable => {
    // Set up watchers for reply parameters
    watch(
      () => ({
        reply: queryable.responseParameters.reply,
      }),
      () => {
        // Update replyOptionsJSON 
        queryable.responseParameters.reply.updateReplyOptionsJSON()
      },
      { deep: true, immediate: true }
    );

    // Set up watchers for replyErr parameters  
    watch(
      () => ({
        replyErr: queryable.responseParameters.replyErr,
      }),
      () => {
        // Update replyErrOptionsJSON 
        queryable.responseParameters.replyErr.updateReplyErrOptionsJSON()
      },
      { deep: true, immediate: true }
    );
  });
}, { deep: true, immediate: true })
</script>

<style>
/* Global button style overrides for Windows-style appearance */
.compact-button {
  padding: var(--compact-button-padding);
  font-size: var(--compact-label-font-size);
  font-family: 'MS Sans Serif', sans-serif;
  background: #f0f0f0;
  border: 1px outset #c0c0c0;
  border-radius: 0;
  cursor: pointer;
  color: #000;
}

.compact-button:hover:not(:disabled) {
  background: #e8e8e8;
}

.compact-button:active:not(:disabled) {
  border: 1px inset #c0c0c0;
  background: #d8d8d8;
}

.compact-button:disabled {
  color: #808080;
  background: #f0f0f0;
  cursor: not-allowed;
}

.compact-button.btn-success {
  background: #90ee90;
  border-color: #7fdd7f;
}

.compact-button.btn-primary {
  background: #add8e6;
  border-color: #87ceeb;
}

.compact-button.btn-danger {
  background: #ffb6c1;
  border-color: #ff9fac;
}

.compact-button.btn-warning {
  background: #ffd700;
  border-color: #ffcc00;
}

.compact-button.btn-info {
  background: #b0e0e6;
  border-color: #87ceeb;
}
</style>

<style scoped>
.zenoh-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: var(--compact-gap);
  font-family: Arial, sans-serif;
  box-sizing: border-box;
}

.main-panel {
  display: flex;
  flex: 1;
  gap: var(--compact-gap);
  overflow: hidden;
}

.operations-panel {
  width: 40%;
  background-color: white;
  padding: calc(var(--compact-gap) * 1.875); /* 15px with 8px base */
  border: none;
  border-radius: 0;
  overflow-y: auto;
  font-family: 'MS Sans Serif', sans-serif;
}

.operations-panel h3 {
  margin-top: 0;
  color: #333;
}

.operation-group {
  margin-bottom: calc(var(--compact-gap) * 1.5); /* 12px with 8px base */
  padding: var(--compact-gap);
  background-color: #f0f0f0;
  border: none;
  border-radius: 0;
  font-family: 'MS Sans Serif', sans-serif;
}

/* Add spacing between operation-header and any following content */
.operation-header + * {
  margin-top: var(--compact-gap);
}

.operation-block {
  margin-bottom: calc(var(--compact-gap) * 2); /* 16px with 8px base */
  padding: 0;
  background: #f0f0f0;
  font-family: 'MS Sans Serif', sans-serif;
}

/* Legacy operation-section styles - now handled by OperationSection component */

.block-title {
  color: #495057;
  font-size: 1.0em;
  font-weight: 500;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #e9ecef;
  letter-spacing: 0.3px;
}

.operation-group h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ccc;
  transition: background-color 0.3s;
  display: inline-block;
  margin-right: 8px;
}

.status-dot.connecting {
  background-color: #ff9800;
  animation: pulse 1s infinite;
}

.status-dot.connected {
  background-color: #4CAF50;
}

/* Legacy styles for status-indicator context (if still used elsewhere) */
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

/* Button group styling - app-specific */
.active-items-list {
  margin-top: var(--compact-gap);
  padding-top: var(--compact-gap);
  border-top: 1px solid #ddd;
}

.item-entry {
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  border: 1px solid #e9ecef;
  border-radius: var(--compact-gap);
  padding: var(--compact-gap) var(--compact-gap);
  margin-bottom: var(--compact-margin);
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
  align-items: flex-start;
  width: 100%;
  flex-wrap: wrap;
  gap: var(--compact-gap);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--compact-gap);
  min-width: 0; /* Allow shrinking */
}

.item-actions {
  display: flex;
  gap: var(--compact-margin);
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 1; /* Allow shrinking to enable wrapping */
}

.item-actions .compact-button {
  min-height: calc(var(--compact-input-height) * 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--compact-button-padding-v) * 0.8) calc(var(--compact-button-padding-h) * 0.8);
  font-size: calc(var(--compact-font-size) * 0.85);
  min-width: auto;
  box-sizing: border-box;
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
  padding: var(--compact-margin) var(--compact-gap);
  border-radius: var(--compact-border-radius);
  font-family: 'Courier New', monospace;
  font-weight: 500;
  font-size: var(--compact-font-size);
  color: #6c757d;
}

.item-session {
  background: #e3f2fd;
  padding: var(--compact-margin) var(--compact-gap);
  border-radius: var(--compact-border-radius);
  font-family: 'Courier New', monospace;
  font-weight: 500;
  font-size: var(--compact-font-size);
  color: #1976d2;
}

.item-selected {
  background: #c8e6c9;
  padding: var(--compact-margin) var(--compact-gap);
  border-radius: var(--compact-border-radius);
  font-weight: 500;
  font-size: var(--compact-font-size);
  color: #388e3c;
}

.item-time {
  font-style: italic;
  font-size: var(--compact-font-size);
  color: #6c757d;
}

/* Item action buttons now use shared compact-button classes */

/* Details expansion section */
.item-details {
  margin-top: var(--compact-gap);
  padding: var(--compact-gap);
  /* Classic Microsoft dialog box styling for info panels */
  background-color: #c0c0c0;
  border: 2px inset #c0c0c0;
  border-radius: 0;
  font-family: 'MS Sans Serif', sans-serif;
}

/* Edit reply section styling */
.edit-reply-section {
  margin-top: var(--compact-gap);
  margin-bottom: 12px;
  padding: var(--compact-gap);
  /* Classic Microsoft dialog box styling for edit panels */
  background-color: #c0c0c0;
  border: 2px inset #c0c0c0;
  border-radius: 0;
  font-family: 'MS Sans Serif', sans-serif;
}

.response-config-content {
  margin-top: var(--compact-gap);
}

.details-header {
  font-weight: 600;
  font-size: var(--compact-font-size);
  color: #495057;
  margin-bottom: var(--compact-gap);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: var(--compact-margin);
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

.log-header .compact-button {
  min-height: var(--compact-input-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.log-header h3 {
  margin: 0;
  color: #333;
}

/* Clear button now uses shared btn-warning class */

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
  padding: var(--compact-gap) 0;
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

.log-message > span {
  margin-bottom: var(--compact-gap);
  display: block;
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
  border-radius: var(--compact-gap) !important;
  border-left: var(--compact-border-radius) solid var(--log-color, #ccc) !important;
  font-family: 'Courier New', Consolas, monospace !important;
  font-size: var(--compact-font-size) !important;
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
  margin-left: var(--compact-gap);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--compact-gap);
}

.header-actions .compact-button {
  min-height: var(--compact-input-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Container-specific sizing for CollapseButton components using compact-button */
.header-actions .compact-button {
  width: auto;
  height: auto;
  padding: var(--compact-button-padding);
  font-size: var(--compact-font-size);
}

.item-actions .compact-button {
  /* Ensure consistent sizing with other item action buttons */
  height: auto;
  padding: calc(var(--compact-button-padding-v) * 0.8) calc(var(--compact-button-padding-h) * 0.6);
  font-size: calc(var(--compact-font-size) * 0.85);
  font-weight: 500;
  min-width: auto;
  width: auto;
  min-height: calc(var(--compact-input-height) * 0.7);
  border-radius: var(--compact-border-radius);
  flex-shrink: 0;
  line-height: normal;
  box-sizing: border-box;
}

.item-actions .compact-button .button-label {
  font-size: calc(var(--compact-label-font-size) * 0.9);
  font-weight: 500;
}

.item-actions .compact-button .button-text {
  font-size: calc(var(--compact-label-font-size) * 0.9);
  font-weight: 500;
}

.item-actions .compact-button .button-triangle {
  font-size: 8px;
}

/* Operation buttons now use shared compact-button classes */


.options-toggle {
  margin: 10px 0;
}

.options-toggle-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: var(--compact-gap);
  padding: var(--compact-padding);
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--compact-margin);
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
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  margin: 0 0 12px 0;
}

.reply-fields, .reply-err-fields {
  padding: var(--compact-gap);
  background-color: #f8f9fa;
  border-radius: var(--compact-border-radius);
  margin-bottom: var(--compact-gap);
  border: 1px solid #e9ecef;
}

.field-group {
  margin-bottom: var(--compact-gap);
}

.field-group label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: var(--compact-border-radius);
  font-size: var(--compact-label-font-size);
}

.field-group input,
.field-group textarea {
  width: 100%;
  padding: var(--compact-margin);
  border: 1px solid #ced4da;
  border-radius: var(--compact-border-radius);
  font-size: var(--compact-font-size);
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

/* Remove extra spacing from reply parameter sections */
.reply-parameters,
.reply-err-parameters {
  margin: 0;
  padding: 0;
}

/* Ignore info styling */
.ignore-info {
  padding: var(--compact-gap);
  background-color: #f8f9fa;
  border-radius: var(--compact-border-radius);
  border: 1px solid #e9ecef;
  margin-bottom: var(--compact-gap);
}

.ignore-description {
  margin: 0;
  color: #495057;
  font-size: var(--compact-font-size);
  line-height: 1.5;
}

.ignore-description code {
  background-color: #e9ecef;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>