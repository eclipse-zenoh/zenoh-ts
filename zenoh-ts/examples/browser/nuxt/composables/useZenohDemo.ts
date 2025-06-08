import type { Ref } from "vue";
import { ref } from "vue";
import { Deconstructable, type OptionItem } from "./zenohDemo/safeUtils";

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
import type { QueryableOptionsJSON, ReplyErrOptionsJSON, ReplyOptionsJSON, SubscriberOptionsJSON } from "./zenohDemo/zenohUtils";

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
  options: SubscriberOptionsJSON
}

// Reply parameters state - for successful replies
export interface ReplyParametersState {
  keyExpr: string;
  payload: string;
  payloadEmpty: boolean;
  encoding: string;
  customEncoding: boolean;
  priority: Priority | undefined;
  congestionControl: CongestionControl | undefined;
  express: boolean | undefined;
  timestamp: Date | undefined;
  useTimestamp: boolean; // Whether to automatically get timestamp from session
  attachment: string;
  attachmentEmpty: boolean;
}

// Reply error parameters state - for error replies
export interface ReplyErrParametersState {
  payload: string;
  payloadEmpty: boolean;
  encoding: string;
  customEncoding: boolean;
}

// Individual queryable response parameters state
export interface QueryableResponseParametersState {
  // Reply configuration
  replyType: "reply" | "replyErr";
  
  // Reply sub-states
  reply: ReplyParametersState;
  replyErr: ReplyErrParametersState;

  // Methods to get JSON representations of the reply options
  // As the zenoh-ts library is loaded dynamically to avoid SSR issues,
  // we cannot import real method implementations here, so using function references
  getReplyOptionsJSON: () => ReplyOptionsJSON;
  getReplyErrOptionsJSON: () => ReplyErrOptionsJSON;
}

// Queryable info interface
export interface QueryableInfo {
  displayId: string; // Display ID like "qry0", "qry1", etc.
  keyExpr: string;
  queryable: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
  options: QueryableOptionsJSON;
  responseParameters: QueryableResponseParametersState; // Individual response settings
}

// Put parameters state - includes all put-related data
export interface PutParametersState {
  key: Ref<string>;
  value: Ref<string>;
  valueEmpty: Ref<boolean>;
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

// Subscriber parameters state - includes all subscriber-related data
export interface SubscriberParametersState {
  key: Ref<string>;
  allowedOrigin: Ref<Locality | undefined>;
}

// Queryable parameters state - includes all queryable-related data (declaration only)
export interface QueryableParametersState {
  key: Ref<string>;
  complete: Ref<boolean | undefined>;
  allowedOrigin: Ref<Locality | undefined>;
}

// Get parameters state - includes all get-related data
export interface GetParametersState {
  key: Ref<string>;
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
  timeoutEmpty: Ref<boolean>;
  target: Ref<QueryTarget | undefined>;
  consolidation: Ref<ConsolidationMode | undefined>;
  acceptReplies: Ref<ReplyKeyExpr | undefined>;
}

// Zenoh Demo state interface combining UI state and operations
export interface ZenohDemoState {
  serverUrl: Ref<string>;
  isConnected: Ref<boolean>;
  isConnecting: Ref<boolean>;
  putParameters: PutParametersState;
  subscriberParameters: SubscriberParametersState;
  queryableParameters: QueryableParametersState;
  getParameters: GetParametersState;
  logEntries: Ref<LogEntry[]>;
  activeSubscribers: Ref<SubscriberInfo[]>;
  activeQueryables: Ref<QueryableInfo[]>;
  priorityOptions: OptionItem[];
  congestionControlOptions: OptionItem[];
  reliabilityOptions: OptionItem[];
  localityOptions: OptionItem[];
  encodingOptions: OptionItem[];
  targetOptions: OptionItem[];
  consolidationOptions: OptionItem[];
  acceptRepliesOptions: OptionItem[];
  connect: () => Promise<void>;
  getSessionId: () => Promise<string | null>;
  getSessionInfo: () => Promise<void>;
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

// Helper function to create default response parameters for a new queryable
export function createDefaultResponseParameters(): QueryableResponseParametersState {
  return {
    // Reply configuration
    replyType: "reply" as "reply" | "replyErr",
    
    // Reply sub-states
    reply: {
      keyExpr: "",
      payload: "",
      payloadEmpty: true,
      encoding: "",
      customEncoding: false,
      priority: undefined as Priority | undefined,
      congestionControl: undefined as CongestionControl | undefined,
      express: undefined as boolean | undefined,
      timestamp: undefined as Date | undefined,
      useTimestamp: false,
      attachment: "",
      attachmentEmpty: true,
    },
    replyErr: {
      payload: "",
      payloadEmpty: true,
      encoding: "",
      customEncoding: false,
    },

    getReplyOptionsJSON: () => { return {} as ReplyOptionsJSON; },
    getReplyErrOptionsJSON: () => { return {} as ReplyErrOptionsJSON; },
  };
}

export class ZenohDemoEmpty extends Deconstructable implements ZenohDemoState {
  // state fields only; operations are bound in the super constructor
  serverUrl = ref("ws://localhost:10000");
  isConnected = ref(false);
  isConnecting = ref(false);
  putParameters = {
    key: ref("demo/example/test"),
    value: ref("Hello Zenoh!"),
    valueEmpty: ref(false),
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
  subscriberParameters = {
    key: ref("demo/example/**"),
    allowedOrigin: ref(undefined as Locality | undefined),
  };
  queryableParameters = {
    key: ref("demo/example/queryable"),
    complete: ref(undefined as boolean | undefined),
    allowedOrigin: ref(undefined as Locality | undefined),
  };
  getParameters = {
    key: ref("demo/example/*"),
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
    timeoutEmpty: ref(true),
    target: ref(undefined as QueryTarget | undefined),
    consolidation: ref(undefined as ConsolidationMode | undefined),
    acceptReplies: ref(undefined as ReplyKeyExpr | undefined),
  };
  logEntries = ref<LogEntry[]>([]);
  activeSubscribers = ref<SubscriberInfo[]>([]);
  activeQueryables = ref<QueryableInfo[]>([]) as any;
  priorityOptions: OptionItem[] = [];
  congestionControlOptions: OptionItem[] = [];
  reliabilityOptions: OptionItem[] = [];
  localityOptions: OptionItem[] = [];
  encodingOptions: OptionItem[] = [];
  targetOptions: OptionItem[] = [];
  consolidationOptions: OptionItem[] = [];
  acceptRepliesOptions: OptionItem[] = [];
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
  async getSessionId() { return null as string | null; }
  async getSessionInfo() {}
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
