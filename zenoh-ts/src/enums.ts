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
export enum Priority {
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
export enum CongestionControl {
    // When transmitting a message in a node with a full queue, the node may drop the message.
    DROP = 0,
    // When transmitting a message in a node with a full queue, the node will wait for queue to
    // progress.
    BLOCK = 1,
    DEFAULT_PUSH = DROP,
    DEFAULT_REQUEST = BLOCK,
    DEFAULT_RESPONSE = BLOCK
}

// The publisher reliability.
// Currently `reliability` does not trigger any data retransmission on the wire.
//  It is rather used as a marker on the wire and it may be used to select the best link available (e.g. TCP for reliable data and UDP for best effort data).
export enum Reliability {
    BEST_EFFORT = 0,
    RELIABLE = 1,
    DEFAULT = RELIABLE
}

// The locality of samples to be received by subscribers or targeted by publishers.
export enum Locality {
    SESSION_LOCAL = 0,
    REMOTE = 1,
    ANY = 2,
    DEFAULT = ANY
}


export enum SampleKind {
    PUT = 0,
    DELETE = 1
}

// The `zenoh.queryable.Queryables that should be target of a `zenoh.Session.get()`.
export enum QueryTarget {
    // Let Zenoh find the BestMatching queryable capabale of serving the query.
    BEST_MATCHING = 0,
    // Deliver the query to all queryables matching the query's key expression.
    ALL = 1,
    // Deliver the query to all queryables matching the query's key expression that are declared as complete.
    ALL_COMPLETE = 2,
    DEFAULT = BEST_MATCHING
}

// The kind of consolidation to apply to a query.
export enum ConsolidationMode {
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
export enum ReplyKeyExpr {
    // Accept replies whose key expressions may not match the query key expression.
    ANY = 0,
    // // Accept replies whose key expressions match the query key expression.
    MATCHING_QUERY = 1,
    DEFAULT = MATCHING_QUERY
}