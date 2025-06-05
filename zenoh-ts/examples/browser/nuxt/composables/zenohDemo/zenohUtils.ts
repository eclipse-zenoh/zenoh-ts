import {
  Sample,
  SampleKind,
  Priority,
  CongestionControl,
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
