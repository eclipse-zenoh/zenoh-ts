//
// Copyright (c) 2025 ZettaScale Technology
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

import { ZBytesDeserializer, ZBytesSerializer } from "./ext/index.js";
import { KeyExpr } from "./key_expr.js";
import { DeclareLivelinessSubscriber, DeclareLivelinessToken, DeclarePublisher, DeclareQuerier, DeclareQueryable, DeclareSubscriber, Delete, deserializeHeader, Get, GetProperties, GetSessionInfo, GetTimestamp, InQuery, InRemoteMessageId, InReply, InSample, LivelinessGet, LivelinessGetProperties, LivelinessSubscriberProperties, MatchingStatusUpdate, OutMessageInterface, Ping, PublisherDeclareMatchingListener, PublisherDelete, PublisherGetMatchingStatus, PublisherProperties, PublisherPut, Put, QuerierDeclareMatchingListener, QuerierGet, QuerierGetMatchingStatus, QuerierGetProperties, QuerierProperties, QueryableProperties, QueryResponseFinal, ReplyDel, ReplyErr, ReplyOk, ResponseError, ResponseMatchingStatus, ResponseOk, ResponsePing, ResponseSessionInfo, ResponseTimestamp, serializeHeader, SubscriberProperties, UndeclareLivelinessSubscriber, UndeclareLivelinessToken, UndeclareMatchingListener, UndeclarePublisher, UndeclareQuerier, UndeclareQueryable, UndeclareSubscriber } from "./message.js";
import { Query, Reply } from "./query.js";
import { Closure } from "./closure.js";
import { RemoteLink } from "./link.js";
import { Sample } from "./sample.js";
import { SessionInfo } from "./session.js";
import { Timestamp } from "./timestamp.js";
import { MatchingStatus } from "./matching.js";

// Private branded types for IDs
declare const publisherIdBrand: unique symbol;
declare const subscriberIdBrand: unique symbol;
declare const queryableIdBrand: unique symbol;
declare const querierIdBrand: unique symbol;
declare const livelinessTokenIdBrand: unique symbol;
declare const livelinessSubscriberIdBrand: unique symbol;
declare const getIdBrand: unique symbol;
declare const matchingListenerIdBrand: unique symbol;

export type PublisherId = number & { readonly [publisherIdBrand]: typeof publisherIdBrand };
export type SubscriberId = number & { readonly [subscriberIdBrand]: typeof subscriberIdBrand };
export type QueryableId = number & { readonly [queryableIdBrand]: typeof queryableIdBrand };
export type QuerierId = number & { readonly [querierIdBrand]: typeof querierIdBrand };
export type LivelinessTokenId = number & { readonly [livelinessTokenIdBrand]: typeof livelinessTokenIdBrand };
export type LivelinessSubscriberId = number & { readonly [livelinessSubscriberIdBrand]: typeof livelinessSubscriberIdBrand };
export type GetId = number & { readonly [getIdBrand]: typeof getIdBrand };
export type MatchingListenerId = number & { readonly [matchingListenerIdBrand]: typeof matchingListenerIdBrand };

export enum SubscriberKind {
    Subscriber,
    LivelinessSubscriber,
}

class IdSource<T extends number> {
    private static MAX: number = 1 << 31;
    private current: number;

    constructor() {
        this.current = 0;
    }

    get(): T {
        const ret = this.current;
        if (this.current == IdSource.MAX) {
            this.current = 0;
        } else {
            this.current++;
        }
        return ret as T;
    }
}

type OnResponseReceivedCallback = (msg: [InRemoteMessageId, ZBytesDeserializer]) => void;


export class SessionInner {
    private isClosed_: boolean = false;

    private link: RemoteLink;
    private id: string = "";

