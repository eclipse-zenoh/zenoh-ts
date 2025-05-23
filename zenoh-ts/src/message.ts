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

import { ZBytesDeserializer, ZBytesSerializer, ZD } from "./ext"
import { Encoding, EncodingPredefined } from "./encoding.js";
import { KeyExpr } from "./key_expr.js";
import { Locality, Reliability, CongestionControl, Priority, SampleKind, ConsolidationMode, ReplyKeyExpr, QueryTarget } from "./enums.js";
import { Timestamp } from "./timestamp";
import { ZenohId } from "./zid";
import { Sample } from "./sample";
import { Parameters, QueryInner, Reply, ReplyError } from "./query";
import { ZBytes } from "./z_bytes";

function sampleKindFromUint8(val: number): SampleKind {
    switch (val) {
        case SampleKind.Put: return SampleKind.Put;
        case SampleKind.Delete: return SampleKind.Delete;
        default: {
            console.warn(`Unsupported SampleKind value ${val}`);
            return SampleKind.Put;
        }
    }
}

function priorityFromUint8(val: number): Priority {
    switch (val) {
        case Priority.REAL_TIME: return Priority.REAL_TIME;
        case Priority.INTERACTIVE_HIGH: return Priority.INTERACTIVE_HIGH;
        case Priority.INTERACTIVE_LOW: return Priority.INTERACTIVE_LOW;
        case Priority.DATA_HIGH: return Priority.DATA_HIGH;
        case Priority.DATA: return Priority.DATA;
        case Priority.DATA_LOW: return Priority.DATA_LOW;
        case Priority.BACKGROUND: return Priority.BACKGROUND;
        default: {
            console.warn(`Unsupported Priority value ${val}`);
            return Priority.DEFAULT;
        }
    }
}

function congestionControlFromUint8(val: number): CongestionControl {
    switch (val) {
        case CongestionControl.DROP: return CongestionControl.DROP;
        case CongestionControl.BLOCK: return CongestionControl.BLOCK;
        default: {
            console.warn(`Unsupported CongestionControl value ${val}`);
            return CongestionControl.DEFAULT_PUSH;
        }
    }
}

function reliabilityFromUint8(val: number): Reliability {
    switch (val) {
        case Reliability.BEST_EFFORT: return Reliability.BEST_EFFORT;
        case Reliability.RELIABLE: return Reliability.RELIABLE;
        default: {
            console.warn(`Unsupported Reliability value ${val}`);
            return Reliability.DEFAULT;
        }
    }
}

function localityFromUint8(val: number): Locality {
    switch (val) {
        case Locality.SESSION_LOCAL: return Locality.SESSION_LOCAL;
        case Locality.REMOTE: return Locality.REMOTE;
        case Locality.ANY: return Locality.ANY;
        default: {
            console.warn(`Unsupported Locality value ${val}`);
            return Locality.DEFAULT;
        }
    }
}

export class Qos  {
    constructor(
        public readonly priority: Priority,
        public readonly congestion_control: CongestionControl, 
        public readonly express: boolean,
        public readonly reliability: Reliability,
        public readonly locality: Locality
    ) {}
}

function qosToUint8(qos: Qos): number {
    // llrecppp
    let e = qos.express ? 1 : 0;
    return qos.priority | (qos.congestion_control << 3) | (e << 4) | (qos.reliability << 5) | (qos.locality << 6);
}

function qosFromUint8(val: number): Qos {
    let p = val & 0b111;
    let c = (val >> 3) & 0b1;
    let e = (val >> 4) & 0b1;
    let r = (val >> 5) & 0b1;
    let l = (val >> 6) & 0b11;
    return new Qos(priorityFromUint8(p), congestionControlFromUint8(c), e != 0, reliabilityFromUint8(r), localityFromUint8(l));
}

function queryTargetFromUint8(val: number): QueryTarget {
    switch (val) {
        case QueryTarget.BEST_MATCHING: return QueryTarget.BEST_MATCHING;
        case QueryTarget.ALL: return QueryTarget.ALL;
        case QueryTarget.ALL_COMPLETE: return QueryTarget.ALL_COMPLETE;
        default: {
            console.warn(`Unsupported QueryTarget value ${val}`);
            return QueryTarget.DEFAULT;
        }
    }
}

