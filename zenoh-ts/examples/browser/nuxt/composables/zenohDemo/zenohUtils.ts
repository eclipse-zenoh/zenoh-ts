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
} from "@eclipse-zenoh/zenoh-ts";
import { getEnumLabel } from "./utils";

// Interface for the sample JSON representation
export interface SampleJSON {
  keyexpr: string;
  payload: string;
  kind: string;
  encoding: string;
  priority: string;
  congestionControl: string;
  express: string;
  timestamp: string | undefined;
  attachment: string | undefined;
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

// Interface for the get options JSON representation
export interface GetOptionsJSON {
  congestionControl: string | undefined;
  priority: string | undefined;
  express: string | undefined;
  allowedDestination: string | undefined;
  encoding: string | undefined;
  payload: string | undefined;
  attachment: string | undefined;
  timeout: string | undefined;
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

function claenUndefineds<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as T;
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
    timestamp: sample.timestamp()?.asDate().toISOString(),
    attachment: sample.attachment()?.toString(),
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
  return claenUndefineds(result);
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
  return claenUndefineds(result);
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
  return claenUndefineds(result);
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
    timeout: options.timeout?.toString(),
    target: options.target !== undefined ? options.target.toString() : undefined,
    consolidation: options.consolidation !== undefined ? options.consolidation.toString() : undefined,
    acceptReplies: options.acceptReplies !== undefined ? options.acceptReplies.toString() : undefined,
  };
  return claenUndefineds(result);
}
