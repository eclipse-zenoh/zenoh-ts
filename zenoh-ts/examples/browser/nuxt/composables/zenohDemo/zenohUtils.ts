import {
  Sample,
  SampleKind,
  Priority,
  CongestionControl,
  Reliability,
  Locality,
  type PutOptions,
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

/**
 * Converts a Zenoh Sample to a structured JSON object
 * @param sample The Zenoh Sample to convert
 * @returns A structured object containing all sample properties as strings
 */
export function sampleToJSON(sample: Sample): SampleJSON {
  return {
    keyexpr: sample.keyexpr().toString(),
    payload: sample.payload().toString(),
    kind: getEnumLabel(SampleKind, sample.kind()) || `UNKNOWN(${sample.kind()})`,
    encoding: sample.encoding().toString(),
    priority: getEnumLabel(Priority, sample.priority()) || `UNKNOWN(${sample.priority()})`,
    congestionControl: getEnumLabel(CongestionControl, sample.congestionControl()) || `UNKNOWN(${sample.congestionControl()})`,
    express: sample.express().toString(),
    timestamp: sample.timestamp()?.asDate().toISOString(),
    attachment: sample.attachment()?.toString(),
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
    priority: options.priority !== undefined 
      ? getEnumLabel(Priority, options.priority) || `UNKNOWN(${options.priority})`
      : undefined,
    congestionControl: options.congestionControl !== undefined
      ? getEnumLabel(CongestionControl, options.congestionControl) || `UNKNOWN(${options.congestionControl})`
      : undefined,
    express: options.express !== undefined 
      ? options.express.toString()
      : undefined,
    reliability: options.reliability !== undefined
      ? getEnumLabel(Reliability, options.reliability) || `UNKNOWN(${options.reliability})`
      : undefined,
    allowedDestination: options.allowedDestination !== undefined
      ? getEnumLabel(Locality, options.allowedDestination) || `UNKNOWN(${options.allowedDestination})`
      : undefined,
    attachment: options.attachment?.toString()
  };

  // Remove undefined values to keep the JSON clean
  return Object.fromEntries(
    Object.entries(result).filter(([_, value]) => value !== undefined)
  ) as PutOptionsJSON;
}
