import type { Ref } from "vue";
import { ref } from "vue";
import { Deconstructable, type OptionItem } from "./zenohDemo/utils";

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

// Put options state
export interface PutOptionsState {
  showOptions: Ref<boolean>;
  encoding: Ref<string>;
  customEncoding: Ref<boolean>;
  priority: Ref<Priority>;
  congestionControl: Ref<CongestionControl>;
  express: Ref<boolean>;
  reliability: Ref<Reliability>;
  allowedDestination: Ref<Locality>;
  attachment: Ref<string>;
}

// Zenoh Demo state interface combining UI state and operations
export interface ZenohDemoState {
  serverUrl: Ref<string>;
  isConnected: Ref<boolean>;
  isConnecting: Ref<boolean>;
  putKey: Ref<string>;
  putValue: Ref<string>;
  putOptions: PutOptionsState;
  getKey: Ref<string>;
  subscribeKey: Ref<string>;
  logEntries: Ref<LogEntry[]>;
  activeSubscribers: Ref<SubscriberInfo[]>;
  priorityOptions: OptionItem[];
  congestionControlOptions: OptionItem[];
  reliabilityOptions: OptionItem[];
  localityOptions: OptionItem[];
  encodingOptions: OptionItem[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  performPut: () => Promise<void>;
  performGet: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: (subscriberId: string) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
  addLogEntry: (type: LogEntry["type"], message: string) => void;
  clearLog: () => void;
}

export class ZenohDemoEmpty extends Deconstructable implements ZenohDemoState {
  // state fields only; operations are bound in the super constructor
  serverUrl = ref("ws://localhost:10000");
  isConnected = ref(false);
  isConnecting = ref(false);
  putKey = ref("demo/example/test");
  putValue = ref("Hello Zenoh!");
  putOptions = {
    showOptions: ref(false),
    encoding: ref(""),
    customEncoding: ref(false),
    priority: ref(0 as Priority),
    congestionControl: ref(0 as CongestionControl),
    express: ref(false),
    reliability: ref(0 as Reliability),
    allowedDestination: ref(0 as Locality),
    attachment: ref(""),
  };
  getKey = ref("demo/example/*");
  subscribeKey = ref("demo/example/**");
  logEntries = ref<LogEntry[]>([]);
  activeSubscribers = ref<SubscriberInfo[]>([]);
  priorityOptions: OptionItem[] = [];
  congestionControlOptions: OptionItem[] = [];
  reliabilityOptions: OptionItem[] = [];
  localityOptions: OptionItem[] = [];
  encodingOptions: OptionItem[] = [];
  async connect() {}
  async disconnect() {}
  async performPut() {}
  async performGet() {}
  async subscribe() {}
  async unsubscribe(_: string) {}
  async unsubscribeAll() {}
  addLogEntry(_: LogEntry["type"], __: string) {}
  clearLog() {}
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  // Check if we're in a browser environment
  if (import.meta.client) {
    // Dynamic import of the implementation - only loads in browser
    return await import("./zenohDemo/zenohDemo").then((module) =>
      module.useZenohDemo()
    );
  } else {
    // SSR - return empty implementation
    return new ZenohDemoEmpty();
  }
}
