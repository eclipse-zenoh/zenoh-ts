import type { Ref } from "vue";

// Type-only imports - safe for SSR
import type {
  Priority,
  CongestionControl,
  Reliability,
  Locality,
} from "@eclipse-zenoh/zenoh-ts";

// Log entry interface
export interface LogEntry {
  timestamp: Date;
  type: "info" | "success" | "error" | "data";
  message: string;
}

// Subscriber info interface
export interface SubscriberInfo {
  displayId: string; // Display ID like "sub0", "sub1", etc.
  keyExpr: string;
  subscriber: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
}

// Put options state interface
export interface PutOptionsState {
  showOptions: boolean;
  encoding?: string | undefined;
  priority?: Priority | undefined;
  congestionControl?: CongestionControl | undefined;
  express?: boolean | undefined;
  reliability?: Reliability | undefined;
  allowedDestination?: Locality | undefined;
  attachment?: string | undefined;
}

// Option interface for select dropdowns
export interface OptionItem {
  value: number;
  label: string;
}

// Global option arrays - initialized when zenoh-ts loads
export let priorityOptions: OptionItem[] = [];
export let congestionControlOptions: OptionItem[] = [];
export let reliabilityOptions: OptionItem[] = [];
export let localityOptions: OptionItem[] = [];

// Function to initialize option arrays (called from zenohDemoImpl)
export function initializeOptionArrays(
  priority: OptionItem[],
  congestionControl: OptionItem[],
  reliability: OptionItem[],
  locality: OptionItem[]
): void {
  priorityOptions = priority;
  congestionControlOptions = congestionControl;
  reliabilityOptions = reliability;
  localityOptions = locality;
}

// Application state
export interface AppState {
  serverUrl: Ref<string>;
  isConnected: Ref<boolean>;
  isConnecting: Ref<boolean>;
  putKey: Ref<string>;
  putValue: Ref<string>;
  putOptions: Ref<PutOptionsState>;
  getKey: Ref<string>;
  subscribeKey: Ref<string>;
  logEntries: Ref<LogEntry[]>;
  activeSubscribers: Ref<SubscriberInfo[]>;
}
// Helper functions
export function addLogEntry(
  state: AppState,
  type: LogEntry["type"],
  message: string
): void {
  state.logEntries.value.push({
    timestamp: new Date(),
    type,
    message,
  });
}

export function clearLog(state: AppState): void {
  state.logEntries.value = [];
}

// Application operations interface
export interface AppOperations {
  addLogEntry: (type: LogEntry["type"], message: string) => void;
  clearLog: () => void;
}

// Zenoh operations interface
// The zenoh-ts can't be used in ssr (server-side rendering)
// so the real zenoh-ts code is proxied though this interface from zenohDemoImpl.ts
// which is loaded dynamically in the browser
export interface ZenohOperations {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  performPut: () => Promise<void>;
  performGet: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: (subscriberId: string) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
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
    attachment: "",
  };
}

// Create common application operations
export function createAppOperations(state: AppState): AppOperations {
  return {
    addLogEntry: (type: LogEntry["type"], message: string) => {
      addLogEntry(state, type, message);
    },
    clearLog: () => {
      clearLog(state);
    },
  };
}

// Dummy operations for SSR
function createDummyZenohOperations(): ZenohOperations {
  const noop = async () => {};
  const noopWithParam = async (_: string) => {};
  return {
    connect: noop,
    disconnect: noop,
    performPut: noop,
    performGet: noop,
    subscribe: noop,
    unsubscribe: noopWithParam,
    unsubscribeAll: noop,
  };
}

export async function useZenoh(): Promise<
  AppState & AppOperations & ZenohOperations
> {
  // Reactive state - these work on both client and server
  const state: AppState = {
    serverUrl: ref("ws://localhost:10000"),
    isConnected: ref(false),
    isConnecting: ref(false),
    putKey: ref("demo/example/test"),
    putValue: ref("Hello Zenoh!"),
    putOptions: ref<PutOptionsState>(putOptionsStateDefault()),
    getKey: ref("demo/example/*"),
    subscribeKey: ref("demo/example/**"),
    logEntries: ref<LogEntry[]>([]),
    activeSubscribers: ref<SubscriberInfo[]>([]),
  };

  const appOperations = createAppOperations(state);

  let zenohOperations: ZenohOperations;

  // Check if we're in a browser environment
  if (process.client) {
    // Dynamic import of the implementation - only loads in browser
    let implPromise: Promise<ZenohOperations> | null = null;
    const getImpl = async (): Promise<ZenohOperations> => {
      if (!implPromise) {
        implPromise = import("./zenohDemoImpl.js").then((module) =>
          module.useZenohImpl(state)
        );
      }
      return implPromise;
    };
    // Initialize on mount
    onMounted(async () => {
      appOperations.addLogEntry(
        "info",
        "Zenoh-TS Demo initialized. Connect to a Zenoh router to start."
      );
    });

    // Cleanup on unmount
    onUnmounted(async () => {
      await zenohOperations.disconnect();
    });
    zenohOperations = await getImpl();
  } else {
    // SSR - return dummy zenoh-ts operations
    zenohOperations = createDummyZenohOperations();
  }
  return {
    ...state,
    ...appOperations,
    ...zenohOperations,
  };
}
