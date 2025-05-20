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
  RemoteSession,
  TimestampIface as TimestampIface,
} from "./remote_api/session.js";
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";
import { RemotePublisher, RemoteSubscriber } from "./remote_api/pubsub.js";
import { SampleWS } from "./remote_api/interface/SampleWS.js";
import { QueryWS } from "./remote_api/interface/QueryWS.js";
// API interface
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { Liveliness } from "./liveliness.js";
import {
  IntoSelector,
  Parameters,
  Query,
  QueryFromQueryWS,
  Queryable,
  Reply,
  ReplyFromReplyWS,
  Selector,
} from "./query.js";
import { NewSubscriber, Publisher, Subscriber } from "./pubsub.js";
import {
  priority_to_int,
  congestion_control_to_int,
  CongestionControl,
  Priority,
  Sample,
  SampleFromSampleWS,
  consolidation_mode_to_int,
  ConsolidationMode,
  Reliability,
  reliability_to_int,
} from "./sample.js";
import { Config } from "./config.js";
import { Encoding } from "./encoding.js";
import { SessionInfo as SessionInfoIface } from "./remote_api/interface/SessionInfo.js";
// External deps
import { Duration, TimeDuration } from 'typed-duration'
import { locality_to_int, Querier, QuerierOptions, query_target_to_int, QueryTarget, reply_key_expr_to_int, ReplyKeyExpr } from "./querier.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver, FifoChannel, Handler, into_cb_drop_receiver } from "./remote_api/channels.js";

/**
 * Options for a Put function 
 * @prop {Encoding=} encoding - encoding type 
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {Priority=} priority - priority of the written data
 * @prop {boolean=} express  - express 
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
 * @prop {Timestamp=} timestamp - Timestamp of the message
*/

export interface PutOptions {
  encoding?: Encoding,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  attachment?: IntoZBytes
  timestamp?: Timestamp,
}

/**
 * Options for a Delete function 
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {Priority=} priority - priority of the written data
 * @prop {boolean=} express  - Express 
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
 * @prop {Timestamp=} timestamp - Timestamp of the message
*/
export interface DeleteOptions {
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  attachment?: IntoZBytes
  timestamp?: Timestamp
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
 * @prop {TimeDuration=} timeout - Timeout value for a get request
 * @prop {Handler<Reply>} handler - A reply handler
*/
export interface GetOptions {
  consolidation?: ConsolidationMode,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  encoding?: Encoding,
  payload?: IntoZBytes,
  attachment?: IntoZBytes
  timeout?: TimeDuration,
  target?: QueryTarget,
  handler?: Handler<Reply>,
}

/**
 * Options for a Queryable
 * @prop complete - Change queryable completeness.
 * @prop callback - Callback function for this queryable
*/
export interface QueryableOptions {
  complete?: boolean,
  handler?: Handler<Query>
}

/**
 *  Set of options used when declaring a publisher
 * @prop {Encoding} encoding - Optional, Type of Encoding data to be sent over
 * @prop {CongestionControl} congestion_control - Optional, Type of Congestion control to be used (BLOCK / DROP)
 * @prop {Priority} priority - Optional, The Priority of zenoh messages
 * @prop {boolean} express - Optional, The Priority of zenoh messages
 * @prop {Reliability} reliability - Optional, The Priority of zenoh messages : Note This is unstable in Zenoh
 */
export interface PublisherOptions {
  encoding?: Encoding,
  congestion_control?: CongestionControl,
  priority?: Priority,
  express?: boolean,
  // Note realiability is unstable in Zenoh
  reliability?: Reliability,
}

/**
 * Options for a Subscriber
 * @prop handler - Handler for this subscriber
 */
export interface SubscriberOptions {
  handler?: Handler<Sample>,
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

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  private constructor(remote_session: RemoteSession) {
    this.remote_session = remote_session;
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
  }

  is_closed() {
    return this.remote_session.is_closed();
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
    let _timestamp;

    if (put_opts?.timestamp != undefined) {
      _timestamp = put_opts?.timestamp.get_resource_uuid() as string;
    }
    if (put_opts?.priority != undefined) {
      _priority = priority_to_int(put_opts?.priority);
    }
    _express = put_opts?.express?.valueOf();

    if (put_opts?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(put_opts?.attachment).to_bytes())
    }

    this.remote_session.put(
      key_expr.toString(),
      Array.from(z_bytes.to_bytes()),
      _encoding,
      _congestion_control,
      _priority,
      _express,
      _attachment,
      _timestamp,
    );
  }

