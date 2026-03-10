//
// Copyright (c) 2026 ZettaScale Technology
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
import { WhatAmI, SampleKind, Reliability } from "./enums";
import { SessionInner, TransportEventsListenerId, LinkEventsListenerId } from "./session_inner";
import { ZenohId } from "./zid";

/**
 * Information about a zenoh transport.
 */
export class TransportInfo {
    /**
     * @internal
     */
    constructor(
        private readonly zid_: ZenohId,
        private readonly whatami_: WhatAmI,
        private readonly isQos_: boolean,
        private readonly isMulticast_: boolean,
    ) { }

    zid(): ZenohId { return this.zid_; }
    whatami(): WhatAmI { return this.whatami_; }
    isQos(): boolean { return this.isQos_; }
    isMulticast(): boolean { return this.isMulticast_; }
}

/**
 * Information about a zenoh link.
 */
export class LinkInfo {
    /**
     * @internal
     */
    constructor(
        private readonly zid_: ZenohId,
        private readonly src_: string,
        private readonly dst_: string,
        private readonly group_: string | undefined,
        private readonly mtu_: number,
        private readonly isStreamed_: boolean,
        private readonly interfaces_: string[],
        private readonly authIdentifier_: string | undefined,
        private readonly priorities_: [number, number] | undefined,
        private readonly reliability_: Reliability | undefined,
    ) { }

    zid(): ZenohId { return this.zid_; }
    src(): string { return this.src_; }
    dst(): string { return this.dst_; }
    group(): string | undefined { return this.group_; }
    mtu(): number { return this.mtu_; }
    isStreamed(): boolean { return this.isStreamed_; }
    interfaces(): string[] { return this.interfaces_; }
    authIdentifier(): string | undefined { return this.authIdentifier_; }
    priorities(): [number, number] | undefined { return this.priorities_; }
    reliability(): Reliability | undefined { return this.reliability_; }
}

/**
 * An event indicating a transport has been opened or closed.
 */
export class TransportEvent {
    /**
     * @internal
     */
    constructor(
        private readonly kind_: SampleKind,
        private readonly transport_: TransportInfo,
    ) { }

    kind(): SampleKind { return this.kind_; }
    transport(): TransportInfo { return this.transport_; }
}

/**
 * An event indicating a link has been added or removed.
 */
export class LinkEvent {
    /**
     * @internal
     */
    constructor(
        private readonly kind_: SampleKind,
        private readonly link_: LinkInfo,
    ) { }

    kind(): SampleKind { return this.kind_; }
    link(): LinkInfo { return this.link_; }
}

/**
 * Options for a transport events listener.
 */
export interface TransportEventsListenerOptions {
    history?: boolean;
    handler?: Handler<TransportEvent>;
}

/**
 * Options for a link events listener.
 */
export interface LinkEventsListenerOptions {
    history?: boolean;
    handler?: Handler<LinkEvent>;
}

/**
 * A listener for transport lifecycle events (opened/closed).
 */
export class TransportEventsListener {
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
        private id: TransportEventsListenerId,
        private receiver_?: ChannelReceiver<TransportEvent>,
    ) { }

    receiver(): ChannelReceiver<TransportEvent> | undefined {
        return this.receiver_;
    }

    async undeclare() {
        await this.session.undeclareTransportEventsListener(this.id);
    }
}

/**
 * A listener for link lifecycle events (added/removed).
 */
export class LinkEventsListener {
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
        private id: LinkEventsListenerId,
        private receiver_?: ChannelReceiver<LinkEvent>,
    ) { }

    receiver(): ChannelReceiver<LinkEvent> | undefined {
        return this.receiver_;
    }

    async undeclare() {
        await this.session.undeclareLinkEventsListener(this.id);
    }
}
