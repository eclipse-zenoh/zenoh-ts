import {
  Sample,
  SampleKind,
  Priority,
  CongestionControl,
  Encoding,
  Timestamp,
  ZBytes,
} from "@eclipse-zenoh/zenoh-ts";

// Sample field conversion functions
function sampleKindToString(kind: SampleKind): string {
  switch (kind) {
    case SampleKind.PUT:
      return "PUT";
    case SampleKind.DELETE:
      return "DELETE";
    default:
      return `UNKNOWN(${kind})`;
  }
}

function priorityToString(priority: Priority): string {
  switch (priority) {
    case Priority.REAL_TIME:
      return "REAL_TIME";
    case Priority.INTERACTIVE_HIGH:
      return "INTERACTIVE_HIGH";
    case Priority.INTERACTIVE_LOW:
      return "INTERACTIVE_LOW";
    case Priority.DATA_HIGH:
      return "DATA_HIGH";
    case Priority.DATA:
      return "DATA";
    case Priority.DATA_LOW:
      return "DATA_LOW";
    case Priority.BACKGROUND:
      return "BACKGROUND";
    default:
      return `UNKNOWN(${priority})`;
  }
}

function congestionControlToString(congestionControl: CongestionControl): string {
  switch (congestionControl) {
    case CongestionControl.DROP:
      return "DROP";
    case CongestionControl.BLOCK:
      return "BLOCK";
    default:
      return `UNKNOWN(${congestionControl})`;
  }
}

function timestampToString(timestamp: Timestamp | undefined): string {
  return timestamp ? timestamp.asDate().toISOString() : "none";
}

function attachmentToString(attachment: ZBytes | undefined): string {
  return attachment ? `"${attachment.toString()}"` : "none";
}

function encodingToString(encoding: Encoding): string {
  return encoding.toString() || "none";
}

function expressToString(express: boolean): string {
  return express.toString();
}

// Interface for the sample JSON representation
export interface SampleJSON {
  key: string;
  value: string;
  kind: string;
  encoding: string;
  priority: string;
  congestionControl: string;
  express: string;
  timestamp: string;
  attachment: string;
}

/**
 * Converts a Zenoh Sample to a structured JSON object
 * @param sample The Zenoh Sample to convert
 * @returns A structured object containing all sample properties as strings
 */
export function sampleToJSON(sample: Sample): SampleJSON {
  return {
    key: sample.keyexpr().toString(),
    value: sample.payload().toString(),
    kind: sampleKindToString(sample.kind()),
    encoding: encodingToString(sample.encoding()),
    priority: priorityToString(sample.priority()),
    congestionControl: congestionControlToString(sample.congestionControl()),
    express: expressToString(sample.express()),
    timestamp: timestampToString(sample.timestamp()),
    attachment: attachmentToString(sample.attachment()),
  };
}
