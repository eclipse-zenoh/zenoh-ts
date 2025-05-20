//
// Copyright (c) 2024 ZettaScale Technology
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0, or the Apache License, Version 2.0
// which is available at https://www.apache.org/licenses/LICENSE-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR Apache-2.0
//
// Contributors:
//   ZettaScale Zenoh Team, <zenoh@zettascale.tech>
//

import { v4 as uuidv4 } from "uuid";
import { Logger } from "tslog";
import { encode as b64_str_from_bytes } from "base64-arraybuffer";

const log = new Logger({ stylePrettyLogs: false });

// Import interface
import { RemoteAPIMsg } from "./interface/RemoteAPIMsg.js";
import { SampleWS, SampleCallback } from "./interface/SampleWS.js";
import { DataMsg } from "./interface/DataMsg.js";
import { ControlMsg } from "./interface/ControlMsg.js";
import { OwnedKeyExprWrapper } from "./interface/OwnedKeyExprWrapper.js";
import { QueryCallback, QueryWS } from "./interface/QueryWS.js";
import { RemotePublisher, RemoteSubscriber } from "./pubsub.js";
import { RemoteQueryable } from "./query.js";
import { ReplyCallback, ReplyWS } from "./interface/ReplyWS.js";
import { QueryableMsg } from "./interface/QueryableMsg.js";
import { SessionInfo as SessionInfoIface } from "./interface/SessionInfo.js";
import { RemoteQuerier } from "./querier.js"
import { B64String } from "./interface/B64String.js";
import { QueryReplyVariant } from "./interface/QueryReplyVariant.js";
import { RemoteLink } from "./link.js";
import { Closure, Drop } from "./closure.js";


// ██████  ███████ ███    ███  ██████  ████████ ███████     ███████ ███████ ███████ ███████ ██  ██████  ███    ██
// ██   ██ ██      ████  ████ ██    ██    ██    ██          ██      ██      ██      ██      ██ ██    ██ ████   ██
// ██████  █████   ██ ████ ██ ██    ██    ██    █████       ███████ █████   ███████ ███████ ██ ██    ██ ██ ██  ██
// ██   ██ ██      ██  ██  ██ ██    ██    ██    ██               ██ ██           ██      ██ ██ ██    ██ ██  ██ ██
// ██   ██ ███████ ██      ██  ██████     ██    ███████     ███████ ███████ ███████ ███████ ██  ██████  ██   ████

export interface TimestampIface {
  id: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  string_rep: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  millis_since_epoch: bigint
}

export enum RemoteRecvErr {
  Disconnected,
}

type JSONMessage = string;
/**
 * @ignore
 */
export type UUIDv4 = String | string;

export class RemoteSession {
  link: RemoteLink;
  session: UUIDv4 | null;
  subscribers: Map<UUIDv4, Closure<SampleWS>>;
  queryables: Map<UUIDv4, Closure<QueryWS>>;
  getReceivers: Map<UUIDv4, Closure<ReplyWS>>;
  livelinessSubscribers: Map<UUIDv4, Closure<SampleWS>>;
  livelinessGetReceivers: Map<UUIDv4, Closure<ReplyWS>>;
  pendingQueries: Set<UUIDv4>;
  sessionInfo: SessionInfoIface | null;
  newTimestamp_: TimestampIface | null;

  private constructor(link: RemoteLink) {
    this.link = link;
    this.session = null;
    this.subscribers = new Map<UUIDv4, Closure<SampleWS>>();
    this.queryables = new Map<UUIDv4, Closure<QueryWS>>();
    this.getReceivers = new Map<UUIDv4, Closure<ReplyWS>>();
    this.livelinessSubscribers = new Map<UUIDv4, Closure<SampleWS>>();
    this.livelinessGetReceivers = new Map<UUIDv4, Closure<ReplyWS>>();
    this.pendingQueries = new Set<UUIDv4>;
    this.sessionInfo = null;
    this.newTimestamp_ = null;
  }