function consolidationModeFromUint8(val: number): ConsolidationMode {
    switch (val) {
        case ConsolidationMode.AUTO: return ConsolidationMode.AUTO;
        case ConsolidationMode.NONE: return ConsolidationMode.NONE;
        case ConsolidationMode.MONOTONIC: return ConsolidationMode.MONOTONIC;
        case ConsolidationMode.LATEST: return ConsolidationMode.LATEST;
        default: {
            console.warn(`Unsupported ConsolidationMode value ${val}`);
            return ConsolidationMode.DEFAULT;
        }
    }
}

function replyKeyExprFromUint8(val: number): ReplyKeyExpr {
    switch (val) {
        case ReplyKeyExpr.ANY: return ReplyKeyExpr.ANY;
        case ReplyKeyExpr.MATCHING_QUERY: return ReplyKeyExpr.MATCHING_QUERY;
        default: {
            console.warn(`Unsupported ReplyKeyExpr value ${val}`);
            return ReplyKeyExpr.DEFAULT;
        }
    }
}

function serializeEncoding(e: Encoding, serializer: ZBytesSerializer) {
    let [id, schema] = e.toIdSchema();
    // TODO: add id for specifying custom encoding
    serializer.serializeNumberUint16(id ?? EncodingPredefined.ZENOH_BYTES);
    if (schema == undefined) {
        serializer.serializeBoolean(false);
    } else {
        serializer.serializeBoolean(true);
        serializer.serializeString(schema);
    }
}

function serializeOptEncoding(e: Encoding | undefined, serializer: ZBytesSerializer) {
    if (e == undefined) {
        serializer.serializeBoolean(false);
    } else {
        serializer.serializeBoolean(true);
        serializeEncoding(e, serializer);
    }
}

function deserializeEncoding(deserializer: ZBytesDeserializer): Encoding {
    // TODO: add id for specifying custom encoding
    let id = deserializer.deserializeNumberUint16();
    let schema: string | undefined;
    if (deserializer.deserializeBoolean()) {
        schema = deserializer.deserializeString();
    } else {
        schema = undefined;
    }
    return new Encoding(id, schema);
}

function deserializeOptEncoding(deserializer: ZBytesDeserializer): Encoding | undefined {
    if (deserializer.deserializeBoolean()) {
        return deserializeEncoding(deserializer);
    } else {
        return undefined;
    }
}

export class QuerySettings  {
    constructor(
        public readonly target: QueryTarget,
        public readonly consolidation: ConsolidationMode, 
        public readonly replyKeyExpr: ReplyKeyExpr,
    ) {}
}

function querySettingsToUint8(qs: QuerySettings): number {
    // rcctt
    return qs.target | (qs.consolidation << 2) | (qs.replyKeyExpr << 4);
}

function querySettingsFromUint8(val: number): QuerySettings {
    let t = val & 0b11;
    let c = (val >> 2) & 0b11;
    let r = (val >> 4) & 0b1;
    return new QuerySettings(queryTargetFromUint8(t), consolidationModeFromUint8(c), replyKeyExprFromUint8(r));
}

function deserializeZenohId(deserializer: ZBytesDeserializer): ZenohId {
    return new ZenohId(deserializer.deserializeUint8Array());
}

function serializeZid(zid: ZenohId, serializer: ZBytesSerializer) {
    serializer.serializeUint8Array(zid.toLeBytes());
}

function serializeTimestamp(timestamp: Timestamp, serializer: ZBytesSerializer) {
    serializer.serializeBigintUint64(timestamp.getMsSinceUnixEpoch());
    serializeZid(timestamp.getId(), serializer);
}

function serializeOptTimestamp(timestamp: Timestamp | undefined, serializer: ZBytesSerializer) {
    if (timestamp == undefined) {
        serializer.serializeBoolean(false);
    } else {
        serializer.serializeBoolean(true);
        serializeTimestamp(timestamp, serializer);
    }
}

function deserializeTimestamp(deserializer: ZBytesDeserializer): Timestamp {
    let ntp64 = deserializer.deserializeBigintUint64();
    let zid = deserializeZenohId(deserializer);
    return new Timestamp(zid, ntp64);
}

function deserializeOptTimestamp(deserializer: ZBytesDeserializer): Timestamp | undefined {
    if (deserializer.deserializeBoolean()) {
        return deserializeTimestamp(deserializer);
    } else {
        return undefined;
    }
}

function serializeOptUint8Array(a: Uint8Array | undefined, serializer: ZBytesSerializer) {
    if (a == undefined) {
        serializer.serialize(false);
    } else {
        serializer.serialize(true);
        serializer.serializeUint8Array(a);
    }
}

