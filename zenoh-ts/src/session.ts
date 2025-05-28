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
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { Liveliness } from "./liveliness.js";
import {
    IntoSelector,
    Query,
    Queryable,
    Reply,
    Selector,
} from "./query.js";
import { Publisher, Subscriber } from "./pubsub.js";
import { Config } from "./config.js";
import { Encoding, IntoEncoding } from "./encoding.js";
// External deps
import { Duration, TimeDuration } from 'typed-duration'
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver, FifoChannel, Handler, intoCbDropReceiver } from "./channels.js";
import { ZenohId } from "./zid.js";
import { CongestionControl, ConsolidationMode, Locality, Priority, QueryTarget, Reliability, ReplyKeyExpr } from "./enums.js";
import { Sample } from "./sample.js";
import { SessionInner } from "./session_inner.js";
import { Delete, Put, Qos, QuerierProperties, QuerySettings } from "./message.js";
import { Querier } from "./querier.js";

export const DEFAULT_QUERY_TIMEOUT_MS = 10000;
/**
 * Options for a Put operation 
 * @prop {Encoding=} encoding - Encoding type 
 * @prop {CongestionControl=} congestionControl - Congestion control applied when routing the data
 * @prop {Priority=} priority - Priority of the written data
 * @prop {boolean=} express  - Express: if set to `true`, this message will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Reliability=} reliability  - Reliability to apply to data transport,
 * @prop {Locality=} allowedDestination - Allowed destination for the data, 
 * @prop {IntoZBytes=} attachment - Additional Data to send with the request
 * @prop {Timestamp=} timestamp - Timestamp of the message
*/

export interface PutOptions {
    encoding?: IntoEncoding,
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    reliability?: Reliability,
    allowedDestinaton?: Locality,
    attachment?: IntoZBytes
    timestamp?: Timestamp,
}

/**
 * Options for a Delete operation 
 * @prop {CongestionControl=} congestion_control - Congestion control applied when routing the data
 * @prop {Priority=} priority - Prriority of the written data
 * @prop {boolean=} express  - Express: if set to `true`, this message will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Reliability=} reliability  - Reliability to apply to data transport
 * @prop {Locality=} allowedDestination - Allowed destination for the data
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
 * @prop {Timestamp=} timestamp - Timestamp of the message
*/
export interface DeleteOptions {
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    reliability?: Reliability,
    allowedDestinaton?: Locality,
    attachment?: IntoZBytes
    timestamp?: Timestamp
}

/**
 * Options for a Get operation 
 * @prop {CongestionControl=} congestion_control - Congestion control applied when routing the data
 * @prop {Priority=} priority - Priority of the query
 * @prop {boolean=} express  - Express: if set to `true`, this query will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Locality=} allowedDestination - Allowed destination for the query 
 * @prop {IntoEncoding=} encoding - Encoding type of payload 
 * @prop {IntoZBytes=} payload - Payload associated with the query
 * @prop {IntoZBytes=} attachment - Additional Data sent with the query
 * @prop {TimeDuration=} timeout - Timeout value for a query
 * @prop {ConsolidationMode=} consolidation - Consolidation mode
 * @prop {QueryTarget=} target - Queryables this query should target
 * @prop {ReplyKeyExpr=} acceptReplies - Replies this query accepts
 * @prop {Handler<Reply>=} handler - A reply handler
*/
export interface GetOptions {
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    allowedDestinaton?: Locality,
    encoding?: IntoEncoding,
    payload?: IntoZBytes,
    attachment?: IntoZBytes
    timeout?: TimeDuration,
    target?: QueryTarget,
    consolidation?: ConsolidationMode,
    acceptReplies?: ReplyKeyExpr,
    handler?: Handler<Reply>,
}

/**
 * Options for a Queryable
 * @prop {boolean?} complete - Queryable completness.
 * @prop {Locality=} allowedOrigin - Origin of queries, this queryable should reply to 
 * @prop {Handler<Query>=} handler - A query handler
*/
export interface QueryableOptions {
    complete?: boolean,
    allowedOrigin?: Locality,
    handler?: Handler<Query>
}

