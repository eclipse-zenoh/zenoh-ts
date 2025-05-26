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
import { KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { Sample } from "./sample.js";
import { Encoding, IntoEncoding } from "./encoding.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver } from "./channels.js";
import { SessionInner } from "./session_inner.js";
import { PublisherDelete, PublisherProperties, PublisherPut } from "./message.js";
import { CongestionControl, Priority, Reliability } from "./enums.js";


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
        private session: SessionInner,
        private id: number,
        private keyExpr_: KeyExpr,
        private receiver_?: ChannelReceiver<Sample>,
    ) { }

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
        await this.session.undeclareSubscriber(this.id);
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

/**
 * Class that represents a Zenoh Publisher, 
 * created by calling `Session.declarePublisher()`
 */
export class Publisher {
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
        private session: SessionInner,
        private publisherId: number,
        private properties: PublisherProperties,
    ) { }

    /**
     * gets the Key Expression from Publisher
     *
     * @returns {KeyExpr} instance
     */
    keyExpr(): KeyExpr {
        return this.properties.keyexpr;
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
        await this.session.publisherPut(
            new PublisherPut(
                this.publisherId,
                new ZBytes(payload),
                putOptions?.encoding ? Encoding.from(putOptions.encoding) : undefined,
                putOptions?.attachment ? new ZBytes(putOptions.attachment) : undefined,
                putOptions?.timestamp
            )
        );
    }

    /**
    * get Encoding declared for Publisher
    *   
    * @returns {Encoding}
    */
    encoding(): Encoding {
        return this.properties.encoding;
    }

    /**
    * get Priority declared for Publisher
    *   
    * @returns {Priority}
    */
    priority(): Priority {
        return this.properties.qos.priority;
    }

    /**
    * get Reliability declared for Publisher
    *   
    * @returns {Reliability}
    */
    reliability(): Reliability {
        return this.properties.qos.reliability;
    }

    /**
     * get Congestion Control declared for a Publisher
     *   
     * @returns {CongestionControl}
     */
    congestionControl(): CongestionControl {
        return this.properties.qos.congestionControl;
    }

    /**
     * 
     * executes delete on publisher
     * @param {PublisherDeleteOptions=} deleteOptions:  Options associated with a publishers delete
     * @returns void
     */
    async delete(deleteOptions?: PublisherDeleteOptions) {
        await this.session.publisherDelete(
            new PublisherDelete(
                this.publisherId,
                deleteOptions?.attachment ? new ZBytes(deleteOptions.attachment) : undefined,
                deleteOptions?.timestamp
            )
        )
    }

    /**
     * undeclares publisher
     *   
     * @returns void
     */
    async undeclare() {
        await this.session.undeclarePublisher(this.publisherId);
    }

}
