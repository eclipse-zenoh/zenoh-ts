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

// Log entry types for color coding
export type LogType = "info" | "success" | "error" | "data" | "warning";

// Color mapping for different log types
const LOG_COLORS: Record<LogType, string> = {
  info: "#2563eb",      // blue
  success: "#16a34a",   // green
  error: "#dc2626",     // red
  data: "#7c3aed",      // purple
  warning: "#ea580c",   // orange
};

// JSON syntax highlighting colors
const JSON_COLORS = {
  key: "#059669",       // emerald
  string: "#dc2626",    // red
  number: "#2563eb",    // blue
  boolean: "#7c3aed",   // purple
  null: "#6b7280",      // gray
  bracket: "#374151",   // dark gray
};

/**
 * Pretty formats JSON with syntax highlighting for browser display
 * @param obj The object to format as JSON
 * @param indent The indentation level (for recursive calls)
 * @returns HTML string with colored JSON formatting
 */
function formatJSONWithColors(obj: any, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);
  const nextIndentStr = "  ".repeat(indent + 1);

  if (obj === null) {
    return `<span style="color: ${JSON_COLORS.null}">null</span>`;
  }

  if (typeof obj === "string") {
    return `<span style="color: ${JSON_COLORS.string}">"${obj}"</span>`;
  }

  if (typeof obj === "number") {
    return `<span style="color: ${JSON_COLORS.number}">${obj}</span>`;
  }

  if (typeof obj === "boolean") {
    return `<span style="color: ${JSON_COLORS.boolean}">${obj}</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">[]</span>`;
    }

    const items = obj.map(item => 
      `${nextIndentStr}${formatJSONWithColors(item, indent + 1)}`
    ).join(",\n");

    return `<span style="color: ${JSON_COLORS.bracket}">[</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">]</span>`;
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">{}</span>`;
    }

    const items = keys.map(key => {
      const value = formatJSONWithColors(obj[key], indent + 1);
      return `${nextIndentStr}<span style="color: ${JSON_COLORS.key}">"${key}"</span>: ${value}`;
    }).join(",\n");

    return `<span style="color: ${JSON_COLORS.bracket}">{</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">}</span>`;
  }

  return String(obj);
}

/**
 * Formats a log message with optional JSON pretty printing and color coding
 * @param type The type of log message for color coding
 * @param message The string message or object to log
 * @returns Formatted HTML string for display
 */
export function formatLogMessage(type: LogType, message: string | object): string {
  const timestamp = new Date().toISOString();
  const typeColor = LOG_COLORS[type];
  
  // Format the message based on its type
  let formattedMessage: string;
  
  if (typeof message === "string") {
    formattedMessage = message;
  } else {
    // Pretty format JSON with syntax highlighting
    formattedMessage = `<pre style="margin: 0; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid ${typeColor};">${formatJSONWithColors(message)}</pre>`;
  }

  // Return formatted log entry with timestamp and type
  return `<div style="margin: 4px 0;">
    <span style="color: #6b7280; font-size: 0.85em;">[${timestamp}]</span>
    <span style="color: ${typeColor}; font-weight: bold; text-transform: uppercase;">[${type}]</span>
    <span style="margin-left: 8px;">${formattedMessage}</span>
  </div>`;
}