/**
 * Options for a Publisher
 * @prop {Encoding=} encoding - Default publisher encoding, that will be applied if no encoding is specified when sending individual messages.
 * @prop {CongestionControl=} congestionControl - Congestion control to be applied to messages sent with this publisher
 * @prop {Priority=} priority - The Priority of messages sent with this publisher
 * @prop {boolean=} express - Express setting for messages sent with this publisher. If set to `true`, the messages will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Reliability=} reliability - Reliability of messages sent with this publisher
 * @prop {Locality=} allowedDestination - Allowed destination for the messages sent with this publisher
 */
export interface PublisherOptions {
    encoding?: IntoEncoding,
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    reliability?: Reliability,
    allowedDestination?: Locality
}

/**
 * Options for a Subscriber
 * @prop {Locality=} allowedOrigin - Origin of messages this subscriber can receive
 * @prop {Handler<Sample=>} handler - Handler for this subscriber
 */
export interface SubscriberOptions {
    allowedOrigin?: Locality,
    handler?: Handler<Sample>,
}

/**
 * Options for a Querier
 * @prop {CongestionControl=} congestion_control - Congestion control applied when routing this Querier queries
 * @prop {Priority=} priority - Priority of this Querier's queries
 * @prop {boolean=} express  - Express: If set to `true`, this query will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Locality=} allowedDestination - Allowed destination for this Querier queries 
 * @prop {TimeDuration=} timeout - Timeout value for this Querier queries
 * @prop {QueryTarget=} target - Queryables this Querier queries should target
 * @prop {ConsolidationMode=} consolidation - Consolidation mode for this Querier queries
 * @prop {ReplyKeyExpr=} acceptReplies - Replies this Querier queries accept
 */