    private messageIdCounter: IdSource<number> = new IdSource<number>();
    private publisherIdCounter: IdSource<PublisherId> = new IdSource<PublisherId>();
    private subscriberIdCounter: IdSource<SubscriberId> = new IdSource<SubscriberId>();
    private queryableIdCounter: IdSource<QueryableId> = new IdSource<QueryableId>();
    private querierIdCounter: IdSource<QuerierId> = new IdSource<QuerierId>();
    private livelinessTokenIdCounter: IdSource<LivelinessTokenId> = new IdSource<LivelinessTokenId>();
    private livelinessSubscriberIdCounter: IdSource<LivelinessSubscriberId> = new IdSource<LivelinessSubscriberId>();
    private getIdCounter: IdSource<GetId> = new IdSource<GetId>();
    private matchingListenerIdCounter: IdSource<MatchingListenerId> = new IdSource<MatchingListenerId>();

    private subscribers: Map<SubscriberId, Closure<Sample>> = new Map<SubscriberId, Closure<Sample>>();
    private queryables: Map<QueryableId, Closure<Query>> = new Map<QueryableId, Closure<Query>>();
    private livelinessSubscribers: Map<LivelinessSubscriberId, Closure<Sample>> = new Map<LivelinessSubscriberId, Closure<Sample>>();
    private gets: Map<GetId, Closure<Reply>> = new Map<GetId, Closure<Reply>>();
    private matchingListeners: Map<MatchingListenerId, Closure<MatchingStatus>> = new Map<MatchingListenerId, Closure<MatchingStatus>>();
    private pendingMessageResponses: Map<number, OnResponseReceivedCallback> = new Map<number, OnResponseReceivedCallback>();
    private readonly messageResponseTimeoutMs: number;

    private constructor(link: RemoteLink, messageResponseTimeoutMs: number) {
        this.link = link;
        this.messageResponseTimeoutMs = messageResponseTimeoutMs;
        this.link.onmessage((msg: any) => { 
            try {
                this.onMessageReceived(msg);
            } catch (e) {
                console.warn(e);
            }
        });
    }

    private onMessageReceived(msg: Uint8Array) {
        let deserializer = new ZBytesDeserializer(msg);
        let [messageId, sequenceId] = deserializeHeader(deserializer);
        if (sequenceId != undefined) { // received response to one of the messages
            let res = this.pendingMessageResponses.get(sequenceId);
            if (res == undefined) {
                console.warn(`Received unexpected response ${messageId}:${sequenceId}`) 
            } else {
                res([messageId, deserializer]);
                this.pendingMessageResponses.delete(sequenceId);
            }
        } else {
            switch (messageId) {
                case InRemoteMessageId.InQuery: {
                    const q = InQuery.deserialize(deserializer);
                    let queryable = this.queryables.get(q.queryableId);
                    if (queryable == undefined) {
                        console.warn(`Received query for inexistant queryable ${q.queryableId}`) 
                    } else {
                        queryable.callback(new Query(this, q.query));
                    }
                    break;
                }
                case InRemoteMessageId.InReply: {
                    const r = InReply.deserialize(deserializer);
                    let get = this.gets.get(r.queryId);
                    if (get == undefined) {
                        console.warn(`Received reply for inexistant query ${r.queryId}`) 
                    } else {
                        get.callback(r.reply);
                    }
                    break;
                }
                case InRemoteMessageId.InSample: {
                    const s = InSample.deserialize(deserializer);
                    let subscriber = this.subscribers.get(s.subscriberId);
                    if (subscriber == undefined) {
                        console.warn(`Received sample for inexistant subscriber ${s.subscriberId}`) 
                    } else {
                        subscriber.callback(s.sample);
                    }
                    break;
                }
                case InRemoteMessageId.QueryResponseFinal: {
                    const q = QueryResponseFinal.deserialize(deserializer);
                    let get = this.gets.get(q.queryId);
                    if (get == undefined) {
                        console.warn(`Received responseFinal for inexistant get ${q.queryId}`) 
                    } else {
                        this.gets.delete(q.queryId);
                        get.drop();
                    }
                    break;
                }
                case InRemoteMessageId.MatchingStatusUpdate: {
                    const m = MatchingStatusUpdate.deserialize(deserializer);
                    let matchingListener = this.matchingListeners.get(m.matchingListenerId);
                    if (matchingListener == undefined) {
                        console.warn(`Received matching status update for inexistant matching listener ${m.matchingListenerId}`) 
                    } else {
                        matchingListener.callback(new MatchingStatus(m.matching));
                    }
                    break;
                }
                default: throw new Error(`Received unexpected message type ${messageId}`);
            }
        }
    }

