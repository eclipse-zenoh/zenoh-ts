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
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { KeyExpr } from "./key_expr.js";
import { IntoParameters, Parameters, Reply } from "./query.js";
import { ChannelReceiver, FifoChannel, Handler, intoCbDropReceiver } from "./channels.js";
import { Encoding, IntoEncoding } from "./encoding.js";
import { SessionInner } from "./session_inner.js";
import { CongestionControl, Priority, ReplyKeyExpr } from "./enums.js";

/**
 * Options for a Querier Get operation 
 * @prop {IntoParameters=} parameters - Optional query parameters
 * @prop {IntoEncoding=} encoding - Encoding type of payload 
 * @prop {IntoZBytes=} payload - Payload associated with the query
 * @prop {IntoZBytes=} attachment - Additional Data sent with the query
 * @prop {Handler<Reply>=} handler - A reply handler
*/
export interface QuerierGetOptions {
    parameters?: IntoParameters,
    encoding?: IntoEncoding,
    payload?: IntoZBytes,
    attachment?: IntoZBytes,
    handler?: Handler<Reply>
}

/**
 * Queryable class used to receive Query's from the network and handle Reply's
 * created by Session.declare_queryable
 */
export class Querier {
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
        private querierId: number,
        private keyExpr_: KeyExpr,
        private congestionControl_: CongestionControl,
        private priority_: Priority,
        private acceptReplies_: ReplyKeyExpr,
    ) { }

    /**
     * Undeclares Queryable
     * @returns void
     */
    async undeclare() {
        await this.session.undeclareQuerier(this.querierId);
    }

    /**
     * returns key expression for this Querier
     * @returns KeyExpr
     */
    keyExpr() {
        return this.keyExpr_;
    }

    /**
     * returns Congestion Control for this Querier
     * @returns CongestionControl
     */
    congestionControl() {
        return this.congestionControl_;
    }

    /**
     * returns Priority for this Querier
     * @returns Priority
     */
    priority() {
        return this.priority_;
    }

    /**
     * returns ReplyKeyExpr for this Querier
     * @returns ReplyKeyExpr
     */
    acceptReplies() {
        return this.acceptReplies_;
    }

    /**
     * Issue a Get request on this querier
     * @returns Promise <Receiever | void>
     */
    async get(getOpts?: QuerierGetOptions): Promise<ChannelReceiver<Reply> | undefined> {

        let handler = getOpts?.handler ?? new FifoChannel<Reply>(256);
        let [callback, drop, receiver] = intoCbDropReceiver(handler);

        await this.session.querierGet(
            {
                querierId: this.querierId,
                parameters: getOpts?.parameters ? new Parameters(getOpts.parameters).toString() : "",
                payload: getOpts?.payload ? new ZBytes(getOpts.payload) : undefined,
                encoding: getOpts?.encoding ? Encoding.from(getOpts.encoding) : undefined,
                attachment: getOpts?.attachment ? new ZBytes(getOpts.attachment) : undefined,
            },
            { callback, drop }
        );
        return receiver;
    }
}
