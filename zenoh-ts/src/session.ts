//
// Copyright (c) 2023 ZettaScale Technology
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
// Remote API interface
import {
  RemoteRecvErr as GetChannelClose,
  RemoteSession,
} from "./remote_api/session";
import { ReplyWS } from "./remote_api/interface/ReplyWS";
import { RemotePublisher, RemoteSubscriber } from "./remote_api/pubsub";
import { SampleWS } from "./remote_api/interface/SampleWS";
import { RemoteQueryable } from "./remote_api/query";
import { QueryWS } from "./remote_api/interface/QueryWS";
import { QueryReplyWS } from "./remote_api/interface/QueryReplyWS";
// API interface
import { IntoKeyExpr, KeyExpr } from "./key_expr";
import { IntoZBytes, ZBytes } from "./z_bytes";
import { Liveliness } from "./liveliness";
import {
  IntoSelector,
  Parameters,
  Query,
  Queryable,
  QueryWS_to_Query,
  Reply,
  Selector,
} from "./query";
import { ChannelType, FifoChannel, Handler, NewSubscriber, Publisher, RingChannel, Subscriber } from "./pubsub";
import {
  priority_to_int,
  congestion_control_to_int,
  CongestionControl,
  Priority,
  Sample,
  Sample_from_SampleWS,
  consolidation_mode_to_int,
  ConsolidationMode,
  Reliability,
  reliability_to_int,
} from "./sample";
import { Config } from "./config";
import { Encoding } from "./encoding";
import { HandlerChannel } from "./remote_api/interface/HandlerChannel";
// General imports
import { SimpleChannel } from "channel-ts";
import { State } from "channel-ts/lib/channel";


function executeAsync(func: any) {
  setTimeout(func, 0);
}

/**
 * Options for a Put function 
 * @prop {Encoding=} encoding - encoding type 
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {Priority=} priority - priority of the written data
 * @prop {boolean=} express  - express 
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
*/

export interface PutOptions {
  encoding?: Encoding,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  attachment?: IntoZBytes
}

/**
 * Options for a Delete function 
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {Priority=} priority - priority of the written data
 * @prop {boolean=} express  - Express 
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
*/
export interface DeleteOptions {
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  attachment?: IntoZBytes
}

/**
 * Options for a Get function 
 * @prop {ConsolidationMode=} consolidation - consolidation mode
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {Priority=} priority - priority of the written data
 * @prop {boolean=} express  - Express 
 * @prop {Encoding=} encoding - Encoding type of payload 
 * @prop {IntoZBytes=} payload - Payload associated with getrequest
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
*/
export interface GetOptions {
  consolidation?: ConsolidationMode,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  encoding?: Encoding,
  payload?: IntoZBytes,
  attachment?: IntoZBytes
}

/**
 * Options for a Queryable
 * @prop complete - Change queryable completeness.
 * @prop callback - Callback function for this queryable
*/
export interface QueryableOptions {
  complete?: boolean,
  callback?: (query: Query) => void,
}

/**
 *  Set of options used when declaring a publisher
 * @prop {Encoding} encoding - Optional, Type of Encoding data to be sent over
 * @prop {CongestionControl} congestion_control - Optional, Type of Congestion control to be used (BLOCK / DROP)
 * @prop {Priority} priority - Optional, The Priority of zenoh messages
 * @prop {boolean} express - Optional, The Priority of zenoh messages
 * @prop {Reliability} reliability - Optional, The Priority of zenoh messages
 */
export interface PublisherOptions {
  encoding?: Encoding,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  reliability?: Reliability,
}

// ███████ ███████ ███████ ███████ ██  ██████  ███    ██
// ██      ██      ██      ██      ██ ██    ██ ████   ██
// ███████ █████   ███████ ███████ ██ ██    ██ ██ ██  ██
//      ██ ██           ██      ██ ██ ██    ██ ██  ██ ██
// ███████ ███████ ███████ ███████ ██  ██████  ██   ████

/**
 * Zenoh Session
 */
export class Session {
  // WebSocket Backend
  private remote_session: RemoteSession;
  /** Finalization registry used for cleanup on drop
   * @ignore 
   */
  static registry: FinalizationRegistry<RemoteSession> = new FinalizationRegistry((r_session: RemoteSession) => r_session.close());

  dispose() {
    this.close();
    Session.registry.unregister(this);
  }