    private async sendMessage(msg: OutMessageInterface) {
        let serializer = new ZBytesSerializer();
        serializer.serializeNumberUint8(msg.outMessageId);
        msg.serializeWithZSerializer(serializer);
        return await this.link.send(serializer.toBytes());
    }

    private async sendRequest<T>(msg: OutMessageInterface, expectedResponseId: InRemoteMessageId, deserialize: (deserializer: ZBytesDeserializer) => T): Promise<T> {
        let serializer = new ZBytesSerializer();
        const msgId = this.messageIdCounter.get();
        serializeHeader([msg.outMessageId, msgId], serializer);

        msg.serializeWithZSerializer(serializer);
        const p = new Promise((resolve: OnResponseReceivedCallback, reject) => {
            let t = setTimeout(() => reject(), this.messageResponseTimeoutMs);
            this.pendingMessageResponses.set(msgId, (arg: [InRemoteMessageId, ZBytesDeserializer]) => {
                clearTimeout(t);
                resolve(arg);
            });
        });
        await this.link.send(serializer.finish().toBytes());

        return await p.then((r: [InRemoteMessageId, ZBytesDeserializer]) => {
            switch (r[0]) {
                case expectedResponseId: return deserialize(r[1]);
                case InRemoteMessageId.ResponseError: {
                    const e = ResponseError.deserialize(r[1]);
                    throw new Error(e.error);
                }
                default: throw new Error(`Unexpected InRemoteMessageId ${r[0]}`);
            };
        }, () => {
            this.pendingMessageResponses.delete(msgId);
            throw new Error("Remote api request timeout");
        });
    }

    async ping(): Promise<ResponsePing> {
        return await this.sendRequest(new Ping, InRemoteMessageId.ResponsePing, ResponsePing.deserialize);
    }

    static async open(locator: string, messageResponseTimeoutMs: number): Promise<SessionInner> {
        let link = await RemoteLink.new(locator);
        let session =  new SessionInner(link, messageResponseTimeoutMs);
        session.id = (await session.ping()).uuid; // verify connection
        console.log(`Successfully opened session with id: ${session.id}`);
        return session;
    }

