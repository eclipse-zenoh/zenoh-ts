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

// Message priority.
export const enum Priority {
    REAL_TIME = 1,
    INTERACTIVE_HIGH = 2,
    INTERACTIVE_LOW = 3,
    DATA_HIGH = 4,
    DATA = 5,
    DATA_LOW = 6,
    BACKGROUND = 7,
    DEFAULT = DATA,
}

// Congestion control strategy.
export const enum CongestionControl {
    // When transmitting a message in a node with a full queue, the node may drop the message.
    DROP = 0,
    // When transmitting a message in a node with a full queue, the node will wait for queue to
    // progress.
    BLOCK = 1,
    DEFAULT_PUSH = DROP,
    DEFAULT_REQUEST = BLOCK
}

export const enum Reliability {
    BEST_EFFORT = 0,
    RELIABLE = 1,
    DEFAULT = RELIABLE
}

// The locality of samples to be received by subscribers or targeted by publishers.
export const enum Locality {
    SESSION_LOCAL = 0,
    REMOTE = 1,
    ANY = 2,
    DEFAULT = ANY
}


export const enum SampleKind {
    Put = 0,
    Delete = 1
}

export function sampleKindFromUint8(val: number): SampleKind {
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

    public toUint8(): number {
        // llrecppp
        let e = this.express ? 1 : 0;
        return this.priority | (this.congestion_control << 3) | (e << 4) | (this.reliability << 5) | (this.locality << 6);
    }

    public static fromUint8(val: number): Qos {
        let p = val & 0b111;
        let c = (val >> 3) & 0b1;
        let e = (val >> 4) & 0b1;
        let r = (val >> 5) & 0b1;
        let l = (val >> 6) & 0b11;
        return new Qos(priorityFromUint8(p), congestionControlFromUint8(c), e != 0, reliabilityFromUint8(r), localityFromUint8(l));
    }
}

// The `zenoh::queryable::Queryable`s that should be target of a `zenoh::Session::get()`.
export const enum QueryTarget {
    // Let Zenoh find the BestMatching queryable capabale of serving the query.
    BEST_MATCHING = 0,
    // Deliver the query to all queryables matching the query's key expression.
    ALL = 1,
    // Deliver the query to all queryables matching the query's key expression that are declared as complete.
    ALL_COMPLETE = 2,
    DEFAULT = BEST_MATCHING
}

// The kind of consolidation to apply to a query.
export const enum ConsolidationMode {
    // Apply automatic consolidation based on queryable's preferences
    AUTO = 0,
    // No consolidation applied: multiple samples may be received for the same key-timestamp.
    NONE = 1,
    // Monotonic consolidation immediately forwards samples, except if one with an equal or more recent timestamp
    // has already been sent with the same key.
    //
    // This optimizes latency while potentially reducing bandwidth.
    //
    // Note that this doesn't cause re-ordering, but drops the samples for which a more recent timestamp has already
    // been observed with the same key.
    MONOTONIC = 2,
    // Holds back samples to only send the set of samples that had the highest timestamp for their key.  
    LATEST = 3,
    DEFAULT = AUTO
}

// The kind of accepted query replies.
export const enum ReplyKeyExpr {
    // Accept replies whose key expressions may not match the query key expression.
    ANY = 0,
    // // Accept replies whose key expressions match the query key expression.
    MATCHING_QUERY = 1,
    DEFAULT = MATCHING_QUERY
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

export class QuerySettings  {
    constructor(
        public readonly target: QueryTarget,
        public readonly consolidation: ConsolidationMode, 
        public readonly replyKeyExpr: ReplyKeyExpr,
    ) {}

    public toUint8(): number {
        // rcctt
        return this.target | (this.consolidation << 2) | (this.replyKeyExpr << 4);
    }

    public static fromUint8(val: number): QuerySettings {
        let t = val & 0b11;
        let c = (val >> 2) & 0b11;
        let r = (val >> 4) & 0b1;
        return new QuerySettings(queryTargetFromUint8(t), consolidationModeFromUint8(c), replyKeyExprFromUint8(r));
    }
}