function deserializeOptUint8Array(deserializer: ZBytesDeserializer): Uint8Array | undefined {
    if (deserializer.deserializeBoolean()) {
        return deserializer.deserializeUint8Array();
    } else {
        return undefined;
    }
}

function deserializeOptZBytes(deserializer: ZBytesDeserializer): ZBytes | undefined {
    if (deserializer.deserializeBoolean()) {
        return new ZBytes(deserializer.deserializeUint8Array());
    } else {
        return undefined;
    }
  }


function deserializeSample(deserializer: ZBytesDeserializer): Sample {
    let keyexpr = new KeyExpr(deserializer.deserializeString());
    let payload = new ZBytes(deserializer.deserializeUint8Array());
    let kind = sampleKindFromUint8(deserializer.deserializeNumberUint8());
    let encoding = deserializeEncoding(deserializer);
    let attachment = deserializeOptZBytes(deserializer);
    let timestamp = deserializeOptTimestamp(deserializer);
    let qos = qosFromUint8(deserializer.deserializeNumberUint8());

    return new Sample(
        keyexpr, payload, kind, encoding, attachment, timestamp, 
        qos.priority, qos.congestion_control, qos.express
    );
}

function deserializeReply(deserializer: ZBytesDeserializer): Reply {
    if (deserializer.deserializeBoolean()) {
        return new Reply(deserializeSample(deserializer));
    } else {
        let payload = new ZBytes(deserializer.deserializeUint8Array());
        let encoding = deserializeEncoding(deserializer);
        return new Reply(new ReplyError(payload, encoding));
    }
}

function deserializeQueryInner(deserializer: ZBytesDeserializer): QueryInner {
    let queryId = deserializer.deserializeNumberUint8();
    let keyexpr = new KeyExpr(deserializer.deserializeString());
    let params = new Parameters(deserializer.deserializeString());
    let payload = deserializeOptZBytes(deserializer);
    let encoding = deserializeOptEncoding(deserializer);
    let attachment = deserializeOptZBytes(deserializer);
    let replyKeyExpr = replyKeyExprFromUint8(deserializer.deserializeNumberUint8());

    return new QueryInner(queryId, keyexpr, params, payload, encoding, attachment, replyKeyExpr);
}

export const enum OutRemoteMessageId {
    DeclarePublisher = 0,
    UndeclarePublisher,
    DeclareSubscriber,
    UndeclareSubscriber,
    DeclareQueryable,
    UndeclareQueryable,
    DeclareQuerier,
    UndeclareQuerier,
    DeclareLivelinessToken,
    UndeclareLivelinessToken,
    DeclareLivelinessSubscriber,
    UndeclareLivelinessSubscriber,
    GetSessionInfo,
    GetTimestamp,
    Put,
    Delete,
    PublisherPut,
    PublisherDelete,
    Get,
    QuerierGet,
    LivelinessGet,
    ReplyOk,
    ReplyDel,
    ReplyErr,
    QueryResponseFinal,
    Ping,
}

export type PublisherProperties = {
    keyexpr: KeyExpr,
    encoding: Encoding,
    qos: Qos
};

export class DeclarePublisher {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclarePublisher;
    public constructor(
        public readonly id: number,
        public readonly info: PublisherProperties,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.info.keyexpr.toString());
        serializeEncoding(this.info.encoding, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.info.qos));
    }
}

export class UndeclarePublisher {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclarePublisher;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

export type SubscriberProperties = {
    keyexpr: KeyExpr,
    allowed_origin: Locality
};

export class DeclareSubscriber {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareSubscriber;
    public constructor(
        public readonly id: number,
        public readonly info: SubscriberProperties
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.info.keyexpr.toString());
        serializer.serializeNumberUint8(this.info.allowed_origin);
    }
}

export class UndeclareSubscriber {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclareSubscriber;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

export type QueryableProperties = {
    keyexpr: KeyExpr,
    complete: boolean,
    allowed_origin: Locality
}
export class DeclareQueryable {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareQueryable;
    public constructor(
        public readonly id: number,
        public readonly info: QueryableProperties,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.info.keyexpr.toString());
        serializer.serializeBoolean(this.info.complete);
        serializer.serializeNumberUint8(this.info.allowed_origin);
    }
}

