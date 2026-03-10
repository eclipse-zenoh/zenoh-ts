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

import { Config, Session, SessionInfo, TransportInfo, LinkInfo, TransportEventsListener, LinkEventsListener, SampleKind, TryReceivedKind, TransportEvent, LinkEvent } from "@eclipse-zenoh/zenoh-ts";
import { assert, assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Connectivity - transports()", async () => {
    let session: Session | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        const transports: TransportInfo[] = await info.transports();
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

        const info: SessionInfo = await session.info();
        const links: LinkInfo[] = await info.links();
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

        const info: SessionInfo = await session.info();
        listener = await info.transportEventsListener();
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

        const info: SessionInfo = await session.info();
        listener = await info.linkEventsListener();
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

Deno.test("Connectivity - transportEventsListener with history option", async () => {
    let session: Session | undefined;
    let listener: TransportEventsListener | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        listener = await info.transportEventsListener({ history: true });
        assert(listener !== undefined, "Transport events listener with history should be created");
        assert(listener.receiver() !== undefined, "Listener should have a receiver");

        // tryReceive should work without error regardless of whether history events arrive
        // (the remote-api-plugin may not replay history for transport events)
        const res = listener.receiver()!.tryReceive();
        assert(res.kind === TryReceivedKind.value || res.kind === TryReceivedKind.notReceived,
            "tryReceive should return value or notReceived");
        if (res.kind === TryReceivedKind.value) {
            const event: TransportEvent = res.value;
            assertEquals(event.kind(), SampleKind.PUT, "History event should be PUT");
            assert(event.transport().zid() !== undefined, "Transport zid should be defined");
        }
    } finally {
        await listener?.undeclare();
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - linkEventsListener with history option", async () => {
    let session: Session | undefined;
    let listener: LinkEventsListener | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        listener = await info.linkEventsListener({ history: true });
        assert(listener !== undefined, "Link events listener with history should be created");
        assert(listener.receiver() !== undefined, "Listener should have a receiver");

        // tryReceive should work without error regardless of whether history events arrive
        const res = listener.receiver()!.tryReceive();
        assert(res.kind === TryReceivedKind.value || res.kind === TryReceivedKind.notReceived,
            "tryReceive should return value or notReceived");
        if (res.kind === TryReceivedKind.value) {
            const event: LinkEvent = res.value;
            assertEquals(event.kind(), SampleKind.PUT, "History event should be PUT");
            assert(event.link().zid() !== undefined, "Link zid should be defined");
        }
    } finally {
        await listener?.undeclare();
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - transportEventsListener no history by default", async () => {
    let session: Session | undefined;
    let listener: TransportEventsListener | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        listener = await info.transportEventsListener();
        await sleep(100);

        const receiver = listener.receiver();
        assert(receiver !== undefined, "Listener should have a receiver");

        const res = receiver!.tryReceive();
        assertEquals(res.kind, TryReceivedKind.notReceived, "Should not receive events without history option");
    } finally {
        await listener?.undeclare();
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - transport fields validation", async () => {
    let session: Session | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        const transports: TransportInfo[] = await info.transports();
        assert(Array.isArray(transports), "transports() should return an array");

        for (const t of transports) {
            assert(t.zid() !== undefined, "Transport zid should be defined");
            assert(typeof t.whatami() === "number", "Transport whatami should be a number");
            assert(t.whatami() >= 0, "Transport whatami should be non-negative");
            assert(typeof t.isQos() === "boolean", "Transport isQos should be a boolean");
            assert(typeof t.isMulticast() === "boolean", "Transport isMulticast should be a boolean");
        }
    } finally {
        await session?.close();
        await sleep(100);
    }
});

Deno.test("Connectivity - link fields validation", async () => {
    let session: Session | undefined;

    try {
        session = await Session.open(new Config("ws/127.0.0.1:10000"));
        await sleep(100);

        const info: SessionInfo = await session.info();
        const links: LinkInfo[] = await info.links();
        assert(Array.isArray(links), "links() should return an array");

        for (const l of links) {
            assert(l.zid() !== undefined, "Link zid should be defined");
            assert(typeof l.src() === "string", "Link src should be a string");
            assert(l.src().length > 0, "Link src should not be empty");
            assert(typeof l.dst() === "string", "Link dst should be a string");
            assert(l.dst().length > 0, "Link dst should not be empty");
            assert(typeof l.mtu() === "number", "Link mtu should be a number");
            assert(typeof l.isStreamed() === "boolean", "Link isStreamed should be a boolean");
            assert(Array.isArray(l.interfaces()), "Link interfaces should be an array");
            // Optional fields: verify they are either their expected type or undefined
            const group = l.group();
            assert(group === undefined || typeof group === "string", "Link group should be string or undefined");
            const authId = l.authIdentifier();
            assert(authId === undefined || typeof authId === "string", "Link authIdentifier should be string or undefined");
            const priorities = l.priorities();
            assert(priorities === undefined || (Array.isArray(priorities) && priorities.length === 2), "Link priorities should be [number, number] or undefined");
            const reliability = l.reliability();
            assert(reliability === undefined || typeof reliability === "number", "Link reliability should be Reliability enum or undefined");
        }
    } finally {
        await session?.close();
        await sleep(100);
    }
});
