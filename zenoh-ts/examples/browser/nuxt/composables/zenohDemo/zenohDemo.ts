import {
  type ZenohDemoState,
  ZenohDemoEmpty,
  type LogEntry,
  type SessionState,
  type SubscriberState,
  type QueryableState,
  type PutParametersState,
  type SubscriberParametersState,
  type QueryableParametersState,
  type ReplyParametersState,
  type ReplyErrParametersState,
  type GetParametersState,
  createDefaultResponseParameters,
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
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from "typed-duration";
import type {
  PutOptions,
  SubscriberOptions,
  QueryableOptions,
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
  subscriberOptionsToJSON,
  queryableOptionsToJSON,
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

function subscriberParametersStateToSubscriberOptions(
  options: SubscriberParametersState
): SubscriberOptions {
  let opts: SubscriberOptions = {};
  if (options.allowedOrigin.value !== undefined) {
    opts.allowedOrigin = options.allowedOrigin.value;
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

async function replyParametersStateToReplyOptions(parameters: ReplyParametersState, session?: Session) {
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

  // Helper method to get the currently selected session, or first session if none selected
  private getCurrentSession(): Session | undefined {
    // Prioritize selected session if available
    if (this.selectedSessionId.value) {
      const selectedSession = this.activeSessions.value.find(
        session => session.displayId === this.selectedSessionId.value
      );
      if (selectedSession) {
        return selectedSession.session;
      }
    }
    // Fallback to first session if no selection or selected session not found
    return this.activeSessions.value.length > 0 ? this.activeSessions.value[0]?.session : undefined;
  }

  // Helper method to get current session with its ID for tracking purposes
  private getCurrentSessionWithId(): { session: Session; sessionId: string } | undefined {
    // Prioritize selected session if available
    if (this.selectedSessionId.value) {
      const selectedSession = this.activeSessions.value.find(
        session => session.displayId === this.selectedSessionId.value
      );
      if (selectedSession) {
        return { session: selectedSession.session, sessionId: selectedSession.displayId };
      }
    }
    // Fallback to first session if no selection or selected session not found
    if (this.activeSessions.value.length > 0) {
      const firstSession = this.activeSessions.value[0];
      if (firstSession) {
        return { session: firstSession.session, sessionId: firstSession.displayId };
      }
    }
    return undefined;
  }

  // Method to select a session
  override selectSession(sessionId: string): void {
    const session = this.activeSessions.value.find(s => s.displayId === sessionId);
    if (session) {
      this.selectedSessionId.value = sessionId;
      this.addLogEntry("info", `Selected session ${sessionId} as current session`);
    } else {
      this.addErrorLogEntry(`Session ${sessionId} not found`);
    }
  }

  // Update isConnected to reflect if we have any active sessions
  private updateConnectionStatus(): void {
    this.isConnected.value = this.activeSessions.value.length > 0;
  }

  override async getSessionInfo(): Promise<void> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      this.addErrorLogEntry("No active session. Please connect first.");
      return;
    }

    try {
      this.addLogEntry("info", "Retrieving session information...");
      const sessionInfo = await currentSession.info();
      const sessionInfoJson = sessionInfoToJSON(sessionInfo);
      
      this.addLogEntry(
        "success", 
        "Session information retrieved successfully",
        { "SessionInfo": sessionInfoJson }
      );
    } catch (error) {
      this.addErrorLogEntry("Failed to retrieve session information", error);
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
      this.updateConnectionStatus();
      
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
        error
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
      this.updateConnectionStatus();
      
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
      
      // Clear subscribers and queryables if no sessions remain
      if (this.activeSessions.value.length === 0) {
        this.activeSubscribers.value = [];
        this.activeQueryables.value = [];
      }
      
      this.addLogEntry("success", `Disconnected from session ${sessionId} (${sessionState.serverUrl})`);
    } catch (error) {
      this.addErrorLogEntry(`Error during disconnect of session ${sessionId}`, error);
    }
  }

  override async performPut(): Promise<void> {
    const currentSession = this.getCurrentSession();
    if (
      !currentSession ||
      !this.putParameters.key.value ||
      this.putParameters.valueEmpty.value
    )
      return;

    try {
      const keyExpr = new KeyExpr(this.putParameters.key.value);
      const bytes = new ZBytes(this.putParameters.value.value);

      // Build put options
      const options = putParametersStateToPutOptions(this.putParameters);
      await currentSession.put(keyExpr, bytes, options);

      this.addLogEntry("success", "PUT successful", {
        keyexpr: keyExpr.toString(),
        payload: bytes.toString(),
        PutOptions: putOptionsToJSON(options),
      });
    } catch (error) {
      this.addErrorLogEntry(
        `PUT failed for key "${this.putParameters.key.value}"`,
        error
      );
    }
  }

  override async performGet(): Promise<void> {
    const currentSession = this.getCurrentSession();
    if (!currentSession || !this.getParameters.key.value) return;

    try {
      const selector = this.getParameters.key.value;

      // Build get options using getParametersStateTo
      const getOptions = getParametersStateToGetOptions(this.getParameters);

      this.addLogEntry("info", `Starting GET`, {
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
          this.addErrorLogEntry("Error processing GET result", resultError);
        }
      }
      this.addLogEntry(
        "success",
        `GET query completed for ${selector}. Found ${resultCount} results.`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `GET failed for selector "${this.getParameters.key.value}"`,
        error
      );
    }
  }

  override async subscribe(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.subscriberParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;

    try {
      const keyExpr = new KeyExpr(this.subscriberParameters.key.value);
      const subscriberOptions = subscriberParametersStateToSubscriberOptions(
        this.subscriberParameters
      );
      const subscriber = await currentSession.declareSubscriber(
        keyExpr,
        subscriberOptions
      );

      // Generate sequential display ID for this subscriber
      const displayId = `sub${this.subscriberIdCounter++}`;

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
        `Subscribe failed for "${this.subscriberParameters.key.value}"`,
        error
      );
    }
  }

  override async unsubscribe(subscriberId: string): Promise<void> {
    const subscriberIndex = this.activeSubscribers.value.findIndex(
      (sub: SubscriberState) => sub.displayId === subscriberId
    );
    if (subscriberIndex === -1) {
      this.addErrorLogEntry(`Subscriber ${subscriberId} not found`);
      return;
    }

    const subscriberState = this.activeSubscribers.value[subscriberIndex];
    if (!subscriberState) {
      this.addErrorLogEntry(`Subscriber info for ${subscriberId} is invalid`);
      return;
    }

    try {
      await subscriberState.subscriber.undeclare();
      this.activeSubscribers.value.splice(subscriberIndex, 1);
      this.addLogEntry(
        "success",
        `Unsubscribed from "${subscriberState.keyExpr}" (${subscriberId})`
      );
    } catch (error) {
      this.addErrorLogEntry(`Unsubscribe failed for ${subscriberId}`, error);
    }
  }

  override async declareQueryable(): Promise<void> {
    const sessionWithId = this.getCurrentSessionWithId();
    if (!sessionWithId || !this.queryableParameters.key.value) return;

    const { session: currentSession, sessionId } = sessionWithId;

    try {
      // Generate sequential display ID for this queryable
      const displayId = `qry${this.queryableIdCounter++}`;

      const keyExpr = new KeyExpr(this.queryableParameters.key.value);
      const queryableOptions = queryableParametersStateToQueryableOptions(
        this.queryableParameters
      );

      // Create individual response parameters for this queryable
      const responseParameters = createDefaultResponseParameters();
      responseParameters.replyErr.updateReplyErrOptionsJSON = () => {
        responseParameters.replyErr.replyErrOptionsJSON =
          replyErrParametersStateToReplyErrOptionsJSON(responseParameters.replyErr);
      };
      responseParameters.reply.updateReplyOptionsJSON = () => {
        responseParameters.reply.replyOptionsJSON =
          replyParametersStateToReplyOptionsJSON(responseParameters.reply);
      };

      // Initialize reply key expression to match the queryable's key expression
      responseParameters.reply.keyExpr = this.queryableParameters.key.value;

      // Create a single timestamp for both payload and QueryableState consistency
      const createdAt = new Date();
      const createdAtStr =createdAt.toISOString().slice(11, 19);
      
      // Set payload explicitly with queryable ID and creation time
      responseParameters.reply.payload = `Hello from queryable ${displayId} created at ${createdAtStr}`;
      responseParameters.reply.payloadEmpty = false;
      // Set error payload explicitly with queryable ID and creation time
      responseParameters.replyErr.payload = `Error processing query from ${displayId} created at ${createdAtStr}`;
      responseParameters.replyErr.payloadEmpty = false;

      // Set up handler for queries
      queryableOptions.handler = async (query: Query) => {
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
            const replyOptions =
              await replyParametersStateToReplyOptions(replyParams, currentSession);

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
          } else {
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
          }

          // Finalize the query to signal no more replies will be sent
          await query.finalize();
        } catch (queryError) {
          this.addErrorLogEntry("Error handling query", queryError);
          try {
            await query.replyErr("Internal error handling query");
            await query.finalize();
          } catch (replyError) {
            this.addErrorLogEntry("Error sending error reply", replyError);
          }
        }
      };

      const queryable = await currentSession.declareQueryable(
        keyExpr,
        queryableOptions
      );

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
    } catch (error) {
      this.addErrorLogEntry(
        `Declare queryable failed for "${this.queryableParameters.key.value}"`,
        error
      );
    }
  }

  override async undeclareQueryable(queryableId: string): Promise<void> {
    const queryableIndex = this.activeQueryables.value.findIndex(
      (qry: QueryableState) => qry.displayId === queryableId
    );
    if (queryableIndex === -1) {
      this.addErrorLogEntry(`Queryable ${queryableId} not found`);
      return;
    }

    const queryableState = this.activeQueryables.value[queryableIndex];
    if (!queryableState) {
      this.addErrorLogEntry(`Queryable info for ${queryableId} is invalid`);
      return;
    }

    try {
      await queryableState.queryable.undeclare();
      this.activeQueryables.value.splice(queryableIndex, 1);
      this.addLogEntry(
        "success",
        `Undeclared queryable "${queryableState.keyExpr}" (${queryableId})`
      );
    } catch (error) {
      this.addErrorLogEntry(
        `Undeclare queryable failed for ${queryableId}`,
        error
      );
    }
  }
}

export async function useZenohDemo(): Promise<ZenohDemoState> {
  return new ZenohDemo();
}