  /**
   * Creates a Key Expression
   *
   * @returns KeyExpr
   */
  declare_keyexpr(key_expr: IntoKeyExpr): KeyExpr {
    return new KeyExpr(key_expr)
  }

  /**
   * Returns the Zenoh SessionInfo Object
   *
   * @returns SessionInfo
   */
  async info(): Promise<SessionInfo> {
    let session_info_iface: SessionInfoIface = await this.remote_session.info();

    let zid = new ZenohId(session_info_iface.zid);
    let z_peers = session_info_iface.z_peers.map(x => new ZenohId(x));
    let z_routers = session_info_iface.z_routers.map(x => new ZenohId(x));

    let session_info = new SessionInfo(zid, z_peers, z_routers);

    return session_info;
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
    let _attachment;
    let _timestamp;

    if (delete_opts?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(delete_opts?.attachment).to_bytes())
    }

    if (delete_opts?.timestamp != undefined) {
      _timestamp = delete_opts?.timestamp.get_resource_uuid() as string;
    }

    this.remote_session.delete(
      key_expr.toString(),
      _congestion_control,
      _priority,
      _express,
      _attachment,
      _timestamp
    );
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
    get_options?: GetOptions
  ): Promise<ChannelReceiver<Reply> | undefined> {

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

    let handler = get_options?.handler ?? new FifoChannel<Reply>(256);
    let [calback, drop, receiver] = into_cb_drop_receiver(handler);
    
    let callback_ws = (reply_ws: ReplyWS): void => {
      let reply: Reply = ReplyFromReplyWS(reply_ws);
      calback(reply);
    }
    // Optional Parameters 

    let _consolidation = consolidation_mode_to_int(get_options?.consolidation)
    let _encoding = get_options?.encoding?.toString();
    let _congestion_control = congestion_control_to_int(get_options?.congestion_control);
    let _priority = priority_to_int(get_options?.priority);
    let _express = get_options?.express;
    let _target = query_target_to_int(get_options?.target);
    let _attachment;
    let _payload;
    let _timeout_millis: number | undefined = undefined;

    if (get_options?.timeout !== undefined) {
      _timeout_millis = Duration.milliseconds.from(get_options?.timeout);
    }
    if (get_options?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(get_options?.attachment).to_bytes())
    }
    if (get_options?.payload != undefined) {
      _payload = Array.from(new ZBytes(get_options?.payload).to_bytes())
    }

    await this.remote_session.get(
      selector.key_expr().toString(),
      selector.parameters().toString(),
      callback_ws,
      drop,
      _consolidation,
      _congestion_control,
      _priority,
      _express,
      _target,
      _encoding,
      _payload,
      _attachment,
      _timeout_millis
    );

    return receiver;
  }

  /**
   * Declares a new subscriber
   *
   * @remarks
   *  If a Subscriber is created with a callback, it cannot be simultaneously polled for new values
   * 
   * @param {IntoKeyExpr} key_expr - string of key_expression
   * @param {SubscriberOptions} subscriber_opts - Options for the subscriber, including a handler
   *
   * @returns Subscriber
   */
  // Handler size : This is to match the API_DATA_RECEPTION_CHANNEL_SIZE of zenoh internally
  async declare_subscriber(
    key_expr: IntoKeyExpr,
    subscriber_opts?: SubscriberOptions
  ): Promise<Subscriber> {
    let _key_expr = new KeyExpr(key_expr);
    let remote_subscriber: RemoteSubscriber;

    let handler = subscriber_opts?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callback_ws = (sample_ws: SampleWS): void => {
      let sample: Sample = SampleFromSampleWS(sample_ws);
      callback(sample);
    }

    remote_subscriber = await this.remote_session.declare_remote_subscriber(
      _key_expr.toString(),
      callback_ws,
      drop
    );

    let subscriber = Subscriber[NewSubscriber](
      remote_subscriber,
      _key_expr,
      receiver,
    );

    return subscriber;
  }

  /**
   * Obtain a Liveliness struct tied to this Zenoh Session.
   * 
   * @returns Liveliness
   */
  liveliness(): Liveliness {
    return new Liveliness(this.remote_session)
  }

  /**
   * Creates a new Timestamp instance
   * 
   * @returns Timestamp
   */
  async new_timestamp(): Promise<Timestamp> {

    let ts_iface: TimestampIface = await this.remote_session.new_timestamp();

    return new Timestamp(ts_iface.id, ts_iface.string_rep, ts_iface.millis_since_epoch);
  }

  /**
  * Declares a new Queryable
  * 
  * @param {IntoKeyExpr} key_expr - Queryable key expression
  * @param {QueryableOptions} queryable_opts - Optional additional settings for a Queryable [QueryableOptions]
  *
  * @returns Queryable
  */
  async declare_queryable(
    key_expr: IntoKeyExpr,
    queryable_opts?: QueryableOptions
  ): Promise<Queryable> {
    let _key_expr = new KeyExpr(key_expr);

    let _complete = false;
    if (queryable_opts?.complete != undefined) {
      _complete = queryable_opts?.complete;
    };

    let handler = queryable_opts?.handler ?? new FifoChannel<Query>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);
    
    let callback_ws = (query_ws: QueryWS): void => {
      let query = QueryFromQueryWS(query_ws, this.remote_session);
      callback(query);
    }

    let remote_queryable = await this.remote_session.declare_remote_queryable(
      _key_expr.toString(),
      _complete,
      callback_ws,
      drop
    );

    let queryable = new Queryable(remote_queryable, receiver);
    return queryable;
  }

  /**
  * Declares a new Publisher
  *
  * @remarks
  *  If a Queryable is created with a callback, it cannot be simultaneously polled for new Query's
  * 
  * @param {IntoKeyExpr} keyexpr - string of key_expression
  * @param {PublisherOptions=} publisher_opts - Optional, set of options to be used when declaring a publisher
  * @returns Publisher
  */
  async declare_publisher(
    keyexpr: IntoKeyExpr,
    publisher_opts?: PublisherOptions
  ): Promise<Publisher> {
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
      await this.remote_session.declare_remote_publisher(
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

  /**
  * Declares a Querier 
  * 
  * @param {IntoKeyExpr} keyexpr - string of key_expression
  * @param {QuerierOptions} publisher_opts - Optional, set of options to be used when declaring a publisher
  * @returns Publisher
  */
  async declare_querier(
    into_keyexpr: IntoKeyExpr,
    querier_opts: QuerierOptions,
  ): Promise<Querier> {
    const key_expr = new KeyExpr(into_keyexpr);

    // Optional Parameters 
    let _priority;
    let priority = Priority.DATA;
    if (querier_opts?.priority != null) {
      _priority = priority_to_int(querier_opts?.priority);
      priority = querier_opts?.priority;
    }

    let _congestion_control;
    let congestion_control = CongestionControl.DROP;
    if (querier_opts?.congestion_control != null) {
      _congestion_control = congestion_control_to_int(querier_opts?.congestion_control);
      congestion_control = querier_opts?.congestion_control;
    }

    let _accept_replies;
    let accept_replies = ReplyKeyExpr.Any;
    if (querier_opts?.accept_replies != null) {
      _accept_replies = reply_key_expr_to_int(querier_opts?.accept_replies);
      accept_replies = querier_opts?.accept_replies;
    }

    let _consolidation = consolidation_mode_to_int(querier_opts?.consolidation);
    let _target = query_target_to_int(querier_opts?.target);
    let _allowed_destination = locality_to_int(querier_opts?.allowed_destination);
    let _express = querier_opts?.express;
    let _timeout_millis: number | undefined = undefined;

    if (querier_opts?.timeout !== undefined) {
      _timeout_millis = Duration.milliseconds.from(querier_opts?.timeout);
    }

    let remote_querier = await this.remote_session.declare_remote_querier(
      key_expr.toString(),
      _consolidation,
      _congestion_control,
      _priority,
      _express,
      _target,
      _allowed_destination,
      _accept_replies,
      _timeout_millis,
    );

    return new Querier(
      remote_querier,
      key_expr,
      congestion_control,
      priority,
      accept_replies,
    );
  }
}

export enum RecvErr {
  Disconnected,
  MalformedReply,
}

/**
 *  Function to open a Zenoh session
 */
export function open(config: Config): Promise<Session> {
  return Session.open(config);
}

/**
 *  Struct to expose Info for your Zenoh Session
 */
export class SessionInfo {
  private _zid: ZenohId
  private _routers: ZenohId[]
  private _peers: ZenohId[]

  constructor(
    zid: ZenohId,
    peers: ZenohId[],
    routers: ZenohId[],
  ) {
    this._zid = zid;
    this._routers = routers;
    this._peers = peers;
  }

  zid(): ZenohId {
    return this._zid;
  }
  routers_zid(): ZenohId[] {
    return this._routers;
  }
  peers_zid(): ZenohId[] {
    return this._peers;
  }
}

export class ZenohId {
  private zid: string

  constructor(zid: string) {
    this.zid = zid;
  }

  toString(): string {
    return this.zid;
  }
}