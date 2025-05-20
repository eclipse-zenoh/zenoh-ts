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
import { ChannelReceiver } from "./remote_api/channels.js";


// ███████ ██    ██ ██████  ███████  ██████ ██████  ██ ██████  ███████ ██████
// ██      ██    ██ ██   ██ ██      ██      ██   ██ ██ ██   ██ ██      ██   ██
// ███████ ██    ██ ██████  ███████ ██      ██████  ██ ██████  █████   ██████
//      ██ ██    ██ ██   ██      ██ ██      ██   ██ ██ ██   ██ ██      ██   ██
// ███████  ██████  ██████  ███████  ██████ ██   ██ ██ ██████  ███████ ██   ██


/**
 * Class to represent a Subscriber on Zenoh, 
 * created via calling `declare_subscriber()` on a `session`
 */

export class Subscriber {
  /**
   * @ignore 
   */
  async [Symbol.asyncDispose]() {
    await this.undeclare();
  }
  /**
   * @ignore 
   */
  constructor(
    private remoteSubscriber: RemoteSubscriber,
    private keyExpr_: KeyExpr,
    private receiver_?: ChannelReceiver<Sample>,
  ) {}

  /**
   * returns the key expression of an object
   * @returns KeyExpr
   */
  keyExpr(): KeyExpr {
    return this.keyExpr_
  }
  /**
   * returns a sample receiver for non-callback subscriber, undefined otherwise.
   *
   * @returns ChannelReceiver<Sample> | undefined
   */
  receiver(): ChannelReceiver<Sample> | undefined {
    return this.receiver_;
  }

  /**
   * Undeclares a subscriber on the session
   *
   */
  async undeclare() {
    await this.remoteSubscriber.undeclare();
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

  /** 
   * @ignore 
   */
  async [Symbol.asyncDispose]() {
    await this.undeclare();
  }

  /**
   * @ignore 
   * 
   * Creates a new Publisher on a session
   *  Note: this should never be called directly by the user. 
   *  please use `declare_publisher` on a session.
   * 
   * @param {KeyExpr} keyExpr_ -  A Key Expression
   * @param {RemotePublisher} remotePublisher -  A Session to create the publisher on
   * @param {CongestionControl} congestionControl_ -  Congestion control 
   * @param {Priority} priority_ -  Priority for Zenoh Data
   * @param {Reliability} reliability_ - Reliability for publishing data
   * 
   * @returns {Publisher} a new  instance of a publisher 
   * 
   */
  constructor(
    private remotePublisher: RemotePublisher,
    private keyExpr_: KeyExpr,
    private congestionControl_: CongestionControl,
    private priority_: Priority,
    private reliability_: Reliability,
    private encoding_: Encoding,
  ) {}

  /**
   * gets the Key Expression from Publisher
   *
   * @returns {KeyExpr} instance
   */
  keyExpr(): KeyExpr {
    return this.keyExpr_;
  }

  /**
   * Puts a payload on the publisher associated with this class instance
   *
   * @param {IntoZBytes} payload
   * @param {PublisherPutOptions} putOptions
   *
   * @returns void
   */
  async put(
    payload: IntoZBytes,
    putOptions?: PublisherPutOptions,
  ) {
    let zbytes: ZBytes = new ZBytes(payload);
    let encoding;
    let timestamp = null;
    if (putOptions?.timestamp != null) {
      timestamp = putOptions.timestamp.getResourceUuid() as unknown as string;
    }

    if (putOptions?.encoding != null) {
      encoding = Encoding.fromString(putOptions.encoding.toString());
    } else {
      encoding = Encoding.default();
    }

    let attachment = null;
    if (putOptions?.attachment != null) {
      let attBytes = new ZBytes(putOptions.attachment);
      attachment = Array.from(attBytes.toBytes());
    }

    return await this.remotePublisher.put(
      Array.from(zbytes.toBytes()),
      attachment,
      encoding.toString(),
      timestamp,
    );
  }

  /**
  * get Encoding declared for Publisher
  *   
  * @returns {Encoding}
  */
  encoding(): Encoding {
    return this.encoding_;
  }

  /**
  * get Priority declared for Publisher
  *   
  * @returns {Priority}
  */
  priority(): Priority {
    return this.priority_;
  }

  /**
  * get Reliability declared for Publisher
  *   
  * @returns {Reliability}
  */
  reliability(): Reliability {
    return this.reliability_;
  }

  /**
   * get Congestion Control for a Publisher
   *   
   * @returns {CongestionControl}
   */
  congestionControl(): CongestionControl {
    return this.congestionControl_;
  }

  /**
   * 
   * executes delete on publisher
   * @param {PublisherDeleteOptions} deleteOptions:  Options associated with a publishers delete
   * @returns void
   */
  async delete(deleteOptions: PublisherDeleteOptions) {

    let attachment = null;
    if (deleteOptions.attachment != null) {
      let attBytes = new ZBytes(deleteOptions.attachment);
      attachment = Array.from(attBytes.toBytes());
    }

    let timestamp = null;
    if (deleteOptions.timestamp != null) {
      timestamp = deleteOptions.timestamp.getResourceUuid() as unknown as string;
    }

    return await this.remotePublisher.delete(
      attachment,
      timestamp
    );
  }

  /**
   * undeclares publisher
   *   
   * @returns void
   */
  async undeclare() {
    await this.remotePublisher.undeclare();
  }

}
