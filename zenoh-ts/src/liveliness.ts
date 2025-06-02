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

import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { Sample } from "./sample.js";
import { Reply } from "./query.js";

import { Subscriber } from "./pubsub.js";
import { Duration, TimeDuration } from 'typed-duration'
import { ChannelReceiver, FifoChannel, Handler, intoCbDropReceiver } from "./channels.js";
import { SessionInner } from "./session_inner.js";
import { DEFAULT_QUERY_TIMEOUT_MS } from "./session.js";

/**
 * Options for a Liveliness Subscriber
 * @prop {boolean=} history - If true, subscriber will receive the state change notifications for liveliness tokens that were declared before its declaration
 * @prop {Handler<Sample>=} handler - Handler for this subscriber
 */
interface LivelinessSubscriberOptions {
    history?: boolean,
    handler?: Handler<Sample>,
}

/**
 * Options for a Liveliness Subscriber
 * @prop {TimeDuration=} timeout - This liveliness query timeout value
 * @prop {Handler<Sample>=} handler - Handler for this liveliness query
 */
interface LivelinessGetOptions {
    timeout?: TimeDuration,
    handler?: Handler<Reply>,
}

export class Liveliness {

    constructor(private session: SessionInner) { }

    async declareToken(intoKeyExpr: IntoKeyExpr): Promise<LivelinessToken> {
        let tokenId = await this.session.declareLivelinessToken(new KeyExpr(intoKeyExpr));
        return new LivelinessToken(this.session, tokenId);
    }

    /**
     * Declares a subscriber on liveliness tokens that intersect specified keyexpr
     *
     * @param {IntoKeyExpr} intoKeyExpr - The key expression to subscribe to
     * @param {LivelinessSubscriberOptions=} livelinessSubscriberOpts - options for the liveliness subscriber
     *
     * @returns Liveliness Subscriber
     */
    async declareSubscriber(
        intoKeyExpr: IntoKeyExpr, livelinessSubscriberOpts?: LivelinessSubscriberOptions
    ): Promise<Subscriber> {
        let handler = livelinessSubscriberOpts?.handler ?? new FifoChannel<Sample>(256);
        let [callback, drop, receiver] = intoCbDropReceiver(handler);
        let keyexpr = new KeyExpr(intoKeyExpr);
        let subscriberId = await this.session.declareLivelinessSubscriber(
            {
                keyexpr,
                history: livelinessSubscriberOpts?.history ?? false,
            },
            { callback, drop }
        );

        return new Subscriber(this.session, subscriberId, keyexpr, receiver);
    }

    /**
     * Queries liveliness tokens currently on the network intersecting with specified key expression
     * @param intoKeyExpr - key expression to query
     * @param livelinessGetOpts - options passed to get operation
     * 
     */
    async get(intoKeyExpr: IntoKeyExpr, livelinessGetOpts?: LivelinessGetOptions): Promise<ChannelReceiver<Reply> | undefined> {
        let handler = livelinessGetOpts?.handler ?? new FifoChannel<Reply>(256);
        let [callback, drop, receiver] = intoCbDropReceiver(handler);
        await this.session.livelinessGet(
            {
                keyexpr: new KeyExpr(intoKeyExpr),
                timeoutMs: livelinessGetOpts?.timeout ? Duration.milliseconds.from(livelinessGetOpts.timeout) : DEFAULT_QUERY_TIMEOUT_MS,
            },
            { callback, drop }
        );
        return receiver;
    }
}

/** A token whose liveliness is tied to the Zenoh [`Session`](Session).
 *
 * A declared liveliness token will be seen as alive by any other Zenoh
 * application in the system that monitors it while the liveliness token
 * is not undeclared or dropped, while the Zenoh application that declared
 * it is alive (didn't stop or crashed) and while the Zenoh application
 * that declared the token has Zenoh connectivity with the Zenoh application
 * that monitors it.
 */
export class LivelinessToken {
    constructor(private session: SessionInner, private id: number) { }

    async undeclare() {
        await this.session.undeclareLivelinessToken(this.id);
    }

    async [Symbol.asyncDispose]() {
        await this.undeclare();
    }
}