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
/// <reference lib="deno.ns" />

import { Config, Session, TransportInfo, LinkInfo, TransportEventsListener, LinkEventsListener } from "@eclipse-zenoh/zenoh-ts";
import { assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Connectivity - transports()", async () => {
    let session: Session | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const transports: TransportInfo[] = await session.transports();
        assert(Array.isArray(transports), "transports() should return an array");

        for (const t of transports) {
            assert(t.zid() !== undefined, "Transport zid should be defined");
            assert(typeof t.whatami() === "number", "Transport whatami should be a number");
            assert(typeof t.isQos() === "boolean", "Transport isQos should be a boolean");
            assert(typeof t.isMulticast() === "boolean", "Transport isMulticast should be a boolean");
        }
    } finally {
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - links()", async () => {
    let session: Session | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const links: LinkInfo[] = await session.links();
        assert(Array.isArray(links), "links() should return an array");

        for (const l of links) {
            assert(l.zid() !== undefined, "Link zid should be defined");
            assert(typeof l.src() === "string", "Link src should be a string");
            assert(typeof l.dst() === "string", "Link dst should be a string");
            assert(typeof l.mtu() === "number", "Link mtu should be a number");
            assert(typeof l.isStreamed() === "boolean", "Link isStreamed should be a boolean");
            assert(Array.isArray(l.interfaces()), "Link interfaces should be an array");
        }
    } finally {
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - transportEventsListener declare/undeclare", async () => {
    let session: Session | undefined;
    let listener: TransportEventsListener | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        listener = await session.transportEventsListener();
        assert(listener !== undefined, "Transport events listener should be created");
        assert(listener.receiver() !== undefined, "Listener should have a receiver");

        await listener.undeclare();
        listener = undefined;
    } finally {
        await listener?.undeclare();
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - linkEventsListener declare/undeclare", async () => {
    let session: Session | undefined;
    let listener: LinkEventsListener | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        listener = await session.linkEventsListener();
        assert(listener !== undefined, "Link events listener should be created");
        assert(listener.receiver() !== undefined, "Listener should have a receiver");

        await listener.undeclare();
        listener = undefined;
    } finally {
        await listener?.undeclare();
        await session?.close();
        await sleep(100);
    }
});
