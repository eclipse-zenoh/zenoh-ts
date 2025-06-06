import type { Ref } from "vue";
import { ref } from "vue";
import { Deconstructable, type OptionItem } from "./zenohDemo/utils";

// Type-only imports - safe for SSR
import type {
  Priority,
  CongestionControl,
  Reliability,
  Locality,
  QueryTarget,
  ConsolidationMode,
  ReplyKeyExpr,
} from "@eclipse-zenoh/zenoh-ts";

// Log entry interface
export interface LogEntry {
  timestamp: Date;
  type: "info" | "success" | "error" | "data";
  message: string;
  data?: Record<string, any>; // Optional data record with single key-value pair
}

// Subscriber info interface
export interface SubscriberInfo {
  displayId: string; // Display ID like "sub0", "sub1", etc.
  keyExpr: string;
  subscriber: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
}

// Queryable info interface
export interface QueryableInfo {
  displayId: string; // Display ID like "qry0", "qry1", etc.
  keyExpr: string;
  queryable: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
}

// Put options state
export interface PutOptionsState {
  showOptions: Ref<boolean>;
  encoding: Ref<string>;
  customEncoding: Ref<boolean>;
  priority: Ref<Priority | undefined>;
  congestionControl: Ref<CongestionControl | undefined>;
  express: Ref<boolean | undefined>;
  reliability: Ref<Reliability | undefined>;
  allowedDestination: Ref<Locality | undefined>;
  attachment: Ref<string>;
  attachmentEmpty: Ref<boolean>;
}

// Subscriber options state
export interface SubscriberOptionsState {
  showOptions: Ref<boolean>;
  allowedOrigin: Ref<Locality | undefined>;
}

// Queryable options state
export interface QueryableOptionsState {
  showOptions: Ref<boolean>;
  complete: Ref<boolean | undefined>;
  allowedOrigin: Ref<Locality | undefined>;
}

// Get options state
export interface GetOptionsState {
  showOptions: Ref<boolean>;
  congestionControl: Ref<CongestionControl | undefined>;
  priority: Ref<Priority | undefined>;
  express: Ref<boolean | undefined>;
  allowedDestination: Ref<Locality | undefined>;
  encoding: Ref<string>;
  customEncoding: Ref<boolean>;
  payload: Ref<string>;
  payloadEmpty: Ref<boolean>;
  attachment: Ref<string>;
  attachmentEmpty: Ref<boolean>;
  timeout: Ref<number | undefined>; // timeout in milliseconds
  target: Ref<QueryTarget | undefined>;
  consolidation: Ref<ConsolidationMode | undefined>;
  acceptReplies: Ref<ReplyKeyExpr | undefined>;
}

// Zenoh Demo state interface combining UI state and operations
export interface ZenohDemoState {
  serverUrl: Ref<string>;
  isConnected: Ref<boolean>;
  isConnecting: Ref<boolean>;
  putKey: Ref<string>;
  putValue: Ref<string>;
  putOptions: PutOptionsState;
  subscriberOptions: SubscriberOptionsState;
  queryableKey: Ref<string>;
  queryableOptions: QueryableOptionsState;
  getKey: Ref<string>;
  getOptions: GetOptionsState;
  subscribeKey: Ref<string>;
  logEntries: Ref<LogEntry[]>;
  activeSubscribers: Ref<SubscriberInfo[]>;
  activeQueryables: Ref<QueryableInfo[]>;
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
  declareQueryable: () => Promise<void>;
  undeclareQueryable: (queryableId: string) => Promise<void>;
  addLogEntry: (type: LogEntry["type"], message: string, data?: Record<string, any>) => void;
  addErrorLogEntry: (message: string, error?: any) => void;
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
    priority: ref(undefined as Priority | undefined),
    congestionControl: ref(undefined as CongestionControl | undefined),
    express: ref(undefined as boolean | undefined),
    reliability: ref(undefined as Reliability | undefined),
    allowedDestination: ref(undefined as Locality | undefined),
    attachment: ref(""),
    attachmentEmpty: ref(true),
  };
  subscriberOptions = {
    showOptions: ref(false),
    allowedOrigin: ref(undefined as Locality | undefined),
  };
  queryableKey = ref("demo/example/queryable");
  queryableOptions = {
    showOptions: ref(false),
    complete: ref(undefined as boolean | undefined),
    allowedOrigin: ref(undefined as Locality | undefined),
  };
  getKey = ref("demo/example/*");
  getOptions = {
    showOptions: ref(false),
    congestionControl: ref(undefined as CongestionControl | undefined),
    priority: ref(undefined as Priority | undefined),
    express: ref(undefined as boolean | undefined),
    allowedDestination: ref(undefined as Locality | undefined),
    encoding: ref(""),
    customEncoding: ref(false),
    payload: ref(""),
    payloadEmpty: ref(true),
    attachment: ref(""),
    attachmentEmpty: ref(true),
    timeout: ref(undefined as number | undefined),
    target: ref(undefined as QueryTarget | undefined),
    consolidation: ref(undefined as ConsolidationMode | undefined),
    acceptReplies: ref(undefined as ReplyKeyExpr | undefined),
  };
  subscribeKey = ref("demo/example/**");
  logEntries = ref<LogEntry[]>([]);
  activeSubscribers = ref<SubscriberInfo[]>([]);
  activeQueryables = ref<QueryableInfo[]>([]);
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
  async declareQueryable() {}
  async undeclareQueryable(_: string) {}
  addLogEntry(_: LogEntry["type"], __: string, ___?: Record<string, any>) {}
  addErrorLogEntry(_: string, __?: any) {}
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