  //
  // Initialize Class
  //
  static async new(locator: string): Promise<RemoteSession> {
    let link = await RemoteLink.new(locator);
    let session =  new RemoteSession(link);
    session.link.onmessage((msg: any) => { session.onMessageReceived(msg); });

    let open: ControlMsg = "OpenSession";
    await session.sendCtrlMessage(open);
    while (session.session == null) {
      await sleep(10);
    }
    console.log("Successfully opened session:", session.session);

    return session;
  }

  //
  // Zenoh Session Functions
  //
  // Info
  async info(): Promise<SessionInfoIface> {
    let ctrlMessage: ControlMsg = "SessionInfo";
    this.sessionInfo = null;
    await this.sendCtrlMessage(ctrlMessage);

    while (this.sessionInfo === null) {
      await sleep(10);
    }
    return this.sessionInfo;
  }

  // Put
  async put(keyExpr: string,
    payload: Array<number>,
    encoding?: string,
    congestionControl?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?:string,
  ) {
    let ownedKeyexpr: OwnedKeyExprWrapper = keyExpr;

    let optAttachment = undefined;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(new Uint8Array(attachment))
    }

    let ctrlMessage: ControlMsg = {
      Put: {
        key_expr: ownedKeyexpr,
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        encoding: encoding,
        congestion_control: congestionControl,
        priority: priority,
        express: express,
        attachment: optAttachment,
        timestamp: timestamp
      },
    };
    await this.sendCtrlMessage(ctrlMessage);
  }

  // get
  async get(
    keyExpr: string,
    parameters: string | null,
    callback: ReplyCallback,
    drop: Drop,
    consolidation?: number,
    congestionControl?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    encoding?: string,
    payload?: Array<number>,
    attachment?: Array<number>,
    timeoutMs?: number,
  ) {
    let uuid = uuidv4();
    this.getReceivers.set(uuid, {callback, drop});

    let optPayload = undefined;
    if (payload != undefined) {
      optPayload = b64_str_from_bytes(new Uint8Array(payload))
    }
    let optAttachment = undefined;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(new Uint8Array(attachment))
    }

    let controlMessage: ControlMsg = {
      Get: {
        key_expr: keyExpr,
        parameters: parameters,
        id: uuid,
        consolidation: consolidation,
        congestion_control: congestionControl,
        priority: priority,
        express: express,
        target: target,
        encoding: encoding,
        timeout: timeoutMs,
        payload: optPayload,
        attachment: optAttachment
      },
    };
    await this.sendCtrlMessage(controlMessage);
  }

  // delete
  async delete(
    keyExpr: string,
    congestionControl?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?: string,
  ) {
    let ownedKeyexpr: OwnedKeyExprWrapper = keyExpr;
    let optAttachment = undefined;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(new Uint8Array(attachment))
    }
    let dataMessage: ControlMsg = {
      Delete: {
        key_expr: ownedKeyexpr,
        congestion_control: congestionControl,
        priority: priority,
        express: express,
        attachment: optAttachment,
        timestamp: timestamp
      }
    };
    await this.sendCtrlMessage(dataMessage);
  }

  async replyFinal(queryUuid: UUIDv4): Promise<boolean> {
    return this.pendingQueries.delete(queryUuid);
  }

  async reply(uuid: UUIDv4, 
      keyExpr: string,
      payload: Uint8Array,
      encoding: string | null,
      congestionControl: number,
      priority: number,
      express: boolean,
      attachment: Uint8Array | null,
      timestamp: string | null
    ): Promise<boolean> {
      if (!this.pendingQueries.has(uuid)) {
        console.warn("Attempt to reply to unknown query:", uuid);
        return false;
      }

      let optAttachment = null;
      if (attachment != undefined) {
        optAttachment = b64_str_from_bytes(attachment)
      }
      
      let qrVariant: QueryReplyVariant = {
        Reply: {
          key_expr: keyExpr.toString(),
          payload: b64_str_from_bytes(payload),
          encoding: encoding,
          priority: priority,
          congestion_control: congestionControl,
          express: express,
          timestamp: timestamp,
          attachment: optAttachment
        },
      };

      let queryableMsg: QueryableMsg = { Reply: { reply: {query_uuid: uuid.toString(), result: qrVariant} } };
      let dataMsg: DataMsg = { Queryable: queryableMsg };
      await this.sendDataMessage(dataMsg);

      return await this.replyFinal(uuid);
  }

  async replyErr(uuid: UUIDv4, payload: Uint8Array, encoding: string | null): Promise<boolean> {
    if (!this.pendingQueries.has(uuid)) {
      return false;
    }
    
    let qrVariant: QueryReplyVariant = {
      ReplyErr: {
        payload: b64_str_from_bytes(payload),
        encoding: encoding,
      },
    };

    let queryableMsg: QueryableMsg = { Reply: { reply: {query_uuid: uuid.toString(), result: qrVariant} } };
    let dataMsg: DataMsg = { Queryable: queryableMsg };
    await this.sendDataMessage(dataMsg);

    return await this.replyFinal(uuid);
  }

  async replyDel(uuid: UUIDv4,
      keyExpr: string,
      congestionControl: number,
      priority: number,
      express: boolean,
      attachment: Uint8Array | null,
      timestamp: string | null): Promise<boolean> {
    if (!this.pendingQueries.has(uuid)) {
      return false;
    }
    
    let optAttachment : B64String | null = null;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(attachment);
    }

    let qrVariant: QueryReplyVariant = {
      ReplyDelete: {
        key_expr: keyExpr,
        priority: priority,
        congestion_control: congestionControl,
        express: express,
        timestamp: timestamp,
        attachment: optAttachment
      },
    };

    let queryableMsg: QueryableMsg = { Reply: { reply: {query_uuid: uuid.toString(), result: qrVariant} } };
    let dataMsg: DataMsg = { Queryable: queryableMsg };
    await this.sendDataMessage(dataMsg);

    return await this.replyFinal(uuid);
}

  async close() {
    let dataMessage: ControlMsg = "CloseSession";
    await this.sendCtrlMessage(dataMessage);
    this.link.close();

    this.pendingQueries.clear();
    for (let v of this.subscribers.values()) {
      v.drop();
    }
    this.subscribers.clear();

    for (let v of this.livelinessSubscribers.values()) {
      v.drop();
    }
    this.livelinessSubscribers.clear();

    for (let v of this.getReceivers.values()) {
      v.drop();
    }
    this.getReceivers.clear();

    for (let v of this.livelinessGetReceivers.values()) {
      v.drop();
    }

    for (let v of this.queryables.values()) {
      v.drop();
    }
    this.queryables.clear();
  }

  async declareRemoteSubscriber(
    keyExpr: string,
    callback: SampleCallback,
    drop: Drop,
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      DeclareSubscriber: { key_expr: keyExpr, id: uuid},
    };

    this.subscribers.set(uuid, {callback, drop});

    await this.sendCtrlMessage(controlMessage);

    let subscriber = new RemoteSubscriber(
      keyExpr,
      uuid,
      this
    );
    return subscriber;
  }


  async declareRemoteQueryable(
    keyExpr: string,
    complete: boolean,
    callback: QueryCallback,
    drop: Drop
  ): Promise<RemoteQueryable> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      DeclareQueryable: { key_expr: keyExpr, complete: complete, id: uuid},
    };

    this.queryables.set(uuid, {callback, drop});

    await this.sendCtrlMessage(controlMessage);

    let queryable = new RemoteQueryable(
      keyExpr,
      uuid,
      this,
    );

    return queryable;
  }

  async declareRemotePublisher(
    keyExpr: string,
    encoding?: string,
    congestionControl?: number,
    priority?: number,
    express?: boolean,
    reliability?: number,
  ): Promise<RemotePublisher> {
    let uuid: string = uuidv4();
    let publisher = new RemotePublisher(keyExpr, uuid, this);
    let controlMessage: ControlMsg = {
      DeclarePublisher: {
        key_expr: keyExpr,
        encoding: encoding,
        congestion_control: congestionControl,
        priority: priority,
        express: express,
        reliability: reliability,
        id: uuid,
      },
    };
    await this.sendCtrlMessage(controlMessage);
    return publisher;
  }

  async declareRemoteQuerier(
    keyExpr: string,
    consolidation?: number,
    congestionControl?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    allowedDestination?: number,
    acceptReplies?: number,
    timeoutMilliseconds?: number,
  ): Promise<RemoteQuerier> {
    let timeout = undefined;
    if (timeoutMilliseconds !== undefined) {
      timeout = timeoutMilliseconds;
    }

    let uuid: string = uuidv4();
    let querier = new RemoteQuerier(uuid, this);

    let controlMessage: ControlMsg = {
      DeclareQuerier: {
        id: uuid,
        key_expr: keyExpr,
        congestion_control: congestionControl,
        priority: priority,
        express: express,
        target: target,
        timeout: timeout,
        accept_replies: acceptReplies,
        allowed_destination: allowedDestination,
        consolidation: consolidation,
      },
    };

    await this.sendCtrlMessage(controlMessage);
    return querier;
  }


  // Liveliness 
  async declareLivelinessToken(
    keyExpr: string,
  ): Promise<UUIDv4> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareToken: { key_expr: keyExpr, id: uuid } }
    };

    await this.sendCtrlMessage(controlMessage);

    return uuid;
  }

  async declareLivelinessSubscriber(
    keyExpr: string,
    history: boolean,
    callback: SampleCallback,
    drop: Drop
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareSubscriber: { key_expr: keyExpr, id: uuid, history: history } }
    };

    this.livelinessSubscribers.set(uuid, {callback, drop});

    await this.sendCtrlMessage(controlMessage);

    let subscriber = new RemoteSubscriber(
      keyExpr,
      uuid,
      this,
    );

    return subscriber;
  }

  async getLiveliness(
    keyExpr: string,
    callback: ReplyCallback,
    drop: Drop,
    timeoutMilliseconds?: number
  ) {
    let uuid = uuidv4();

    let timeout = undefined;
    if (timeoutMilliseconds !== undefined) {
      timeout = timeoutMilliseconds;
    }

    let controlMessage: ControlMsg = {
      Liveliness: { Get: { key_expr: keyExpr, id: uuid, timeout: timeout } }
    };

    this.livelinessGetReceivers.set(uuid, {callback, drop});

    await this.sendCtrlMessage(controlMessage);
  }

  // Note: This method blocks until Timestamp has been created
  // The correct way to do this would be with a request / response
  async newTimestamp(): Promise<TimestampIface> {
    let uuid = uuidv4();
    let controlMessage: ControlMsg = { "NewTimestamp": uuid };
    this.newTimestamp_ = null;
    await this.sendCtrlMessage(controlMessage);
    while (this.newTimestamp_ === null) {
      await sleep(10);
    }
    return this.newTimestamp_;
  }

  //
  // Sending Messages
  //
  async sendDataMessage(dataMessage: DataMsg) {
    let remoteApiMmessage: RemoteAPIMsg = { Data: dataMessage };
    await this.sendRemoteApiMessage(remoteApiMmessage);
  }

  async sendCtrlMessage(ctrlMessage: ControlMsg) {
    let remoteApiMessage: RemoteAPIMsg = { Control: ctrlMessage };
    await this.sendRemoteApiMessage(remoteApiMessage);
  }

  private async sendRemoteApiMessage(remoteApiMessage: RemoteAPIMsg) {
    await this.link.send(JSON.stringify(remoteApiMessage));
  }

  //
  // Manage Session and handle messages
  //
  private onMessageReceived(message: JSONMessage) {
    let remoteApiMessage: RemoteAPIMsg = JSON.parse(
      message,
    ) as RemoteAPIMsg;
    if ("Session" in remoteApiMessage) {
      console.warn("Continue Ignore Session Messages");
    } else if ("Control" in remoteApiMessage) {
      this.handleControlMessage(remoteApiMessage["Control"]);
    } else if ("Data" in remoteApiMessage) {
      this.handleDataMessage(remoteApiMessage["Data"]);
    } else {
      log.error(
        `RemoteAPIMsg Does not contain known Members`,
        remoteApiMessage,
      );
    }
  }

  undeclareQueryable(id: UUIDv4): boolean{
    let handler = this.queryables.get(id);
    if (handler != undefined) {
      handler.drop();
      this.queryables.delete(id);
      return true;
    }
    return false;
  }

  undeclareSubscriber(id: UUIDv4): boolean{
    let handler = this.subscribers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.subscribers.delete(id);
      return true;
    }
    return false;
  }

  undeclareLivelinessSubscriber(id: UUIDv4): boolean{
    let handler = this.livelinessSubscribers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.livelinessSubscribers.delete(id);
      return true;
    }
    return false;
  }

  private removeGetReceiver(id: UUIDv4): boolean{
    let handler = this.getReceivers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.getReceivers.delete(id);
      return true;
    }
    return false;
  }

  private removeLivelinessGetReceiver(id: UUIDv4): boolean{
    let handler = this.livelinessGetReceivers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.livelinessGetReceivers.delete(id);
      return true;
    }
    return false;
  }

  private handleControlMessage(controlMsg: ControlMsg) {
    if (typeof controlMsg === "string") {
      console.warn("unhandled Control Message:", controlMsg);
    } else if (typeof controlMsg === "object") {
      if ("Session" in controlMsg) {
        this.session = controlMsg["Session"];
      } else if ("GetFinished" in controlMsg) {
        let id = controlMsg["GetFinished"].id;
        this.removeGetReceiver(id) || this.removeLivelinessGetReceiver(id);
      } else if ("UndeclareSubscriber" in controlMsg) {
        let subscriberUuid = controlMsg["UndeclareSubscriber"];
        this.undeclareSubscriber(subscriberUuid);
      } else if ("UndeclareQueryable" in controlMsg) {
        let queryableUuid = controlMsg["UndeclareQueryable"];
        this.undeclareQueryable(queryableUuid);
      }
    }
  }

  private handleDataMessage(dataMsg: DataMsg) {
    if ("Sample" in dataMsg) {
      let subscriptionUuid: UUIDv4 = dataMsg["Sample"][1];

      let subscriber = this.subscribers.get(subscriptionUuid) ?? this.livelinessSubscribers.get(subscriptionUuid);

      if (subscriber != undefined) {
        let sample: SampleWS = dataMsg["Sample"][0];
        subscriber.callback(sample);
      } else {
        console.warn("Subscrption UUID not in map", subscriptionUuid);
      }
    } else if ("GetReply" in dataMsg) {
      let getReply: ReplyWS = dataMsg["GetReply"];

      let receiver = this.getReceivers.get(getReply.query_uuid) ?? this.livelinessGetReceivers.get(getReply.query_uuid);

      if (receiver != undefined) {
        receiver.callback(getReply);
      } else {
        console.warn("Get receiver UUID not in map", getReply.query_uuid);
      }
    } else if ("Queryable" in dataMsg) {
      let queryableMsg: QueryableMsg = dataMsg["Queryable"];
      if ("Query" in queryableMsg) {
        let queryableUuid: UUIDv4 = queryableMsg.Query.queryable_uuid;
        let queryable = this.queryables.get(queryableUuid);
        if (queryable != undefined) {
          this.pendingQueries.add(queryableMsg.Query.query.query_uuid);
          queryable.callback(queryableMsg.Query.query)
        } else {
          console.warn("Queryable Message UUID not in map", queryableUuid);
        }
      } else if ("Reply" in queryableMsg) {
        // Server
        console.warn("Client should not receive Reply in Queryable Message");
        console.warn("Replies to get queries should come via Get Reply");
      } else {
        console.warn("Queryable message Variant not recognized");
      }
    } else if ("SessionInfo" in dataMsg) {
      let sessionInfo: SessionInfoIface = dataMsg["SessionInfo"];
      this.sessionInfo = sessionInfo;
    } else if ("NewTimestamp" in dataMsg) {
      let newTimestamp: TimestampIface = dataMsg["NewTimestamp"];
      this.newTimestamp_ = newTimestamp;
    } else {
      console.warn("Data Message not recognized Expected Variant", dataMsg);
    }
  }

  isClosed(): boolean {
    return !this.link.isOk();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
