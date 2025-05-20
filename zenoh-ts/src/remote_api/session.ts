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
  async put(key_expr: string,
    payload: Array<number>,
    encoding?: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?:string,
  ) {
    let ownedKeyexpr: OwnedKeyExprWrapper = key_expr;

    let optAttachment = undefined;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(new Uint8Array(attachment))
    }

    let ctrlMessage: ControlMsg = {
      Put: {
        key_expr: ownedKeyexpr,
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        encoding: encoding,
        congestion_control: congestion_control,
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
    key_expr: string,
    parameters: string | null,
    callback: ReplyCallback,
    drop: Drop,
    consolidation?: number,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    encoding?: string,
    payload?: Array<number>,
    attachment?: Array<number>,
    timeout_ms?: number,
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
        key_expr: key_expr,
        parameters: parameters,
        id: uuid,
        consolidation: consolidation,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        target: target,
        encoding: encoding,
        timeout: timeout_ms,
        payload: optPayload,
        attachment: optAttachment
      },
    };
    await this.send_ctrl_message(controlMessage);
  }

  // delete
  async delete(
    key_expr: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?: string,
  ) {
    let ownedKeyexpr: OwnedKeyExprWrapper = key_expr;
    let optAttachment = undefined;
    if (attachment != undefined) {
      optAttachment = b64_str_from_bytes(new Uint8Array(attachment))
    }
    let dataMessage: ControlMsg = {
      Delete: {
        key_expr: ownedKeyexpr,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        attachment: optAttachment,
        timestamp: timestamp
      }
    };
    await this.send_ctrl_message(dataMessage);
  }

  async reply_final(query_uuid: UUIDv4): Promise<boolean> {
    return this.pending_queries.delete(query_uuid);
  }

  async reply(uuid: UUIDv4, 
      key_expr: string,
      payload: Uint8Array,
      encoding: string | null,
      congestion_control: number,
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
          key_expr: key_expr.toString(),
          payload: b64_str_from_bytes(payload),
          encoding: encoding,
          priority: priority,
          congestion_control: congestion_control,
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
      key_expr: string,
      congestion_control: number,
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
        key_expr: key_expr,
        priority: priority,
        congestion_control: congestion_control,
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
    key_expr: string,
    callback: SampleCallback,
    drop: Drop,
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      DeclareSubscriber: { key_expr: key_expr, id: uuid},
    };

    this.subscribers.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);

    let subscriber = RemoteSubscriber.new(
      key_expr,
      uuid,
      this
    );
    return subscriber;
  }


  async declare_remote_queryable(
    key_expr: string,
    complete: boolean,
    callback: QueryCallback,
    drop: Drop
  ): Promise<RemoteQueryable> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      DeclareQueryable: { key_expr: key_expr, complete: complete, id: uuid},
    };

    this.queryables.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);

    let queryable = RemoteQueryable.new(
      key_expr,
      uuid,
      this,
    );

    return queryable;
  }

  async declare_remote_publisher(
    key_expr: string,
    encoding?: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    reliability?: number,
  ): Promise<RemotePublisher> {
    let uuid: string = uuidv4();
    let publisher = new RemotePublisher(key_expr, uuid, this);
    let controlMessage: ControlMsg = {
      DeclarePublisher: {
        key_expr: key_expr,
        encoding: encoding,
        congestion_control: congestion_control,
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
    key_expr: string,
    consolidation?: number,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    allowed_destination?: number,
    accept_replies?: number,
    timeout_milliseconds?: number,
  ): Promise<RemoteQuerier> {
    let timeout = undefined;
    if (timeout_milliseconds !== undefined) {
      timeout = timeout_milliseconds;
    }

    let uuid: string = uuidv4();
    let querier = new RemoteQuerier(uuid, this);

    let controlMessage: ControlMsg = {
      DeclareQuerier: {
        id: uuid,
        key_expr: key_expr,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        target: target,
        timeout: timeout,
        accept_replies: accept_replies,
        allowed_destination: allowed_destination,
        consolidation: consolidation,
      },
    };

    await this.send_ctrl_message(controlMessage);
    return querier;
  }


  // Liveliness 
  async declare_liveliness_token(
    key_expr: string,
  ): Promise<UUIDv4> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareToken: { key_expr: key_expr, id: uuid } }
    };

    await this.send_ctrl_message(controlMessage);

    return uuid;
  }

  async declare_liveliness_subscriber(
    key_expr: string,
    history: boolean,
    callback: SampleCallback,
    drop: Drop
  ): Promise<RemoteSubscriber> {
    let uuid = uuidv4();

    let controlMessage: ControlMsg = {
      Liveliness: { DeclareSubscriber: { key_expr: key_expr, id: uuid, history: history } }
    };

    this.liveliness_subscribers.set(uuid, {callback, drop});

    await this.send_ctrl_message(controlMessage);

    let subscriber = RemoteSubscriber.new(
      key_expr,
      uuid,
      this,
    );

    return subscriber;
  }

  async get_liveliness(
    key_expr: string,
    callback: ReplyCallback,
    drop: Drop,
    timeout_milliseconds?: number
  ) {
    let uuid = uuidv4();

    let timeout = undefined;
    if (timeout_milliseconds !== undefined) {
      timeout = timeout_milliseconds;
    }

    let controlMessage: ControlMsg = {
      Liveliness: { Get: { key_expr: key_expr, id: uuid, timeout: timeout } }
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
  async send_data_message(data_message: DataMsg) {
    let remoteApiMmessage: RemoteAPIMsg = { Data: data_message };
    await this.send_remote_api_message(remoteApiMmessage);
  }

  async send_ctrl_message(ctrl_message: ControlMsg) {
    let remoteApiMessage: RemoteAPIMsg = { Control: ctrl_message };
    await this.send_remote_api_message(remoteApiMessage);
  }

  private async send_remote_api_message(remote_api_message: RemoteAPIMsg) {
    await this.link.send(JSON.stringify(remote_api_message));
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

  private handle_control_message(control_msg: ControlMsg) {
    if (typeof control_msg === "string") {
      console.warn("unhandled Control Message:", control_msg);
    } else if (typeof control_msg === "object") {
      if ("Session" in control_msg) {
        this.session = control_msg["Session"];
      } else if ("GetFinished" in control_msg) {
        let id = control_msg["GetFinished"].id;
        this.remove_get_receiver(id) || this.remove_liveliness_get_receiver(id);
      } else if ("UndeclareSubscriber" in control_msg) {
        let subscriberUuid = control_msg["UndeclareSubscriber"];
        this.undeclare_subscriber(subscriberUuid);
      } else if ("UndeclareQueryable" in control_msg) {
        let queryableUuid = control_msg["UndeclareQueryable"];
        this.undeclare_queryable(queryableUuid);
      }
    }
  }

  private handle_data_message(data_msg: DataMsg) {
    if ("Sample" in data_msg) {
      let subscriptionUuid: UUIDv4 = data_msg["Sample"][1];

      let subscriber = this.subscribers.get(subscriptionUuid) ?? this.liveliness_subscribers.get(subscriptionUuid);

      if (subscriber != undefined) {
        let sample: SampleWS = data_msg["Sample"][0];
        subscriber.callback(sample);
      } else {
        console.warn("Subscrption UUID not in map", subscriptionUuid);
      }
    } else if ("GetReply" in data_msg) {
      let getReply: ReplyWS = data_msg["GetReply"];

      let receiver = this.get_receivers.get(getReply.query_uuid) ?? this.liveliness_get_receivers.get(getReply.query_uuid);

      if (receiver != undefined) {
        receiver.callback(getReply);
      } else {
        console.warn("Get receiver UUID not in map", getReply.query_uuid);
      }
    } else if ("Queryable" in data_msg) {
      let queryableMsg: QueryableMsg = data_msg["Queryable"];
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
    } else if ("SessionInfo" in data_msg) {
      let sessionInfo: SessionInfoIface = data_msg["SessionInfo"];
      this.session_info = sessionInfo;
    } else if ("NewTimestamp" in data_msg) {
      let newTimestamp: TimestampIface = data_msg["NewTimestamp"];
      this._new_timestamp = newTimestamp;
    } else {
      console.warn("Data Message not recognized Expected Variant", data_msg);
    }
  }

  is_closed(): boolean {
    return !this.link.is_ok();
  }
}




function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
