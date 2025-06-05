import {
  type ZenohDemoState,
  ZenohDemoEmpty,
  type LogEntry,
  type SubscriberInfo,
  type PutOptionsState,
} from "../useZenohDemo";
import {
  Config,
  Session,
  KeyExpr,
  ZBytes,
  Sample,
  Reply,
  ReplyError,
  Encoding,
  Priority,
  CongestionControl,
  Reliability,
  Locality,
} from "@eclipse-zenoh/zenoh-ts";
import type { PutOptions } from "@eclipse-zenoh/zenoh-ts";
import {
  createOptionsFromEnum,
  createOptionsFromStaticConstants,
} from "./utils";
import { sampleToJSON } from "./zenohUtils";

// Pretty-print sample function using zenohUtils
function sampleToPrettyString(sample: Sample, subscriberId?: string): string {
  // Use the utility function to get structured sample data
  const sampleData = sampleToJSON(sample);

  // Create comprehensive sample information from the structured data
  const sampleInfo = [
    `Key: ${sampleData.key}`,
    `Value: "${sampleData.value}"`,
    `Kind: ${sampleData.kind}`,
    `Encoding: ${sampleData.encoding}`,
    `Priority: ${sampleData.priority}`,
    `CongestionControl: ${sampleData.congestionControl}`,
    `Express: ${sampleData.express}`,
    `Timestamp: ${sampleData.timestamp}`,
    `Attachment: ${sampleData.attachment}`,
  ].join(", ");

  // Return formatted string with optional subscriber ID
  const prefix = subscriberId ? `SUBSCRIPTION [${subscriberId}]` : "SAMPLE";
  return `${prefix} ${sampleInfo}`;
}

function putOptionsStateTo(options: PutOptionsState): PutOptions {
  let opts: PutOptions = {};
  if (options.encoding.value) {
    opts.encoding = Encoding.fromString(options.encoding.value);
  }
  if (options.priority.value) {
    opts.priority = options.priority.value;
  }
  if (options.congestionControl.value) {
    opts.congestionControl = options.congestionControl.value;
  }
  if (options.express.value) {
    opts.express = options.express.value;
  }
  if (options.reliability.value) {
    opts.reliability = options.reliability.value;
  }
  if (options.allowedDestination.value) {
    opts.allowedDestination = options.allowedDestination.value;
  }
  if (options.attachment.value) {
    opts.attachment = new ZBytes(options.attachment.value);
  }
  return opts;
}

class ZenohDemo extends ZenohDemoEmpty {
  private zenohSession: Session | null = null;
  private subscriberIdCounter = 0;

  constructor() {
    super();

    // Populate option arrays using utility functions from utils.ts
    this.priorityOptions = createOptionsFromEnum(Priority, ["DEFAULT"]);

    this.congestionControlOptions = createOptionsFromEnum(CongestionControl, [
      "DEFAULT_PUSH",
      "DEFAULT_REQUEST",
      "DEFAULT_RESPONSE",
    ]);

    this.reliabilityOptions = createOptionsFromEnum(Reliability, ["DEFAULT"]);

    this.localityOptions = createOptionsFromEnum(Locality, ["DEFAULT"]);

    // Encoding options - dynamically populated from Encoding static properties
    // Exclude private static properties that might be exposed
    this.encodingOptions = createOptionsFromStaticConstants(Encoding, [
      "ID_TO_ENCODING",
      "ENCODING_TO_ID",
      "SEP",
    ]);
  }

