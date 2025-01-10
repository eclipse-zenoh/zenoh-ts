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

import { SimpleChannel } from "channel-ts";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "tslog";
import { encode as b64_str_from_bytes } from "base64-arraybuffer";

const log = new Logger({ stylePrettyLogs: false });

// Import interface
import { RemoteAPIMsg } from "./interface/RemoteAPIMsg.js";
import { SampleWS } from "./interface/SampleWS.js";
import { DataMsg } from "./interface/DataMsg.js";
import { ControlMsg } from "./interface/ControlMsg.js";
import { OwnedKeyExprWrapper } from "./interface/OwnedKeyExprWrapper.js";
import { QueryWS } from "./interface/QueryWS.js";
import { RemotePublisher, RemoteSubscriber } from "./pubsub.js";
import { RemoteQueryable } from "./query.js";
import { ReplyWS } from "./interface/ReplyWS.js";
import { QueryableMsg } from "./interface/QueryableMsg.js";
import { QueryReplyWS } from "./interface/QueryReplyWS.js";
import { HandlerChannel } from "./interface/HandlerChannel.js";
import { SessionInfo as SessionInfoIface } from "./interface/SessionInfo.js";
import { RemoteQuerier } from "./querier.js"


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
  ws: WebSocket;
  ws_channel: SimpleChannel<JSONMessage>;
  session: UUIDv4 | null;
  subscribers: Map<UUIDv4, SimpleChannel<SampleWS>>;
  queryables: Map<UUIDv4, SimpleChannel<QueryWS>>;
  get_receiver: Map<UUIDv4, SimpleChannel<ReplyWS | RemoteRecvErr>>;
  liveliness_subscribers: Map<UUIDv4, SimpleChannel<SampleWS>>;
  liveliness_get_receiver: Map<UUIDv4, SimpleChannel<ReplyWS>>;
  session_info: SessionInfoIface | null;
  _new_timestamp: TimestampIface | null;

  private constructor(ws: WebSocket, ws_channel: SimpleChannel<JSONMessage>) {
    this.ws = ws;
    this.ws_channel = ws_channel;
    this.session = null;
    this.subscribers = new Map<UUIDv4, SimpleChannel<SampleWS>>();
    this.queryables = new Map<UUIDv4, SimpleChannel<QueryWS>>();
    this.get_receiver = new Map<UUIDv4, SimpleChannel<ReplyWS>>();
    this.liveliness_subscribers = new Map<UUIDv4, SimpleChannel<SampleWS>>();
    this.liveliness_get_receiver = new Map<UUIDv4, SimpleChannel<ReplyWS>>();
    this.session_info = null;
    this._new_timestamp = null;
  }

  //
  // Initialize Class
  //
  static async new(url: string): Promise<RemoteSession> {
    let split = url.split("/");
    let websocket_endpoint = split[0] + "://" + split[1];

    const MAX_RETRIES: number = 10;
    let retries: number = 0;
    let websocket_connected = false;
    let retry_timeout_ms = 2000;
    let exponential_multiplier = 1;

    const chan = new SimpleChannel<JSONMessage>(); // creates a new simple channel
    let ws = new WebSocket(websocket_endpoint);

    while (websocket_connected == false) {
      ws.onopen = function (_event: any) {
        // `this` here is a websocket object
        let control_message: ControlMsg = "OpenSession";
        let remote_api_message: RemoteAPIMsg = { Control: control_message };
        this.send(JSON.stringify(remote_api_message));
      };

      ws.onmessage = function (event: any) {
        // `this` here is a websocket object
        chan.send(event.data);
      };

      ws.onclose = function () {
        // `this` here is a websocket object
        console.warn("Websocket connection to remote-api-plugin has been disconnected")
      };

      let wait = 0;
      while (ws.readyState != 1) {
        await sleep(100);
        wait += 100;
        if (wait > (retry_timeout_ms * exponential_multiplier)) {
          ws.close();
          if (retries > MAX_RETRIES) {
            throw new Error(`Failed to Connect to locator endpoint: ${url} after ${MAX_RETRIES}`);
          }
          exponential_multiplier = exponential_multiplier * 2;
          break;
        }
      }

      if (ws.readyState == 1) {
        websocket_connected = true;
      } else {
        ws = new WebSocket(websocket_endpoint);
        console.warn("Restart connection");
      }
    }

    let session = new RemoteSession(ws, chan);
    session.channel_receive();
    return session;
  }

  //
  // Zenoh Session Functions
  //
  // Info
  async info(): Promise<SessionInfoIface> {
    let ctrl_message: ControlMsg = "SessionInfo";
    this.session_info = null;
    this.send_ctrl_message(ctrl_message);

    while (this.session_info === null) {
      await sleep(10);
    }
    return this.session_info;
  }

  // Put
  put(key_expr: string,
    payload: Array<number>,
    encoding?: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?:string,
  ): void {
    let owned_keyexpr: OwnedKeyExprWrapper = key_expr;

    let opt_attachment = undefined;
    if (attachment != undefined) {
      opt_attachment = b64_str_from_bytes(new Uint8Array(attachment))
    }

    let ctrl_message: ControlMsg = {
      Put: {
        key_expr: owned_keyexpr,
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        encoding: encoding,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        attachment: opt_attachment,
        timestamp: timestamp
      },
    };
    this.send_ctrl_message(ctrl_message);
  }

  // get
  get(
    key_expr: string,
    parameters: string | null,
    handler: HandlerChannel,
    consolidation?: number,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    encoding?: string,
    payload?: Array<number>,
    attachment?: Array<number>,
    timeout_ms?: number,
  ): SimpleChannel<ReplyWS> {
    let uuid = uuidv4();
    let channel: SimpleChannel<ReplyWS> = new SimpleChannel<ReplyWS>();
    this.get_receiver.set(uuid, channel);

    let opt_payload = undefined;
    if (payload != undefined) {
      opt_payload = b64_str_from_bytes(new Uint8Array(payload))
    }
    let opt_attachment = undefined;
    if (attachment != undefined) {
      opt_attachment = b64_str_from_bytes(new Uint8Array(attachment))
    }

    let control_message: ControlMsg = {
      Get: {
        key_expr: key_expr,
        parameters: parameters,
        id: uuid,
        handler: handler,
        consolidation: consolidation,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        target: target,
        encoding: encoding,
        timeout: timeout_ms,
        payload: opt_payload,
        attachment: opt_attachment
      },
    };
    this.send_ctrl_message(control_message);
    return channel;
  }

  // delete
  delete(
    key_expr: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    attachment?: Array<number>,
    timestamp?: string,
  ): void {
    let owned_keyexpr: OwnedKeyExprWrapper = key_expr;
    let opt_attachment = undefined;
    if (attachment != undefined) {
      opt_attachment = b64_str_from_bytes(new Uint8Array(attachment))
    }
    let data_message: ControlMsg = {
      Delete: {
        key_expr: owned_keyexpr,
        congestion_control: congestion_control,
        priority: priority,
        express: express,
        attachment: opt_attachment,
        timestamp: timestamp
      }
    };
    this.send_ctrl_message(data_message);
  }

  close(): void {
    let data_message: ControlMsg = "CloseSession";
    this.send_ctrl_message(data_message);
    this.ws.close();
  }

  declare_remote_subscriber(
    key_expr: string,
    handler: HandlerChannel,
    callback?: (sample: SampleWS) => void,
  ): RemoteSubscriber {
    let uuid = uuidv4();

    let control_message: ControlMsg = {
      DeclareSubscriber: { key_expr: key_expr, id: uuid, handler: handler },
    };

    let channel: SimpleChannel<SampleWS> = new SimpleChannel<SampleWS>();

    this.subscribers.set(uuid, channel);

    this.send_ctrl_message(control_message);

    let subscriber = RemoteSubscriber.new(
      key_expr,
      uuid,
      this,
      channel,
      callback,
    );
    return subscriber;
  }


  declare_remote_queryable(
    key_expr: string,
    complete: boolean,
    reply_tx: SimpleChannel<QueryReplyWS>,
    handler: HandlerChannel,
    callback?: (sample: QueryWS) => void,
  ): RemoteQueryable {
    let uuid = uuidv4();

    let control_message: ControlMsg = {
      DeclareQueryable: { key_expr: key_expr, complete: complete, id: uuid, handler: handler },
    };

    let query_rx: SimpleChannel<QueryWS> = new SimpleChannel<QueryWS>();

    this.queryables.set(uuid, query_rx);

    this.send_ctrl_message(control_message);

    let queryable = RemoteQueryable.new(
      key_expr,
      uuid,
      this,
      query_rx,
      reply_tx,
      callback,
    );

    return queryable;
  }

  declare_remote_publisher(
    key_expr: string,
    encoding?: string,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    reliability?: number,
  ): RemotePublisher {
    let uuid: string = uuidv4();
    let publisher = new RemotePublisher(key_expr, uuid, this);
    let control_message: ControlMsg = {
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
    this.send_ctrl_message(control_message);
    return publisher;
  }

  declare_remote_querier(
    key_expr: string,
    consolidation?: number,
    congestion_control?: number,
    priority?: number,
    express?: boolean,
    target?: number,
    allowed_destination?: number,
    accept_replies?: number,
    timeout_milliseconds?: number,
  ): RemoteQuerier {
    let timeout = undefined;
    if (timeout_milliseconds !== undefined) {
      timeout = timeout_milliseconds;
    }

    let uuid: string = uuidv4();
    let querier = new RemoteQuerier(uuid, this);

    let control_message: ControlMsg = {
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

    this.send_ctrl_message(control_message);
    return querier;
  }


  // Liveliness 
  declare_liveliness_token(
    key_expr: string,
  ): UUIDv4 {
    let uuid = uuidv4();

    let control_message: ControlMsg = {
      Liveliness: { DeclareToken: { key_expr: key_expr, id: uuid } }
    };

    this.send_ctrl_message(control_message);

    return uuid;
  }

  declare_liveliness_subscriber(
    key_expr: string,
    history: boolean,
    callback?: (sample: SampleWS) => void,
  ): RemoteSubscriber {
    let uuid = uuidv4();

    let control_message: ControlMsg = {
      Liveliness: { DeclareSubscriber: { key_expr: key_expr, id: uuid, history: history } }
    };

    let channel: SimpleChannel<SampleWS> = new SimpleChannel<SampleWS>();

    this.liveliness_subscribers.set(uuid, channel);

    this.send_ctrl_message(control_message);

    let subscriber = RemoteSubscriber.new(
      key_expr,
      uuid,
      this,
      channel,
      callback,
    );

    return subscriber;
  }

  get_liveliness(
    key_expr: string,
    timeout_milliseconds?: number
  ): SimpleChannel<ReplyWS> {
    let uuid = uuidv4();
    let channel: SimpleChannel<ReplyWS> = new SimpleChannel<ReplyWS>();
    this.get_receiver.set(uuid, channel);

    let timeout = undefined;
    if (timeout_milliseconds !== undefined) {
      timeout = timeout_milliseconds;
    }

    let control_message: ControlMsg = {
      Liveliness: { Get: { key_expr: key_expr, id: uuid, timeout: timeout } }
    };

    this.liveliness_get_receiver.set(uuid, channel);

    this.send_ctrl_message(control_message);

    return channel;
  }

  // Note: This method blocks until Timestamp has been created
  // The correct way to do this would be with a request / response
  async new_timestamp(): Promise<TimestampIface> {
    let uuid = uuidv4();
    let control_message: ControlMsg = { "NewTimestamp": uuid };
    this._new_timestamp = null;
    this.send_ctrl_message(control_message);
    while (this._new_timestamp === null) {
      await sleep(10);
    }
    return this._new_timestamp;
  }

  //
  // Sending Messages
  //
  send_data_message(data_message: DataMsg) {
    let remote_api_message: RemoteAPIMsg = { Data: data_message };
    this.send_remote_api_message(remote_api_message);
  }

  send_ctrl_message(ctrl_message: ControlMsg) {
    let remote_api_message: RemoteAPIMsg = { Control: ctrl_message };
    this.send_remote_api_message(remote_api_message);
  }

  private send_remote_api_message(remote_api_message: RemoteAPIMsg) {
    this.ws.send(JSON.stringify(remote_api_message));
  }

  //
  // Manage Session and handle messages
  //
  private async channel_receive() {
    for await (const message of this.ws_channel) {
      let remote_api_message: RemoteAPIMsg = JSON.parse(
        message,
      ) as RemoteAPIMsg;

      if ("Session" in remote_api_message) {
        console.warn("Continue Ignore Session Messages");
        continue;
      } else if ("Control" in remote_api_message) {
        this.handle_control_message(remote_api_message["Control"]);
        continue;
      } else if ("Data" in remote_api_message) {
        this.handle_data_message(remote_api_message["Data"]);
        continue;
      } else {
        log.error(
          `RemoteAPIMsg Does not contain known Members`,
          remote_api_message,
        );
      }
    }
    console.warn("Closed");
  }

  private handle_control_message(control_msg: ControlMsg) {
    if (typeof control_msg === "string") {
      console.warn("unhandled Control Message:", control_msg);
    } else if (typeof control_msg === "object") {
      if ("Session" in control_msg) {
        this.session = control_msg["Session"];
      } else if ("GetFinished" in control_msg) {
        let channel = this.get_receiver.get(control_msg["GetFinished"].id);
        channel?.send(RemoteRecvErr.Disconnected);
        this.get_receiver.delete(control_msg["GetFinished"].id);
      }
    }
  }

  private handle_data_message(data_msg: DataMsg) {
    if ("Sample" in data_msg) {
      let subscription_uuid: UUIDv4 = data_msg["Sample"][1];

      let opt_subscriber = this.subscribers.get(subscription_uuid);
      let opt_livelinesss_subscriber = this.liveliness_subscribers.get(subscription_uuid);

      if (opt_subscriber != undefined) {
        let channel: SimpleChannel<SampleWS> = opt_subscriber;
        let sample: SampleWS = data_msg["Sample"][0];
        channel.send(sample);
      } else if (opt_livelinesss_subscriber != undefined) {
        let channel: SimpleChannel<SampleWS> = opt_livelinesss_subscriber;
        let sample: SampleWS = data_msg["Sample"][0];
        channel.send(sample);
      } else {
        console.warn("Subscrption UUID not in map", subscription_uuid);
      }
    } else if ("GetReply" in data_msg) {
      let get_reply: ReplyWS = data_msg["GetReply"];

      let opt_receiver = this.get_receiver.get(get_reply.query_uuid);
      let opt_liveliness_receiver = this.liveliness_get_receiver.get(get_reply.query_uuid);

      if (opt_receiver != undefined) {
        let channel: SimpleChannel<ReplyWS | RemoteRecvErr> = opt_receiver;
        channel.send(get_reply);
      } else if (opt_liveliness_receiver != undefined) {
        let channel: SimpleChannel<ReplyWS | RemoteRecvErr> = opt_liveliness_receiver;
        channel.send(get_reply);
      }
    } else if ("Queryable" in data_msg) {
      let queryable_msg: QueryableMsg = data_msg["Queryable"];
      if ("Query" in queryable_msg) {
        let queryable_uuid: UUIDv4 = queryable_msg.Query.queryable_uuid;
        let opt_queryable = this.queryables.get(queryable_uuid);

        if (opt_queryable != undefined) {
          let channel: SimpleChannel<QueryWS> = opt_queryable;
          let query = queryable_msg.Query.query;
          channel.send(query);
        } else {
          console.warn("Queryable Message UUID not in map", queryable_uuid);
        }
      } else if ("Reply" in queryable_msg) {
        // Server
        console.warn("Client should not receive Reply in Queryable Message");
        console.warn("Replies to get queries should come via Get Reply");
      } else {
        console.warn("Queryable message Variant not recognized");
      }
    } else if ("SessionInfo" in data_msg) {
      let session_info: SessionInfoIface = data_msg["SessionInfo"];
      this.session_info = session_info;
    } else if ("NewTimestamp" in data_msg) {
      let new_timestamp: TimestampIface = data_msg["NewTimestamp"];
      this._new_timestamp = new_timestamp;
    } else {
      console.warn("Data Message not recognized Expected Variant", data_msg);
    }
  }
}




function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
