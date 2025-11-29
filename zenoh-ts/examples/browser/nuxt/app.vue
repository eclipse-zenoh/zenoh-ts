<template>
  <ClientOnly>
    <div class="zenoh-container">
      <!-- Main Operations Panel -->
      <div class="main-panel">
        <!-- Entity Controls -->
        <div class="entity-panel">
          <!-- Session Section -->
          <Section
            title="Session"
            icon="🔗"
            section-class="session-section"
          >
            <!-- Open Operation -->
            <Entity
              title="Open"
              :descr="serverUrl"
              v-model:editsExpanded="sessionOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="connect"
                  :disabled="isConnecting"
                >
                  <span v-if="isConnecting">Connecting...</span>
                  <span v-else>Connect</span>
                </button>
              </template>

              <template #edits>
                <ServerInput v-model="serverUrl" :disabled="false" />
              </template>

              <!-- Active Sessions as Sub-entities -->
              <template v-if="activeSessions.length > 0" #sub-entities>
                <Entity
                  v-for="sessionState in activeSessions"
                  :key="sessionState.displayId"
                  :title="sessionState.displayId"
                  :session="sessionState.displayId"
                  :selected-session="selectedSessionId"
                  :descr="sessionState.serverUrl"
                >
                  <template #actions>
                    <button
                      @click="selectSession(sessionState.displayId)"
                      :disabled="selectedSessionId === sessionState.displayId"
                    >
                      Select
                    </button>
                    <button
                      @click="disconnect(sessionState.displayId)"
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
            <Entity 
              title="Info"
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
            >
              <template #actions>
                <button
                  @click="getSessionInfo"
                  :disabled="!selectedSessionId"
                >
                  Run
                </button>
              </template>
            </Entity>
          </Section>

          <!-- Publish/Subscribe Section -->
          <Section
            title="Publish / Subscribe"
            icon="📡"
            section-class="pubsub-section"
            :disabled="!selectedSessionId"
          >
            <!-- Declare Subscriber Operation -->
            <Entity
              title="Subscriber"
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
              :descr="subscriberParameters.key.value"
              v-model:editsExpanded="subscriberOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="subscribe"
                  :disabled="
                    !selectedSessionId || !subscriberParameters.key.value
                  "
                >
                  Declare
                </button>
              </template>

              <template #edits>
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
              <template v-if="activeSubscribers.length > 0" #sub-entities>
                <Entity
                  v-for="subscriberState in activeSubscribers"
                  :key="subscriberState.displayId"
                  :title="subscriberState.displayId"
                  :session="subscriberState.sessionId"
                  :selected-session="selectedSessionId"
                  :descr="subscriberState.keyExpr"
                >
                  <template #actions>
                    <button
                      @click="unsubscribe(subscriberState.displayId)"
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

            <!-- Declare Publisher Operation -->
            <Entity
              title="Publisher"
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
              :descr="publisherParameters.key.value"
              v-model:editsExpanded="publisherOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="declarePublisher"
                  :disabled="
                    !selectedSessionId || !publisherParameters.key.value
                  "
                >
                  Declare
                </button>
              </template>

              <template #edits>
                <KeyExprInput
                  v-model="publisherParameters.key.value"
                  label="Key Expression"
                  placeholder="Key expression (e.g., demo/example/publisher)"
                  :disabled="!selectedSessionId"
                />

                <EncodingSelect
                  v-model="publisherParameters.encoding.value"
                  v-model:custom-encoding="publisherParameters.customEncoding.value"
                  :encoding-options="encodingOptions"
                  :disabled="!selectedSessionId"
                />

                <PrioritySelect
                  v-model="publisherParameters.priority.value"
                  :disabled="!selectedSessionId"
                  :options="priorityOptions"
                />

                <CongestionControlSelect
                  v-model="publisherParameters.congestionControl.value"
                  :disabled="!selectedSessionId"
                  :options="congestionControlOptions"
                />

                <ExpressSelect
                  v-model="publisherParameters.express.value"
                  :disabled="!selectedSessionId"
                />

                <ReliabilitySelect
                  v-model="publisherParameters.reliability.value"
                  :disabled="!selectedSessionId"
                  :options="reliabilityOptions"
                />

                <AllowedDestinationSelect
                  v-model="publisherParameters.allowedDestination.value"
                  :disabled="!selectedSessionId"
                  :options="localityOptions"
                />
              </template>

              <!-- Active Publishers as Sub-entities -->
              <template v-if="activePublishers.length > 0" #sub-entities>
                <Entity
                  v-for="publisherState in activePublishers"
                  :key="publisherState.displayId"
                  :title="publisherState.displayId"
                  :session="publisherState.sessionId"
                  :selected-session="selectedSessionId"
                  :descr="publisherState.keyExpr"
                >
                  <template #actions>
                    <button
                      @click="publishData(publisherState.displayId)"
                      :disabled="!selectedSessionId || publisherState.putParameters.payloadEmpty"
                    >
                      Put
                    </button>
                    <button
                      @click="undeclarePublisher(publisherState.displayId)"
                      :disabled="!selectedSessionId"
                    >
                      Undeclare
                    </button>
                  </template>

                  <!-- Info as reactive slot -->
                  <template #info>
                    <ParameterDisplay
                      type="neutral"
                      :data="{ 'PublisherOptions': publisherState.options }"
                    />
                    <ParameterDisplay
                      type="neutral"
                      :data="{
                        'Put Config': {
                          'Payload': publisherState.putParameters.payload,
                          'Encoding': publisherState.putParameters.encoding || 'default',
                          'Priority': publisherState.putParameters.priority || 'default',
                          'Put Options': publisherState.putParameters.putOptionsJSON
                        }
                      }"
                    />
                  </template>

                  <!-- Edit Put Parameters Section -->
                  <template #edits>
                    <PayloadInput
                      v-model="publisherState.putParameters.payload"
                      v-model:is-empty="publisherState.putParameters.payloadEmpty"
                      label="Payload"
                      placeholder="Data to publish"
                      :disabled="!selectedSessionId"
                    />

                    <EncodingSelect
                      v-model="publisherState.putParameters.encoding"
                      v-model:custom-encoding="publisherState.putParameters.customEncoding"
                      :encoding-options="encodingOptions"
                      :disabled="!selectedSessionId"
                    />

                    <PrioritySelect
                      v-model="publisherState.putParameters.priority"
                      :disabled="!selectedSessionId"
                      :options="priorityOptions"
                    />

                    <CongestionControlSelect
                      v-model="publisherState.putParameters.congestionControl"
                      :disabled="!selectedSessionId"
                      :options="congestionControlOptions"
                    />

                    <ExpressSelect
                      v-model="publisherState.putParameters.express"
                      :disabled="!selectedSessionId"
                    />

                    <PayloadInput
                      v-model="publisherState.putParameters.attachment"
                      v-model:is-empty="publisherState.putParameters.attachmentEmpty"
                      label="Attachment"
                      placeholder="Optional attachment data"
                      :disabled="!selectedSessionId"
                    />
                  </template>
                </Entity>
              </template>
            </Entity>

            <!-- Put Operation -->
            <Entity
              title="Put"
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
              :descr="putParameters.key.value"
              v-model:editsExpanded="putOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="performPut"
                  :disabled="
                    !selectedSessionId ||
                    !putParameters.key.value ||
                    putParameters.valueEmpty.value
                  "
                >
                  Run
                </button>
              </template>

              <template #edits>
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
          </Section>

          <!-- Query/Reply Section -->
          <Section
            title="Query / Reply"
            icon="🔍"
            section-class="query-section"
            :disabled="!selectedSessionId"
          >
            <!-- Declare Queryable Operation -->
            <Entity
              title="Queryable"
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
              :descr="queryableParameters.key.value"
              v-model:editsExpanded="queryableOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="declareQueryable"
                  :disabled="
                    !selectedSessionId || !queryableParameters.key.value
                  "
                >
                  Declare
                </button>
              </template>

              <template #edits>
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
              <template v-if="activeQueryables.length > 0" #sub-entities>
                <Entity
                  v-for="queryableState in activeQueryables"
                  :key="queryableState.displayId"
                  :title="queryableState.displayId"
                  :session="queryableState.sessionId"
                  :selected-session="selectedSessionId"
                  :descr="queryableState.keyExpr"
                >
                  <template #actions>
                    <button
                      @click="undeclareQueryable(queryableState.displayId)"
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

                  <!-- Edit Reply Section as edits slot -->
                  <template #edits>
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
              :session="selectedSessionId"
              :selected-session="selectedSessionId"
              :descr="getParameters.key.value"
              v-model:editsExpanded="getOptionsCollapsed"
            >
              <template #actions>
                <button
                  @click="performGet"
                  :disabled="!selectedSessionId || !getParameters.key.value"
                >
                  Run
                </button>
              </template>

              <template #edits>
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
          </Section>
        </div>

        <!-- Activity Log Panel -->
        <div class="log-panel">
          <!-- Activity Log Section -->
          <Section
            title="Activity Log"
            icon="📜"
            section-class="log-section"
          >
          <template #actions>
            <button @click="clearLog">
              Clear
            </button>
          </template>
          
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
        </Section>
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
  isConnecting,
  activeSessions,
  selectedSessionId,
  putParameters,
  logEntries,
  activeSubscribers,
  activePublishers,
  activeQueryables,
  subscriberParameters,
  publisherParameters,
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
  declarePublisher,
  undeclarePublisher,
  publishData,
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
const sessionOptionsCollapsed = ref(false);
const subscriberOptionsCollapsed = ref(false);
const publisherOptionsCollapsed = ref(false);
const putOptionsCollapsed = ref(false);
const queryableOptionsCollapsed = ref(false);
const getOptionsCollapsed = ref(false);

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

// Watchers to update putOptionsJSON when publisher put parameters change
watch(
  activePublishers,
  (publishers) => {
    publishers.forEach((publisher) => {
      watch(
        () => ({
          putParams: publisher.putParameters,
        }),
        () => {
          publisher.putParameters.updatePutOptionsJSON();
        },
        { deep: true, immediate: true }
      );
    });
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
/* Essential 2-panel layout styles */
.zenoh-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-panel {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0.5rem;
}

.entity-panel {
  width: 40%;
  overflow-y: auto;
}

.log-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.log-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  border: none;
}

/* Loading screen layout */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

</style>