    async declarePublisher(info: PublisherProperties): Promise<PublisherId> {
        let publisherId = this.publisherIdCounter.get();
        await this.sendRequest(
            new DeclarePublisher(publisherId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return publisherId;
    }

    async undeclarePublisher(publisherId: PublisherId) {
        await this.sendRequest(
            new UndeclarePublisher(publisherId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareSubscriber(info: SubscriberProperties, closure: Closure<Sample>): Promise<SubscriberId> {
        let subscriberId = this.subscriberIdCounter.get();
        this.subscribers.set(subscriberId, closure);
        try {
            await this.sendRequest(
                new DeclareSubscriber(subscriberId, info), 
                InRemoteMessageId.ResponseOk, 
                ResponseOk.deserialize
            );
        } catch (error) {
            this.subscribers.delete(subscriberId);
            throw error;
        } 
        return subscriberId;
    }

    async undeclareSubscriber(subscriberId: SubscriberId) {
        const subscriber = this.subscribers.get(subscriberId);
        if (subscriber == undefined) {
            new Error (`Unknown subscriber id: ${subscriberId}`)
        } else {
            this.subscribers.delete(subscriberId);
            subscriber.drop();
        }
        await this.sendRequest(
            new UndeclareSubscriber(subscriberId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareQueryable(info: QueryableProperties, closure: Closure<Query>): Promise<QueryableId> {
        let queryableId = this.queryableIdCounter.get();
        await this.sendRequest(
            new DeclareQueryable(queryableId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        this.queryables.set(queryableId, closure);
        return queryableId;
    }

    async undeclareQueryable(queryableId: QueryableId) {
        const queryable = this.queryables.get(queryableId);
        if (queryable == undefined) {
            new Error (`Unknown queryable id: ${queryableId}`)
        } else {
            this.queryables.delete(queryableId);
            queryable.drop();
        }
        await this.sendRequest(
            new UndeclareQueryable(queryableId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareQuerier(info: QuerierProperties): Promise<QuerierId> {
        let querierId = this.querierIdCounter.get();
        await this.sendRequest(
            new DeclareQuerier(querierId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return querierId;
    }

    async undeclareQuerier(querierId: QuerierId) {
        await this.sendRequest(
            new UndeclareQuerier(querierId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareLivelinessToken(keyexpr: KeyExpr): Promise<LivelinessTokenId> {
        let tokenId = this.livelinessTokenIdCounter.get();
        await this.sendRequest(
            new DeclareLivelinessToken(tokenId, keyexpr), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return tokenId;
    }

    async undeclareLivelinessToken(tokenId: LivelinessTokenId) {
        await this.sendRequest(
            new UndeclareLivelinessToken(tokenId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareLivelinessSubscriber(info: LivelinessSubscriberProperties, closure: Closure<Sample>): Promise<LivelinessSubscriberId> {
        let livelinessSubscriberId = this.livelinessSubscriberIdCounter.get();
        this.livelinessSubscribers.set(livelinessSubscriberId, closure);
        try {
            await this.sendRequest(
                new DeclareLivelinessSubscriber(livelinessSubscriberId, info), 
                InRemoteMessageId.ResponseOk, 
                ResponseOk.deserialize
            );
        } catch (error) {
            this.livelinessSubscribers.delete(livelinessSubscriberId);
            throw error;
        }
        return livelinessSubscriberId;
    }

    async undeclareLivelinessSubscriber(livelinessSubscriberId: LivelinessSubscriberId) {
        const livelinessSubscriber = this.livelinessSubscribers.get(livelinessSubscriberId);
        if (livelinessSubscriber == undefined) {
            new Error (`Unknown liveliness subscriber id: ${livelinessSubscriberId}`)
        } else {
            this.livelinessSubscribers.delete(livelinessSubscriberId);
            livelinessSubscriber.drop();
        }
        await this.sendRequest(
            new UndeclareLivelinessSubscriber(livelinessSubscriberId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async getSessionInfo(): Promise<SessionInfo> {
        return await this.sendRequest(
            new GetSessionInfo(), 
            InRemoteMessageId.ResponseSessionInfo, 
            ResponseSessionInfo.deserialize
        ).then(
            (value) => value.info
        );
    }

    async getTimestamp(): Promise<Timestamp> {
        return await this.sendRequest(
            new GetTimestamp(), 
            InRemoteMessageId.ResponseTimestamp, 
            ResponseTimestamp.deserialize
        ).then(
            (value) => value.timestamp
        );
    }

    async put(data: Put) {
        return await this.sendMessage(data);
    }

    async delete(data: Delete) {
        return await this.sendMessage(data);
    }

    async publisherPut(data: PublisherPut) {
        return await this.sendMessage(data);
    }

    async publisherDelete(data: PublisherDelete) {
        return await this.sendMessage(data);
    }

    async get(data: GetProperties, closure: Closure<Reply>): Promise<GetId> {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        try {
            await this.sendMessage(new Get(getId, data));
            return getId;
        } catch (error) {
            this.gets.delete(getId);
            throw error;
        }
    }

    async querierGet(data: QuerierGetProperties, closure: Closure<Reply>): Promise<GetId>  {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        try {
            await this.sendMessage(new QuerierGet(getId, data));
            return getId;
        } catch (error) {
            this.gets.delete(getId);
            throw error;
        }
    }

    async livelinessGet(data: LivelinessGetProperties, closure: Closure<Reply>): Promise<GetId> {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        try {
            await this.sendMessage(new LivelinessGet(getId, data));
            return getId;
        } catch (error) {
            this.gets.delete(getId);
            throw error;
        }
    }

    async replyOk(data: ReplyOk) {
        await this.sendMessage(data);
    }

    async replyDel(data: ReplyDel) {
        await this.sendMessage(data);
    }

    async replyErr(data: ReplyErr) {
        await this.sendMessage(data);
    }

    async sendResponseFinal(queryId: GetId) {
        await this.sendMessage(new QueryResponseFinal(queryId));
    }

    async publisherDeclareMatchingListener(publisherId: PublisherId, closure: Closure<MatchingStatus>): Promise<MatchingListenerId> {
        let listenerId = this.matchingListenerIdCounter.get();
        this.matchingListeners.set(listenerId, closure);
        try {
            await this.sendRequest(
                new PublisherDeclareMatchingListener(listenerId, publisherId), 
                InRemoteMessageId.ResponseOk, 
                ResponseOk.deserialize
            ) 
        } catch (error) {
            this.matchingListeners.delete(listenerId);
            throw error;
        }
        return listenerId;
    }

    async undeclareMatchingListener(listenerId: MatchingListenerId) {
        const listener = this.matchingListeners.get(listenerId);
        if (listener == undefined) {
            new Error (`Unknown matching listener id: ${listenerId}`)
        } else {
            this.matchingListeners.delete(listenerId);
            listener.drop();
        }

        await this.sendRequest(
            new UndeclareMatchingListener(listenerId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async publisherGetMatchingStatus(publisherId: PublisherId): Promise<MatchingStatus> {
        return await this.sendRequest(
            new PublisherGetMatchingStatus(publisherId), 
            InRemoteMessageId.ResponseMatchingStatus, 
            ResponseMatchingStatus.deserialize
        ).then(
            (value) => new MatchingStatus(value.matching)
        );
    }

    async querierDeclareMatchingListener(querierId: QuerierId, closure: Closure<MatchingStatus>): Promise<MatchingListenerId> {
        let listenerId = this.matchingListenerIdCounter.get();
        this.matchingListeners.set(listenerId, closure);
        try {
            await this.sendRequest(
                new QuerierDeclareMatchingListener(listenerId, querierId), 
                InRemoteMessageId.ResponseOk, 
                ResponseOk.deserialize
            ) 
        } catch (error) {
            this.matchingListeners.delete(listenerId);
            throw error;
        }
        return listenerId;
    }

    async querierGetMatchingStatus(querierId: QuerierId): Promise<MatchingStatus> {
        return await this.sendRequest(
            new QuerierGetMatchingStatus(querierId), 
            InRemoteMessageId.ResponseMatchingStatus, 
            ResponseMatchingStatus.deserialize
        ).then(
            (value) => new MatchingStatus(value.matching)
        );
    }

    async close() {
        this.link.close();
        for (let s of this.subscribers) {
            s[1].drop();
        }
        this.subscribers.clear();

        for (let l of this.livelinessSubscribers) {
            l[1].drop();
        }
        this.livelinessSubscribers.clear();

        for (let g of this.gets) {
            g[1].drop();
        }
        this.gets.clear();

        for (let q of this.queryables) {
            q[1].drop();
        }
        this.queryables.clear();

        for (let l of this.matchingListeners) {
            l[1].drop();
        }
        this.matchingListeners.clear();

        this.isClosed_ = true;
    }

    isClosed(): boolean {
        return this.isClosed_;
    }

    cancelQuery(queryId: GetId) {
        let get = this.gets.get(queryId);
        if (get != undefined) {
            this.gets.delete(queryId);
            get.drop()
        }
    }
}