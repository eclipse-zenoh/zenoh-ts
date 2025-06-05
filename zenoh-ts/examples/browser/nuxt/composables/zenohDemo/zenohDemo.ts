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

  // Standard logging method - accepts required string message and optional JSON data
  override addLogEntry(type: LogEntry["type"], message: string, jsonData?: object): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (jsonData) {
      console.log(`[${type.toUpperCase()}] JSON Data:`, jsonData);
      
      // Store the message and JSON data separately for Vue to format
      this.logEntries.value.push({ 
        type, 
        message, 
        jsonData,
        timestamp: new Date() 
      });
    } else {
      // Simple string logging
      this.logEntries.value.push({ type, message, timestamp: new Date() });
    }
  }

  // Error logging method with JSON formatting for error details
  override addErrorLogEntry(message: string, errorDetails?: any): void {
    if (errorDetails) {
      // Create formatted error object
      const errorObject = {
        type: "ERROR",
        message: message,
        details: errorDetails,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[ERROR] ${message}`, errorDetails);
      
      // Store the message and error object separately for Vue to format
      this.logEntries.value.push({ 
        type: "error", 
        message, 
        jsonData: errorObject,
        timestamp: new Date() 
      });
    } else {
      // Simple string error logging
      console.error(`[ERROR] ${message}`);
      this.logEntries.value.push({ 
        type: "error", 
        message, 
        timestamp: new Date() 
      });
    }
  }

  // Test method to demonstrate JSON formatting capabilities
  testJSONLogging(): void {
    // Test string logging for regular operations
    this.addLogEntry("info", "This is a simple string log message");
    this.addLogEntry("success", "Operation completed successfully");
    
    // Test error logging with details (JSON formatted)
    this.addErrorLogEntry("Example error with detailed information", {
      errorCode: "DEMO_ERROR",
      details: {
        operation: "test_operation",
        parameters: { key: "demo/test", value: "test_value" },
        timestamp: new Date().toISOString()
      }
    });
    
    // Test simple error logging (string only)
    this.addErrorLogEntry("Simple error message without details");
    
    // Test sample data logging (JSON formatted) - message describes context, JSON shows raw sample
    const sampleData = {
      key: "demo/sensor/temperature", 
      value: "23.5°C",
      kind: "PUT",
      encoding: "text/plain",
      priority: "DATA_HIGH",
      congestionControl: "DROP",
      express: "false",
      timestamp: "2025-06-05T10:30:00Z",
      attachment: "sensor-001:room-A"
    };
    this.addLogEntry("data", "Test sample data from demo sensor", sampleData);
  }

  override clearLog(): void {
    this.logEntries.value = [];
  }

  override async connect(): Promise<void> {
    if (this.isConnecting.value || this.isConnected.value) return;

    this.isConnecting.value = true;
    this.addLogEntry("info", `Attempting to connect to ${this.serverUrl.value}...`);

    try {
      const config = new Config(this.serverUrl.value);
      this.zenohSession = await Session.open(config);
      this.isConnected.value = true;
      this.addLogEntry("success", `Successfully connected to ${this.serverUrl.value}`);
    } catch (error) {
      this.addErrorLogEntry(`Failed to connect to ${this.serverUrl.value}`, error);
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
      this.addLogEntry("success", "Disconnected from Zenoh session");
    } catch (error) {
      this.addErrorLogEntry("Error during disconnect", error);
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
      
      this.addLogEntry("success", `PUT successful: ${this.putKey.value} = "${this.putValue.value}"`);
    } catch (error) {
      this.addErrorLogEntry(`PUT failed for key "${this.putKey.value}"`, error);
    }
  }

  override async performGet(): Promise<void> {
    if (!this.zenohSession || !this.getKey.value) return;

    try {
      const selector = this.getKey.value;
      this.addLogEntry("info", `Starting GET query for selector: ${selector}`);

      const receiver = await this.zenohSession.get(selector);
      if (!receiver) {
        this.addErrorLogEntry("GET failed: No receiver returned");
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
            // It's a Sample - use JSON formatting for enhanced display
            const sample = result as Sample;
            const sampleData = sampleToJSON(sample);
            this.addLogEntry("data", `GET result from ${sample.keyexpr()}`, sampleData);
            resultCount++;
          } else {
            // It's a ReplyError - log with error formatting
            const replyError = result as ReplyError;
            this.addErrorLogEntry(`GET query error for ${selector}`, {
              error: replyError.payload().toString(),
              encoding: replyError.encoding().toString()
            });
          }
        } catch (resultError) {
          this.addErrorLogEntry("Error processing GET result", resultError);
        }
      }

      this.addLogEntry("success", `GET query completed for ${selector}. Found ${resultCount} results.`);
    } catch (error) {
      this.addErrorLogEntry(`GET failed for selector "${this.getKey.value}"`, error);
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
      this.addLogEntry("success", `Subscribed to "${this.subscribeKey.value}" (${displayId})`);

      // Handle incoming data
      (async () => {
        const receiver = subscriber.receiver();
        if (!receiver) return;

        try {
          while (true) {
            const sample: Sample | null = await receiver.receive();
            if (!sample) break; // Normal end of subscription

            try {
              // Use JSON formatting for sample display
              const sampleData = sampleToJSON(sample);
              this.addLogEntry("data", `Subscriber ${displayId} received data from ${sample.keyexpr()}`, sampleData);
            } catch (sampleError) {
              this.addErrorLogEntry("Error processing subscription sample", sampleError);
            }
          }
          // Normal end of subscription - no error logging needed
        } catch (subscriptionError) {
          // Only log actual errors, not normal disconnections
          if (subscriptionError) {
            this.addErrorLogEntry(`Subscription error for ${displayId}`, subscriptionError);
          }
        }
      })();
    } catch (error) {
      this.addErrorLogEntry(`Subscribe failed for "${this.subscribeKey.value}"`, error);
    }
  }

  override async unsubscribe(subscriberId: string): Promise<void> {
    const subscriberIndex = this.activeSubscribers.value.findIndex(
      (sub) => sub.displayId === subscriberId
    );
    if (subscriberIndex === -1) {
      this.addErrorLogEntry(`Subscriber ${subscriberId} not found`);
      return;
    }

    const subscriberInfo = this.activeSubscribers.value[subscriberIndex];
    if (!subscriberInfo) {
      this.addErrorLogEntry(`Subscriber info for ${subscriberId} is invalid`);
      return;
    }

    try {
      await subscriberInfo.subscriber.undeclare();
      this.activeSubscribers.value.splice(subscriberIndex, 1);
      this.addLogEntry("success", `Unsubscribed from "${subscriberInfo.keyExpr}" (${subscriberId})`);
    } catch (error) {
      this.addErrorLogEntry(`Unsubscribe failed for ${subscriberId}`, error);
    }
  }

  override async unsubscribeAll(): Promise<void> {
    const subscribersToRemove = [...this.activeSubscribers.value];
    
    if (subscribersToRemove.length === 0) {
      this.addLogEntry("info", "No active subscriptions to remove");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const subscriberInfo of subscribersToRemove) {
      try {
        await subscriberInfo.subscriber.undeclare();
        successCount++;
      } catch (error) {
        errorCount++;
        this.addErrorLogEntry(`Failed to unsubscribe ${subscriberInfo.displayId}`, error);
      }
    }

    this.activeSubscribers.value = [];
    
    if (errorCount === 0) {
      this.addLogEntry("success", `Successfully unsubscribed from all ${successCount} subscriptions`);
    } else {
      this.addLogEntry("info", `Unsubscribed from ${successCount} subscriptions, ${errorCount} failed`);
    }
  }
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  return new ZenohDemo();
}
