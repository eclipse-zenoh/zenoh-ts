import {
  Sample,
  SampleKind,
  Priority,
  CongestionControl,
  Reliability,
  Locality,
  Query,
  type PutOptions,
  type SubscriberOptions,
  type QueryableOptions,
  type GetOptions,
  type ReplyErrOptions,
  type ReplyOptions,
  QueryTarget,
  ConsolidationMode,
  ReplyKeyExpr,
  ReplyError,
  Timestamp,
  SessionInfo,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from 'typed-duration';
import { getEnumLabel } from "./safeUtils";
import type { ReplyParametersState, ReplyErrParametersState } from "../useZenohDemo";

const { milliseconds } = Duration;

// Interface for the timestamp JSON representation
export interface TimestampJSON {
  timestamp: string;
  id: string;
}

// Interface for the session info JSON representation
export interface SessionInfoJSON {
  sessionId: string;
  peersZid: string[];
  routersZid: string[];
}

// Interface for the sample JSON representation
export interface SampleJSON {
  keyexpr: string;
  payload: string;
  kind: string;
  encoding: string;
  priority: string;
  congestionControl: string;
  express: string;
  timestamp: TimestampJSON | undefined;
  attachment: string | undefined;
}

export interface ReplyErrorJSON {
  payload: string;
  encoding: string;
}

// Interface for the put options JSON representation
export interface PutOptionsJSON {
  encoding: string | undefined;
  priority: string | undefined;
  congestionControl: string | undefined;
  express: string | undefined;
  reliability: string | undefined;
  allowedDestination: string | undefined;
  attachment: string | undefined;
}

// Interface for the subscriber options JSON representation
export interface SubscriberOptionsJSON {
  allowedOrigin: string | undefined;
}

// Interface for the queryable options JSON representation
export interface QueryableOptionsJSON {
  complete: string | undefined;
  allowedOrigin: string | undefined;
}

// Interface for the reply options JSON representation
export interface ReplyOptionsJSON {
  encoding: string | undefined;
  congestionControl: string | undefined;
  priority: string | undefined;
  express: string | undefined;
  timestamp: TimestampJSON | undefined;
  attachment: string | undefined;
}

// Interface for the reply error options JSON representation
export interface ReplyErrOptionsJSON {
  encoding: string | undefined;
}

// Interface for the get options JSON representation
export interface GetOptionsJSON {
  congestionControl: string | undefined;
  priority: string | undefined;
  express: string | undefined;
  allowedDestination: string | undefined;
  encoding: string | undefined;
  payload: string | undefined;
  attachment: string | undefined;
  timeout_ms: number | undefined;
  target: string | undefined;
  consolidation: string | undefined;
  acceptReplies: string | undefined;
}

// Interface for the query JSON representation
export interface QueryJSON {
  keyexpr: string;
  parameters: string | undefined;
  payload: string | undefined;
  encoding: string | undefined;
}

// Wrapper function for getEnumLabel which returns
// a string label of the enum value or a default "UNKNOWN" and the value in round brackets
function label<
  T extends Record<string, string | number>
>(enumObj: T, value: T[keyof T]): string {
  const label = getEnumLabel(enumObj, value);
  if (label !== undefined) {
    return `${label}(${value})`;
  } else {
    return `UNKNOWN(${value})`;
  }
}

function labelOrUndefined<
  T extends Record<string, string | number>
>(enumObj: T, value: T[keyof T] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return label(enumObj, value);
}

function cleanUndefineds<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as T;
}

/**
 * Converts a Zenoh Timestamp to a structured JSON object
 * @param timestamp The Zenoh Timestamp to convert
 * @returns A structured object containing timestamp as ISO string and id as string
 */
export function timestampToJSON(timestamp: Timestamp): TimestampJSON {
  return {
    timestamp: timestamp.asDate().toISOString(),
    id: timestamp.getId().toString(),
  };
}

/**
 * Converts a Zenoh SessionInfo to a structured JSON object
 * @param sessionInfo The Zenoh SessionInfo to convert
 * @returns A structured object containing session ID and connected peers/routers
 */
export function sessionInfoToJSON(sessionInfo: SessionInfo): SessionInfoJSON {
  return {
    sessionId: sessionInfo.zid().toString(),
    peersZid: sessionInfo.peersZid().map(zid => zid.toString()),
    routersZid: sessionInfo.routersZid().map(zid => zid.toString()),
  };
}

/**
 * Converts a Zenoh Sample to a structured JSON object
 * @param sample The Zenoh Sample to convert
 * @returns A structured object containing all sample properties as strings
 */
export function sampleToJSON(sample: Sample): SampleJSON {
  return {
    keyexpr: sample.keyexpr().toString(),
    payload: sample.payload().toString(),
    kind:
      label(SampleKind, sample.kind()),
    encoding: sample.encoding().toString(),
    priority:
      label(Priority, sample.priority()),
    congestionControl:
      label(CongestionControl, sample.congestionControl()),
    express: sample.express().toString(),
    timestamp: sample.timestamp() ? timestampToJSON(sample.timestamp()!) : undefined,
    attachment: sample.attachment()?.toString(),
  };
}

