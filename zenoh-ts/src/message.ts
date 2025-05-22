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
import { Encoding } from "./encoding.js";
import { KeyExpr } from "./key_expr.js";
import { Qos, Locality, QuerySettings } from "./enums.js";
import { Timestamp } from "./timestamp";
import { Zid } from "./zid";
import { Sample } from "./sample";
import { ZBytes } from "./z_bytes";
import { Query } from "./query";

const enum OutRemoteMessageId {
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
}

class DeclarePublisher {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclarePublisher;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly encoding: Encoding,
        public readonly qos: Qos
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        this.encoding.serializeWithZSerializer(serializer);
        serializer.serializeNumberUint8(this.qos.toUint8());
    }
}

class UndeclarePublisher {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclarePublisher;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

class DeclareSubscriber {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareSubscriber;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly allowed_origin: Locality
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeNumberUint8(this.allowed_origin);
    }
}

class UndeclareSubscriber {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.UndeclareSubscriber;
    public constructor(
        public readonly id: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
    }
}

class DeclareQueryable {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.DeclareQueryable;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly complete: boolean,
        public readonly allowed_origin: Locality
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeBoolean(this.complete);
        serializer.serializeNumberUint8(this.allowed_origin);
    }
}

class UndeclareQueryable {
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
        public readonly timeout_ms: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint8(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeNumberUint8(this.qos.toUint8());
        serializer.serializeNumberUint8(this.qos.toUint8());
        serializer.serializeNumberUint32(this.timeout_ms);
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
        this.encoding.serializeWithZSerializer(serializer);
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
        serializer.serializeNumberUint8(this.qos.toUint8());
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
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
        serializer.serializeNumberUint8(this.qos.toUint8());
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
        if (this.encoding == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.encoding.serializeWithZSerializer(serializer);
        }
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
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
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
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
        public readonly timeout_ms: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeString(this.parameters);
        if (this.payload == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(false);
            serializer.serializeUint8Array(this.payload);
        }
        if (this.encoding == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(false);
            this.encoding.serializeWithZSerializer(serializer);
        }
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        serializer.serializeNumberUint8(this.qos.toUint8());
        serializer.serializeNumberUint8(this.querySettings.toUint8());
        serializer.serializeNumberUint32(this.timeout_ms);
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
        public readonly timeout_ms: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.querierId);
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.parameters);
        if (this.payload == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(false);
            serializer.serializeUint8Array(this.payload);
        }
        if (this.encoding == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(false);
            this.encoding.serializeWithZSerializer(serializer);
        }
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        serializer.serializeNumberUint32(this.timeout_ms);
    }
}

class LivelinessGet {
    public readonly outMessageId: OutRemoteMessageId = OutRemoteMessageId.LivelinessGet;
    public constructor(
        public readonly id: number,
        public readonly keyexpr: KeyExpr,
        public readonly timeout_ms: number,
    ) {}

    public serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeNumberUint32(this.id);
        serializer.serializeString(this.keyexpr.toString());
        serializer.serializeNumberUint32(this.timeout_ms);
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
        this.encoding.serializeWithZSerializer(serializer);
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
        serializer.serializeNumberUint8(this.qos.toUint8());
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
        if (this.attachment == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            serializer.serializeUint8Array(this.attachment);
        }
        if (this.timestamp == undefined) {
            serializer.serializeBoolean(false);
        } else {
            serializer.serializeBoolean(true);
            this.timestamp.serializeWithZSerializer(serializer);
        }
        serializer.serializeNumberUint8(this.qos.toUint8());
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
        this.encoding.serializeWithZSerializer(serializer);
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

const enum InRemoteMessageId {
    OpenAck = 0,
    Ok,
    Error,
    ResponseTimestamp,
    ResponseSessionInfo,
    InSample,
    InQuery,
    InReply,
    QueryResponseFinal,
}

class OpenAck {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.OpenAck;

    public constructor(
        public readonly uuid: string,
    ) {}

    public static deserialize(deserializer: ZBytesDeserializer): OpenAck {
        let uuid = deserializer.deserializeString();
        return new OpenAck(uuid);
    }
}

class Ok {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.Ok;

    public constructor(
        public readonly contentId: OutRemoteMessageId,
    ) {}

    public static deserialize(deserializer: ZBytesDeserializer): Ok {
        let contentId = deserializer.deserializeNumberUint8();
        return new Ok(contentId);
    }
}

class Error {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.Error;

    public constructor(
        public readonly contentId: OutRemoteMessageId,
        public readonly error: string
    ) {}

    public static deserialize(deserializer: ZBytesDeserializer): Error {
        let contentId = deserializer.deserializeNumberUint8();
        let error = deserializer.deserializeString();
        return new Error(contentId, error);
    }
}

class ResponseTimestamp {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseTimestamp;

    public constructor(
        public readonly timestamp: Timestamp,
    ) {}

    public deserialize(deserializer: ZBytesDeserializer): ResponseTimestamp {
        return new ResponseTimestamp(Timestamp.deserialize(deserializer));
    }
}

class ResponseSessionInfo {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.ResponseSessionInfo;

    public constructor(
        public readonly zid: Zid,
        public readonly routers: Zid[],
        public readonly peers: Zid[],
    ) {}

    public deserialize(deserializer: ZBytesDeserializer): ResponseSessionInfo {
        let zid = Zid.deserialize(deserializer);
        let dt = ZD.array(ZD.objectStatic(Zid.deserialize));
        let routers = deserializer.deserialize(dt);
        let peers = deserializer.deserialize(dt);
        return new ResponseSessionInfo(zid, routers, peers);
    }
}



class InSample {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.InSample;

    public constructor(
        public readonly subscriberId: number,
        public readonly sample: Sample,
    ) {}

    public deserialize(deserializer: ZBytesDeserializer): InSample {
        let subscriberId = deserializer.deserializeNumberUint32();
        let sample = Sample.deserialize(deserializer);
        return new InSample(subscriberId, sample);
    }
}

class InQuery {
    public readonly inMessageId: InRemoteMessageId = InRemoteMessageId.InQuery;

    public constructor(
        public readonly queryableId: number,
        public readonly query: Query,
    ) {}

    public deserialize(deserializer: ZBytesDeserializer): InSample {
        let queryableId = deserializer.deserializeNumberUint32();
        let query = Query.deserialize(deserializer);
        return new InQuery(queryableId, query);
    }
}