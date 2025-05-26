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

import { ZBytesDeserializer, ZBytesSerializer } from "./ext";
import { KeyExpr } from "./key_expr";
import { DeclareLivelinessSubscriber, DeclareLivelinessToken, DeclarePublisher, DeclareQuerier, DeclareQueryable, DeclareSubscriber, Delete, deserializeHeader, Get, GetProperties, GetSessionInfo, InQuery, InRemoteMessageId, InReply, InSample, LivelinessGet, LivelinessGetProperties, LivelinessSubscriberProperties, OutMessageInterface, Ping, PublisherDelete, PublisherProperties, PublisherPut, Put, QuerierGet, QuerierGetProperties, QuerierProperties, QueryableProperties, QueryResponseFinal, ReplyDel, ReplyErr, ReplyOk, ResponseError, ResponseOk, ResponsePing, ResponseSessionInfo, ResponseTimestamp, serializeHeader, SubscriberProperties, UndeclareLivelinessToken, UndeclarePublisher, UndeclareQueryable, UndeclareSubscriber } from "./message";
import { Query, Reply, ReplyError } from "./query";
import { Closure } from "./closure";
import { RemoteLink } from "./link";
import { Sample } from "./sample";
import { SessionInfo } from "./session";
import { Timestamp } from "./timestamp";
import { ZBytes } from "./z_bytes";

class IdSource {
    private static MAX: number = 1 << 31;
    private current: number;

    constructor() {
        this.current = 0;
    }

    get(): number {
        const ret = this.current;
        if (this.current == IdSource.MAX) {
            this.current = 0;
        } else {
            this.current++;
        }
        return ret;
    }
}

type OnResponseReceivedCallback = (msg: [InRemoteMessageId, ZBytesDeserializer]) => void;


export class SessionInner {
    private static TIMEOUT_ERROR = new Error("Timeout");
    private isClosed_: boolean = false;

    private link: RemoteLink;
    private id: string = "";

    private messageIdCounter: IdSource = new IdSource();
    private publisherIdCounter: IdSource = new IdSource();
    private subscriberIdCounter: IdSource = new IdSource();
    private queryableIdCounter: IdSource = new IdSource();
    private querierIdCounter: IdSource = new IdSource();
    private livelinessTokenIdCounter: IdSource = new IdSource();
    private getIdCounter: IdSource = new IdSource();

    private subscribers: Map<number, Closure<Sample>> = new Map<number, Closure<Sample>>();
    private queryables: Map<number, Closure<Query>> = new Map<number, Closure<Query>>();
    private gets: Map<number, Closure<Reply>> = new Map<number, Closure<Reply>>();

    private messageResponseTimeoutMs: number = 100;
    
    private pendingMessageResponses: Map<number, OnResponseReceivedCallback> = new Map<number, OnResponseReceivedCallback>();
    

    private constructor(link: RemoteLink) {
        this.link = link;
        this.link.onmessage((msg: any) => { 
            try {
                this.onMessageReceived(msg);
            } catch (e) {
                console.warn(e);
            } 
        });
    }

