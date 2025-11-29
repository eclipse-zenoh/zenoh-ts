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

// Session state interface
export interface SessionState {
  displayId: string; // Display ID like "ses0", "ses1", etc.
  serverUrl: string;
  session: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
  isConnecting: boolean;
}

// Subscriber state interface
export interface SubscriberState {
  displayId: string; // Display ID like "sub0", "sub1", etc.
  sessionId: string; // Session ID that this subscriber belongs to
  keyExpr: string;
  subscriber: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
  options: SubscriberOptionsJSON
}

// Publisher put parameters state - for each publisher instance
export interface PublisherPutParametersState {
  payload: string;
  payloadEmpty: boolean;
  encoding: string;
  customEncoding: boolean;
  priority: Priority | undefined;
  congestionControl: CongestionControl | undefined;
  express: boolean | undefined;
  attachment: string;
  attachmentEmpty: boolean;
  putOptionsJSON: any; // TODO: Define PutOptionsJSON type
  updatePutOptionsJSON: () => void;
}

// Publisher state interface
export interface PublisherState {
  displayId: string; // Display ID like "pub0", "pub1", etc.
  sessionId: string; // Session ID that this publisher belongs to
  keyExpr: string;
  publisher: any; // Use any type to avoid strict type checking issues
  createdAt: Date;
  options: any; // TODO: Define PublisherOptionsJSON when implementing
  putParameters: PublisherPutParametersState; // Per-publisher configuration
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
  useTimestamp: boolean; // Whether to automatically get timestamp from session
  attachment: string;
  attachmentEmpty: boolean;
  replyOptionsJSON: ReplyOptionsJSON;
  updateReplyOptionsJSON: () => void
}

// Reply error parameters state - for error replies
export interface ReplyErrParametersState {
  payload: string;
  payloadEmpty: boolean;
  encoding: string;
  customEncoding: boolean;
  replyErrOptionsJSON: ReplyErrOptionsJSON;
  updateReplyErrOptionsJSON: () => void
}

// Individual queryable response parameters state
export interface QueryableResponseParametersState {
  // Reply configuration
  replyType: "reply" | "replyErr" | "ignore";
  
  // Reply sub-states
  reply: ReplyParametersState;
  replyErr: ReplyErrParametersState;

  // Legacy methods for backward compatibility (now delegate to nested structures)
}

