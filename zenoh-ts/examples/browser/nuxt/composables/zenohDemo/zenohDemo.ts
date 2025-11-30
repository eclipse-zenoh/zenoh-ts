import {
  // en      }) // end of subscriber handler closure
  type ZenohDemoState,
  ZenohDemoEmpty,
  type LogEntry,
  type SessionState,
  type SubscriberState,
  type PublisherState,
  type PublisherPutParametersState,
  type PublisherParametersState,
  type QueryableState,
  type QuerierState,
  type QuerierGetParametersState,
  type QuerierParametersState,
  type LivelinessTokenState,
  type LivelinessSubscriberState,
  type PutParametersState,
  type SubscriberParametersState,
  type QueryableParametersState,
  type ReplyParametersState,
  type ReplyErrParametersState,
  type GetParametersState,
  createDefaultResponseParameters,
  createDefaultPublisherPutParameters,
  createDefaultQuerierGetParameters,
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
  QueryTarget,
  ConsolidationMode,
  ReplyKeyExpr,
  Query,
  Timestamp,
  SampleKind,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from "typed-duration";
import type {
  PutOptions,
  DeleteOptions,
  PublisherOptions,
  PublisherPutOptions,
  SubscriberOptions,
  QueryableOptions,
  QuerierOptions,
  GetOptions,
  ChannelReceiver,
} from "@eclipse-zenoh/zenoh-ts";
import {
  createOptionsFromEnum,
  createOptionsFromStaticConstants,
} from "./safeUtils";
import {
  sampleToJSON,
  queryToJSON,
  putOptionsToJSON,
  deleteOptionsToJSON,
  publisherPutOptionsToJSON,
  subscriberOptionsToJSON,
  publisherOptionsToJSON,
  querierOptionsToJSON,
  queryableOptionsToJSON,
  livelinessSubscriberOptionsToJSON,
  getOptionsToJSON,
  replyOptionsToJSON,
  replyErrorToJSON,
  sessionInfoToJSON,
  replyParametersStateToReplyOptionsJSON,
  replyErrParametersStateToReplyErrOptionsJSON,
} from "./zenohUtils";
import type { ReplyOptions } from "@eclipse-zenoh/zenoh-ts";

function putParametersStateToPutOptions(
  parameters: PutParametersState
): PutOptions {
  let opts: PutOptions = {};
  if (parameters.encoding.value) {
    opts.encoding = Encoding.fromString(parameters.encoding.value);
  }
  if (parameters.priority.value !== undefined) {
    opts.priority = parameters.priority.value;
  }
  if (parameters.congestionControl.value !== undefined) {
    opts.congestionControl = parameters.congestionControl.value;
  }
  if (parameters.express.value !== undefined) {
    opts.express = parameters.express.value;
  }
  if (parameters.reliability.value !== undefined) {
    opts.reliability = parameters.reliability.value;
  }
  if (parameters.allowedDestination.value !== undefined) {
    opts.allowedDestination = parameters.allowedDestination.value;
  }
  if (!parameters.attachmentEmpty.value) {
    opts.attachment = new ZBytes(parameters.attachment.value);
  }
  return opts;
}

function putParametersStateToDeleteOptions(
  parameters: PutParametersState
): DeleteOptions {
  let opts: DeleteOptions = {};
  if (parameters.priority.value !== undefined) {
    opts.priority = parameters.priority.value;
  }
  if (parameters.congestionControl.value !== undefined) {
    opts.congestionControl = parameters.congestionControl.value;
  }
  if (parameters.express.value !== undefined) {
    opts.express = parameters.express.value;
  }
  if (parameters.reliability.value !== undefined) {
    opts.reliability = parameters.reliability.value;
  }
  if (parameters.allowedDestination.value !== undefined) {
    opts.allowedDestination = parameters.allowedDestination.value;
  }
  if (!parameters.attachmentEmpty.value) {
    opts.attachment = new ZBytes(parameters.attachment.value);
  }
  return opts;
}

function subscriberParametersStateToSubscriberOptions(
  options: SubscriberParametersState
): SubscriberOptions {
  let opts: SubscriberOptions = {};
  if (options.allowedOrigin.value !== undefined) {
    opts.allowedOrigin = options.allowedOrigin.value;
  }
  return opts;
}

function publisherParametersStateToPublisherOptions(
  parameters: PublisherParametersState
): PublisherOptions {
  let opts: PublisherOptions = {};
  if (parameters.encoding.value) {
    opts.encoding = Encoding.fromString(parameters.encoding.value);
  }
  if (parameters.priority.value !== undefined) {
    opts.priority = parameters.priority.value;
  }
  if (parameters.congestionControl.value !== undefined) {
    opts.congestionControl = parameters.congestionControl.value;
  }
  if (parameters.express.value !== undefined) {
    opts.express = parameters.express.value;
  }
  if (parameters.reliability.value !== undefined) {
    opts.reliability = parameters.reliability.value;
  }
  if (parameters.allowedDestination.value !== undefined) {
    opts.allowedDestination = parameters.allowedDestination.value;
  }
  return opts;
}

function queryableParametersStateToQueryableOptions(
  parameters: QueryableParametersState
): QueryableOptions {
  let opts: QueryableOptions = {};
  if (parameters.complete.value !== undefined) {
    opts.complete = parameters.complete.value;
  }
  if (parameters.allowedOrigin.value !== undefined) {
    opts.allowedOrigin = parameters.allowedOrigin.value;
  }
  return opts;
}

function querierParametersStateToQuerierOptions(
  parameters: QuerierParametersState
): QuerierOptions {
  let opts: QuerierOptions = {};
  if (parameters.congestionControl.value !== undefined) {
    opts.congestionControl = parameters.congestionControl.value;
  }
  if (parameters.priority.value !== undefined) {
    opts.priority = parameters.priority.value;
  }
  if (parameters.express.value !== undefined) {
    opts.express = parameters.express.value;
  }
  if (parameters.allowedDestination.value !== undefined) {
    opts.allowedDestination = parameters.allowedDestination.value;
  }
  if (parameters.consolidation.value !== undefined) {
    opts.consolidation = parameters.consolidation.value;
  }
  if (parameters.target.value !== undefined) {
    opts.target = parameters.target.value;
  }
  if (
    !parameters.timeoutEmpty.value &&
    parameters.timeout.value !== undefined
  ) {
    opts.timeout = Duration.milliseconds.of(parameters.timeout.value);
  }
  if (parameters.acceptReplies.value !== undefined) {
    opts.acceptReplies = parameters.acceptReplies.value;
  }
  return opts;
}

function querierGetParametersStateToGetOptions(
  parameters: QuerierGetParametersState
): GetOptions {
  let opts: GetOptions = {};
  if (parameters.congestionControl !== undefined) {
    opts.congestionControl = parameters.congestionControl;
  }
  if (parameters.priority !== undefined) {
    opts.priority = parameters.priority;
  }
  if (parameters.express !== undefined) {
    opts.express = parameters.express;
  }
  if (parameters.allowedDestination !== undefined) {
    opts.allowedDestination = parameters.allowedDestination;
  }
  if (parameters.encoding) {
    opts.encoding = Encoding.fromString(parameters.encoding);
  }
  if (!parameters.payloadEmpty) {
    opts.payload = new ZBytes(parameters.payload);
  }
  if (!parameters.attachmentEmpty) {
    opts.attachment = new ZBytes(parameters.attachment);
  }
  if (!parameters.timeoutEmpty && parameters.timeout !== undefined) {
    opts.timeout = Duration.milliseconds.of(parameters.timeout);
  }
  if (parameters.target !== undefined) {
    opts.target = parameters.target;
  }
  if (parameters.consolidation !== undefined) {
    opts.consolidation = parameters.consolidation;
  }
  if (parameters.acceptReplies !== undefined) {
    opts.acceptReplies = parameters.acceptReplies;
  }
  return opts;
}

async function replyParametersStateToReplyOptions(
  parameters: ReplyParametersState,
  session?: Session
) {
  let opts: ReplyOptions = {};
  if (parameters.encoding) {
    opts.encoding = Encoding.fromString(parameters.encoding);
  }
  if (parameters.priority !== undefined) {
    opts.priority = parameters.priority;
  }
  if (parameters.congestionControl !== undefined) {
    opts.congestionControl = parameters.congestionControl;
  }
  if (parameters.express !== undefined) {
    opts.express = parameters.express;
  }
  if (parameters.useTimestamp && session) {
    console.log("Requesting new timestamp for reply");
    opts.timestamp = await session.newTimestamp();
    console.log("Timestamp for reply:", opts.timestamp);
  }
  if (!parameters.attachmentEmpty) {
    opts.attachment = new ZBytes(parameters.attachment);
  }
  return opts;
}

function replyErrParametersStateToReplyErrOptions(
  parameters: ReplyErrParametersState
) {
  let opts: any = {};
  if (parameters.encoding) {
    opts.encoding = Encoding.fromString(parameters.encoding);
  }
  return opts;
}

function getParametersStateToGetOptions(
  parameters: GetParametersState
): GetOptions {
  let opts: GetOptions = {};
  if (parameters.congestionControl.value !== undefined) {
    opts.congestionControl = parameters.congestionControl.value;
  }
  if (parameters.priority.value !== undefined) {
    opts.priority = parameters.priority.value;
  }
  if (parameters.express.value !== undefined) {
    opts.express = parameters.express.value;
  }
  if (parameters.allowedDestination.value !== undefined) {
    opts.allowedDestination = parameters.allowedDestination.value;
  }
  if (parameters.encoding.value) {
    opts.encoding = Encoding.fromString(parameters.encoding.value);
  }
  if (!parameters.payloadEmpty.value) {
    opts.payload = new ZBytes(parameters.payload.value);
  }
  if (!parameters.attachmentEmpty.value) {
    opts.attachment = new ZBytes(parameters.attachment.value);
  }
  if (
    !parameters.timeoutEmpty.value &&
    parameters.timeout.value !== undefined
  ) {
    opts.timeout = Duration.milliseconds.of(parameters.timeout.value);
  }
  if (parameters.target.value !== undefined) {
    opts.target = parameters.target.value;
  }
  if (parameters.consolidation.value !== undefined) {
    opts.consolidation = parameters.consolidation.value;
  }
  if (parameters.acceptReplies.value !== undefined) {
    opts.acceptReplies = parameters.acceptReplies.value;
  }
  return opts;
}

class ZenohDemo extends ZenohDemoEmpty {
  private sessionIdCounter = 0;
  private subscriberIdCounter = 0;
  private publisherIdCounter = 0;
  private queryableIdCounter = 0;
  private querierIdCounter = 0;
  private livelinessTokenIdCounter = 0;
  private livelinessSubscriberIdCounter = 0;

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

    this.sampleKindOptions = createOptionsFromEnum(SampleKind, []);

    // Expose SampleKind enum values as a plain object for use in Vue templates
    this.SampleKind = { PUT: SampleKind.PUT, DELETE: SampleKind.DELETE };

    this.targetOptions = createOptionsFromEnum(QueryTarget, ["DEFAULT"]);

    this.consolidationOptions = createOptionsFromEnum(ConsolidationMode, [
      "DEFAULT",
    ]);

    this.acceptRepliesOptions = createOptionsFromEnum(ReplyKeyExpr, [
      "DEFAULT",
    ]);

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
  override addErrorLogEntry(message: string, data?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, data);
    this.addLogEntry("error", message, data);
  }

  override clearLog(): void {
    this.logEntries.value = [];
  }

  // Helper method to get current session with its ID for tracking purposes
  private getCurrentSessionWithId():
    | { session: Session; sessionId: string }
    | undefined {
    // Prioritize selected session if available
    if (this.selectedSessionId.value) {
      const selectedSession = this.activeSessions.value.find(
        (session) => session.displayId === this.selectedSessionId.value
      );
      if (selectedSession) {
        return {
          session: selectedSession.session,
          sessionId: selectedSession.displayId,
        };
      }
    }
    // Fallback to first session if no selection or selected session not found
    if (this.activeSessions.value.length > 0) {
      const firstSession = this.activeSessions.value[0];
      if (firstSession) {
        return {
          session: firstSession.session,
          sessionId: firstSession.displayId,
        };
      }
    }
    return undefined;
  }

  // Method to get a specific session by ID
  private getSessionById(
    sessionId: string
  ): { session: Session; sessionId: string } | undefined {
    const foundSession = this.activeSessions.value.find(
      (session) => session.displayId === sessionId
    );
    if (foundSession) {
      return {
        session: foundSession.session,
        sessionId: foundSession.displayId,
      };
    }
    return undefined;
  }

  // Method to select a session
  override selectSession(sessionId: string): void {
    const session = this.activeSessions.value.find(
      (s) => s.displayId === sessionId
    );
    if (session) {
      this.selectedSessionId.value = sessionId;
      this.addLogEntry(
        "info",
        `Selected session ${sessionId} as current session`
      );
    } else {
      this.addErrorLogEntry(`Session ${sessionId} not found`);
    }
  }

  private removeSubscriber(displayId: string): void {
    const subscriberIndex = this.activeSubscribers.value.findIndex(
      (sub: SubscriberState) => sub.displayId === displayId
    );
    if (subscriberIndex === -1) {
      this.addLogEntry("info", `Subscriber ${displayId} already removed or not found`);
      return;
    }
    this.activeSubscribers.value.splice(subscriberIndex, 1);
  }

  private removeQueryable(displayId: string): void {
    const queryableIndex = this.activeQueryables.value.findIndex(
      (qry: QueryableState) => qry.displayId === displayId
    );
    if (queryableIndex === -1) {
      this.addLogEntry("info", `Queryable ${displayId} already removed or not found`);
      return;
    }
    this.activeQueryables.value.splice(queryableIndex, 1);
  }

  private getSubscriber(displayId: string): SubscriberState | undefined {
    return this.activeSubscribers.value.find(
      (sub: SubscriberState) => sub.displayId === displayId
    );
  }

  override async getSessionInfo(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId) {
      this.addErrorLogEntry("No active session. Please connect first.");
      return;
    }

    const { session: currentSession, sessionId } = sessionWithId;

    try {
      this.addLogEntry(
        "info",
        `Retrieving session information from ${sessionId}...`
      );
      const sessionInfo = await currentSession.info();
      const sessionInfoJson = sessionInfoToJSON(sessionInfo);

      this.addLogEntry(
        "success",
        `Session information retrieved successfully from ${sessionId}`,
        { SessionInfo: sessionInfoJson }
      );
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to retrieve session information from ${sessionId}`,
        { error }
      );
    }
  }

  override async connect(): Promise<void> {
    if (this.isConnecting.value) return;

    this.isConnecting.value = true;
    this.addLogEntry(
      "info",
      `Attempting to connect to ${this.serverUrl.value}...`
    );

    try {
      const config = new Config(this.serverUrl.value);
      const session = await Session.open(config);

      // Generate sequential display ID for this session
      const displayId = `ses${this.sessionIdCounter++}`;

      const sessionState: SessionState = {
        displayId: displayId,
        serverUrl: this.serverUrl.value,
        session: session,
        createdAt: new Date(),
        isConnecting: false,
      };

      this.activeSessions.value.push(sessionState);

      // Auto-select the first session if none is selected
      if (!this.selectedSessionId.value) {
        this.selectedSessionId.value = displayId;
      }

      this.addLogEntry(
        "success",
        `Successfully connected to ${this.serverUrl.value} (${displayId})`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to connect to ${this.serverUrl.value}`,
        { error }
      );
    } finally {
      this.isConnecting.value = false;
    }
  }

  override async disconnect(sessionId: string): Promise<void> {
    const sessionIndex = this.activeSessions.value.findIndex(
      (session: SessionState) => session.displayId === sessionId
    );
    if (sessionIndex === -1) {
      this.addErrorLogEntry(`Session ${sessionId} not found`);
      return;
    }

    const sessionState = this.activeSessions.value[sessionIndex];
    if (!sessionState) {
      this.addErrorLogEntry(`Session info for ${sessionId} is invalid`);
      return;
    }

    try {
      await sessionState.session.close();
      this.activeSessions.value.splice(sessionIndex, 1);

      // Clear selected session if it's the one being disconnected
      if (this.selectedSessionId.value === sessionId) {
        this.selectedSessionId.value = null;
        // Auto-select first remaining session if any
        if (this.activeSessions.value.length > 0) {
          const firstSession = this.activeSessions.value[0];
          if (firstSession) {
            this.selectedSessionId.value = firstSession.displayId;
          }
        }
      }

      this.addLogEntry(
        "success",
        `Disconnected from session ${sessionId} (${sessionState.serverUrl})`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `Error during disconnect of session ${sessionId}`,
        { error }
      );
    }
  }

  override async performPut(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.putParameters.key.value)
      return;

    const { session: currentSession, sessionId } = sessionWithId;
    const publicationKind = this.putParameters.publicationKind.value;

    try {
      const keyExpr = new KeyExpr(this.putParameters.key.value);

      if (publicationKind === SampleKind.PUT) {
        // PUT operation
        if (this.putParameters.valueEmpty.value) return;

        const bytes = new ZBytes(this.putParameters.value.value);
        const options = putParametersStateToPutOptions(this.putParameters);
        await currentSession.put(keyExpr, bytes, options);

        this.addLogEntry("success", `PUT successful on ${sessionId}`, {
          keyexpr: keyExpr.toString(),
          payload: bytes.toString(),
          PutOptions: putOptionsToJSON(options),
        });
      } else {
        // DELETE operation
        const options = putParametersStateToDeleteOptions(this.putParameters);
        await currentSession.delete(keyExpr, options);

        this.addLogEntry("success", `DELETE successful on ${sessionId}`, {
          keyexpr: keyExpr.toString(),
          DeleteOptions: deleteOptionsToJSON(options),
        });
      }
    } catch (error) {
      const operationName = publicationKind === SampleKind.PUT ? "PUT" : "DELETE";
      this.addErrorLogEntry(
        `${operationName} failed for key "${this.putParameters.key.value}" on ${sessionId}`,
        { error }
      );
    }
  }

  override async performGet(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.getParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;

    try {
      const selector = this.getParameters.key.value;

      // Build get options using getParametersStateTo
      const getOptions = getParametersStateToGetOptions(this.getParameters);

      this.addLogEntry("info", `Starting GET on ${sessionId}`, {
        selector: selector,
        GetOptions: getOptionsToJSON(getOptions),
      });

      const receiver = await currentSession.get(selector, getOptions);
      if (!receiver) {
        this.addErrorLogEntry("GET failed: No receiver returned");
        return;
      }

      let resultCount = 0;

      for await (const reply of receiver as ChannelReceiver<Reply>) {
        try {
          const result = reply.result();
          // Check if it's a successful sample or an error
          if (result instanceof Sample) {
            // It's a Sample - use JSON formatting for enhanced display
            const sample = result as Sample;
            this.addLogEntry("data", "GET result ", {
              Sample: sampleToJSON(sample),
            });
            resultCount++;
          } else {
            // It's a ReplyError - log with error formatting
            const replyError = result as ReplyError;
            this.addLogEntry("data", `GET query error for ${selector}`, {
              ReplyError: replyErrorToJSON(replyError),
            });
          }
        } catch (resultError) {
          this.addErrorLogEntry("Error processing GET result", { error: resultError });
        }
      }
      this.addLogEntry(
        "success",
        `GET query completed on ${sessionId} for ${selector}. Found ${resultCount} results.`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `GET failed for selector "${this.getParameters.key.value}" on ${sessionId}`,
        { error }
      );
    }
  }

  override async subscribe(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.subscriberParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;
    
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.subscriberParameters.key.value);
      const subscriberOptions = subscriberParametersStateToSubscriberOptions(
        this.subscriberParameters
      );
      const subscriber = await currentSession.declareSubscriber(
        keyExpr,
        subscriberOptions
      );

      // Generate sequential display ID only after successful subscriber creation
      displayId = `sub${this.subscriberIdCounter++}`;

      const subscriberState: SubscriberState = {
        displayId: displayId,
        keyExpr: this.subscriberParameters.key.value,
        subscriber,
        createdAt: new Date(),
        options: subscriberOptionsToJSON(subscriberOptions),
        sessionId: sessionId,
      };

      this.activeSubscribers.value.push(subscriberState);
      this.addLogEntry("success", `Subscriber ${displayId} declared`, {
        keyexpr: keyExpr.toString(),
        SubscriberOptions: subscriberOptionsToJSON(subscriberOptions),
      });

      // Handle incoming data
      const receiver = subscriber.receiver();
      if (!receiver) {
        this.addErrorLogEntry(
          `Subscriber ${displayId} receiver is not available`
        );
        return;
      }

      try {
        for await (const sample of receiver as ChannelReceiver<Sample>) {
          try {
            // Use JSON formatting for sample display with multiple parameters
            this.addLogEntry("data", `Subscriber ${displayId} received data`, {
              Sample: sampleToJSON(sample),
            });
          } catch (sampleError) {
            this.addErrorLogEntry(
              "Error processing subscription sample",
              { error: sampleError }
            );
          }
        }
        this.addLogEntry(
          "success",
          `Subscriber ${displayId} (${subscriberState.keyExpr}) closed`
        );
      } catch (subscriptionError) {
        this.addErrorLogEntry(
          `Subscription error for ${displayId}`,
          { error: subscriptionError }
        );
      }
    } catch (error) {
      this.addErrorLogEntry(
        `Subscribe failed for "${this.subscriberParameters.key.value}"`,
        { error }
      );
    } finally {
      // Only remove subscriber if displayId was assigned (subscriber was successfully created)
      if (displayId) {
        this.removeSubscriber(displayId);
      }
    }
  }

  override async unsubscribe(subscriberId: string): Promise<void> {
    const subscriberState = this.getSubscriber(subscriberId);
    if (!subscriberState) {
      this.addErrorLogEntry(`Subscriber ${subscriberId} is not found`);
      return;
    }
    try {
      await subscriberState.subscriber.undeclare();
    } catch (error) {
      this.addErrorLogEntry(`Undeclare failed for ${subscriberId}`, { error });
    }
  }

  // Helper method to convert publisher put parameters to PublisherPutOptions
  private async publisherPutParametersStateToPutOptions(
    putParams: PublisherPutParametersState
  ): Promise<PublisherPutOptions> {
    const options: PublisherPutOptions = {};

    // Encoding
    if (putParams.encoding) {
      options.encoding = Encoding.fromString(putParams.encoding);
    }

    // Attachment
    if (!putParams.attachmentEmpty && putParams.attachment) {
      options.attachment = new ZBytes(putParams.attachment);
    }

    return options;
  }

  // Helper method to convert publisher put parameters to JSON for logging
  private publisherPutParametersStateToPutOptionsJSON(
    putParams: PublisherPutParametersState
  ): any {
    const json: any = {};

    if (putParams.encoding) {
      json.encoding = putParams.encoding;
    }
    if (!putParams.attachmentEmpty && putParams.attachment) {
      json.attachment = putParams.attachment;
    }

    return json;
  }

  private querierGetParametersStateToGetOptionsJSON(
    getParams: QuerierGetParametersState
  ): any {
    const json: any = {};

    if (getParams.encoding) {
      json.encoding = getParams.encoding;
    }
    if (getParams.priority !== undefined) {
      json.priority = getParams.priority;
    }
    if (getParams.congestionControl !== undefined) {
      json.congestionControl = getParams.congestionControl;
    }
    if (getParams.express !== undefined) {
      json.express = getParams.express;
    }
    if (getParams.allowedDestination !== undefined) {
      json.allowedDestination = getParams.allowedDestination;
    }
    if (getParams.consolidation !== undefined) {
      json.consolidation = getParams.consolidation;
    }
    if (getParams.target !== undefined) {
      json.target = getParams.target;
    }
    if (!getParams.timeoutEmpty && getParams.timeout !== undefined) {
      json.timeout_ms = getParams.timeout;
    }
    if (getParams.acceptReplies !== undefined) {
      json.acceptReplies = getParams.acceptReplies;
    }
    if (!getParams.payloadEmpty && getParams.payload) {
      json.payload = getParams.payload;
    }
    if (!getParams.attachmentEmpty && getParams.attachment) {
      json.attachment = getParams.attachment;
    }

    return json;
  }

  override async declarePublisher(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.publisherParameters.key.value) {
      this.addErrorLogEntry("No session selected or empty key expression");
      return;
    }

    const { session: currentSession, sessionId } = sessionWithId;
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.publisherParameters.key.value);

      const publisherOptions = publisherParametersStateToPublisherOptions(
        this.publisherParameters
      );

      const publisher = await currentSession.declarePublisher(
        keyExpr,
        publisherOptions
      );

      displayId = `pub${this.publisherIdCounter++}`;
      const createdAt = new Date();

      // CREATE INDIVIDUAL PUT PARAMETERS FOR THIS PUBLISHER
      const putParameters = createDefaultPublisherPutParameters();

      // Set up sync method
      putParameters.updatePutOptionsJSON = () => {
        putParameters.putOptionsJSON = this.publisherPutParametersStateToPutOptionsJSON(putParameters);
      };

      // Initialize with default payload
      const createdAtStr = createdAt.toISOString().slice(11, 19);
      putParameters.payload = `Hello from publisher ${displayId} on session ${sessionId} created at ${createdAtStr}`;
      putParameters.payloadEmpty = false;

      const publisherState: PublisherState = {
        displayId,
        keyExpr: this.publisherParameters.key.value,
        publisher,
        createdAt,
        options: publisherOptionsToJSON(publisherOptions),
        putParameters: putParameters, // EACH PUBLISHER HAS ITS OWN
        sessionId,
      };

      this.activePublishers.value.push(publisherState);

      this.addLogEntry("success", `Publisher ${displayId} declared`, {
        keyexpr: publisherState.keyExpr,
        PublisherOptions: publisherState.options,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to declare publisher${displayId ? ` ${displayId}` : ""}`,
        { error }
      );
    }
  }

  override async undeclarePublisher(publisherId: string): Promise<void> {
    const index = this.activePublishers.value.findIndex(
      (pub: PublisherState) => pub.displayId === publisherId
    );

    if (index === -1) {
      this.addErrorLogEntry(`Publisher ${publisherId} not found`);
      return;
    }

    const publisherState = this.activePublishers.value[index];
    if (!publisherState) {
      this.addErrorLogEntry(`Publisher ${publisherId} not found in array`);
      return;
    }

    try {
      await publisherState.publisher.undeclare();
      this.activePublishers.value.splice(index, 1);

      this.addLogEntry("success", `Publisher ${publisherId} undeclared`, {
        keyexpr: publisherState.keyExpr,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to undeclare publisher ${publisherId}`,
        { error }
      );
    }
  }

  override async publishData(publisherId: string): Promise<void> {
    const publisherState = this.activePublishers.value.find(
      (pub: PublisherState) => pub.displayId === publisherId
    );

    if (!publisherState) {
      this.addErrorLogEntry(`Publisher ${publisherId} not found`);
      return;
    }

    const sessionWithId = this.getSessionById(publisherState.sessionId);
    if (!sessionWithId) {
      this.addErrorLogEntry(`Session ${publisherState.sessionId} not found for publisher ${publisherId}`);
      return;
    }

    try {
      const putParams = publisherState.putParameters;
      const publicationKind = putParams.publicationKind;

      if (publicationKind === SampleKind.PUT) {
        // PUT operation
        const payload = putParams.payloadEmpty ? "" : putParams.payload;

        // Build put options from publisher's stored parameters
        const options = await this.publisherPutParametersStateToPutOptions(
          putParams
        );

        await publisherState.publisher.put(payload, options);

        this.addLogEntry("success", `Published data on ${publisherId}`, {
          keyexpr: publisherState.keyExpr,
          payload,
          PublisherPutOptions: publisherPutOptionsToJSON(options),
        });
      } else {
        // DELETE operation
        await publisherState.publisher.delete();

        this.addLogEntry("success", `Published DELETE on ${publisherId}`, {
          keyexpr: publisherState.keyExpr,
        });
      }
    } catch (error) {
      const operationName = publisherState.putParameters.publicationKind === SampleKind.PUT ? "PUT" : "DELETE";
      this.addErrorLogEntry(
        `Failed to publish ${operationName} on ${publisherId}`,
        { error }
      );
    }
  }

  override async declareQueryable(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.queryableParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;
    
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.queryableParameters.key.value);
      const queryableOptions = queryableParametersStateToQueryableOptions(
        this.queryableParameters
      );

      const queryable = await currentSession.declareQueryable(
        keyExpr,
        queryableOptions
      );

      // Generate sequential display ID only after successful queryable creation
      displayId = `qry${this.queryableIdCounter++}`;

      // Create individual response parameters for this queryable
      const responseParameters = createDefaultResponseParameters();
      responseParameters.replyErr.updateReplyErrOptionsJSON = () => {
        responseParameters.replyErr.replyErrOptionsJSON =
          replyErrParametersStateToReplyErrOptionsJSON(
            responseParameters.replyErr
          );
      };
      responseParameters.reply.updateReplyOptionsJSON = () => {
        responseParameters.reply.replyOptionsJSON =
          replyParametersStateToReplyOptionsJSON(responseParameters.reply);
      };

      // Initialize reply key expression to match the queryable's key expression
      responseParameters.reply.keyExpr = this.queryableParameters.key.value;

      // Create a single timestamp for both payload and QueryableState consistency
      const createdAt = new Date();
      const createdAtStr = createdAt.toISOString().slice(11, 19);

      // Set payload explicitly with queryable ID, session ID, and creation time
      responseParameters.reply.payload = `Hello from queryable ${displayId} on session ${sessionId} created at ${createdAtStr}`;
      responseParameters.reply.payloadEmpty = false;
      // Set error payload explicitly with queryable ID, session ID, and creation time
      responseParameters.replyErr.payload = `Error processing query from ${displayId} on session ${sessionId} created at ${createdAtStr}`;
      responseParameters.replyErr.payloadEmpty = false;

      const queryableState: QueryableState = {
        displayId: displayId,
        keyExpr: this.queryableParameters.key.value,
        queryable,
        createdAt,
        options: queryableOptionsToJSON(queryableOptions),
        responseParameters: responseParameters, // Include individual response settings
        sessionId: sessionId,
      };

      this.activeQueryables.value.push(queryableState);
      this.addLogEntry("success", `Queryable ${displayId} declared`, {
        keyexpr: keyExpr.toString(),
        QueryableOptions: queryableOptionsToJSON(queryableOptions),
      });

      // Handle incoming queries
      const receiver = queryable.receiver();
      if (!receiver) {
        this.addErrorLogEntry(
          `Queryable ${displayId} receiver is not available`
        );
        return;
      }

      try {
        for await (const query of receiver as ChannelReceiver<Query>) {
          try {
            // Handle reply based on configured reply type
            if (responseParameters.replyType === "reply") {
              // Get reply parameters
              const replyParams = responseParameters.reply;

              // Determine the key expression for the reply
              const replyKeyExpr = replyParams.keyExpr
                ? new KeyExpr(replyParams.keyExpr)
                : keyExpr;

              // Get the payload (use empty if marked as empty)
              const replyPayload = replyParams.payloadEmpty
                ? ""
                : replyParams.payload;

              // Get timestamp if useTimestamp is enabled
              let timestamp: Timestamp | undefined = undefined;
              if (replyParams.useTimestamp && currentSession) {
                try {
                  timestamp = await currentSession.newTimestamp();
                } catch (error) {
                  this.addLogEntry(
                    "error",
                    `Failed to get timestamp for reply: ${error}`
                  );
                }
              }

              // Build reply options with timestamp if available
              const replyOptions = await replyParametersStateToReplyOptions(
                replyParams,
                currentSession
              );

              // Log the reply details with timestamp information
              const logData: Record<string, any> = {
                Query: queryToJSON(query),
                "reply keyexpr": replyKeyExpr.toString(),
                "reply payload": replyPayload,
                ReplyOptions: replyOptionsToJSON(replyOptions),
              };

              // Add timestamp info to logs if enabled
              if (replyParams.useTimestamp) {
                logData["timestamp requested"] = true;
                logData["timestamp included"] = timestamp !== undefined;
                if (timestamp) {
                  logData["timestamp value"] = timestamp.asDate().toISOString();
                }
              }

              this.addLogEntry(
                "data",
                `Queryable ${displayId} replying to query:`,
                logData
              );

              await query.reply(replyKeyExpr, replyPayload, replyOptions);
            } else if (responseParameters.replyType === "replyErr") {
              // Handle error reply
              const replyErrParams = responseParameters.replyErr;

              // Get the error payload (use empty if marked as empty)
              const errorPayload = replyErrParams.payloadEmpty
                ? ""
                : replyErrParams.payload;

              // Build reply error options
              const replyErrOptions =
                replyErrParametersStateToReplyErrOptions(replyErrParams);

              // Log the reply details
              this.addLogEntry(
                "data",
                `Queryable ${displayId} replying error to query:`,
                {
                  Query: queryToJSON(query),
                  "error payload": errorPayload,
                  ReplyErrOptions: replyOptionsToJSON(replyErrOptions),
                }
              );
              await query.replyErr(errorPayload, replyErrOptions);
            } else if (responseParameters.replyType === "ignore") {
              // Handle ignore case - just log that the query is being ignored
              this.addLogEntry("data", `Queryable ${displayId} ignoring query:`, {
                Query: queryToJSON(query),
              });
              // No reply sent, just continue to finalize
            }
            // Finalize the query to signal no more replies will be sent
            await query.finalize();
          } catch (queryError) {
              this.addErrorLogEntry("Error handling query", { error: queryError });
          }
        }
        this.addLogEntry(
          "success",
          `Queryable ${displayId} (${queryableState.keyExpr}) closed`
        );
      } catch (queryableError) {
        this.addErrorLogEntry(
          `Queryable error for ${displayId}`,
          { error: queryableError }
        );
      }
    } catch (error) {
      this.addErrorLogEntry(
        `Declare queryable failed for "${this.queryableParameters.key.value}"`,
        { error }
      );
    } finally {
      // Only remove queryable if displayId was assigned (queryable was successfully created)
      if (displayId) {
        this.removeQueryable(displayId);
      }
    }
  }

  override async undeclareQueryable(queryableId: string): Promise<void> {
    const queryableState = this.activeQueryables.value.find(
      (qry: QueryableState) => qry.displayId === queryableId
    );
    if (!queryableState) {
      this.addErrorLogEntry(`Queryable ${queryableId} not found`);
      return;
    }
    try {
      await queryableState.queryable.undeclare();
    } catch (error) {
      this.addErrorLogEntry(
        `Undeclare queryable failed for ${queryableId}`,
        { error }
      );
    }
  }

  override async declareQuerier(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.querierParameters.key.value) {
      this.addErrorLogEntry("No session selected or empty key expression");
      return;
    }

    const { session: currentSession, sessionId } = sessionWithId;
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.querierParameters.key.value);

      const querierOptions = querierParametersStateToQuerierOptions(
        this.querierParameters
      );

      const querier = await currentSession.declareQuerier(
        keyExpr,
        querierOptions
      );

      displayId = `qr${this.querierIdCounter++}`;
      const createdAt = new Date();

      // CREATE INDIVIDUAL GET PARAMETERS FOR THIS QUERIER
      const getParameters = createDefaultQuerierGetParameters();

      // Set up sync method
      getParameters.updateGetOptionsJSON = () => {
        getParameters.getOptionsJSON = this.querierGetParametersStateToGetOptionsJSON(getParameters);
      };

      // Initialize with default payload (empty)
      getParameters.payloadEmpty = true;

      const querierState: QuerierState = {
        displayId,
        keyExpr: this.querierParameters.key.value,
        querier,
        createdAt,
        options: querierOptionsToJSON(querierOptions),
        getParameters: getParameters, // EACH QUERIER HAS ITS OWN
        sessionId,
      };

      this.activeQueriers.value.push(querierState);

      this.addLogEntry("success", `Querier ${displayId} declared`, {
        keyexpr: this.querierParameters.key.value,
        QuerierOptions: querierOptionsToJSON(querierOptions),
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to declare querier${displayId ? ` ${displayId}` : ""}`,
        { error }
      );
    }
  }

  override async undeclareQuerier(querierId: string): Promise<void> {
    const index = this.activeQueriers.value.findIndex(
      (qr: QuerierState) => qr.displayId === querierId
    );

    if (index === -1) {
      this.addErrorLogEntry(`Querier ${querierId} not found`);
      return;
    }

    const querierState = this.activeQueriers.value[index];
    if (!querierState) {
      this.addErrorLogEntry(`Querier ${querierId} not found in array`);
      return;
    }

    try {
      await querierState.querier.undeclare();
      this.activeQueriers.value.splice(index, 1);

      this.addLogEntry("success", `Querier ${querierId} undeclared`, {
        keyexpr: querierState.keyExpr,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to undeclare querier ${querierId}`,
        { error }
      );
    }
  }

  override async performQuerierGet(querierId: string): Promise<void> {
    const querierState = this.activeQueriers.value.find(
      (qr: QuerierState) => qr.displayId === querierId
    );

    if (!querierState) {
      this.addErrorLogEntry(`Querier ${querierId} not found`);
      return;
    }

    const sessionWithId = this.getSessionById(querierState.sessionId);
    if (!sessionWithId) {
      this.addErrorLogEntry(`Session ${querierState.sessionId} not found for querier ${querierId}`);
      return;
    }

    try {
      const getParams = querierState.getParameters;

      // Build get options from querier's stored parameters
      const options = querierGetParametersStateToGetOptions(getParams);

      this.addLogEntry("info", `Performing get on ${querierId}`, {
        keyexpr: querierState.keyExpr,
        GetOptions: getOptionsToJSON(options),
      });

      const receiver = await querierState.querier.get(options);
      if (!receiver) {
        this.addErrorLogEntry("GET failed: No receiver returned");
        return;
      }

      // Process replies
      let resultCount = 0;

      for await (const reply of receiver as ChannelReceiver<Reply>) {
        try {
          const result = reply.result();
          // Check if it's a successful sample or an error
          if (result instanceof Sample) {
            // It's a Sample - use JSON formatting for enhanced display
            const sample = result as Sample;
            this.addLogEntry("data", `Reply ${resultCount + 1} from ${querierId}`, {
              Sample: sampleToJSON(sample),
            });
            resultCount++;
          } else {
            // It's a ReplyError - log with error formatting
            const replyError = result as ReplyError;
            this.addLogEntry("data", `Error reply from ${querierId}`, {
              ReplyError: replyErrorToJSON(replyError),
            });
          }
        } catch (resultError) {
          this.addErrorLogEntry("Error processing GET result", { error: resultError });
        }
      }

      this.addLogEntry("success", `Get completed on ${querierId}: ${resultCount} replies received`, {
        keyexpr: querierState.keyExpr,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to perform get on ${querierId}`,
        { error }
      );
    }
  }

  override async declareLivelinessToken(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.livelinessTokenParameters.key.value) {
      this.addErrorLogEntry("No session selected or empty key expression");
      return;
    }

    const { session: currentSession, sessionId } = sessionWithId;
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.livelinessTokenParameters.key.value);

      const token = await currentSession.liveliness().declareToken(keyExpr);

      displayId = `lt${this.livelinessTokenIdCounter++}`;
      const createdAt = new Date();

      const tokenState: LivelinessTokenState = {
        displayId,
        keyExpr: this.livelinessTokenParameters.key.value,
        token,
        createdAt,
        sessionId,
      };

      this.activeLivelinessTokens.value.push(tokenState);

      this.addLogEntry("success", `Liveliness token ${displayId} declared`, {
        keyexpr: this.livelinessTokenParameters.key.value,
      });

      // Update default key for next token
      this.livelinessTokenParameters.key.value = `demo/example/token${this.livelinessTokenIdCounter}`;
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to declare liveliness token${displayId ? ` ${displayId}` : ""}`,
        { error }
      );
    }
  }

  override async undeclareLivelinessToken(tokenId: string): Promise<void> {
    const index = this.activeLivelinessTokens.value.findIndex(
      (tk: LivelinessTokenState) => tk.displayId === tokenId
    );

    if (index === -1) {
      this.addErrorLogEntry(`Liveliness token ${tokenId} not found`);
      return;
    }

    const tokenState = this.activeLivelinessTokens.value[index];
    if (!tokenState) {
      this.addErrorLogEntry(`Liveliness token ${tokenId} not found in array`);
      return;
    }

    try {
      await tokenState.token.undeclare();
      this.activeLivelinessTokens.value.splice(index, 1);

      this.addLogEntry("success", `Liveliness token ${tokenId} undeclared`, {
        keyexpr: tokenState.keyExpr,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to undeclare liveliness token ${tokenId}`,
        { error }
      );
    }
  }

  override async declareLivelinessSubscriber(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.livelinessSubscriberParameters.key.value) {
      this.addErrorLogEntry("No session selected or empty key expression");
      return;
    }

    const { session: currentSession, sessionId } = sessionWithId;
    let displayId: string | undefined;

    try {
      const keyExpr = new KeyExpr(this.livelinessSubscriberParameters.key.value);
      const history = this.livelinessSubscriberParameters.history.value ?? false;

      const subscriber = await currentSession.liveliness().declareSubscriber(
        keyExpr,
        { history }
      );

      displayId = `ls${this.livelinessSubscriberIdCounter++}`;
      const createdAt = new Date();

      const subscriberState: LivelinessSubscriberState = {
        displayId,
        keyExpr: this.livelinessSubscriberParameters.key.value,
        subscriber,
        createdAt,
        options: livelinessSubscriberOptionsToJSON(history),
        sessionId,
      };

      this.activeLivelinessSubscribers.value.push(subscriberState);

      // Set up receiver to process samples
      const receiver = subscriber.receiver();
      (async () => {
        try {
          for await (const sample of receiver as ChannelReceiver<Sample>) {
            this.addLogEntry("data", `Liveliness sample on ${displayId}`, {
              Sample: sampleToJSON(sample),
            });
          }
        } catch (error) {
          this.addErrorLogEntry(
            `Error in liveliness subscriber ${displayId} receiver`,
            { error }
          );
        }
      })();

      this.addLogEntry("success", `Liveliness subscriber ${displayId} declared`, {
        keyexpr: this.livelinessSubscriberParameters.key.value,
        LivelinessSubscriberOptions: livelinessSubscriberOptionsToJSON(history),
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to declare liveliness subscriber${displayId ? ` ${displayId}` : ""}`,
        { error }
      );
    }
  }

  override async undeclareLivelinessSubscriber(subscriberId: string): Promise<void> {
    const index = this.activeLivelinessSubscribers.value.findIndex(
      (sub: LivelinessSubscriberState) => sub.displayId === subscriberId
    );

    if (index === -1) {
      this.addErrorLogEntry(`Liveliness subscriber ${subscriberId} not found`);
      return;
    }

    const subscriberState = this.activeLivelinessSubscribers.value[index];
    if (!subscriberState) {
      this.addErrorLogEntry(`Liveliness subscriber ${subscriberId} not found in array`);
      return;
    }

    try {
      await subscriberState.subscriber.undeclare();
      this.activeLivelinessSubscribers.value.splice(index, 1);

      this.addLogEntry("success", `Liveliness subscriber ${subscriberId} undeclared`, {
        keyexpr: subscriberState.keyExpr,
      });
    } catch (error) {
      this.addErrorLogEntry(
        `Failed to undeclare liveliness subscriber ${subscriberId}`,
        { error }
      );
    }
  }

  override async performLivelinessGet(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.livelinessGetParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;

    try {
      const selector = this.livelinessGetParameters.key.value;

      // Build get options
      const getOptions: any = {};
      if (
        !this.livelinessGetParameters.timeoutEmpty.value &&
        this.livelinessGetParameters.timeout.value !== undefined
      ) {
        getOptions.timeout = Duration.milliseconds.of(this.livelinessGetParameters.timeout.value);
      }

      this.addLogEntry("info", `Starting liveliness GET on ${sessionId}`, {
        selector: selector,
        timeout_ms: this.livelinessGetParameters.timeout.value,
      });

      const receiver = await currentSession.liveliness().get(selector, getOptions);
      if (!receiver) {
        this.addErrorLogEntry("Liveliness GET failed: No receiver returned");
        return;
      }

      let resultCount = 0;

      for await (const reply of receiver as ChannelReceiver<Reply>) {
        try {
          const result = reply.result();
          // Check if it's a successful sample or an error
          if (result instanceof Sample) {
            // It's a Sample - use JSON formatting for enhanced display
            const sample = result as Sample;
            this.addLogEntry("data", "Liveliness GET result", {
              Sample: sampleToJSON(sample),
            });
            resultCount++;
          } else {
            // It's a ReplyError - log with error formatting
            const replyError = result as ReplyError;
            this.addLogEntry("data", `Liveliness GET query error for ${selector}`, {
              ReplyError: replyErrorToJSON(replyError),
            });
          }
        } catch (resultError) {
          this.addErrorLogEntry("Error processing liveliness GET result", { error: resultError });
        }
      }
      this.addLogEntry(
        "success",
        `Liveliness GET query completed on ${sessionId} for ${selector}. Found ${resultCount} results.`
      );
    } catch (error) {
      this.addErrorLogEntry("Liveliness GET query failed", { error });
    }
  }
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  return new ZenohDemo();
}
