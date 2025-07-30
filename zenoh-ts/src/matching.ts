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

import { ChannelReceiver, Handler } from "./channels";
import { SessionInner } from "./session_inner";

/**
 * A class that indicates if there exist Subscribers matching the Publisher's key expression or Queryables matching Querier's key expression and target.
 */
export class MatchingStatus {
    /**
     * @internal
     */
    constructor(
        private readonly matching_: boolean,
    ) { }

    /**
     * 
     * @returns ``True`` if there exist matching Zenoh entities, ``false`` otherwise.
     */
    matching(): boolean {
        return this.matching_;
    }
}

/**
 * Options for a Matching listener
 * @prop {Handler<MatchingStatus=>} handler - Handler for this matching listener
 */
export interface MatchingListenerOptions {
    handler?: Handler<MatchingStatus>,
}

/**
 * A Zenoh matching listener that sends notifications when the `MatchingStatus` of a `Publisher` or a `Querier` changes.
 */

export class MatchingListener {
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
        private receiver_?: ChannelReceiver<MatchingStatus>,
    ) { }

    /**
     * returns a message status receiver for non-callback matching listener, undefined otherwise.
     *
     * @returns ChannelReceiver<MatchingStatus> | undefined
     */
    receiver(): ChannelReceiver<MatchingStatus> | undefined {
        return this.receiver_;
    }

    /**
     * Undeclares a subscriber on the session
     *
     */
    async undeclare() {
        await this.session.undeclareMatchingListener(this.id);
    }
}