import type { Ref } from 'vue'

// Import types only for TypeScript type checking
import type { 
  Config, 
  Session, 
  KeyExpr,
  ZBytes,
  Sample,
  Subscriber,
  Reply,
  ReplyError
} from '@eclipse-zenoh/zenoh-ts'

// Log entry interface
export interface LogEntry {
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'data'
  message: string
}

// Zenoh session state
export interface ZenohState {
  serverUrl: Ref<string>
  isConnected: Ref<boolean>
  isConnecting: Ref<boolean>
  isSubscribed: Ref<boolean>
  putKey: Ref<string>
  putValue: Ref<string>
  getKey: Ref<string>
  subscribeKey: Ref<string>
  logEntries: Ref<LogEntry[]>
}

// Zenoh operations interface
export interface ZenohOperations {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  performPut: () => Promise<void>
  performGet: () => Promise<void>
  toggleSubscribe: () => Promise<void>
  addLogEntry: (type: LogEntry['type'], message: string) => void
  formatTime: (date: Date) => string
  clearLog: () => void
}

export function useZenoh(): ZenohState & ZenohOperations {
  // Import Zenoh only on client side to avoid SSR issues with WASM
  let zenohModule: typeof import('@eclipse-zenoh/zenoh-ts') | null = null
  let ConfigClass: new (url: string) => Config
  let SessionClass: typeof Session
  let KeyExprClass: new (expr: string) => KeyExpr
  let ZBytesClass: new (data: string | Uint8Array) => ZBytes

  // Reactive state
  const serverUrl = ref('ws://localhost:10000')
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const isSubscribed = ref(false)

  // Operation inputs
  const putKey = ref('demo/example/test')
  const putValue = ref('Hello Zenoh!')
  const getKey = ref('demo/example/*')
  const subscribeKey = ref('demo/example/**')

  // Log entries
  const logEntries = ref<LogEntry[]>([])

  // Zenoh objects
  let zenohSession: Session | null = null
  let subscriber: Subscriber | null = null

  // Initialize Zenoh module on client side
  const initializeZenoh = async (): Promise<void> => {
    if (process.client && !zenohModule) {
      try {
        zenohModule = await import('@eclipse-zenoh/zenoh-ts')
        ConfigClass = zenohModule.Config
        SessionClass = zenohModule.Session
        KeyExprClass = zenohModule.KeyExpr
        ZBytesClass = zenohModule.ZBytes
      } catch (error) {
        console.error('Failed to load Zenoh module:', error)
        addLogEntry('error', `Failed to load Zenoh module: ${error}`)
      }
    }
  }

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
    
    await initializeZenoh()
    
    if (!ConfigClass || !SessionClass) {
      addLogEntry('error', 'Zenoh module not available')
      return
    }
    
    isConnecting.value = true
    addLogEntry('info', `Attempting to connect to ${serverUrl.value}`)
    
    try {
      const config = new ConfigClass(serverUrl.value)
      zenohSession = await SessionClass.open(config)
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
      // Unsubscribe if active
      if (subscriber) {
        await subscriber.undeclare()
        subscriber = null
        isSubscribed.value = false
        addLogEntry('info', 'Unsubscribed from all subscriptions')
      }
      
      await zenohSession.close()
      zenohSession = null
      isConnected.value = false
      addLogEntry('success', 'Disconnected from Zenoh')
    } catch (error) {
      addLogEntry('error', `Error during disconnect: ${error}`)
    }
  }

  async function performPut(): Promise<void> {
    if (!zenohSession || !putKey.value || !putValue.value || !process.client || !KeyExprClass || !ZBytesClass) return
    
    try {
      const keyExpr = new KeyExprClass(putKey.value)
      const bytes = new ZBytesClass(putValue.value)
      await zenohSession.put(keyExpr, bytes)
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

  async function toggleSubscribe(): Promise<void> {
    if (!zenohSession || !subscribeKey.value || !process.client || !KeyExprClass) return
    
    if (isSubscribed.value && subscriber) {
      // Unsubscribe
      try {
        await subscriber.undeclare()
        subscriber = null
        isSubscribed.value = false
        addLogEntry('success', `Unsubscribed from ${subscribeKey.value}`)
      } catch (error) {
        addLogEntry('error', `Unsubscribe failed: ${error}`)
      }
    } else {
      // Subscribe
      try {
        const keyExpr = new KeyExprClass(subscribeKey.value)
        
        subscriber = await zenohSession.declareSubscriber(keyExpr)
        isSubscribed.value = true
        addLogEntry('success', `Subscribed to ${subscribeKey.value}`)
        
        // Handle incoming data
        ;(async () => {
          if (!subscriber) return
          
          const receiver = subscriber.receiver()
          if (!receiver) return
          
          while (true) {
            const sample: Sample | null = await receiver.receive()
            if (!sample) break
            
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
              
              addLogEntry('data', `SUBSCRIPTION [${kindStr}]: ${keyStr} = "${valueStr}"`)
            } catch (sampleError) {
              addLogEntry('error', `Error processing subscription sample: ${sampleError}`)
            }
          }
        })().catch(error => {
          addLogEntry('error', `Subscription error: ${error}`)
        })
      } catch (error) {
        addLogEntry('error', `Subscribe failed: ${error}`)
      }
    }
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
    isSubscribed,
    putKey,
    putValue,
    getKey,
    subscribeKey,
    logEntries,
    
    // Operations
    connect,
    disconnect,
    performPut,
    performGet,
    toggleSubscribe,
    addLogEntry,
    formatTime,
    clearLog
  }
}