  override addLogEntry(type: LogEntry["type"], message: string): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    this.logEntries.value.push({ type, message, timestamp: new Date() });
  }

  // Common method for logging errors with stack traces
  private addErrorlogEntry(message: string, error: unknown): void {
    const stack = error instanceof Error ? error.stack : new Error().stack;
    
    // Parse stack trace to extract source location
    let sourceLocation = "";
    if (stack) {
      const stackLines = stack.split('\n');
      for (const line of stackLines) {
        // Look for lines that contain file paths (not node_modules or internal)
        const match = line.match(/\s+at\s+.*?\(?(.*?):(\d+):(\d+)\)?/);
        if (match) {
          const [, filePath, lineNumber, columnNumber] = match;
          // Filter out node_modules and internal files, show only application code
          if (filePath && !filePath.includes('node_modules') && !filePath.includes('internal/') && filePath.includes('.')) {
            const fileName = filePath.split('/').pop() || filePath;
            sourceLocation = ` [${fileName}:${lineNumber}:${columnNumber}]`;
            break;
          }
        }
      }
    }
    
    this.addLogEntry("error", `${message}${sourceLocation}: ${error}\nStack trace:\n${stack}`);
  }

  override clearLog(): void {
    this.logEntries.value = [];
  }

  override async connect(): Promise<void> {
    if (this.isConnecting.value || this.isConnected.value) return;

    this.isConnecting.value = true;
    this.addLogEntry(
      "info",
      `Attempting to connect to ${this.serverUrl.value}`
    );

    try {
      const config = new Config(this.serverUrl.value);
      this.zenohSession = await Session.open(config);
      this.isConnected.value = true;
      this.addLogEntry(
        "success",
        `Successfully connected to ${this.serverUrl.value}`
      );
    } catch (error) {
      this.addErrorlogEntry("Failed to connect", error);
      this.zenohSession = null;
    } finally {
      this.isConnecting.value = false;
    }
  }

  override async disconnect(): Promise<void> {
    if (!this.zenohSession) return;

    try {
      // Unsubscribe from all active subscriptions
      await this.unsubscribeAll();

      await this.zenohSession.close();
      this.zenohSession = null;
      this.isConnected.value = false;
      this.addLogEntry("success", "Disconnected from Zenoh");
    } catch (error) {
      this.addErrorlogEntry("Error during disconnect", error);
    }
  }

  override async performPut(): Promise<void> {
    if (!this.zenohSession || !this.putKey.value || !this.putValue.value)
      return;

    try {
      const keyExpr = new KeyExpr(this.putKey.value);
      const bytes = new ZBytes(this.putValue.value);

      // Build put options
      const options = putOptionsStateTo(this.putOptions);
      await this.zenohSession.put(keyExpr, bytes, options);
      this.addLogEntry(
        "success",
        `PUT: ${this.putKey.value} = "${this.putValue.value}"`
      );
    } catch (error) {
      this.addErrorlogEntry("PUT failed", error);
    }
  }

  override async performGet(): Promise<void> {
    if (!this.zenohSession || !this.getKey.value) return;

    try {
      const selector = this.getKey.value;
      this.addLogEntry("info", `GET: Querying ${selector}`);

      const receiver = await this.zenohSession.get(selector);
      if (!receiver) {
        this.addLogEntry("error", "GET failed: No receiver returned");
        return;
      }

      let resultCount = 0;

      while (true) {
        const reply: Reply | null = await receiver.receive();
        if (!reply) break;

        try {
          const result = reply.result();

          // Check if it's a successful sample or an error
          if ("keyexpr" in result && typeof result.keyexpr === "function") {
            // It's a Sample - use pretty-printing function
            const sample = result as Sample;
            const sampleInfoStr = sampleToPrettyString(sample);
            this.addLogEntry(
              "data",
              `GET result: ${sampleInfoStr.replace("SAMPLE ", "")}`
            );
            resultCount++;
          } else {
            // It's a ReplyError
            const replyError = result as ReplyError;
            this.addLogEntry(
              "error",
              `GET error: ${replyError.payload().toString()}`
            );
          }
        } catch (resultError) {
          this.addErrorlogEntry("Error processing GET result", resultError);
        }
      }

      this.addLogEntry(
        "success",
        `GET completed: ${resultCount} results received`
      );
    } catch (error) {
      this.addErrorlogEntry("GET failed", error);
    }
  }

  override async subscribe(): Promise<void> {
    if (!this.zenohSession || !this.subscribeKey.value) return;

    // Check if already subscribed to this key expression
    const existingSubscriber = this.activeSubscribers.value.find(
      (sub) => sub.keyExpr === this.subscribeKey.value
    );
    if (existingSubscriber) {
      this.addLogEntry(
        "info",
        `Already subscribed to ${this.subscribeKey.value}`
      );
      return;
    }

    try {
      const keyExpr = new KeyExpr(this.subscribeKey.value);
      const subscriber = await this.zenohSession.declareSubscriber(keyExpr);

      // Generate sequential display ID for this subscriber
      const displayId = `sub${this.subscriberIdCounter++}`;

      const subscriberInfo: SubscriberInfo = {
        displayId: displayId,
        keyExpr: this.subscribeKey.value,
        subscriber,
        createdAt: new Date(),
      };

      this.activeSubscribers.value.push(subscriberInfo);
      this.addLogEntry(
        "success",
        `Subscribed to ${this.subscribeKey.value} (ID: ${displayId})`
      );

      // Handle incoming data
      (async () => {
        const receiver = subscriber.receiver();
        if (!receiver) return;

        try {
          while (true) {
            const sample: Sample | null = await receiver.receive();
            if (!sample) break; // Normal end of subscription

            try {
              // Use the pretty-printing function to format sample information
              const sampleInfoStr = sampleToPrettyString(sample, displayId);
              this.addLogEntry("data", sampleInfoStr);
            } catch (sampleError) {
              this.addErrorlogEntry(
                "Error processing subscription sample",
                sampleError
              );
            }
          }
          // Normal end of subscription - no error logging needed
        } catch (subscriptionError) {
          // Only log actual errors, not normal disconnections
          if (subscriptionError) {
            this.addErrorlogEntry(
              `Subscription error for ${displayId}`,
              subscriptionError
            );
          }
        }
      })();
    } catch (error) {
      this.addErrorlogEntry("Subscribe failed", error);
    }
  }

  override async unsubscribe(subscriberId: string): Promise<void> {
    const subscriberIndex = this.activeSubscribers.value.findIndex(
      (sub) => sub.displayId === subscriberId
    );
    if (subscriberIndex === -1) {
      this.addLogEntry("error", `Subscriber ${subscriberId} not found`);
      return;
    }

    const subscriberInfo = this.activeSubscribers.value[subscriberIndex];
    if (!subscriberInfo) {
      this.addLogEntry(
        "error",
        `Subscriber info for ${subscriberId} is invalid`
      );
      return;
    }

    try {
      await subscriberInfo.subscriber.undeclare();
      this.activeSubscribers.value.splice(subscriberIndex, 1);
      this.addLogEntry(
        "success",
        `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberId})`
      );
    } catch (error) {
      this.addErrorlogEntry(`Unsubscribe failed for ${subscriberId}`, error);
    }
  }

  override async unsubscribeAll(): Promise<void> {
    const subscribersToRemove = [...this.activeSubscribers.value];

    for (const subscriberInfo of subscribersToRemove) {
      try {
        await subscriberInfo.subscriber.undeclare();
        this.addLogEntry(
          "info",
          `Unsubscribed from ${subscriberInfo.keyExpr} (ID: ${subscriberInfo.displayId})`
        );
      } catch (error) {
        this.addErrorlogEntry(
          `Error unsubscribing from ${subscriberInfo.displayId}`,
          error
        );
      }
    }

    this.activeSubscribers.value = [];
    this.addLogEntry("success", "All subscriptions cleared");
  }
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  return new ZenohDemo();
}
