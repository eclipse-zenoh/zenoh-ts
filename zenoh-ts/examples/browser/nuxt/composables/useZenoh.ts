import type { Ref } from 'vue'

// Static imports - safe since SSR is disabled
import { 
  Config,
  Session, 
  KeyExpr,
  ZBytes,
  Sample,
  Reply,
  ReplyError,
  Encoding,
  Priority,
  CongestionControl,
  Reliability,
  Locality,
} from '@eclipse-zenoh/zenoh-ts'
import type { PutOptions } from '@eclipse-zenoh/zenoh-ts'

// Log entry interface
export interface LogEntry {
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'data'
  message: string
}

// Subscriber info interface
export interface SubscriberInfo {
  displayId: string      // Display ID like "sub0", "sub1", etc.
  keyExpr: string
  subscriber: any // Use any type to avoid strict type checking issues
  createdAt: Date
}

// Put options state interface
export interface PutOptionsState {
  showOptions: boolean
  encoding?: string
  priority?: Priority
  congestionControl?: CongestionControl
  express?: boolean
  reliability?: Reliability
  allowedDestination?: Locality
  attachment?: string
}

export function putOptionsStateFrom(options: PutOptions): PutOptionsState {
  return {
    showOptions: false,
    encoding: options.encoding ? options.encoding.toString() : Encoding.default().toString(),
    priority: options.priority || Priority.DEFAULT,
    congestionControl: options.congestionControl || CongestionControl.DEFAULT_PUSH,
    express: options.express || false,
    reliability: options.reliability || Reliability.DEFAULT,
    allowedDestination: options.allowedDestination || Locality.DEFAULT,
    attachment: options.attachment ? options.attachment.toString() : '',
  }
}

export function putOptionsStateDefault(): PutOptionsState {
    return putOptionsStateFrom({});
}

export function putOptionsStateTo(options: PutOptionsState): PutOptions {
    let opts: PutOptions = {};
    if (options.encoding) { opts.encoding = Encoding.fromString(options.encoding); }
    if (options.priority) { opts.priority = options.priority; }
    if (options.congestionControl) { opts.congestionControl = options.congestionControl; }
    if (options.express) { opts.express = options.express; }
    if (options.reliability) { opts.reliability = options.reliability; }
    if (options.allowedDestination) { opts.allowedDestination = options.allowedDestination; }
    if (options.attachment) {
        opts.attachment = new ZBytes(options.attachment);
    }
    return opts;
}

// Zenoh session state
export interface ZenohState {
  serverUrl: Ref<string>
  isConnected: Ref<boolean>
  isConnecting: Ref<boolean>
  putKey: Ref<string>
  putValue: Ref<string>
  putOptions: Ref<PutOptionsState>
  getKey: Ref<string>
  subscribeKey: Ref<string>
  logEntries: Ref<LogEntry[]>
  activeSubscribers: Ref<SubscriberInfo[]>
}

// Zenoh operations interface
export interface ZenohOperations {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  performPut: () => Promise<void>
  performGet: () => Promise<void>
  subscribe: () => Promise<void>
  unsubscribe: (subscriberId: string) => Promise<void>
  unsubscribeAll: () => Promise<void>
  addLogEntry: (type: LogEntry['type'], message: string) => void
  formatTime: (date: Date) => string
  clearLog: () => void
}