export interface QuerierOptions {
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    consolidation?: ConsolidationMode,
    target: QueryTarget
    timeout?: TimeDuration,
    allowedDestination?: Locality
    acceptReplies?: ReplyKeyExpr
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
        private inner: SessionInner
    ) { }

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
        let inner = await SessionInner.open(config.locator, config.messageResponseTimeoutMs);
        return new Session(inner);
    }

    /**
     * Closes a session, cleaning up the resource in Zenoh
     *
     * @returns Nothing
     */
    async close() {
        this.inner.close();
    }

    isClosed() {
        return this.inner.isClosed();
    }
    /**
     * Puts a value on the session, on a specific key expression
     *
     * @param {IntoKeyExpr} intoKeyExpr - key expression to publish to
     * @param {IntoZBytes} intoZBytes - payload to publish
     * @param {PutOptions=} putOpts - optional additional parameters to pass to delete operation
     * @returns void
     */
    async put(
        intoKeyExpr: IntoKeyExpr,
        intoZBytes: IntoZBytes,
        putOpts?: PutOptions,
    ) {
        await this.inner.put(
            new Put(
                new KeyExpr(intoKeyExpr),
                new ZBytes(intoZBytes),
                putOpts?.encoding ? Encoding.from(putOpts.encoding) : Encoding.default(),
                putOpts?.attachment ? new ZBytes(putOpts.attachment) : undefined,
                putOpts?.timestamp,
                new Qos(
                    putOpts?.priority ?? Priority.DEFAULT,
                    putOpts?.congestionControl ?? CongestionControl.DEFAULT_PUSH,
                    putOpts?.express ?? false,
                    putOpts?.reliability ?? Reliability.DEFAULT,
                    putOpts?.allowedDestinaton ?? Locality.DEFAULT
                )
            )
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
        return await this.inner.getSessionInfo();
    }

    /**
     * Executes a Delete on a session, for a specific key expression KeyExpr
     *
     * @param {IntoKeyExpr} intoKeyExpr - something that implements intoKeyExpr
     * @param {DeleteOptions} deleteOpts - optional additional parameters to pass to delete operation
     *
     * @returns void
     */
    async delete(
        intoKeyExpr: IntoKeyExpr,
        deleteOpts?: DeleteOptions
    ) {
        await this.inner.delete(
            new Delete(
                new KeyExpr(intoKeyExpr),
                deleteOpts?.attachment ? new ZBytes(deleteOpts.attachment) : undefined,
                deleteOpts?.timestamp,
                new Qos(
                    deleteOpts?.priority ?? Priority.DEFAULT,
                    deleteOpts?.congestionControl ?? CongestionControl.DEFAULT_PUSH,
                    deleteOpts?.express ?? false,
                    deleteOpts?.reliability ?? Reliability.DEFAULT,
                    deleteOpts?.allowedDestinaton ?? Locality.DEFAULT
                )
            )
        );
    }

    /**
     * Issues a get query on a Zenoh session
     *
     * @param intoSelector - representing a KeyExpr and Parameters
     * @param {GetOptions=} getOpts - optional additional parameters to pass to get operation
     * 
     * @returns Receiver
     */
    async get(
        intoSelector: IntoSelector,
        getOpts?: GetOptions
    ): Promise<ChannelReceiver<Reply> | undefined> {
        let handler = getOpts?.handler ?? new FifoChannel<Reply>(256);
        let [callback, drop, receiver] = intoCbDropReceiver(handler);
        let selector = Selector.from(intoSelector);
        await this.inner.get(
            {
                keyexpr: selector.keyExpr(),
                parameters: selector.parameters().toString(),
                payload: getOpts?.payload ? new ZBytes(getOpts.payload) : undefined,
                encoding: getOpts?.encoding ? Encoding.from(getOpts.encoding) : undefined,
                attachment: getOpts?.attachment ? new ZBytes(getOpts.attachment) : undefined,
                qos: new Qos(
                    getOpts?.priority ?? Priority.DEFAULT,
                    getOpts?.congestionControl ?? CongestionControl.DEFAULT_REQUEST,
                    getOpts?.express ?? false,
                    Reliability.DEFAULT,
                    getOpts?.allowedDestinaton ?? Locality.DEFAULT
                ),
                querySettings: new QuerySettings(
                    getOpts?.target ?? QueryTarget.DEFAULT,
                    getOpts?.consolidation ?? ConsolidationMode.DEFAULT,
                    getOpts?.acceptReplies ?? ReplyKeyExpr.DEFAULT
                ),
                timeoutMs: getOpts?.timeout ? Duration.milliseconds.from(getOpts.timeout) : DEFAULT_QUERY_TIMEOUT_MS,
            },
            { callback, drop }
        );

        return receiver;
    }

    /**
     * Declares a new subscriber
     *
     * @remarks
     *  If a Subscriber is created with a callback, it cannot be simultaneously polled for new values
     * 
     * @param {IntoKeyExpr} intoKeyExpr - the key expression to subscribe to
     * @param {SubscriberOptions} subscriberOpts - optional additional parameters to pass to subscriber declaration
     *
     * @returns Subscriber
     */
    async declareSubscriber(
        intoKeyExpr: IntoKeyExpr,
        subscriberOpts?: SubscriberOptions
    ): Promise<Subscriber> {
        const handler = subscriberOpts?.handler ?? new FifoChannel<Sample>(256);
        const keyexpr = new KeyExpr(intoKeyExpr);
        let [callback, drop, receiver] = intoCbDropReceiver(handler);

        const subscriberId = await this.inner.declareSubscriber(
            {
                keyexpr,
                allowedOrigin: subscriberOpts?.allowedOrigin ?? Locality.DEFAULT
            },
            { callback, drop }
        );
        return new Subscriber(this.inner, subscriberId, keyexpr, receiver);
    }

    /**
     * Obtain a Liveliness struct tied to this Zenoh Session.
     * 
     * @returns Liveliness
     */
    liveliness(): Liveliness {
        return new Liveliness(this.inner)
    }

    /**
     * Creates a new Timestamp instance
     * 
     * @returns Timestamp
     */
    async newTimestamp(): Promise<Timestamp> {
        return await this.inner.getTimestamp();
    }

    /**
    * Declares a new Queryable
    * 
    * @param {IntoKeyExpr} intoKeyExpr - Queryable key expression
    * @param {QueryableOptions=} queryableOpts - Optional additional settings for a Queryable [QueryableOptions]
    *
    * @returns Queryable
    */
    async declareQueryable(
        intoKeyExpr: IntoKeyExpr,
        queryableOpts?: QueryableOptions
    ): Promise<Queryable> {
        const keyexpr = new KeyExpr(intoKeyExpr);
        const handler = queryableOpts?.handler ?? new FifoChannel<Query>(256);
        const [callback, drop, receiver] = intoCbDropReceiver(handler);
        const queryableId = await this.inner.declareQueryable(
            {
                keyexpr,
                complete: queryableOpts?.complete ?? false,
                allowedOrigin: queryableOpts?.allowedOrigin ?? Locality.DEFAULT,
            },
            { callback, drop }
        );

        return new Queryable(this.inner, queryableId, keyexpr, receiver);
    }

    /**
    * Declares a new Publisher
    *
    * @param {IntoKeyExpr} intoKeyExpr - Publisher's key expression
    * @param {PublisherOptions=} publisherOpts - Optional additional settings for a Publisher [PublisherOptions]
    * @returns Publisher
    */
    async declarePublisher(
        intoKeyExpr: IntoKeyExpr,
        publisherOpts?: PublisherOptions
    ): Promise<Publisher> {
        let publisherProperties = {
            keyexpr: new KeyExpr(intoKeyExpr),
            encoding: publisherOpts?.encoding ? Encoding.from(publisherOpts.encoding) : Encoding.default(),
            qos: new Qos(
                publisherOpts?.priority ?? Priority.DEFAULT,
                publisherOpts?.congestionControl ?? CongestionControl.DEFAULT_PUSH,
                publisherOpts?.express ?? false,
                publisherOpts?.reliability ?? Reliability.DEFAULT,
                publisherOpts?.allowedDestination ?? Locality.DEFAULT
            )
        };
        const publisherId = await this.inner.declarePublisher(publisherProperties);
        return new Publisher(this.inner, publisherId, publisherProperties);
    }

    /**
    * Declares a Querier 
    * 
    * @param {IntoKeyExpr} intoKeyexpr - Querier's key expression
    * @param {QuerierOptions=} querierOpts - Optional additional settings for a Querier [QuerierOptions]
    * @returns Publisher
    */
    async declareQuerier(
        intoKeyexpr: IntoKeyExpr,
        querierOpts?: QuerierOptions,
    ): Promise<Querier> {
        const properties: QuerierProperties = {
            keyexpr: new KeyExpr(intoKeyexpr),
            qos: new Qos(
                querierOpts?.priority ?? Priority.DEFAULT,
                querierOpts?.congestionControl ?? CongestionControl.DEFAULT_REQUEST,
                querierOpts?.express ?? false,
                Reliability.DEFAULT,
                querierOpts?.allowedDestination ?? Locality.DEFAULT
            ),
            querySettings: new QuerySettings(
                querierOpts?.target ?? QueryTarget.DEFAULT,
                querierOpts?.consolidation ?? ConsolidationMode.DEFAULT,
                querierOpts?.acceptReplies ?? ReplyKeyExpr.DEFAULT
            ),
            timeoutMs: querierOpts?.timeout ? Duration.milliseconds.from(querierOpts.timeout) : DEFAULT_QUERY_TIMEOUT_MS,
        }

        let querierId = await this.inner.declareQuerier(properties);
        return new Querier(
            this.inner,
            querierId,
            properties.keyexpr,
            properties.qos.congestionControl,
            properties.qos.priority,
            properties.querySettings.replyKeyExpr
        );
    }
}

/**
 *  Function to open a Zenoh session
 */
export async function open(config: Config): Promise<Session> {
    return await Session.open(config);
}

/**
 *  Struct to expose Info for Zenoh Session
 */
export class SessionInfo {
    constructor(
        private zid_: ZenohId,
        private peers_: ZenohId[],
        private routers_: ZenohId[],
    ) { }

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