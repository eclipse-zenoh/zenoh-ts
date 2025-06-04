import { type ZenohDemoState, ZenohDemoEmpty, type LogEntry, type SubscriberInfo, type PutOptionsState } from "../useZenohDemo";
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
    
    // Helper function to convert enum keys to readable labels
    const enumKeyToLabel = (key: string): string => {
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Helper function to populate options from numeric enum, excluding defaults
    const createOptionsFromEnum = <T extends Record<string, string | number>>(
      enumObj: T, 
      excludeKeys: string[] = []
    ): Array<{ value: number; label: string }> => {
      return Object.entries(enumObj)
        .filter(([key, value]) => 
          typeof value === 'number' && 
          !excludeKeys.includes(key)
        )
        .map(([key, value]) => ({
          value: value as number,
          label: enumKeyToLabel(key)
        }))
        .sort((a, b) => a.value - b.value); // Sort by numeric value
    };

    // Helper function to get common encoding options from Encoding static properties
    const createEncodingOptions = (): Array<{ value: string; label: string }> => {
      const commonEncodings = [
        { prop: 'TEXT_PLAIN', label: 'text/plain' },
        { prop: 'APPLICATION_JSON', label: 'application/json' },
        { prop: 'APPLICATION_OCTET_STREAM', label: 'application/octet-stream' },
        { prop: 'ZENOH_STRING', label: 'zenoh/string' },
        { prop: 'ZENOH_BYTES', label: 'zenoh/bytes' },
        { prop: 'APPLICATION_XML', label: 'application/xml' },
        { prop: 'TEXT_YAML', label: 'text/yaml' },
        { prop: 'APPLICATION_CBOR', label: 'application/cbor' },
      ];

      return commonEncodings
        .filter(({ prop }) => (Encoding as any)[prop]) // Check if property exists
        .map(({ prop, label }) => ({
          value: ((Encoding as any)[prop] as Encoding).toString(),
          label
        }));
    };

    // Populate option arrays using enum iteration
    this.priorityOptions = createOptionsFromEnum(Priority, ['DEFAULT']);
    
    this.congestionControlOptions = createOptionsFromEnum(CongestionControl, [
      'DEFAULT_PUSH', 'DEFAULT_REQUEST', 'DEFAULT_RESPONSE'
    ]);
    
    this.reliabilityOptions = createOptionsFromEnum(Reliability, ['DEFAULT']);
    
    this.localityOptions = createOptionsFromEnum(Locality, ['DEFAULT']);

    // Encoding options - dynamically populated from Encoding static properties
    this.encodingOptions = createEncodingOptions();
  }

  override addLogEntry(type: LogEntry["type"], message: string): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    this.logEntries.value.push({ type, message, timestamp: new Date() });
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
      this.addLogEntry("error", `Failed to connect: ${error}`);
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
      this.addLogEntry("error", `Error during disconnect: ${error}`);
    }
  }

  override async performPut(): Promise<void> {
    if (!this.zenohSession || !this.putKey.value || !this.putValue.value) return;

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
      this.addLogEntry("error", `PUT failed: ${error}`);
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
            // It's a Sample
            const sample = result as Sample;
            const keyStr = sample.keyexpr().toString();
            const valueStr = sample.payload().toString();
            this.addLogEntry("data", `GET result: ${keyStr} = "${valueStr}"`);
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
          this.addLogEntry(
            "error",
            `Error processing GET result: ${resultError}`
          );
        }
      }

      this.addLogEntry(
        "success",
        `GET completed: ${resultCount} results received`
      );
    } catch (error) {
      this.addLogEntry("error", `GET failed: ${error}`);
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
              const keyStr = sample.keyexpr().toString();
              const valueStr = sample.payload().toString();
              const kind = sample.kind();

              // Map SampleKind enum values to readable strings
              let kindStr: string;
              switch (kind) {
                case 0: // SampleKind.PUT
                  kindStr = "PUT";
                  break;
                case 1: // SampleKind.DELETE
                  kindStr = "DELETE";
                  break;
                default:
                  kindStr = "UNKNOWN";
              }

              this.addLogEntry(
                "data",
                `SUBSCRIPTION [${displayId}] [${kindStr}]: ${keyStr} = "${valueStr}"`
              );
            } catch (sampleError) {
              this.addLogEntry(
                "error",
                `Error processing subscription sample: ${sampleError}`
              );
            }
          }
          // Normal end of subscription - no error logging needed
        } catch (subscriptionError) {
          // Only log actual errors, not normal disconnections
          if (subscriptionError) {
            this.addLogEntry(
              "error",
              `Subscription error for ${displayId}: ${subscriptionError}`
            );
          }
        }
      })();
    } catch (error) {
      this.addLogEntry("error", `Subscribe failed: ${error}`);
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
      this.addLogEntry(
        "error",
        `Unsubscribe failed for ${subscriberId}: ${error}`
      );
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
        this.addLogEntry(
          "error",
          `Error unsubscribing from ${subscriberInfo.displayId}: ${error}`
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