  private constructor(remote_session: RemoteSession) {
    this.remote_session = remote_session;
    Session.registry.register(this, remote_session, this)
  }

  /**
   * Creates a new Session instance
   *
   * @remarks
   *  Opens A Zenoh Session
   *
   * @param config - Config for session
   * @returns Typescript instance of a Session
   *
   */

  static async open(config: Config): Promise<Session> {
    let remote_session = await RemoteSession.new(config.locator);
    return new Session(remote_session);
  }

  /**
   * Closes a session, cleaning up the resource in Zenoh
   *
   * @returns Nothing
   */
  async close() {
    this.remote_session.close();
    Session.registry.unregister(this);
  }

  /**
   * Puts a value on the session, on a specific key expression KeyExpr
   *
   * @param {IntoKeyExpr} into_key_expr - something that implements intoKeyExpr
   * @param {IntoZBytes} into_zbytes - something that implements intoValue
   * @param {PutOptions=} put_opts - an interface for the options settings on puts 
   * @returns void
   */
  put(
    into_key_expr: IntoKeyExpr,
    into_zbytes: IntoZBytes,
    put_opts?: PutOptions,
  ): void {
    let key_expr = new KeyExpr(into_key_expr);
    let z_bytes = new ZBytes(into_zbytes);

    let _priority;
    let _express;
    let _attachment;

    let _encoding = put_opts?.encoding?.toString()

    let _congestion_control = congestion_control_to_int(put_opts?.congestion_control);

    if (put_opts?.priority != undefined) {
      _priority = priority_to_int(put_opts?.priority);
    }
    _express = put_opts?.express?.valueOf();

    if (put_opts?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(put_opts?.attachment).buffer())
    }

