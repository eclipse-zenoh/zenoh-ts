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
  string_rep: string,
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
  get_receivers: Map<UUIDv4, Closure<ReplyWS>>;
  liveliness_subscribers: Map<UUIDv4, Closure<SampleWS>>;
  liveliness_get_receivers: Map<UUIDv4, Closure<ReplyWS>>;
  pending_queries: Set<UUIDv4>;
  session_info: SessionInfoIface | null;
  _new_timestamp: TimestampIface | null;

  private constructor(link: RemoteLink) {
    this.link = link;
    this.session = null;
    this.subscribers = new Map<UUIDv4, Closure<SampleWS>>();
    this.queryables = new Map<UUIDv4, Closure<QueryWS>>();
    this.get_receivers = new Map<UUIDv4, Closure<ReplyWS>>();
    this.liveliness_subscribers = new Map<UUIDv4, Closure<SampleWS>>();
    this.liveliness_get_receivers = new Map<UUIDv4, Closure<ReplyWS>>();
    this.pending_queries = new Set<UUIDv4>;
    this.session_info = null;
    this._new_timestamp = null;
  }

  //
  // Initialize Class
  //
  static async new(locator: string): Promise<RemoteSession> {
    let link = await RemoteLink.new(locator);
    let session =  new RemoteSession(link);
    session.link.onmessage((msg: any) => { session.on_message_received(msg); });

    let open: ControlMsg = "OpenSession";
    await session.send_ctrl_message(open);
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
    this.session_info = null;
    await this.send_ctrl_message(ctrlMessage);

    while (this.session_info === null) {
      await sleep(10);
    }
    return this.session_info;
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
    await this.send_ctrl_message(ctrlMessage);
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
    this.get_receivers.set(uuid, {callback, drop});

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
    await this.send_ctrl_message(controlMessage);
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
    await this.send_ctrl_message(dataMessage);
  }

  async reply_final(queryUuid: UUIDv4): Promise<boolean> {
    return this.pending_queries.delete(queryUuid);
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
      if (!this.pending_queries.has(uuid)) {
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
      await this.send_data_message(dataMsg);

      return await this.reply_final(uuid);
  }

  async reply_err(uuid: UUIDv4, payload: Uint8Array, encoding: string | null): Promise<boolean> {
    if (!this.pending_queries.has(uuid)) {
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
    await this.send_data_message(dataMsg);

    return await this.reply_final(uuid);
  }

  async reply_del(uuid: UUIDv4,
      keyExpr: string,
      congestionControl: number,
      priority: number,
      express: boolean,
      attachment: Uint8Array | null,
      timestamp: string | null): Promise<boolean> {
    if (!this.pending_queries.has(uuid)) {
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
    await this.send_data_message(dataMsg);

    return await this.reply_final(uuid);
}

  async close() {
    let dataMessage: ControlMsg = "CloseSession";
    await this.send_ctrl_message(dataMessage);
    this.link.close();

    this.pending_queries.clear();
    for (let v of this.subscribers.values()) {
      v.drop();
    }
    this.subscribers.clear();

    for (let v of this.liveliness_subscribers.values()) {
      v.drop();
    }
    this.liveliness_subscribers.clear();

    for (let v of this.get_receivers.values()) {
      v.drop();
    }
    this.get_receivers.clear();

    for (let v of this.liveliness_get_receivers.values()) {
      v.drop();
    }

    for (let v of this.queryables.values()) {
      v.drop();
    }
    this.queryables.clear();
  }

  async declare_remote_subscriber(
    keyExpr: string,
    callback: SampleCallback,
    drop: Drop,
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      DeclareSubscriber: { key_expr: keyExpr, id: uuid},
    };

    this.subscribers.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);

    let subscriber = new RemoteSubscriber(
      keyExpr,
      uuid,
      this
    );
    return subscriber;
  }


  async declare_remote_queryable(
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

    await this.send_ctrl_message(controlMessage);

    let queryable = new RemoteQueryable(
      keyExpr,
      uuid,
      this,
    );

    return queryable;
  }

  async declare_remote_publisher(
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
    await this.send_ctrl_message(controlMessage);
    return publisher;
  }

  async declare_remote_querier(
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

    await this.send_ctrl_message(controlMessage);
    return querier;
  }


  // Liveliness 
  async declare_liveliness_token(
    keyExpr: string,
  ): Promise<UUIDv4> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareToken: { key_expr: keyExpr, id: uuid } }
    };

    await this.send_ctrl_message(controlMessage);

    return uuid;
  }

  async declare_liveliness_subscriber(
    keyExpr: string,
    history: boolean,
    callback: SampleCallback,
    drop: Drop
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareSubscriber: { key_expr: keyExpr, id: uuid, history: history } }
    };

    this.liveliness_subscribers.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);

    let subscriber = new RemoteSubscriber(
      keyExpr,
      uuid,
      this,
    );

    return subscriber;
  }

  async get_liveliness(
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

    this.liveliness_get_receivers.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);
  }

  // Note: This method blocks until Timestamp has been created
  // The correct way to do this would be with a request / response
  async new_timestamp(): Promise<TimestampIface> {
    let uuid = uuidv4();
    let controlMessage: ControlMsg = { "NewTimestamp": uuid };
    this._new_timestamp = null;
    await this.send_ctrl_message(controlMessage);
    while (this._new_timestamp === null) {
      await sleep(10);
    }
    return this._new_timestamp;
  }

  //
  // Sending Messages
  //
  async send_data_message(dataMessage: DataMsg) {
    let remoteApiMmessage: RemoteAPIMsg = { Data: dataMessage };
    await this.send_remote_api_message(remoteApiMmessage);
  }

  async send_ctrl_message(ctrlMessage: ControlMsg) {
    let remoteApiMessage: RemoteAPIMsg = { Control: ctrlMessage };
    await this.send_remote_api_message(remoteApiMessage);
  }

  private async send_remote_api_message(remoteApiMessage: RemoteAPIMsg) {
    await this.link.send(JSON.stringify(remoteApiMessage));
  }

  //
  // Manage Session and handle messages
  //
  private on_message_received(message: JSONMessage) {
    let remoteApiMessage: RemoteAPIMsg = JSON.parse(
      message,
    ) as RemoteAPIMsg;
    if ("Session" in remoteApiMessage) {
      console.warn("Continue Ignore Session Messages");
    } else if ("Control" in remoteApiMessage) {
      this.handle_control_message(remoteApiMessage["Control"]);
    } else if ("Data" in remoteApiMessage) {
      this.handle_data_message(remoteApiMessage["Data"]);
    } else {
      log.error(
        `RemoteAPIMsg Does not contain known Members`,
        remoteApiMessage,
      );
    }
  }

  undeclare_queryable(id: UUIDv4): boolean{
    let handler = this.queryables.get(id);
    if (handler != undefined) {
      handler.drop();
      this.queryables.delete(id);
      return true;
    }
    return false;
  }

  undeclare_subscriber(id: UUIDv4): boolean{
    let handler = this.subscribers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.subscribers.delete(id);
      return true;
    }
    return false;
  }

  undeclare_liveliness_subscriber(id: UUIDv4): boolean{
    let handler = this.liveliness_subscribers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.liveliness_subscribers.delete(id);
      return true;
    }
    return false;
  }

  private remove_get_receiver(id: UUIDv4): boolean{
    let handler = this.get_receivers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.get_receivers.delete(id);
      return true;
    }
    return false;
  }

  private remove_liveliness_get_receiver(id: UUIDv4): boolean{
    let handler = this.liveliness_get_receivers.get(id);
    if (handler != undefined) {
      handler.drop();
      this.liveliness_get_receivers.delete(id);
      return true;
    }
    return false;
  }

  private handle_control_message(controlMsg: ControlMsg) {
    if (typeof controlMsg === "string") {
      console.warn("unhandled Control Message:", controlMsg);
    } else if (typeof controlMsg === "object") {
      if ("Session" in controlMsg) {
        this.session = controlMsg["Session"];
      } else if ("GetFinished" in controlMsg) {
        let id = controlMsg["GetFinished"].id;
        this.remove_get_receiver(id) || this.remove_liveliness_get_receiver(id);
      } else if ("UndeclareSubscriber" in controlMsg) {
        let subscriberUuid = controlMsg["UndeclareSubscriber"];
        this.undeclare_subscriber(subscriberUuid);
      } else if ("UndeclareQueryable" in controlMsg) {
        let queryableUuid = controlMsg["UndeclareQueryable"];
        this.undeclare_queryable(queryableUuid);
      }
    }
  }

  private handle_data_message(dataMsg: DataMsg) {
    if ("Sample" in dataMsg) {
      let subscriptionUuid: UUIDv4 = dataMsg["Sample"][1];

      let subscriber = this.subscribers.get(subscriptionUuid) ?? this.liveliness_subscribers.get(subscriptionUuid);

      if (subscriber != undefined) {
        let sample: SampleWS = dataMsg["Sample"][0];
        subscriber.callback(sample);
      } else {
        console.warn("Subscrption UUID not in map", subscriptionUuid);
      }
    } else if ("GetReply" in dataMsg) {
      let getReply: ReplyWS = dataMsg["GetReply"];

      let receiver = this.get_receivers.get(getReply.query_uuid) ?? this.liveliness_get_receivers.get(getReply.query_uuid);

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
          this.pending_queries.add(queryableMsg.Query.query.query_uuid);
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
      this.session_info = sessionInfo;
    } else if ("NewTimestamp" in dataMsg) {
      let newTimestamp: TimestampIface = dataMsg["NewTimestamp"];
      this._new_timestamp = newTimestamp;
    } else {
      console.warn("Data Message not recognized Expected Variant", dataMsg);
    }
  }

  is_closed(): boolean {
    return !this.link.is_ok();
  }
}




function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
