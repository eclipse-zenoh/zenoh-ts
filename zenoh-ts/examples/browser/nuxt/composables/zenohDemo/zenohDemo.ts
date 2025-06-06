import {
  type ZenohDemoState,
  ZenohDemoEmpty,
  type LogEntry,
  type SubscriberInfo,
  type QueryableInfo,
  type PutOptionsState,
  type SubscriberOptionsState,
  type QueryableOptionsState,
  type GetOptionsState,
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
  Query,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from 'typed-duration';
import type { PutOptions, SubscriberOptions, QueryableOptions, GetOptions } from "@eclipse-zenoh/zenoh-ts";
import {
  createOptionsFromEnum,
  createOptionsFromStaticConstants,
} from "./utils";
import {
  sampleToJSON,
  queryToJSON,
  putOptionsToJSON,
  subscriberOptionsToJSON,
  queryableOptionsToJSON,
  getOptionsToJSON,
} from "./zenohUtils";

function putOptionsStateTo(options: PutOptionsState): PutOptions {
  let opts: PutOptions = {};
  if (options.encoding.value) {
    opts.encoding = Encoding.fromString(options.encoding.value);
  }
  if (options.priority.value !== undefined) {
    opts.priority = options.priority.value;
  }
  if (options.congestionControl.value !== undefined) {
    opts.congestionControl = options.congestionControl.value;
  }
  if (options.express.value !== undefined) {
    opts.express = options.express.value;
  }
  if (options.reliability.value !== undefined) {
    opts.reliability = options.reliability.value;
  }
  if (options.allowedDestination.value !== undefined) {
    opts.allowedDestination = options.allowedDestination.value;
  }
  if (!options.attachmentEmpty.value) {
    opts.attachment = new ZBytes(options.attachment.value);
  }
  return opts;
}

function subscriberOptionsStateTo(
  options: SubscriberOptionsState
): SubscriberOptions {
  let opts: SubscriberOptions = {};
  if (options.allowedOrigin.value !== undefined) {
    opts.allowedOrigin = options.allowedOrigin.value;
  }
  return opts;
}

function queryableOptionsStateTo(
  options: QueryableOptionsState
): QueryableOptions {
  let opts: QueryableOptions = {};
  if (options.complete.value !== undefined) {
    opts.complete = options.complete.value;
  }
  if (options.allowedOrigin.value !== undefined) {
    opts.allowedOrigin = options.allowedOrigin.value;
  }
  return opts;
}

function getOptionsStateTo(options: GetOptionsState): GetOptions {
  let opts: GetOptions = {};
  if (options.congestionControl.value !== undefined) {
    opts.congestionControl = options.congestionControl.value;
  }
  if (options.priority.value !== undefined) {
    opts.priority = options.priority.value;
  }
  if (options.express.value !== undefined) {
    opts.express = options.express.value;
  }
  if (options.allowedDestination.value !== undefined) {
    opts.allowedDestination = options.allowedDestination.value;
  }
  if (options.encoding.value) {
    opts.encoding = Encoding.fromString(options.encoding.value);
  }
  if (!options.payloadEmpty.value) {
    opts.payload = new ZBytes(options.payload.value);
  }
  if (!options.attachmentEmpty.value) {
    opts.attachment = new ZBytes(options.attachment.value);
  }
  if (options.timeout.value !== undefined) {
    opts.timeout = Duration.milliseconds.of(options.timeout.value);
  }
  if (options.target.value !== undefined) {
    opts.target = options.target.value;
  }
  if (options.consolidation.value !== undefined) {
    opts.consolidation = options.consolidation.value;
  }
  if (options.acceptReplies.value !== undefined) {
    opts.acceptReplies = options.acceptReplies.value;
  }
  return opts;
}

class ZenohDemo extends ZenohDemoEmpty {
  private zenohSession: Session | null = null;
  private subscriberIdCounter = 0;
  private queryableIdCounter = 0;

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

  // Standard logging method - accepts required string message and optional data record
  override addLogEntry(
    type: LogEntry["type"],
    message: string,
    data?: Record<string, any>
  ): void {
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (data) {
      console.log(`[${type.toUpperCase()}] Data:`, data);

      // Store the message and data record separately for Vue to format
      const logEntry: LogEntry = {
        type,
        message,
        data,
        timestamp: new Date(),
      };

      this.logEntries.value.push(logEntry);
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
        timestamp: new Date().toISOString(),
      };

      console.error(`[ERROR] ${message}`, errorDetails);

      // Store the message and error object in data record
      const logEntry: LogEntry = {
        type: "error",
        message,
        data: { "Error Details": errorObject },
        timestamp: new Date(),
      };

      this.logEntries.value.push(logEntry);
    } else {
      // Simple string error logging
      console.error(`[ERROR] ${message}`);
      this.logEntries.value.push({
        type: "error",
        message,
        timestamp: new Date(),
      });
    }
  }

  override clearLog(): void {
    this.logEntries.value = [];
  }

  override async connect(): Promise<void> {
    if (this.isConnecting.value || this.isConnected.value) return;

    this.isConnecting.value = true;
    this.addLogEntry(
      "info",
      `Attempting to connect to ${this.serverUrl.value}...`
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
      this.addErrorLogEntry(
        `Failed to connect to ${this.serverUrl.value}`,
        error
      );
      this.zenohSession = null;
    } finally {
      this.isConnecting.value = false;
    }
  }

  override async disconnect(): Promise<void> {
    if (!this.zenohSession) return;

    try {
      await this.zenohSession.close();
      this.zenohSession = null;
      this.isConnected.value = false;
      this.activeSubscribers.value = []; // Clear the subscribers list
      this.activeQueryables.value = []; // Clear the queryables list
      this.addLogEntry("success", "Disconnected from Zenoh session");
    } catch (error) {
      this.addErrorLogEntry("Error during disconnect", error);
    }
  }

  override async performPut(): Promise<void> {
    if (!this.zenohSession || !this.putKey.value || this.putPayloadEmpty.value)
      return;

    try {
      const keyExpr = new KeyExpr(this.putKey.value);
      const bytes = new ZBytes(this.putValue.value);

      // Build put options
      const options = putOptionsStateTo(this.putOptions);
      await this.zenohSession.put(keyExpr, bytes, options);

      this.addLogEntry("success", "PUT successful", {
        keyexpr: keyExpr.toString(),
        payload: bytes.toString(),
        PutOptions: putOptionsToJSON(options),
      });
    } catch (error) {
      this.addErrorLogEntry(`PUT failed for key "${this.putKey.value}"`, error);
    }
  }

  override async performGet(): Promise<void> {
    if (!this.zenohSession || !this.getKey.value) return;

    try {
      const selector = this.getKey.value;
      
      // Build get options using getOptionsStateTo
      const getOptions = getOptionsStateTo(this.getOptions);
      
      this.addLogEntry("info", `Starting GET`, {
        selector: selector,
        GetOptions: getOptionsToJSON(getOptions),
      });

      const receiver = await this.zenohSession.get(selector, getOptions);
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
            this.addLogEntry("data", "GET result ", {
              Sample: sampleToJSON(sample),
            });
            resultCount++;
          } else {
            // It's a ReplyError - log with error formatting
            const replyError = result as ReplyError;
            this.addErrorLogEntry(`GET query error for ${selector}`, {
              error: replyError.payload().toString(),
              encoding: replyError.encoding().toString(),
            });
          }
        } catch (resultError) {
          this.addErrorLogEntry("Error processing GET result", resultError);
        }
      }

      this.addLogEntry(
        "success",
        `GET query completed for ${selector}. Found ${resultCount} results.`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `GET failed for selector "${this.getKey.value}"`,
        error
      );
    }
  }

  override async subscribe(): Promise<void> {
    if (!this.zenohSession || !this.subscribeKey.value) return;

    try {
      const keyExpr = new KeyExpr(this.subscribeKey.value);
      const subscriberOptions = subscriberOptionsStateTo(
        this.subscriberOptions
      );
      const subscriber = await this.zenohSession.declareSubscriber(
        keyExpr,
        subscriberOptions
      );

      // Generate sequential display ID for this subscriber
      const displayId = `sub${this.subscriberIdCounter++}`;

      const subscriberInfo: SubscriberInfo = {
        displayId: displayId,
        keyExpr: this.subscribeKey.value,
        subscriber,
        createdAt: new Date(),
        options: subscriberOptionsToJSON(subscriberOptions),
      };

      this.activeSubscribers.value.push(subscriberInfo);
      this.addLogEntry(
        "success",
        `Subscriber ${displayId} declared`,
        {
          keyexpr: keyExpr.toString(),
          SubscriberOptions: subscriberOptionsToJSON(subscriberOptions),
        }
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
              // Use JSON formatting for sample display with multiple parameters
              this.addLogEntry(
                "data",
                `Subscriber ${displayId} received data`,
                {
                  Sample: sampleToJSON(sample),
                }
              );
            } catch (sampleError) {
              this.addErrorLogEntry(
                "Error processing subscription sample",
                sampleError
              );
            }
          }
          // Normal end of subscription - no error logging needed
        } catch (subscriptionError) {
          // Only log actual errors, not normal disconnections
          if (subscriptionError) {
            this.addErrorLogEntry(
              `Subscription error for ${displayId}`,
              subscriptionError
            );
          }
        }
      })();
    } catch (error) {
      this.addErrorLogEntry(
        `Subscribe failed for "${this.subscribeKey.value}"`,
        error
      );
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
      this.addLogEntry(
        "success",
        `Unsubscribed from "${subscriberInfo.keyExpr}" (${subscriberId})`
      );
    } catch (error) {
      this.addErrorLogEntry(`Unsubscribe failed for ${subscriberId}`, error);
    }
  }

  override async declareQueryable(): Promise<void> {
    if (!this.zenohSession || !this.queryableKey.value) return;

    try {
      // Generate sequential display ID for this queryable
      const displayId = `qry${this.queryableIdCounter++}`;

      const keyExpr = new KeyExpr(this.queryableKey.value);
      const queryableOptions = queryableOptionsStateTo(this.queryableOptions);

      // Set up handler for queries
      queryableOptions.handler = async (query: Query) => {
        try {

          this.addLogEntry(
            "data",
            `Query received on queryable ${displayId} for ${keyExpr.toString()}`,
            {
              Query: queryToJSON(query),
            }
          );

          // Send a simple reply
          const replyPayload = `Hello from queryable! Query for: ${query.keyExpr().toString()}${
            query.parameters().toString() ? "?" + query.parameters().toString() : ""
          }`;
          await query.reply(keyExpr, replyPayload);
        } catch (queryError) {
          this.addErrorLogEntry("Error handling query", queryError);
          try {
            await query.replyErr("Internal error handling query");
          } catch (replyError) {
            this.addErrorLogEntry("Error sending error reply", replyError);
          }
        }
      };

      const queryable = await this.zenohSession.declareQueryable(
        keyExpr,
        queryableOptions
      );

      const queryableInfo: QueryableInfo = {
        displayId: displayId,
        keyExpr: this.queryableKey.value,
        queryable,
        createdAt: new Date(),
        options: queryableOptionsToJSON(queryableOptions),
      };

      this.activeQueryables.value.push(queryableInfo);
      this.addLogEntry(
        "success",
        `Queryable ${displayId} declared`,
        {
          keyexpr: keyExpr.toString(),
          QueryableOptions: queryableOptionsToJSON(queryableOptions),
        }
      );
    } catch (error) {
      this.addErrorLogEntry(
        `Declare queryable failed for "${this.queryableKey.value}"`,
        error
      );
    }
  }

  override async undeclareQueryable(queryableId: string): Promise<void> {
    const queryableIndex = this.activeQueryables.value.findIndex(
      (qry) => qry.displayId === queryableId
    );
    if (queryableIndex === -1) {
      this.addErrorLogEntry(`Queryable ${queryableId} not found`);
      return;
    }

    const queryableInfo = this.activeQueryables.value[queryableIndex];
    if (!queryableInfo) {
      this.addErrorLogEntry(`Queryable info for ${queryableId} is invalid`);
      return;
    }

    try {
      await queryableInfo.queryable.undeclare();
      this.activeQueryables.value.splice(queryableIndex, 1);
      this.addLogEntry(
        "success",
        `Undeclared queryable "${queryableInfo.keyExpr}" (${queryableId})`
      );
    } catch (error) {
      this.addErrorLogEntry(`Undeclare queryable failed for ${queryableId}`, error);
    }
  }
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  return new ZenohDemo();
}
