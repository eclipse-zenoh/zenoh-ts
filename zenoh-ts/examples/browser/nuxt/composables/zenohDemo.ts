import type { Ref } from 'vue'

// Type-only imports - safe for SSR
import type { 
  Priority,
  CongestionControl,
  Reliability,
  Locality,
} from '@eclipse-zenoh/zenoh-ts'

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
  encoding?: string | undefined
  priority?: Priority | undefined
  congestionControl?: CongestionControl | undefined
  express?: boolean | undefined
  reliability?: Reliability | undefined
  allowedDestination?: Locality | undefined
  attachment?: string | undefined
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
  clearLog: () => void
}

// Default put options state
export function putOptionsStateDefault(): PutOptionsState {
  return {
    showOptions: false,
    encoding: undefined,
    priority: undefined,
    congestionControl: undefined,
    express: false,
    reliability: undefined,
    allowedDestination: undefined,
    attachment: '',
  }
}

// Format time utility function
export function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

// Dummy operations for SSR
function createDummyOperations(): ZenohOperations {
  const noop = async () => {}
  const noopWithParam = async (_: string) => {}
  const noopLog = (_type: LogEntry['type'], _message: string) => {}
  
  return {
    connect: noop,
    disconnect: noop,
    performPut: noop,
    performGet: noop,
    subscribe: noop,
    unsubscribe: noopWithParam,
    unsubscribeAll: noop,
    addLogEntry: noopLog,
    clearLog: () => {}
  }
}

export function useZenoh(): ZenohState & ZenohOperations {
  // Reactive state - these work on both client and server
  const serverUrl = ref('ws://localhost:10000')
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const putKey = ref('demo/example/test')
  const putValue = ref('Hello Zenoh!')
  const putOptions = ref<PutOptionsState>(putOptionsStateDefault())
  const getKey = ref('demo/example/*')
  const subscribeKey = ref('demo/example/**')
  const logEntries = ref<LogEntry[]>([])
  const activeSubscribers = ref<SubscriberInfo[]>([])

  const state: ZenohState = {
    serverUrl,
    isConnected,
    isConnecting,
    putKey,
    putValue,
    putOptions,
    getKey,
    subscribeKey,
    logEntries,
    activeSubscribers
  }

  // Check if we're in a browser environment
  if (process.client) {
    // Dynamic import of the implementation - only loads in browser
    let implPromise: Promise<ZenohOperations> | null = null
    
    const getImpl = async (): Promise<ZenohOperations> => {
      if (!implPromise) {
        implPromise = import('./zenohDemoImpl.js').then(module => 
          module.useZenohImpl(state)
        )
      }
      return implPromise
    }

    // Create operations that delegate to the implementation
    const operations: ZenohOperations = {
      connect: async () => {
        const impl = await getImpl()
        return impl.connect()
      },
      disconnect: async () => {
        const impl = await getImpl()
        return impl.disconnect()
      },
      performPut: async () => {
        const impl = await getImpl()
        return impl.performPut()
      },
      performGet: async () => {
        const impl = await getImpl()
        return impl.performGet()
      },
      subscribe: async () => {
        const impl = await getImpl()
        return impl.subscribe()
      },
      unsubscribe: async (subscriberId: string) => {
        const impl = await getImpl()
        return impl.unsubscribe(subscriberId)
      },
      unsubscribeAll: async () => {
        const impl = await getImpl()
        return impl.unsubscribeAll()
      },
      addLogEntry: (type: LogEntry['type'], message: string) => {
        // This one we can handle directly since it doesn't need zenoh
        logEntries.value.push({
          timestamp: new Date(),
          type,
          message
        })
      },
      clearLog: () => {
        logEntries.value = []
      }
    }

    // Initialize on mount
    onMounted(async () => {
      const impl = await getImpl()
      if (impl.addLogEntry) {
        impl.addLogEntry('info', 'Zenoh-TS Demo initialized. Connect to a Zenoh router to start.')
      }
    })

    // Cleanup on unmount
    onUnmounted(async () => {
      const impl = await getImpl()
      if (impl.disconnect) {
        await impl.disconnect()
      }
    })

    return { ...state, ...operations }
  } else {
    // SSR - return dummy operations
    return { ...state, ...createDummyOperations() }
  }
}
