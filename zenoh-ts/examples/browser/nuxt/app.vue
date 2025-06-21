<template>
  <ClientOnly>
    <div class="zenoh-container">
      <!-- Main Operations Panel -->
      <div class="main-panel">
        <!-- Entity Controls -->
        <div class="entity-panel">
          <!-- Session Section -->
          <EntityGroup
            title="Session"
            icon="🔗"
            section-class="session-section"
          >
            <!-- Open Operation -->
            <Entity
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
                <ServerInput v-model="serverUrl" :disabled="false" />
              </template>

              <!-- Active Sessions as Sub-entities -->
              <template #sub-entities>
                <Entity
                  v-for="sessionState in activeSessions"
                  :key="sessionState.displayId"
                  :title="`${sessionState.displayId}${
                    selectedSessionId === sessionState.displayId
                      ? ' (selected)'
                      : ''
                  }`"
                  :key-expr="sessionState.serverUrl"
                >
                  <template #actions>
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
                  </template>

                  <!-- Info as reactive slot -->
                  <template #info>
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{
                        'Session ID': sessionState.displayId,
                        'Server URL': sessionState.serverUrl,
                        'Created At': sessionState.createdAt.toLocaleString(),
                        Status:
                          selectedSessionId === sessionState.displayId
                            ? 'Selected'
                            : 'Connected',
                      }"
                    />
                  </template>
                </Entity>
              </template>
            </Entity>

            <!-- Info Operation -->
            <Entity title="Info">
              <template #actions>
                <button
                  @click="getSessionInfo"
                  :disabled="!selectedSessionId"
                  class="compact-button btn-primary"
                >
                  Run
                </button>
              </template>
            </Entity>
          </EntityGroup>

          <!-- Publish/Subscribe Section -->
          <EntityGroup
            title="Publish / Subscribe"
            icon="📡"
            section-class="pubsub-section"
            :disabled="!selectedSessionId"
          >
            <!-- Declare Subscriber Operation -->
            <Entity
              title="Subscriber"
              :key-expr="subscriberParameters.key.value"
              v-model:options-expanded="subscriberOptionsExpanded"
            >
              <template #actions>
                <button
                  @click="subscribe"
                  :disabled="
                    !selectedSessionId || !subscriberParameters.key.value
                  "
                  class="compact-button btn-primary"
                >
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

              <!-- Active Subscribers as Sub-entities -->
              <template #sub-entities>
                <Entity
                  v-for="subscriberState in activeSubscribers"
                  :key="subscriberState.displayId"
                  :title="`${subscriberState.sessionId} - ${subscriberState.displayId}`"
                  :key-expr="subscriberState.keyExpr"
                >
                  <template #actions>
                    <button
                      @click="unsubscribe(subscriberState.displayId)"
                      class="compact-button btn-danger"
                      :disabled="!selectedSessionId"
                    >
                      Undeclare
                    </button>
                  </template>

                  <!-- Info as reactive slot -->
                  <template #info>
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'SubscriberOptions': subscriberState.options }"
                    />
                  </template>
                </Entity>
              </template>
            </Entity>

            <!-- Put Operation -->
            <Entity
              title="Put"
              :key-expr="putParameters.key.value"
              v-model:options-expanded="putOptionsExpanded"
            >
              <template #actions>
                <button
                  @click="performPut"
                  :disabled="
                    !selectedSessionId ||
                    !putParameters.key.value ||
                    putParameters.valueEmpty.value
                  "
                  class="compact-button btn-primary"
                >
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
            </Entity>
          </EntityGroup>

          <!-- Query/Reply Section -->
          <EntityGroup
            title="Query / Reply"
            icon="🔍"
            section-class="query-section"
            :disabled="!selectedSessionId"
          >
            <!-- Declare Queryable Operation -->
            <Entity
              title="Queryable"
              :key-expr="queryableParameters.key.value"
              v-model:options-expanded="queryableOptionsExpanded"
            >
              <template #actions>
                <button
                  @click="declareQueryable"
                  :disabled="
                    !selectedSessionId || !queryableParameters.key.value
                  "
                  class="compact-button btn-primary"
                >
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

              <!-- Active Queryables as Sub-entities -->
              <template #sub-entities>
                <Entity
                  v-for="queryableState in activeQueryables"
                  :key="queryableState.displayId"
                  :title="`${queryableState.sessionId} - ${queryableState.displayId}`"
                  :key-expr="queryableState.keyExpr"
                >
                  <template #actions>
                    <button
                      @click="undeclareQueryable(queryableState.displayId)"
                      class="compact-button btn-danger"
                      :disabled="!selectedSessionId"
                    >
                      Undeclare
                    </button>
                  </template>

                  <!-- Info as reactive slot -->
                  <template #info>
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 'QueryableOptions': queryableState.options }"
                    />
                    <ParameterDisplay 
                      type="neutral" 
                      :data="{ 
                        'Reply Config': {
                          'Reply Type': queryableState.responseParameters.replyType,
                          ...(queryableState.responseParameters.replyType === 'reply' ? {
                            'Reply Key': queryableState.responseParameters.reply.keyExpr,
                            'Reply Options': queryableState.responseParameters.reply.replyOptionsJSON
                          } : {}),
                          ...(queryableState.responseParameters.replyType === 'replyErr' ? {
                            'Error Options': queryableState.responseParameters.replyErr.replyErrOptionsJSON
                          } : {}),
                          ...(queryableState.responseParameters.replyType === 'ignore' ? {
                            'Behavior': 'Queries received but no reply sent (only query.finalize() called)'
                          } : {})
                        }
                      }"
                    />
                  </template>

                  <!-- Edit Reply Section as options slot -->
                  <template #options>
                    <!-- Response Type Selection -->
                    <ResponseTypeSelect
                      v-model="queryableState.responseParameters.replyType"
                      :name="`response-type-${queryableState.displayId}`"
                      :disabled="!selectedSessionId"
                    />

                    <!-- Reply Fields -->
                    <template
                      v-if="queryableState.responseParameters.replyType === 'reply'"
                    >
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
                    <template
                      v-if="queryableState.responseParameters.replyType === 'replyErr'"
                    >
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
                    <template
                      v-if="queryableState.responseParameters.replyType === 'ignore'"
                    >
                      <div class="ignore-info">
                        <p class="ignore-description">
                          When <strong>Ignore</strong> is selected, queries will be received but no reply will be sent. 
                          Only <code>query.finalize()</code> will be called to acknowledge the query.
                        </p>
                      </div>
                    </template>
                  </template>
                </Entity>
              </template>
            </Entity>

            <!-- Get Operation -->
            <Entity
              title="Get"
              :key-expr="getParameters.key.value"
              v-model:options-expanded="getOptionsExpanded"
            >
              <template #actions>
                <button
                  @click="performGet"
                  :disabled="!selectedSessionId || !getParameters.key.value"
                  class="compact-button btn-primary"
                >
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
            </Entity>
          </EntityGroup>
        </div>

        <!-- Log Panel -->
        <div class="log-panel">
          <div class="log-header">
            <h3>
              <span
                class="status-dot"
                :class="{ connected: isConnected, connecting: isConnecting }"
              ></span>
              Activity Log
            </h3>
            <button @click="clearLog" class="compact-button btn-warning">
              Clear
            </button>
          </div>
          <div class="log-content" ref="logContent">
            <div
              v-for="(entry, index) in logEntries"
              :key="index"
              class="log-entry"
              :class="entry.type"
            >
              <span class="timestamp">{{
                entry.timestamp.toLocaleTimeString()
              }}</span>
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
              No operations logged yet. Connect to Zenoh and try some
              operations!
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Selector at bottom -->
      <ThemeSelector />
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
import { onBeforeUnmount, onUnmounted } from "vue";

// Import components
import ResponseTypeSelect from "./components/ResponseTypeSelect.vue";
import ServerInput from "./components/ServerInput.vue";
import TimeoutInput from "./components/TimeoutInput.vue";
import TargetSelect from "./components/TargetSelect.vue";
import ConsolidationSelect from "./components/ConsolidationSelect.vue";
import AcceptRepliesSelect from "./components/AcceptRepliesSelect.vue";
import KeyExprInput from "./components/KeyExprInput.vue";
import AllowedDestinationSelect from "./components/AllowedDestinationSelect.vue";
import PayloadInput from "./components/PayloadInput.vue";
import EncodingSelect from "./components/EncodingSelect.vue";
import PrioritySelect from "./components/PrioritySelect.vue";
import CongestionControlSelect from "./components/CongestionControlSelect.vue";
import ReliabilitySelect from "./components/ReliabilitySelect.vue";
import ExpressSelect from "./components/ExpressSelect.vue";
import TriStateCheckbox from "./components/TriStateCheckbox.vue";
import CheckBox from "./components/CheckBox.vue";
import ParameterDisplay from "./components/ParameterDisplay.vue";
import ThemeSelector from "./components/ThemeSelector.vue";

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
        await disconnect(session.displayId);
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
};

// Vue lifecycle hooks for cleanup
onBeforeUnmount(cleanup);

// Handle browser page unloads and HMR scenarios
if (import.meta.client) {
  // Clean up on page unload (covers browser refresh, tab close, etc.)
  window.addEventListener("beforeunload", cleanup);
  // Handle HMR module replacement (development only)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanup();
    });
  }
  // Clean up event listeners when component is destroyed
  onUnmounted(() => {
    window.removeEventListener("beforeunload", cleanup);
  });
}

// Template ref for log content
const logContent = ref<HTMLElement>();

// State to track expanded options panels for operations
const sessionOptionsExpanded = ref(false);
const subscriberOptionsExpanded = ref(false);
const putOptionsExpanded = ref(false);
const queryableOptionsExpanded = ref(false);
const getOptionsExpanded = ref(false);

// Auto-scroll to bottom when new log entries are added
watch(
  logEntries,
  () => {
    nextTick(() => {
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight;
      }
    });
  },
  { deep: true }
);

// Watchers to update replyOptionsJSON and replyErrOptionsJSON when corresponding fields changes
watch(
  activeQueryables,
  (queryables) => {
    queryables.forEach((queryable) => {
      // Set up watchers for reply parameters
      watch(
        () => ({
          reply: queryable.responseParameters.reply,
        }),
        () => {
          // Update replyOptionsJSON
          queryable.responseParameters.reply.updateReplyOptionsJSON();
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
          queryable.responseParameters.replyErr.updateReplyErrOptionsJSON();
        },
        { deep: true, immediate: true }
      );
    });
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
/* Functional styles only - appearance controlled by themes */
.zenoh-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: var(--compact-gap);
  box-sizing: border-box;
}

.main-panel {
  display: flex;
  flex: 1;
  gap: var(--compact-gap);
  overflow: hidden;
  margin-bottom: var(--compact-gap);
}

.entity-panel {
  width: 40%;
  padding: calc(var(--compact-gap) * 1.875); /* 15px with 8px base */
  overflow-y: auto;
}

.entity-panel h3 {
  margin-top: 0;
}

.entity {
  margin-bottom: calc(var(--compact-gap) * 1.5); /* 12px with 8px base */
  padding: var(--compact-gap);
}

/* Add spacing between entity-header and any following content */
.entity-header + * {
  margin-top: var(--compact-gap);
}

.entity-block {
  margin-bottom: calc(var(--compact-gap) * 2); /* 16px with 8px base */
  padding: 0;
}

.block-title {
  font-size: 1em;
  font-weight: 500;
  margin: 0 0 var(--compact-gap) 0;
  padding-bottom: calc(var(--compact-margin) / 1);
  letter-spacing: calc(var(--compact-margin) * 0.075);
}

.entity h4 {
  margin-top: 0;
  margin-bottom: calc(var(--compact-gap) + var(--compact-margin) / 2);
}

.status-dot {
  width: calc(var(--compact-gap) * 1.5);
  height: calc(var(--compact-gap) * 1.5);
  border-radius: 50%;
  transition: background-color 0.3s;
  display: inline-block;
  margin-right: var(--compact-gap);
}

.status-dot.connecting {
  animation: pulse 1s infinite;
}

/* Legacy styles for status-indicator context (if still used elsewhere) */
.status-indicator.connecting .status-dot {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.log-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(var(--compact-gap) * 1.875);
}

.log-header .compact-button {
  min-height: var(--compact-input-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.log-header h3 {
  margin: 0;
}

.log-content {
  flex: 1;
  padding: calc(var(--compact-gap) * 1.875);
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: calc(var(--compact-gap) + var(--compact-margin) / 2);
  padding: var(--compact-gap) 0;
  font-size: var(--compact-label-font-size);
}

.log-entry:last-child {
  border-bottom: none;
}

.timestamp {
  min-width: calc(var(--compact-input-height) * 2.5);
}

.log-type {
  font-weight: bold;
  min-width: 60px;
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
  margin: var(--compact-gap) 0 !important;
  padding: calc(var(--compact-gap) * 1.5) !important;
  line-height: 1.4 !important;
  overflow-x: auto !important;
  white-space: pre-wrap !important;
}

.empty-log {
  text-align: center;
  font-style: italic;
  padding: calc(var(--compact-input-height) * 1.25);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.loading-message {
  text-align: center;
  padding: 2rem;
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
.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 0;
}

.entity-header h4 {
  margin: 0;
}

.header-keyexpr {
  font-size: 0.85em;
  font-weight: 500;
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
  padding: calc(var(--compact-button-padding-v) * 0.8)
    calc(var(--compact-button-padding-h) * 0.6);
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
  font-size: calc(var(--compact-gap) * 1);
}

.options-toggle {
  margin: calc(var(--compact-gap) + var(--compact-margin) / 2) 0;
}

.options-toggle-btn {
  padding: var(--compact-padding);
  font-size: var(--compact-font-size);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--compact-margin);
}

/* Reply configuration styles */
.reply-config-section {
  margin-top: calc(var(--compact-gap) * 2);
  padding-top: calc(var(--compact-gap) * 1.5);
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 calc(var(--compact-gap) * 1.5) 0;
}

.reply-fields,
.reply-err-fields {
  padding: var(--compact-gap);
  margin-bottom: var(--compact-gap);
}

.field-group {
  margin-bottom: var(--compact-gap);
}

.field-group label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--compact-border-radius);
  font-size: var(--compact-label-font-size);
}

.field-group input,
.field-group textarea {
  width: 100%;
  padding: var(--compact-margin);
  font-size: var(--compact-font-size);
  box-sizing: border-box;
}

.field-group textarea {
  resize: vertical;
  font-family: inherit;
}

/* Individual Response Configuration Styles */
.individual-response-config {
  margin-top: calc(var(--compact-gap) * 2);
  padding: calc(var(--compact-gap) * 2);
}

.individual-response-config .reply-fields,
.individual-response-config .reply-err-fields {
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
  margin-bottom: var(--compact-gap);
}

.ignore-description {
  margin: 0;
  font-size: var(--compact-font-size);
  line-height: 1.5;
}

.ignore-description code {
  padding: calc(var(--compact-margin) / 2) var(--compact-margin);
  font-size: 0.9em;
}
</style>