export class UndeclareQueryable {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclareQueryable;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

class DeclareQuerier {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareQuerier;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly qos: Qos,
        public readonly querySettings: QuerySettings,
        public readonly timeoutMs: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeNumberUint8(qosToUint8(this.qos));
        serializer.serializeNumberUint8(querySettingsToUint8(this.querySettings));
        
        serializer.serializeNumberUint32(this.timeoutMs);
    }
}

class UndeclareQuerier {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclareQuerier;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

class DeclareLivelinessToken {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareLivelinessToken;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
    }
}

class UndeclareLivelinessToken {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclareLivelinessToken;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

class DeclareLivelinessSubscriber {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareLivelinessSubscriber;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly history: boolean,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeBoolean(this.history);
    }
}

class GetSessionInfo {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.GetSessionInfo;
    public constructor() {}

    public serializeWithZSerializer(_serializer: ZBytesSerializer) {}
}

class GetTimestamp {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.GetTimestamp;
    public constructor() {}

    public serializeWithZSerializer(_serializer: ZBytesSerializer) {}
}

class Put {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.Put;
    public constructor(
        public readonly keyexpr: KeyExpr,
        public readonly payload: Uint8Array,
        public readonly encoding: Encoding,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
        public readonly qos: Qos
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeUint8Array(this.payload);
        serializeEncoding(this.encoding, serializer);
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.qos));
    }
}

class Delete {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.Delete;
    public constructor(
        public readonly keyexpr: KeyExpr,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
        public readonly qos: Qos
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeString(this.keyexpr.toString());
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.qos));
    }
}

class PublisherPut {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.PublisherPut;
    public constructor(
        public readonly publisherId: number,
        public readonly payload: Uint8Array,
        public readonly encoding: Encoding | undefined,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.publisherId);
        serializer.serializeUint8Array(this.payload);
        serializeOptEncoding(this.encoding, serializer);
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
    }
}

class PublisherDelete {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.PublisherDelete;
    public constructor(
        public readonly publisherId: number,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.publisherId);
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
    }
}

class Get {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.Get;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly parameters: string,
        public readonly payload: Uint8Array | undefined,
        public readonly encoding: Encoding | undefined,
        public readonly attachment: Uint8Array | undefined,
        public readonly qos: Qos,
        public readonly querySettings: QuerySettings,
        public readonly timeoutMs: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeString(this.parameters);
        serializeOptUint8Array(this.payload, serializer);
        serializeOptEncoding(this.encoding, serializer);
        serializeOptUint8Array(this.attachment, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.qos));
        serializer.serializeNumberUint8(querySettingsToUint8(this.querySettings));
        serializer.serializeNumberUint32(this.timeoutMs);
    }
}

class QuerierGet {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.QuerierGet;
    public constructor(
        public readonly querierId: number,
        public readonly id: number,
        public readonly parameters: string,
        public readonly payload: Uint8Array | undefined,
        public readonly encoding: Encoding | undefined,
        public readonly attachment: Uint8Array | undefined,
        public readonly timeoutMs: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.querierId);
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.parameters);
        serializeOptUint8Array(this.payload, serializer);
        serializeOptEncoding(this.encoding, serializer);
        serializeOptUint8Array(this.attachment, serializer);
        serializer.serializeNumberUint32(this.timeoutMs);
    }
}

class LivelinessGet {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.LivelinessGet;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly timeoutMs: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeNumberUint32(this.timeoutMs);
    }
}

class ReplyOk {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.ReplyOk;
    public constructor(
        public readonly queryId: number,
        public readonly keyexpr: KeyExpr,
        public readonly payload: Uint8Array,
        public readonly encoding: Encoding,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
        public readonly qos: Qos
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.queryId);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeUint8Array(this.payload);
        serializeEncoding(this.encoding, serializer);
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.qos));
    }
}

class ReplyDel {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.ReplyDel;
    public constructor(
        public readonly queryId: number,
        public readonly keyexpr: KeyExpr,
        public readonly attachment: Uint8Array | undefined,
        public readonly timestamp: Timestamp | undefined,
        public readonly qos: Qos
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.queryId);
        serializer.serializeString(this.keyexpr.toString());
        serializeOptUint8Array(this.attachment, serializer);
        serializeOptTimestamp(this.timestamp, serializer);
        serializer.serializeNumberUint8(qosToUint8(this.qos));
    }
}