    this.remote_session.put(
      key_expr.toString(),
      Array.from(z_bytes.buffer()),
      _encoding,
      _congestion_control,
      _priority,
      _express,
      _attachment,
    );
  }

  /**
   * Executes a Delete on a session, for a specific key expression KeyExpr
   *
   * @param {IntoKeyExpr} into_key_expr - something that implements intoKeyExpr
   * @param {DeleteOptions} delete_opts - optional additional parameters to go with a delete function
   *
   * @returns void
   */
  delete(
    into_key_expr: IntoKeyExpr,
    delete_opts?: DeleteOptions
  ): void {
    let key_expr = new KeyExpr(into_key_expr);
    let _congestion_control = congestion_control_to_int(delete_opts?.congestion_control);
    let _priority = priority_to_int(delete_opts?.priority);
    let _express = delete_opts?.express;
    let _attachment

    if (delete_opts?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(delete_opts?.attachment).buffer())
    }

    this.remote_session.delete(
      key_expr.toString(),
      _congestion_control,
      _priority,
      _express,
      _attachment,
    );
  }

  /** 
   * @ignore internal function for handlers
  */
  private check_handler_or_callback<T>(handler?: FifoChannel | RingChannel | ((sample: T) => Promise<void>)):
    [undefined | ((callback: T) => Promise<void>), HandlerChannel] {

    let handler_type: HandlerChannel;
    let callback = undefined;
    if (handler instanceof FifoChannel || handler instanceof RingChannel) {
      switch (handler.channel_type) {
        case ChannelType.Ring: {
          handler_type = { "Ring": handler.size };
          break;
        }
        case ChannelType.Fifo: {
          handler_type = { "Fifo": handler.size };
          break;
        }
        default: {
          throw "channel type undetermined"
        }
      }
    } else {
      handler_type = { "Fifo": 256 };
      callback = handler;
    }
    return [callback, handler_type]
  }

  /**
   * Issues a get query on a Zenoh session
   *
   * @param into_selector - representing a KeyExpr and Parameters
   *
   * @returns Receiver
   */
  async get(
    into_selector: IntoSelector,
    handler: ((sample: Reply) => Promise<void>) | Handler = new FifoChannel(256),
    get_options?: GetOptions
  ): Promise<Receiver | undefined> {

    let selector: Selector;
    let key_expr: KeyExpr;

    if (typeof into_selector === "string" || into_selector instanceof String) {
      let split_string = into_selector.split("?")
      if (split_string.length == 1) {
        key_expr = new KeyExpr(into_selector);
        selector = new Selector(key_expr);
      } else if (split_string.length == 2 && split_string[0] != undefined && split_string[1] != undefined) {
        key_expr = new KeyExpr(split_string[0]);
        let parameters: Parameters = new Parameters(split_string[1]);
        selector = new Selector(key_expr, parameters);
      } else {
        throw "Error: Invalid Selector, expected format <KeyExpr>?<Parameters>";
      }
    } else {
      selector = new Selector(into_selector);
    }

    let [callback, handler_type] = this.check_handler_or_callback<Reply>(handler);

    // Optional Parameters 
    let _consolidation = consolidation_mode_to_int(get_options?.consolidation)
    let _encoding = get_options?.encoding?.toString();
    let _congestion_control = congestion_control_to_int(get_options?.congestion_control);
    let _priority = priority_to_int(get_options?.priority);
    let _express = get_options?.express;
    let _attachment;
    let _payload;

    if (get_options?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(get_options?.attachment).buffer())
    }
    if (get_options?.payload != undefined) {
      _payload = Array.from(new ZBytes(get_options?.payload).buffer())
    }

    let chan: SimpleChannel<ReplyWS> = await this.remote_session.get(
      selector.key_expr().toString(),
      selector.parameters().toString(),
      handler_type,
      _consolidation,
      _congestion_control,
      _priority,
      _express,
      _encoding,
      _payload,
      _attachment,
    );

    let receiver = Receiver.new(chan);

    if (callback != undefined) {
      executeAsync(async () => {
        for await (const message of chan) {
          // This horribleness comes from SimpleChannel sending a 0 when the channel is closed
          if (message != undefined && (message as unknown as number) != 0) {
            let reply = new Reply(message);
            if (callback != undefined) {
              callback(reply);
            }
          } else {
            break
          }
        }
      });
      return undefined;
    } else {
      return receiver;
    }
  }

  /**
   * Declares a new subscriber
   *
   * @remarks
   *  If a Subscriber is created with a callback, it cannot be simultaneously polled for new values
   * 
   * @param {IntoKeyExpr} key_expr - string of key_expression
   * @param {((sample: Sample) => Promise<void>) | Handler} handler - Either a HandlerChannel or a Callback Function to be called for all samples
   *
   * @returns Subscriber
   */
  // Handler size : This is to match the API_DATA_RECEPTION_CHANNEL_SIZE of zenoh internally
  async declare_subscriber(
    key_expr: IntoKeyExpr,
    handler: ((sample: Sample) => Promise<void>) | Handler = new FifoChannel(256),
  ): Promise<Subscriber> {
    let _key_expr = new KeyExpr(key_expr);
    let remote_subscriber: RemoteSubscriber;
    let callback_subscriber = false;
    let [callback, handler_type] = this.check_handler_or_callback<Sample>(handler);

    if (callback !== undefined) {
      callback_subscriber = true;
      const callback_conversion = async function (sample_ws: SampleWS,): Promise<void> {
        let sample: Sample = Sample_from_SampleWS(sample_ws);
        if (callback !== undefined) {
          callback(sample);
        }
      };
      remote_subscriber = await this.remote_session.declare_remote_subscriber(
        _key_expr.toString(),
        handler_type,
        callback_conversion,
      );
    } else {
      remote_subscriber = await this.remote_session.declare_remote_subscriber(
        _key_expr.toString(),
        handler_type,
      );
    }
    
    let subscriber = Subscriber[NewSubscriber](
      remote_subscriber,
      callback_subscriber,
    );

    return subscriber;
  }

  liveliness() : Liveliness {
    return new Liveliness(this.remote_session)
  }

  /**
  * Declares a new Queryable
  *
  * @remarks
  *  If a Queryable is created with a callback, it cannot be simultaneously polled for new Query's
  * 
  * @param {IntoKeyExpr} key_expr - string of key_expression
  * @param {QueryableOptions=} queryable_opts - Optional additional settings for a Queryable [QueryableOptions]
  *
  * @returns Queryable
  */
  async declare_queryable(
    key_expr: IntoKeyExpr,
    queryable_opts?: QueryableOptions
  ): Promise<Queryable> {
    let _key_expr = new KeyExpr(key_expr);
    let remote_queryable: RemoteQueryable;
    let reply_tx: SimpleChannel<QueryReplyWS> =
      new SimpleChannel<QueryReplyWS>();

    let _complete = false;
    if (queryable_opts?.complete != undefined) {
      _complete = queryable_opts?.complete;
    };

    let callback_queryable = false;
    if (queryable_opts?.callback != undefined) {
      callback_queryable = true;
      let callback = queryable_opts?.callback;
      const callback_conversion = function (
        query_ws: QueryWS,
      ): void {
        let query: Query = QueryWS_to_Query(query_ws, reply_tx);

        callback(query);
      };
      remote_queryable = this.remote_session.declare_remote_queryable(
        _key_expr.toString(),
        _complete,
        reply_tx,
        callback_conversion,
      );
    } else {
      remote_queryable = this.remote_session.declare_remote_queryable(
        _key_expr.toString(),
        _complete,
        reply_tx,
      );
    }

    let queryable = new Queryable(remote_queryable, callback_queryable);
    return queryable;
  }

  /**
  * Declares a new Publisher
  *
  * @remarks
  *  If a Queryable is created with a callback, it cannot be simultaneously polled for new Query's
  * 
  * @param {IntoKeyExpr} keyexpr - string of key_expression
  * @param {PublisherOptions} publisher_opts - Optional, set of options to be used when declaring a publisher
  * @returns Publisher
  */
  declare_publisher(
    keyexpr: IntoKeyExpr,
    publisher_opts: PublisherOptions
  ): Publisher {
    let _key_expr: KeyExpr = new KeyExpr(keyexpr);

    let _express = publisher_opts?.express;

    let _priority;
    let priority = Priority.DATA;
    if (publisher_opts?.priority != null) {
      _priority = priority_to_int(publisher_opts?.priority);
      priority = publisher_opts?.priority;
    }

    let _congestion_control;
    let congestion_control = CongestionControl.DROP;
    if (publisher_opts?.congestion_control != null) {
      _congestion_control = congestion_control_to_int(publisher_opts?.congestion_control);
      congestion_control = publisher_opts?.congestion_control;
    }

    let _reliability = 0; // Default Reliable
    let reliability = Reliability.RELIABLE;
    if (publisher_opts?.reliability != null) {
      _reliability = reliability_to_int(publisher_opts?.reliability);
    }

    let _encoding = "";
    let encoding = Encoding.default();
    if (publisher_opts?.encoding != null) {
      _encoding = publisher_opts?.encoding.toString();
      encoding = publisher_opts?.encoding;
    }

    let remote_publisher: RemotePublisher =
      this.remote_session.declare_remote_publisher(
        _key_expr.toString(),
        _encoding,
        _congestion_control,
        _priority,
        _express,
        _reliability
      );

    let publisher: Publisher = new Publisher(
      remote_publisher,
      _key_expr,
      congestion_control,
      priority,
      reliability,
      encoding
    );
    return publisher;
  }
}