export function useZenoh(): ZenohState & ZenohOperations {
  // Reactive state
  const serverUrl = ref('ws://localhost:10000')
  const isConnected = ref(false)
  const isConnecting = ref(false)

  // Operation inputs
  const putKey = ref('demo/example/test')
  const putValue = ref('Hello Zenoh!')
  
  // PUT options
  const putOptions = ref<PutOptionsState>(putOptionsStateDefault())
  
  const getKey = ref('demo/example/*')
  const subscribeKey = ref('demo/example/**')

  // Log entries
  const logEntries = ref<LogEntry[]>([])

  // Active subscribers
  const activeSubscribers = ref<SubscriberInfo[]>([])

  // Zenoh objects
  let zenohSession: Session | null = null
  let subscriberIdCounter = 0

  // Methods
  function addLogEntry(type: LogEntry['type'], message: string): void {
    logEntries.value.push({
      timestamp: new Date(),
      type,
      message
    })
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString()
  }

  function clearLog(): void {
    logEntries.value = []
  }

  async function connect(): Promise<void> {
    if (isConnecting.value || isConnected.value || !process.client) return
    
    isConnecting.value = true
    addLogEntry('info', `Attempting to connect to ${serverUrl.value}`)
    
    try {
      const config = new Config(serverUrl.value)
      zenohSession = await Session.open(config)
      isConnected.value = true
      addLogEntry('success', `Successfully connected to ${serverUrl.value}`)
    } catch (error) {
      addLogEntry('error', `Failed to connect: ${error}`)
      zenohSession = null
    } finally {
      isConnecting.value = false
    }
  }

  async function disconnect(): Promise<void> {
    if (!zenohSession) return
    
    try {
      // Unsubscribe from all active subscriptions
      await unsubscribeAll()
      
      await zenohSession.close()
      zenohSession = null
      isConnected.value = false
      addLogEntry('success', 'Disconnected from Zenoh')
    } catch (error) {
      addLogEntry('error', `Error during disconnect: ${error}`)
    }
  }

  async function performPut(): Promise<void> {
    if (!zenohSession || !putKey.value || !putValue.value || !process.client) return
    
    try {
      const keyExpr = new KeyExpr(putKey.value)
      const bytes = new ZBytes(putValue.value)
      
      // Build put options
      const options = putOptionsStateTo(putOptions.value);
      await zenohSession.put(keyExpr, bytes, options)
      addLogEntry('success', `PUT: ${putKey.value} = "${putValue.value}"`)
    } catch (error) {
      addLogEntry('error', `PUT failed: ${error}`)
    }
  }

  async function performGet(): Promise<void> {
    if (!zenohSession || !getKey.value || !process.client) return
    
    try {
      const selector = getKey.value
      addLogEntry('info', `GET: Querying ${selector}`)
      
      const receiver = await zenohSession.get(selector)
      if (!receiver) {
        addLogEntry('error', 'GET failed: No receiver returned')
        return
      }
      
      let resultCount = 0
      
      while (true) {
        const reply: Reply | null = await receiver.receive()
        if (!reply) break
        
        try {
          const result = reply.result()
          
          // Check if it's a successful sample or an error
          if ('keyexpr' in result && typeof result.keyexpr === 'function') {
            // It's a Sample
            const sample = result as Sample
            const keyStr = sample.keyexpr().toString()
            const valueStr = sample.payload().toString()
            addLogEntry('data', `GET result: ${keyStr} = "${valueStr}"`)
            resultCount++
          } else {
            // It's a ReplyError
            const replyError = result as ReplyError
            addLogEntry('error', `GET error: ${replyError.payload().toString()}`)
          }
        } catch (resultError) {
          addLogEntry('error', `Error processing GET result: ${resultError}`)
        }
      }
      
      addLogEntry('success', `GET completed: ${resultCount} results received`)
    } catch (error) {
      addLogEntry('error', `GET failed: ${error}`)
    }
  }

  async function subscribe(): Promise<void> {
    if (!zenohSession || !subscribeKey.value || !process.client) return
    
    // Check if already subscribed to this key expression
    const existingSubscriber = activeSubscribers.value.find(sub => sub.keyExpr === subscribeKey.value)
    if (existingSubscriber) {
      addLogEntry('info', `Already subscribed to ${subscribeKey.value}`)
      return
    }

    try {
      const keyExpr = new KeyExpr(subscribeKey.value)
      const subscriber = await zenohSession.declareSubscriber(keyExpr)
      
      // Generate sequential display ID for this subscriber
      const displayId = `sub${subscriberIdCounter++}`
      
      const subscriberInfo: SubscriberInfo = {
        displayId: displayId,
        keyExpr: subscribeKey.value,
        subscriber,
        createdAt: new Date()
      }
      
      activeSubscribers.value.push(subscriberInfo)
      addLogEntry('success', `Subscribed to ${subscribeKey.value} (ID: ${displayId})`)
      
      // Handle incoming data
      ;(async () => {
        const receiver = subscriber.receiver()
        if (!receiver) return
        
        try {
          while (true) {
            const sample: Sample | null = await receiver.receive()
            if (!sample) break  // Normal end of subscription
            
            try {
              const keyStr = sample.keyexpr().toString()
              const valueStr = sample.payload().toString()
              const kind = sample.kind()
              
              // Map SampleKind enum values to readable strings
              let kindStr: string
              switch (kind) {
                case 0: // SampleKind.PUT
                  kindStr = 'PUT'
                  break
                case 1: // SampleKind.DELETE
                  kindStr = 'DELETE'
                  break
                default:
                  kindStr = 'UNKNOWN'
              }
              
              addLogEntry('data', `SUBSCRIPTION [${displayId}] [${kindStr}]: ${keyStr} = "${valueStr}"`)
            } catch (sampleError) {
              addLogEntry('error', `Error processing subscription sample: ${sampleError}`)
            }
          }
          // Normal end of subscription - no error logging needed
        } catch (subscriptionError) {
          // Only log actual errors, not normal disconnections
          if (subscriptionError) {
            addLogEntry('error', `Subscription error for ${displayId}: ${subscriptionError}`)
          }
        }
      })()
    } catch (error) {
      addLogEntry('error', `Subscribe failed: ${error}`)
    }
  }

  async function unsubscribe(subscriberId: string): Promise<void> {
    const subscriberIndex = activeSubscribers.value.findIndex(sub => sub.displayId === subscriberId)
    if (subscriberIndex === -1) {
      addLogEntry('error', `Subscriber ${subscriberId} not found`)
      return
    }

    const subscriberInfo = activeSubscribers.value[subscriberIndex]
    if (!subscriberInfo) {
      addLogEntry('error', `Subscriber info for ${subscriberId} is invalid`)
      return
    }
    
    try {
      await subscriberInfo.subscriber.undeclare()
      activeSubscribers.value.splice(subscriberIndex, 1)
      addLogEntry('success', `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberId})`)
    } catch (error) {
      addLogEntry('error', `Unsubscribe failed for ${subscriberId}: ${error}`)
    }
  }

  async function unsubscribeAll(): Promise<void> {
    const subscribersToRemove = [...activeSubscribers.value]
    
    for (const subscriberInfo of subscribersToRemove) {
      try {
        await subscriberInfo.subscriber.undeclare()
        addLogEntry('info', `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberInfo.displayId})`)
      } catch (error) {
        addLogEntry('error', `Error unsubscribing from ${subscriberInfo.displayId}: ${error}`)
      }
    }
    
    activeSubscribers.value = []
    addLogEntry('success', 'All subscriptions cleared')
  }

  // Cleanup function
  const cleanup = async (): Promise<void> => {
    if (zenohSession) {
      await disconnect()
    }
  }

  // Initialize on mount
  onMounted(() => {
    if (process.client) {
      addLogEntry('info', 'Zenoh-TS Demo initialized. Connect to a Zenoh router to start.')
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    serverUrl,
    isConnected,
    isConnecting,
    putKey,
    putValue,
    putOptions,
    getKey,
    subscribeKey,
    logEntries,
    activeSubscribers,
    
    // Operations
    connect,
    disconnect,
    performPut,
    performGet,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    addLogEntry,
    formatTime,
    clearLog
  }
}