    private onMessageReceived(msg: Uint8Array) {
        let deserializer = new ZBytesDeserializer(new ZBytes(msg));
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
                default: throw new Error(`Received unexpected message type ${messageId}`);
            }
        }
    }

    private async sendMessage(msg: OutMessageInterface) {
        let serializer = new ZBytesSerializer();
        serializer.serializeNumberUint8(msg.outMessageId);
        msg.serializeWithZSerializer(serializer);
        return await this.link.send(serializer.finish().toBytes());
    }

    private async sendRequest<T>(msg: OutMessageInterface, expectedResponseId: InRemoteMessageId, deserialize: (deserializer: ZBytesDeserializer) => T): Promise<T> {
        let serializer = new ZBytesSerializer();
        const msgId = this.messageIdCounter.get();
        serializeHeader([msg.outMessageId, msgId], serializer);

        serializer.serializeNumberUint8(msgId);
        const p = new Promise((resolve: OnResponseReceivedCallback, _) => {
            this.pendingMessageResponses.set(msgId, resolve);
        });

        const timeout = new Promise<[InRemoteMessageId, ZBytesDeserializer]>((_, reject) =>
            setTimeout(() => reject(SessionInner.TIMEOUT_ERROR), this.messageResponseTimeoutMs),
        );
        await this.link.send(serializer.finish().toBytes());

        return await Promise.race([p, timeout]).then((r: [InRemoteMessageId, ZBytesDeserializer]) => {
            switch (r[0]) {
                case expectedResponseId: return deserialize(r[1]);
                case InRemoteMessageId.ResponseError: {
                    const e = ResponseError.deserialize(r[1]);
                    throw new Error(e.error);
                }
                default: throw new Error(`Unexpected InRemoteMessageId ${r[0]}`);
            };
        }, (e: Error) => {
            this.pendingMessageResponses.delete(msgId);
            throw e;
        });
    }

    async ping(): Promise<ResponsePing> {
        return await this.sendRequest(new Ping, InRemoteMessageId.ResponsePing, ResponsePing.deserialize);
    }

    static async open(locator: string): Promise<SessionInner> {
        let link = await RemoteLink.new(locator);
        let session =  new SessionInner(link);
        session.id = (await session.ping()).uuid; // verify connection
        console.log(`Successfully opened session with id: ${session.id}`);
        return session;
    }

    async declarePublisher(info: PublisherProperties): Promise<number> {
        let publisherId = this.publisherIdCounter.get();
        await this.sendRequest(
            new DeclarePublisher(publisherId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return publisherId;
    }

    async undeclarePublisher(publisherId: number) {
        await this.sendRequest(
            new UndeclarePublisher(publisherId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareSubscriber(info: SubscriberProperties, closure: Closure<Sample>): Promise<number> {
        let subscriberId = this.subscriberIdCounter.get();
        await this.sendRequest(
            new DeclareSubscriber(subscriberId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        this.subscribers.set(subscriberId, closure);
        return subscriberId;
    }

    async undeclareSubscriber(subscriberId: number) {
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

    async declareQueryable(info: QueryableProperties, closure: Closure<Query>): Promise<number> {
        let queryableId = this.queryableIdCounter.get();
        await this.sendRequest(
            new DeclareQueryable(queryableId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        this.queryables.set(queryableId, closure);
        return queryableId;
    }

    async undeclareQueryable(queryableId: number) {
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

    async declareQuerier(info: QuerierProperties): Promise<number> {
        let querierId = this.querierIdCounter.get();
        await this.sendRequest(
            new DeclareQuerier(querierId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return querierId;
    }

    async undeclareQuerier(querierId: number) {
        await this.sendRequest(
            new UndeclareQueryable(querierId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareLivelinessToken(keyexpr: KeyExpr): Promise<number> {
        let tokenId = this.livelinessTokenIdCounter.get();
        await this.sendRequest(
            new DeclareLivelinessToken(tokenId, keyexpr), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        return tokenId;
    }

    async undeclareLivelinessToken(tokenId: number) {
        await this.sendRequest(
            new UndeclareLivelinessToken(tokenId), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
    }

    async declareLivelinessSubscriber(info: LivelinessSubscriberProperties, closure: Closure<Sample>): Promise<number> {
        let subscriberId = this.subscriberIdCounter.get();
        await this.sendRequest(
            new DeclareLivelinessSubscriber(subscriberId, info), 
            InRemoteMessageId.ResponseOk, 
            ResponseOk.deserialize
        );
        this.subscribers.set(subscriberId, closure);
        return subscriberId;
    }

    async undeclareLivelinessSubscriber(subscriberId: number) {
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
            new GetSessionInfo(), 
            InRemoteMessageId.ResponseSessionInfo, 
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

    async get(data: GetProperties, closure: Closure<Reply>) {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        await this.sendMessage(new Get(getId, data));
    }

    async querierGet(data: QuerierGetProperties, closure: Closure<Reply>) {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        await this.sendMessage(new QuerierGet(getId, data));
    }

    async livelinessGet(data: LivelinessGetProperties, closure: Closure<Reply>) {
        let getId = this.getIdCounter.get();
        this.gets.set(getId, closure);
        await this.sendMessage(new LivelinessGet(getId, data));
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

    async sendResponseFinal(queryId: number) {
        await this.sendMessage(new QueryResponseFinal(queryId));
    }

    async close() {
        this.link.close();
        for (let s of this.subscribers) {
            s[1].drop();
        }
        this.subscribers.clear();

        for (let g of this.gets) {
            g[1].drop();
        }
        this.gets.clear();

        for (let q of this.queryables) {
            q[1].drop();
        }
        this.queryables.clear();
        this.isClosed_ = true;
    }

    isClosed(): boolean {
        return this.isClosed_;
    }
}