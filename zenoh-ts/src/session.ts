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
  queryFromQueryWS,
  Queryable,
  Reply,
  replyFromReplyWS,
  Selector,
} from "./query.js";
import { Publisher, Subscriber } from "./pubsub.js";
import {
  priorityToInt,
  congestionControlToInt,
  CongestionControl,
  Priority,
  Sample,
  sampleFromSampleWS,
  consolidationModeToInt,
  ConsolidationMode,
  Reliability,
  reliabilityToInt,
} from "./sample.js";
import { Config } from "./config.js";
import { Encoding } from "./encoding.js";
import { SessionInfo as SessionInfoIface } from "./remote_api/interface/SessionInfo.js";
// External deps
import { Duration, TimeDuration } from 'typed-duration'
import { localityToInt, Querier, QuerierOptions, queryTargetToInt, QueryTarget, replyKeyExprToInt, ReplyKeyExpr } from "./querier.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver, FifoChannel, Handler, intoCbDropReceiver } from "./remote_api/channels.js";

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
  congestionControl?: CongestionControl,
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
  congestionControl?: CongestionControl,
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
  congestionControl?: CongestionControl,
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
  congestionControl?: CongestionControl,
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
  async [Symbol.asyncDispose]() {
    await this.close();
  }

  private constructor(
    // WebSocket Backend
    private remoteSession: RemoteSession
  ) {}

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
    let remoteSession = await RemoteSession.new(config.locator);
    return new Session(remoteSession);
  }

  /**
   * Closes a session, cleaning up the resource in Zenoh
   *
   * @returns Nothing
   */
  async close() {
    this.remoteSession.close();
  }

  isClosed() {
    return this.remoteSession.isClosed();
  }
  /**
   * Puts a value on the session, on a specific key expression KeyExpr
   *
   * @param {IntoKeyExpr} intoKeyExpr - something that implements intoKeyExpr
   * @param {IntoZBytes} intoZBytes - something that implements intoValue
   * @param {PutOptions=} putOpts - an interface for the options settings on puts 
   * @returns void
   */
  put(
    intoKeyExpr: IntoKeyExpr,
    intoZBytes: IntoZBytes,
    putOpts?: PutOptions,
  ): void {
    let keyExpr = new KeyExpr(intoKeyExpr);
    let zBytes = new ZBytes(intoZBytes);

    let priority;
    let express;
    let attachment;
    let encoding = putOpts?.encoding?.toString()
    let congestionControl = congestionControlToInt(putOpts?.congestionControl);
    let timestamp;

    if (putOpts?.timestamp != undefined) {
      timestamp = putOpts?.timestamp.getResourceUuid() as string;
    }
    if (putOpts?.priority != undefined) {
      priority = priorityToInt(putOpts?.priority);
    }
    express = putOpts?.express?.valueOf();

    if (putOpts?.attachment != undefined) {
      attachment = Array.from(new ZBytes(putOpts?.attachment).toBytes())
    }

    this.remoteSession.put(
      keyExpr.toString(),
      Array.from(zBytes.toBytes()),
      encoding,
      congestionControl,
      priority,
      express,
      attachment,
      timestamp,
    );
  }

  /**
   * Creates a Key Expression
   *
   * @returns KeyExpr
   */
  declareKeyexpr(intoKeyExpr: IntoKeyExpr): KeyExpr {
    return new KeyExpr(intoKeyExpr)
  }

  /**
   * Returns the Zenoh SessionInfo Object
   *
   * @returns SessionInfo
   */
  async info(): Promise<SessionInfo> {
    let sessionInfoIface: SessionInfoIface = await this.remoteSession.info();

    let zid = new ZenohId(sessionInfoIface.zid);
    let zPeers = sessionInfoIface.z_peers.map(x => new ZenohId(x));
    let zRouters = sessionInfoIface.z_routers.map(x => new ZenohId(x));

    let sessionInfo = new SessionInfo(zid, zPeers, zRouters);

    return sessionInfo;
  }

  /**
   * Executes a Delete on a session, for a specific key expression KeyExpr
   *
   * @param {IntoKeyExpr} intoKeyExpr - something that implements intoKeyExpr
   * @param {DeleteOptions} deleteOpts - optional additional parameters to go with a delete function
   *
   * @returns void
   */
  delete(
    intoKeyExpr: IntoKeyExpr,
    deleteOpts?: DeleteOptions
  ): void {
    let keyExpr = new KeyExpr(intoKeyExpr);
    let congestionControl = congestionControlToInt(deleteOpts?.congestionControl);
    let priority = priorityToInt(deleteOpts?.priority);
    let express = deleteOpts?.express;
    let attachment;
    let timestamp;

    if (deleteOpts?.attachment != undefined) {
      attachment = Array.from(new ZBytes(deleteOpts?.attachment).toBytes())
    }

    if (deleteOpts?.timestamp != undefined) {
      timestamp = deleteOpts?.timestamp.getResourceUuid() as string;
    }

    this.remoteSession.delete(
      keyExpr.toString(),
      congestionControl,
      priority,
      express,
      attachment,
      timestamp
    );
  }

  /**
   * Issues a get query on a Zenoh session
   *
   * @param intoSelector - representing a KeyExpr and Parameters
   *
   * @returns Receiver
   */
  async get(
    intoSelector: IntoSelector,
    getOptions?: GetOptions
  ): Promise<ChannelReceiver<Reply> | undefined> {

    let selector: Selector;
    let keyExpr: KeyExpr;

    if (typeof intoSelector === "string" || intoSelector instanceof String) {
      let splitString = intoSelector.split("?")
      if (splitString.length == 1) {
        keyExpr = new KeyExpr(intoSelector);
        selector = new Selector(keyExpr);
      } else if (splitString.length == 2 && splitString[0] != undefined && splitString[1] != undefined) {
        keyExpr = new KeyExpr(splitString[0]);
        let parameters: Parameters = new Parameters(splitString[1]);
        selector = new Selector(keyExpr, parameters);
      } else {
        throw "Error: Invalid Selector, expected format <KeyExpr>?<Parameters>";
      }
    } else {
      selector = new Selector(intoSelector);
    }

    let handler = getOptions?.handler ?? new FifoChannel<Reply>(256);
    let [calback, drop, receiver] = intoCbDropReceiver(handler);
    
    let callbackWS = (replyWS: ReplyWS): void => {
      let reply: Reply = replyFromReplyWS(replyWS);
      calback(reply);
    }
    // Optional Parameters 

    let consolidation = consolidationModeToInt(getOptions?.consolidation)
    let encoding = getOptions?.encoding?.toString();
    let congestionControl = congestionControlToInt(getOptions?.congestionControl);
    let priority = priorityToInt(getOptions?.priority);
    let express = getOptions?.express;
    let target = queryTargetToInt(getOptions?.target);
    let attachment;
    let payload;
    let timeoutMillis: number | undefined = undefined;

    if (getOptions?.timeout !== undefined) {
      timeoutMillis = Duration.milliseconds.from(getOptions?.timeout);
    }
    if (getOptions?.attachment != undefined) {
      attachment = Array.from(new ZBytes(getOptions?.attachment).toBytes())
    }
    if (getOptions?.payload != undefined) {
      payload = Array.from(new ZBytes(getOptions?.payload).toBytes())
    }

    await this.remoteSession.get(
      selector.keyExpr().toString(),
      selector.parameters().toString(),
      callbackWS,
      drop,
      consolidation,
      congestionControl,
      priority,
      express,
      target,
      encoding,
      payload,
      attachment,
      timeoutMillis
    );

    return receiver;
  }

  /**
   * Declares a new subscriber
   *
   * @remarks
   *  If a Subscriber is created with a callback, it cannot be simultaneously polled for new values
   * 
   * @param {IntoKeyExpr} intoKeyExpr - key expression as a string or KeyExpr instance
   * @param {SubscriberOptions} subscriberOpts - Options for the subscriber, including a handler
   *
   * @returns Subscriber
   */
  // Handler size : This is to match the API_DATA_RECEPTION_CHANNEL_SIZE of zenoh internally
  async declareSubscriber(
    intoKeyExpr: IntoKeyExpr,
    subscriberOpts?: SubscriberOptions
  ): Promise<Subscriber> {
    let keyExpr = new KeyExpr(intoKeyExpr);
    let remoteSubscriber: RemoteSubscriber;

    let handler = subscriberOpts?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = intoCbDropReceiver(handler);

    let callbackWS = (sampleWS: SampleWS): void => {
      let sample: Sample = sampleFromSampleWS(sampleWS);
      callback(sample);
    }

    remoteSubscriber = await this.remoteSession.declareRemoteSubscriber(
      intoKeyExpr.toString(),
      callbackWS,
      drop
    );

    let subscriber = new Subscriber(
      remoteSubscriber,
      keyExpr,
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
    return new Liveliness(this.remoteSession)
  }

  /**
   * Creates a new Timestamp instance
   * 
   * @returns Timestamp
   */
  async newTimestamp(): Promise<Timestamp> {

    let tsIface: TimestampIface = await this.remoteSession.newTimestamp();

    return new Timestamp(tsIface.id, tsIface.string_rep, tsIface.millis_since_epoch);
  }

  /**
  * Declares a new Queryable
  * 
  * @param {IntoKeyExpr} intoKeyExpr - Queryable key expression
  * @param {QueryableOptions} queryableOpts - Optional additional settings for a Queryable [QueryableOptions]
  *
  * @returns Queryable
  */
  async declareQueryable(
    intoKeyExpr: IntoKeyExpr,
    queryableOpts?: QueryableOptions
  ): Promise<Queryable> {
    let keyExpr = new KeyExpr(intoKeyExpr);

    let complete = false;
    if (queryableOpts?.complete != undefined) {
      complete = queryableOpts?.complete;
    };

    let handler = queryableOpts?.handler ?? new FifoChannel<Query>(256);
    let [callback, drop, receiver] = intoCbDropReceiver(handler);
    
    let callbackWS = (queryWS: QueryWS): void => {
      let query = queryFromQueryWS(queryWS, this.remoteSession);
      callback(query);
    }

    let remoteQueryable = await this.remoteSession.declareRemoteQueryable(
      keyExpr.toString(),
      complete,
      callbackWS,
      drop
    );

    let queryable = new Queryable(remoteQueryable, receiver);
    return queryable;
  }

  /**
  * Declares a new Publisher
  *
  * @remarks
  *  If a Queryable is created with a callback, it cannot be simultaneously polled for new Query's
  * 
  * @param {IntoKeyExpr} intoKeyExpr - string of key_expression
  * @param {PublisherOptions=} publisherOpts - Optional, set of options to be used when declaring a publisher
  * @returns Publisher
  */
  async declarePublisher(
    intoKeyExpr: IntoKeyExpr,
    publisherOpts?: PublisherOptions
  ): Promise<Publisher> {
    let keyExpr: KeyExpr = new KeyExpr(intoKeyExpr);

    let express = publisherOpts?.express;

    let priorityRemote;
    let priority = Priority.DATA;
    if (publisherOpts?.priority != null) {
      priorityRemote = priorityToInt(publisherOpts?.priority);
      priority = publisherOpts?.priority;
    }

    let congestionControlRemote;
    let congestionControl = CongestionControl.DROP;
    if (publisherOpts?.congestionControl != null) {
      congestionControlRemote = congestionControlToInt(publisherOpts?.congestionControl);
      congestionControl = publisherOpts?.congestionControl;
    }

    let reliabilityRemote = 0; // Default Reliable
    let reliability = Reliability.RELIABLE;
    if (publisherOpts?.reliability != null) {
      reliabilityRemote = reliabilityToInt(publisherOpts?.reliability);
    }

    let encodingRemote = "";
    let encoding = Encoding.default();
    if (publisherOpts?.encoding != null) {
      encodingRemote = publisherOpts?.encoding.toString();
      encoding = publisherOpts?.encoding;
    }

    let remotePublisher: RemotePublisher =
      await this.remoteSession.declareRemotePublisher(
        keyExpr.toString(),
        encodingRemote,
        congestionControlRemote,
        priorityRemote,
        express,
        reliabilityRemote
      );

    let publisher: Publisher = new Publisher(
      remotePublisher,
      keyExpr,
      congestionControl,
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
  async declareQuerier(
    intoKeyexpr: IntoKeyExpr,
    querierOpts: QuerierOptions,
  ): Promise<Querier> {
    const keyExpr = new KeyExpr(intoKeyexpr);

    // Optional Parameters 
    let priorityRemote;
    let priority = Priority.DATA;
    if (querierOpts?.priority != null) {
      priorityRemote = priorityToInt(querierOpts?.priority);
      priority = querierOpts?.priority;
    }

    let congestionControlRemote;
    let congestionControl = CongestionControl.DROP;
    if (querierOpts?.congestionControl != null) {
      congestionControlRemote = congestionControlToInt(querierOpts?.congestionControl);
      congestionControl = querierOpts?.congestionControl;
    }

    let acceptRepliesRemote;
    let acceptReplies = ReplyKeyExpr.Any;
    if (querierOpts?.acceptReplies != null) {
      acceptRepliesRemote = replyKeyExprToInt(querierOpts?.acceptReplies);
      acceptReplies = querierOpts?.acceptReplies;
    }

    let consolidation = consolidationModeToInt(querierOpts?.consolidation);
    let target = queryTargetToInt(querierOpts?.target);
    let allowedDestination = localityToInt(querierOpts?.allowedDestination);
    let express = querierOpts?.express;
    let timeoutMillis: number | undefined = undefined;

    if (querierOpts?.timeout !== undefined) {
      timeoutMillis = Duration.milliseconds.from(querierOpts?.timeout);
    }

    let remoteQuerier = await this.remoteSession.declareRemoteQuerier(
      keyExpr.toString(),
      consolidation,
      congestionControlRemote,
      priorityRemote,
      express,
      target,
      allowedDestination,
      acceptRepliesRemote,
      timeoutMillis,
    );

    return new Querier(
      remoteQuerier,
      keyExpr,
      congestionControl,
      priority,
      acceptReplies,
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
  constructor(
    private zid_: ZenohId,
    private peers_: ZenohId[],
    private routers_: ZenohId[],
  ) {}

  zid(): ZenohId {
    return this.zid_;
  }
  routersZid(): ZenohId[] {
    return this.routers_;
  }
  peersZid(): ZenohId[] {
    return this.peers_;
  }
}

export class ZenohId {
  constructor(private zid: string) {}

  toString(): string {
    return this.zid;
  }
}