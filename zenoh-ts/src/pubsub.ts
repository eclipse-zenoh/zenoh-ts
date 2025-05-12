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

// Remote API
import { RemoteSubscriber, RemotePublisher } from "./remote_api/pubsub.js";

// API
import { KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import {
  CongestionControl,
  Priority,
  Reliability,
  Sample,
} from "./sample.js";
import { Encoding, IntoEncoding } from "./encoding.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver, Drop } from "./remote_api/channels.js";


// ███████ ██    ██ ██████  ███████  ██████ ██████  ██ ██████  ███████ ██████
// ██      ██    ██ ██   ██ ██      ██      ██   ██ ██ ██   ██ ██      ██   ██
// ███████ ██    ██ ██████  ███████ ██      ██████  ██ ██████  █████   ██████
//      ██ ██    ██ ██   ██      ██ ██      ██   ██ ██ ██   ██ ██      ██   ██
// ███████  ██████  ██████  ███████  ██████ ██   ██ ██ ██████  ███████ ██   ██


export const NewSubscriber = Symbol();
/**
 * Class to represent a Subscriber on Zenoh, 
 * created via calling `declare_subscriber()` on a `session`
 */

export class Subscriber {
  /**
   * @ignore 
   */
  private remote_subscriber: RemoteSubscriber;
  /**
   * @ignore 
   */
  private _key_expr: KeyExpr;
  /**
   * @ignore 
   */
  private _receiver: ChannelReceiver<Sample> | undefined;
  /**
   * @ignore 
   */
  private _drop: Drop;
  /** Finalization registry used for cleanup on drop
   * @ignore 
   */
  static registry: FinalizationRegistry<RemoteSubscriber> = new FinalizationRegistry((r_subscriber: RemoteSubscriber) => r_subscriber.undeclare());
  /**
   * @ignore 
   */
  async [Symbol.asyncDispose]() {
    await this.undeclare();
    Subscriber.registry.unregister(this);
  }
  /**
   * @ignore 
   */
  private constructor(
    remote_subscriber: RemoteSubscriber,
    key_expr: KeyExpr,
    drop: Drop,
    receiver?: ChannelReceiver<Sample>,
  ) {
    this.remote_subscriber = remote_subscriber;
    this._receiver = receiver;
    this._key_expr = key_expr;
    this._drop = drop;
    Subscriber.registry.register(this, remote_subscriber, this)
  }

  /**
   * returns the key expression of an object
   * @returns KeyExpr
   */
  key_expr(): KeyExpr {
    return this._key_expr
  }
  /**
   * returns a sample receiver for non-callback subscriber, undefined otherwise.
   *
   * @returns ChannelReceiver<Sample> | undefined
   */
  receiver(): ChannelReceiver<Sample> | undefined {
    return this._receiver;
  }

  /**
   * Undeclares a subscriber on the session
   *
   */
  async undeclare() {
    await this.remote_subscriber.undeclare();
    Subscriber.registry.unregister(this);
    this._drop;
  }

  /**
   * Create a new subscriber, 
   * note : This function should never be called directly by the user
   * please use `declare_subscriber` on a session to create a subscriber
   * @ignore
   */
  static [NewSubscriber](
    remote_subscriber: RemoteSubscriber,
    key_expr: KeyExpr,
    drop: Drop,
    receiver?: ChannelReceiver<Sample>,
  ): Subscriber {
    return new Subscriber(remote_subscriber, key_expr, drop, receiver);
  }
}

// ██████  ██    ██ ██████  ██      ██ ███████ ██   ██ ███████ ██████
// ██   ██ ██    ██ ██   ██ ██      ██ ██      ██   ██ ██      ██   ██
// ██████  ██    ██ ██████  ██      ██ ███████ ███████ █████   ██████
// ██      ██    ██ ██   ██ ██      ██      ██ ██   ██ ██      ██   ██
// ██       ██████  ██████  ███████ ██ ███████ ██   ██ ███████ ██   ██

/**
 * @param {IntoEncoding=} encoding  - Encoding parameter for Zenoh data
 * @param {IntoZBytes=} attachment - optional extra data to send with Payload
 */
export interface PublisherPutOptions {
  encoding?: IntoEncoding,
  attachment?: IntoZBytes,
  timestamp?: Timestamp;
}

/**
 * @param {IntoZBytes=} attachment - optional extra data to send with Payload
 */
export interface PublisherDeleteOptions {
  attachment?: IntoZBytes,
  timestamp?: Timestamp
}

export class Publisher {
  /**
   * Class that represents a Zenoh Publisher, 
   * created by calling `declare_publisher()` on a `session`
   */
  private _remote_publisher: RemotePublisher;
  private _key_expr: KeyExpr;
  private _congestion_control: CongestionControl;
  private _priority: Priority;
  private _reliability: Reliability;
  private _encoding: Encoding;
  /** Finalization registry used for cleanup on drop
   * @ignore 
   */
  static registry: FinalizationRegistry<RemotePublisher> = new FinalizationRegistry((r_publisher: RemotePublisher) => r_publisher.undeclare());

  /** 
   * @ignore 
   */
  async [Symbol.asyncDispose]() {
    await this.undeclare();
    Publisher.registry.unregister(this);
  }

  /**
   * Creates a new Publisher on a session
   *  Note: this should never be called directly by the user. 
   *  please use `declare_publisher` on a session.
   * 
   * @param {KeyExpr} key_expr -  A Key Expression
   * @param {RemotePublisher} remote_publisher -  A Session to create the publisher on
   * @param {CongestionControl} congestion_control -  Congestion control 
   * @param {Priority} priority -  Priority for Zenoh Data
   * @param {Reliability} reliability - Reliability for publishing data
   * 
   * @returns {Publisher} a new  instance of a publisher 
   * 
   */
  constructor(
    remote_publisher: RemotePublisher,
    key_expr: KeyExpr,
    congestion_control: CongestionControl,
    priority: Priority,
    reliability: Reliability,
    encoding: Encoding,
  ) {
    this._remote_publisher = remote_publisher;
    this._key_expr = key_expr;
    this._congestion_control = congestion_control;
    this._priority = priority;
    this._reliability = reliability;
    this._encoding = encoding;

    Publisher.registry.register(this, remote_publisher, this)
  }

  /**
   * gets the Key Expression from Publisher
   *
   * @returns {KeyExpr} instance
   */
  key_expr(): KeyExpr {
    return this._key_expr;
  }

  /**
   * Puts a payload on the publisher associated with this class instance
   *
   * @param {IntoZBytes} payload
   * @param {PublisherPutOptions} put_options
   *
   * @returns void
   */
  async put(
    payload: IntoZBytes,
    put_options?: PublisherPutOptions,
  ) {
    let zbytes: ZBytes = new ZBytes(payload);
    let _encoding;
    let _timestamp = null;
    if (put_options?.timestamp != null) {
      _timestamp = put_options.timestamp.get_resource_uuid() as unknown as string;
    }

    if (put_options?.encoding != null) {
      _encoding = Encoding.from_string(put_options.encoding.toString());
    } else {
      _encoding = Encoding.default();
    }

    let _attachment = null;
    if (put_options?.attachment != null) {
      let att_bytes = new ZBytes(put_options.attachment);
      _attachment = Array.from(att_bytes.to_bytes());
    }

    return await this._remote_publisher.put(
      Array.from(zbytes.to_bytes()),
      _attachment,
      _encoding.toString(),
      _timestamp,
    );
  }

  /**
  * get Encoding declared for Publisher
  *   
  * @returns {Encoding}
  */
  encoding(): Encoding {
    return this._encoding;
  }

  /**
  * get Priority declared for Publisher
  *   
  * @returns {Priority}
  */
  priority(): Priority {
    return this._priority;
  }

  /**
  * get Reliability declared for Publisher
  *   
  * @returns {Reliability}
  */
  reliability(): Reliability {
    return this._reliability;
  }

  /**
   * get Congestion Control for a Publisher
   *   
   * @returns {CongestionControl}
   */
  congestion_control(): CongestionControl {
    return this._congestion_control;
  }

  /**
   * 
   * executes delete on publisher
   * @param {PublisherDeleteOptions} delete_options:  Options associated with a publishers delete
   * @returns void
   */
  async delete(delete_options: PublisherDeleteOptions) {

    let _attachment = null;
    if (delete_options.attachment != null) {
      let att_bytes = new ZBytes(delete_options.attachment);
      _attachment = Array.from(att_bytes.to_bytes());
    }

    let _timestamp = null;
    if (delete_options.timestamp != null) {
      _timestamp = delete_options.timestamp.get_resource_uuid() as unknown as string;
    }

    return await this._remote_publisher.delete(
      _attachment,
      _timestamp
    );
  }

  /**
   * undeclares publisher
   *   
   * @returns void
   */
  async undeclare() {
    await this._remote_publisher.undeclare();
    Publisher.registry.unregister(this);
  }

}