// Queryable state interface
export interface QueryableState {
  displayId: string; // Display ID like "qry0", "qry1", etc.
  sessionId: string; // Session ID that this queryable belongs to
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

// Publisher parameters state - includes all publisher-related data
export interface PublisherParametersState {
  key: Ref<string>;
  encoding: Ref<string>;
  customEncoding: Ref<boolean>;
  congestionControl: Ref<CongestionControl | undefined>;
  priority: Ref<Priority | undefined>;
  express: Ref<boolean | undefined>;
  reliability: Ref<Reliability | undefined>;
  allowedDestination: Ref<Locality | undefined>;
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
  isConnecting: Ref<boolean>;
  putParameters: PutParametersState;
  subscriberParameters: SubscriberParametersState;
  publisherParameters: PublisherParametersState;
  queryableParameters: QueryableParametersState;
  getParameters: GetParametersState;
  logEntries: Ref<LogEntry[]>;
  activeSessions: Ref<SessionState[]>;
  selectedSessionId: Ref<string | null>; // Track which session is currently selected
  activeSubscribers: Ref<SubscriberState[]>;
  activePublishers: Ref<PublisherState[]>;
  activeQueryables: Ref<QueryableState[]>;
  priorityOptions: OptionItem[];
  congestionControlOptions: OptionItem[];
  reliabilityOptions: OptionItem[];
  localityOptions: OptionItem[];
  encodingOptions: OptionItem[];
  targetOptions: OptionItem[];
  consolidationOptions: OptionItem[];
  acceptRepliesOptions: OptionItem[];
  connect: () => Promise<void>;
  disconnect: (sessionId: string) => Promise<void>;
  selectSession: (sessionId: string) => void;
  performPut: () => Promise<void>;
  performGet: () => Promise<void>;
  getSessionInfo: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: (subscriberId: string) => Promise<void>;
  declarePublisher: () => Promise<void>;
  undeclarePublisher: (publisherId: string) => Promise<void>;
  publishData: (publisherId: string) => Promise<void>;
  declareQueryable: () => Promise<void>;
  undeclareQueryable: (queryableId: string) => Promise<void>;
  addLogEntry: (type: LogEntry["type"], message: string, data?: Record<string, any>) => void;
  addErrorLogEntry: (message: string, error?: any) => void;
  clearLog: () => void;
}

// Helper function to create default response parameters for a new queryable
export function createDefaultResponseParameters(): QueryableResponseParametersState {
  const reply: ReplyParametersState = {
    keyExpr: "",
    payload: "",
    payloadEmpty: true,
    encoding: "",
    customEncoding: false,
    priority: undefined as Priority | undefined,
    congestionControl: undefined as CongestionControl | undefined,
    express: undefined as boolean | undefined,
    useTimestamp: false,
    attachment: "",
    attachmentEmpty: true,
    replyOptionsJSON: {} as ReplyOptionsJSON,
    updateReplyOptionsJSON: () => {}
  };

  const replyErr: ReplyErrParametersState = {
    payload: "",
    payloadEmpty: true,
    encoding: "",
    customEncoding: false,
    replyErrOptionsJSON: {} as ReplyErrOptionsJSON,
    updateReplyErrOptionsJSON: () => {}
  };

  return {
    // Reply configuration
    replyType: "reply" as "reply" | "replyErr" | "ignore",
    // Reply sub-states
    reply,
    replyErr,
  };
}

// Helper function to create default publisher put parameters
export function createDefaultPublisherPutParameters(): PublisherPutParametersState {
  return {
    payload: "",
    payloadEmpty: true,
    encoding: "",
    customEncoding: false,
    priority: undefined as Priority | undefined,
    congestionControl: undefined as CongestionControl | undefined,
    express: undefined as boolean | undefined,
    attachment: "",
    attachmentEmpty: true,
    putOptionsJSON: {},
    updatePutOptionsJSON: () => {}
  };
}

export class ZenohDemoEmpty extends Deconstructable implements ZenohDemoState {
  // state fields only; operations are bound in the super constructor
  serverUrl = ref("ws://localhost:10000");
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
  publisherParameters = {
    key: ref("demo/example/publisher"),
    encoding: ref(""),
    customEncoding: ref(false),
    congestionControl: ref(undefined as CongestionControl | undefined),
    priority: ref(undefined as Priority | undefined),
    express: ref(undefined as boolean | undefined),
    reliability: ref(undefined as Reliability | undefined),
    allowedDestination: ref(undefined as Locality | undefined),
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
  activeSessions = ref<SessionState[]>([]);
  selectedSessionId = ref<string | null>(null);
  activeSubscribers = ref<SubscriberState[]>([]);
  activePublishers = ref<PublisherState[]>([]);
  activeQueryables = ref<QueryableState[]>([]) as any;
  priorityOptions: OptionItem[] = [];
  congestionControlOptions: OptionItem[] = [];
  reliabilityOptions: OptionItem[] = [];
  localityOptions: OptionItem[] = [];
  encodingOptions: OptionItem[] = [];
  targetOptions: OptionItem[] = [];
  consolidationOptions: OptionItem[] = [];
  acceptRepliesOptions: OptionItem[] = [];
  async connect() {}
  async disconnect(_: string) {}
  selectSession(_: string) {}
  async performPut() {}
  async performGet() {}
  async subscribe() {}
  async unsubscribe(_: string) {}
  async declarePublisher() {}
  async undeclarePublisher(_: string) {}
  async publishData(_: string) {}
  async declareQueryable() {}
  async undeclareQueryable(_: string) {}
  addLogEntry(_: LogEntry["type"], __: string, ___?: Record<string, any>) {}
  addErrorLogEntry(_: string, __?: any) {}
  clearLog() {}
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