export function replyErrorToJSON(replyError: ReplyError): ReplyErrorJSON {
  return {
    payload: replyError.payload().toString(),
    encoding: replyError.encoding().toString(),
  };
}

/**
 * Converts a Zenoh Query to a structured JSON object
 * @param query The Zenoh Query to convert
 * @returns A structured object containing all query properties as strings
 */
export function queryToJSON(query: Query): QueryJSON {
  return {
    keyexpr: query.keyExpr().toString(),
    parameters: query.parameters()?.toString(),
    payload: query.payload()?.toString(),
    encoding: query.encoding()?.toString(),
  };
}

/**
 * Converts PutOptions object to a structured JSON object for logging
 * @param options The PutOptions object to convert
 * @returns A structured object containing all put options as strings
 */
export function putOptionsToJSON(options: PutOptions): PutOptionsJSON {
  const result: PutOptionsJSON = {
    encoding: options.encoding?.toString(),
    priority: labelOrUndefined(Priority, options.priority),
    congestionControl: labelOrUndefined(CongestionControl, options.congestionControl),
    express:
      options.express !== undefined ? options.express.toString() : undefined,
    reliability: labelOrUndefined(Reliability, options.reliability),
    allowedDestination: labelOrUndefined(Locality, options.allowedDestination),
    attachment: options.attachment?.toString(),
  };
  return cleanUndefineds(result);
}

/**
 * Converts SubscriberOptions object to a structured JSON object for logging
 * @param options The SubscriberOptions object to convert
 * @returns A structured object containing all subscriber options as strings
 */
export function subscriberOptionsToJSON(
  options: SubscriberOptions
): SubscriberOptionsJSON {
  const result: SubscriberOptionsJSON = {
    allowedOrigin: labelOrUndefined(Locality, options.allowedOrigin),
  };
  return cleanUndefineds(result);
}

/**
 * Converts QueryableOptions object to a structured JSON object for logging
 * @param options The QueryableOptions object to convert
 * @returns A structured object containing all queryable options as strings
 */
export function queryableOptionsToJSON(
  options: QueryableOptions
): QueryableOptionsJSON {
  const result: QueryableOptionsJSON = {
    complete: options.complete?.toString(),
    allowedOrigin: labelOrUndefined(Locality, options.allowedOrigin),
  };
  return cleanUndefineds(result);
}

/**
 * Converts GetOptions object to a structured JSON object for logging
 * @param options The GetOptions object to convert
 * @returns A structured object containing all get options as strings
 */
export function getOptionsToJSON(options: GetOptions): GetOptionsJSON {
  const result: GetOptionsJSON = {
    congestionControl: labelOrUndefined(CongestionControl, options.congestionControl),
    priority: labelOrUndefined(Priority, options.priority),
    express: options.express !== undefined ? options.express.toString() : undefined,
    allowedDestination: labelOrUndefined(Locality, options.allowedDestination),
    encoding: options.encoding?.toString(),
    payload: options.payload?.toString(),
    attachment: options.attachment?.toString(),
    timeout_ms: options.timeout !== undefined ? milliseconds.from(options.timeout) : undefined,
    target: labelOrUndefined(QueryTarget, options.target),
    consolidation: labelOrUndefined(ConsolidationMode, options.consolidation),
    acceptReplies: labelOrUndefined(ReplyKeyExpr, options.acceptReplies),
  };
  return cleanUndefineds(result);
}

export function replyOptionsToJSON(options: ReplyOptions): ReplyOptionsJSON {
  const result: ReplyOptionsJSON = {
    encoding: options.encoding?.toString(),
    congestionControl: labelOrUndefined(CongestionControl, options.congestionControl),
    priority: labelOrUndefined(Priority, options.priority),
    express: options.express !== undefined ? options.express.toString() : undefined,
    timestamp: options.timestamp ? timestampToJSON(options.timestamp) : undefined,
    attachment: options.attachment?.toString(),
  };
  return cleanUndefineds(result);
}

export function replyErrOptionsToJSON(options: ReplyErrOptions): ReplyErrOptionsJSON {
  const result: ReplyErrOptionsJSON = {
    encoding: options.encoding?.toString(),
  };
  return cleanUndefineds(result);
}

export function replyParametersStateToReplyOptionsJSON(parameters: ReplyParametersState): ReplyOptionsJSON {
  const result: ReplyOptionsJSON = {
    encoding: parameters.encoding?.toString(),
    congestionControl: labelOrUndefined(CongestionControl, parameters.congestionControl),
    priority: labelOrUndefined(Priority, parameters.priority),
    express: parameters.express !== undefined ? parameters.express.toString() : undefined,
    timestamp: parameters.timestamp ? { timestamp: parameters.timestamp.toISOString(), id: "" } : undefined,
    attachment: parameters.attachment?.toString(),
  };
  return cleanUndefineds(result);
}

/**
 * Converts ReplyErrOptions object to a structured JSON object for logging
 * @param options The ReplyErrOptions object to convert
 * @returns A structured object containing all reply error options as strings
 */
export function replyErrParametersStateToReplyErrOptionsJSON(parameters: ReplyErrParametersState): ReplyErrOptionsJSON {
  const result: ReplyErrOptionsJSON = {
    encoding: parameters.encoding?.toString(),
  };
  return cleanUndefineds(result);
}
