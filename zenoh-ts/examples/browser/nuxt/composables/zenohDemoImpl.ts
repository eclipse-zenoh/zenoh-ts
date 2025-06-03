// Browser-only implementation with static zenoh-ts imports
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

import type { 
  ZenohState, 
  ZenohOperations, 
  LogEntry, 
  PutOptionsState, 
  SubscriberInfo 
} from './zenohDemo'

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

export function useZenohImpl(state: ZenohState): ZenohOperations {
  // Zenoh objects
  let zenohSession: Session | null = null
  let subscriberIdCounter = 0

  // Helper functions
  function addLogEntry(type: LogEntry['type'], message: string): void {
    state.logEntries.value.push({
      timestamp: new Date(),
      type,
      message
    })
  }

  function clearLog(): void {
    state.logEntries.value = []
  }

  async function connect(): Promise<void> {
    if (state.isConnecting.value || state.isConnected.value) return
    
    state.isConnecting.value = true
    addLogEntry('info', `Attempting to connect to ${state.serverUrl.value}`)
    
    try {
      const config = new Config(state.serverUrl.value)
      zenohSession = await Session.open(config)
      state.isConnected.value = true
      addLogEntry('success', `Successfully connected to ${state.serverUrl.value}`)
    } catch (error) {
      addLogEntry('error', `Failed to connect: ${error}`)
      zenohSession = null
    } finally {
      state.isConnecting.value = false
    }
  }

  async function disconnect(): Promise<void> {
    if (!zenohSession) return
    
    try {
      // Unsubscribe from all active subscriptions
      await unsubscribeAll()
      
      await zenohSession.close()
      zenohSession = null
      state.isConnected.value = false
      addLogEntry('success', 'Disconnected from Zenoh')
    } catch (error) {
      addLogEntry('error', `Error during disconnect: ${error}`)
    }
  }

  async function performPut(): Promise<void> {
    if (!zenohSession || !state.putKey.value || !state.putValue.value) return
    
    try {
      const keyExpr = new KeyExpr(state.putKey.value)
      const bytes = new ZBytes(state.putValue.value)
      
      // Build put options
      const options = putOptionsStateTo(state.putOptions.value);
      await zenohSession.put(keyExpr, bytes, options)
      addLogEntry('success', `PUT: ${state.putKey.value} = "${state.putValue.value}"`)
    } catch (error) {
      addLogEntry('error', `PUT failed: ${error}`)
    }
  }

  async function performGet(): Promise<void> {
    if (!zenohSession || !state.getKey.value) return
    
    try {
      const selector = state.getKey.value
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
    if (!zenohSession || !state.subscribeKey.value) return
    
    // Check if already subscribed to this key expression
    const existingSubscriber = state.activeSubscribers.value.find(sub => sub.keyExpr === state.subscribeKey.value)
    if (existingSubscriber) {
      addLogEntry('info', `Already subscribed to ${state.subscribeKey.value}`)
      return
    }

    try {
      const keyExpr = new KeyExpr(state.subscribeKey.value)
      const subscriber = await zenohSession.declareSubscriber(keyExpr)
      
      // Generate sequential display ID for this subscriber
      const displayId = `sub${subscriberIdCounter++}`
      
      const subscriberInfo: SubscriberInfo = {
        displayId: displayId,
        keyExpr: state.subscribeKey.value,
        subscriber,
        createdAt: new Date()
      }
      
      state.activeSubscribers.value.push(subscriberInfo)
      addLogEntry('success', `Subscribed to ${state.subscribeKey.value} (ID: ${displayId})`)
      
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
    const subscriberIndex = state.activeSubscribers.value.findIndex(sub => sub.displayId === subscriberId)
    if (subscriberIndex === -1) {
      addLogEntry('error', `Subscriber ${subscriberId} not found`)
      return
    }

    const subscriberInfo = state.activeSubscribers.value[subscriberIndex]
    if (!subscriberInfo) {
      addLogEntry('error', `Subscriber info for ${subscriberId} is invalid`)
      return
    }
    
    try {
      await subscriberInfo.subscriber.undeclare()
      state.activeSubscribers.value.splice(subscriberIndex, 1)
      addLogEntry('success', `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberId})`)
    } catch (error) {
      addLogEntry('error', `Unsubscribe failed for ${subscriberId}: ${error}`)
    }
  }

  async function unsubscribeAll(): Promise<void> {
    const subscribersToRemove = [...state.activeSubscribers.value]
    
    for (const subscriberInfo of subscribersToRemove) {
      try {
        await subscriberInfo.subscriber.undeclare()
        addLogEntry('info', `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberInfo.displayId})`)
      } catch (error) {
        addLogEntry('error', `Error unsubscribing from ${subscriberInfo.displayId}: ${error}`)
      }
    }
    
    state.activeSubscribers.value = []
    addLogEntry('success', 'All subscriptions cleared')
  }

  return {
    connect,
    disconnect,
    performPut,
    performGet,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    addLogEntry,
    clearLog
  }
}