class ReplyErr {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.ReplyErr;
    public constructor(
        public readonly queryId: number,
        public readonly payload: Uint8Array,
        public readonly encoding: Encoding,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.queryId);
        serializer.serializeUint8Array(this.payload);
        serializeEncoding(this.encoding, serializer);
    }
}

class QueryResponseFinal {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.QueryResponseFinal;
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.QueryResponseFinal;

    public constructor(
        public readonly queryId: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.queryId);
    }

    public static deserialize(deserializer: ZBytesDeserializer): QueryResponseFinal {
        let queryId = deserializer.deserializeNumberUint8();
        return new QueryResponseFinal(queryId);
    }
}

export class Ping {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.Ping;

    public constructor() {}

    public serializeWithZSerializer(_serializer: ZBytesSerializer) {}
}


export const enum InRemoteMessageId {
    ResponsePing = 0,
    ResponseOk,
    ResponseError,
    ResponseTimestamp,
    ResponseSessionInfo,
    InSample,
    InQuery,
    InReply,
    QueryResponseFinal,
}

export class ResponsePing {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponsePing;

    public constructor(
        public readonly uuid: string,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): ResponsePing {
        let uuid = deserializer.deserializeString();
        return new ResponsePing(uuid);
    }
}

export class ResponseOk {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseOk;

    public constructor(
        public readonly contentId: OutRemoteMessageId,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): ResponseOk {
        let contentId = deserializer.deserializeNumberUint8();
        return new ResponseOk(contentId);
    }
}

export class ResponseError {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseError;

    public constructor(
        public readonly error: string
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): ResponseError {
        let error = deserializer.deserializeString();
        return new ResponseError(error);
    }
}

export class ResponseTimestamp {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseTimestamp;

    public constructor(
        public readonly timestamp: Timestamp,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): ResponseTimestamp {
        return new ResponseTimestamp(deserializeTimestamp(deserializer));
    }
}

export class ResponseSessionInfo {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseSessionInfo;

    public constructor(
        public readonly zid: ZenohId,
        public readonly routers: ZenohId[],
        public readonly peers: ZenohId[],
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): ResponseSessionInfo {
        let zid = deserializeZenohId(deserializer);
        let dt = ZD.array(ZD.objectStatic(deserializeZenohId));
        let routers = deserializer.deserialize(dt);
        let peers = deserializer.deserialize(dt);
        return new ResponseSessionInfo(zid, routers, peers);
    }
}

export class InSample {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.InSample;

    public constructor(
        public readonly subscriberId: number,
        public readonly sample: Sample,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): InSample {
        let subscriberId = deserializer.deserializeNumberUint32();
        let sample = deserializeSample(deserializer);
        return new InSample(subscriberId, sample);
    }
}

export class InQuery {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.InQuery;

    public constructor(
        public readonly queryableId: number,
        public readonly query: QueryInner,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): InQuery {
        let queryableId = deserializer.deserializeNumberUint32();
        let query = deserializeQueryInner(deserializer);
        return new InQuery(queryableId, query);
    }
}

export class InReply {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.InReply;

    public constructor(
        public readonly queryId: number,
        public readonly reply: Reply,
    ) {}

    static deserialize(deserializer: ZBytesDeserializer): InReply {
        let queryId = deserializer.deserializeNumberUint32();
        let reply = deserializeReply(deserializer);
        return new InReply(queryId, reply);
    }
}


export interface OutMessageInterface {
    readonly outMessageId: OutRemoteMessageId;
    serializeWithZSerializer(serializer: ZBytesSerializer): void;
}

const ID_PRESENCE_FLAG = 0b10000000;
const MESSAGE_ID_MASK = 0b01111111;

export function deserializeHeader(deserializer: ZBytesDeserializer): [InRemoteMessageId, number?] {
    let messageId = deserializer.deserializeNumberUint8();
    if ((messageId & ID_PRESENCE_FLAG) == 0) {
        return [messageId, undefined];
    } else {
        messageId = messageId & MESSAGE_ID_MASK;
        const sequenceId = deserializer.deserializeNumberUint32();
        return [messageId, sequenceId];
    }
}

export function serializeHeader(header: [OutRemoteMessageId, number?], serializer: ZBytesSerializer) {
    if (header[1] == undefined) {
        serializer.serializeNumberUint8(header[0]);
    } else {
        serializer.serializeNumberUint8(header[0] | ID_PRESENCE_FLAG);
        serializer.serializeNumberUint32(header[1]);
    }
}