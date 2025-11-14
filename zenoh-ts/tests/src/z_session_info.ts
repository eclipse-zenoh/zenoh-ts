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
/// <reference lib="deno.ns" />

import { Config, SessionInfo, ZenohId, open } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Session Info - Comprehensive test", async () => {
    const session = await open(new Config("ws/127.0.0.1:10000"));
    await sleep(100);

    assert(session !== undefined, "Session should be created");
    assert(!session.isClosed(), "Session should not be closed");

    const info: SessionInfo = await session.info();
    const zid = info.zid();
    const routers = info.routersZid();
    const peers = info.peersZid();

    assert(zid !== undefined, "ZID should be defined");
    assert(Array.isArray(routers), "Routers should be an array");
    assert(Array.isArray(peers), "Peers should be an array");

    // Multiple sessions share the same ZID
    const session2 = await open(new Config("ws/127.0.0.1:10000"));
    await sleep(100);
    const info2: SessionInfo = await session2.info();
    const zid2: ZenohId = info2.zid();
    // Currently, when connecting to remote-api-plugin, all client sessions
    // share the same ZID because they represent the same underlying Zenoh
    // session on the server side. This behavior may change in the future
    // if the remote-api-plugin is enhanced to provide unique session IDs
    // for each client connection.
    assertEquals(zid.toString(), zid2.toString(), 
            "Sessions connected to the same remote-api-plugin should have the same ZID");

    session2.close();
    session.close();
    await sleep(100);
    assert(session.isClosed(), "Session should be closed");
    assert(session2.isClosed(), "Session2 should be closed");
});