function isGetChannelClose(msg: any): msg is GetChannelClose {
  return msg === GetChannelClose.Disconnected;
}

// Type guard to check if channel_msg is of type ReplyWS
function isReplyWS(msg: any): msg is ReplyWS {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "query_uuid" in msg &&
    "result" in msg
  );
}

export enum RecvErr {
  Disconnected,
  MalformedReply,
}

/**
 * Receiver returned from `get` call on a session
 */
export class Receiver {
  /**
   * @ignore
   */
  private receiver: SimpleChannel<ReplyWS | RecvErr>;
  /**
   * @ignore
   */
  private constructor(receiver: SimpleChannel<ReplyWS | RecvErr>) {
    this.receiver = receiver;
  }

  /**
   *  Receives next Reply message from Zenoh `get`
   * 
   * @returns Reply
   */
  async receive(): Promise<Reply | RecvErr> {
    if (this.receiver.state == State.close) {
      return RecvErr.Disconnected;
    } else {
      let channel_msg: ReplyWS | RecvErr = await this.receiver.receive();

      if (isGetChannelClose(channel_msg)) {
        return RecvErr.Disconnected;
      } else if (isReplyWS(channel_msg)) {
        // Handle the ReplyWS case
        let opt_reply = new Reply(channel_msg);
        if (opt_reply == undefined) {
          return RecvErr.MalformedReply;
        } else {
          return opt_reply;
        }
      }
      return RecvErr.MalformedReply;
    }
  }

  /**
   *  Receiver gets created by `get` call
   * 
   * @ignore Reply
   */
  static new(reply_tx: SimpleChannel<ReplyWS>) {
    return new Receiver(reply_tx);
  }
}

/**
 *  Function to open a Zenoh session
 */
export function open(config: Config): Promise<Session> {
  return Session.open(config);
}
