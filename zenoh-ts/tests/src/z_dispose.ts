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

import { 
    Config, 
    Session, 
    Sample,
    Query,
    MatchingStatus,
} from "@eclipse-zenoh/zenoh-ts";
import { assert, assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { Duration } from "typed-duration";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timeoutId: number;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    
    return Promise.race([
        promise.then((result) => {
            clearTimeout(timeoutId);
            return result;
        }),
        timeoutPromise
    ]);
}

Deno.test("API - z_dispose: Verify automatic disposal (await using) for all object types", async () => {
    try {
        // Test automatic disposal with await using for all object types
        {
            await using session = await Session.open(new Config("ws/127.0.0.1:10000"));

            await using _subscriber = await session.declareSubscriber("test/subscriber", {
                handler: (_sample: Sample) => {},
            });

            await using publisher = await session.declarePublisher("test/publisher");

            await using _queryable = await session.declareQueryable("test/dispose/queryable", {
                handler: async (query: Query) => { 
                    await using q = query;  // Query auto-finalization test
                    q.reply("test/dispose/queryable", "response"); 
                },
            });

            await sleep(100); // Wait for queryable to be ready

            // Trigger the queryable to test Query's auto-disposal
            const receiver = await session.get("test/dispose/queryable", { timeout: Duration.milliseconds.of(500) });

            // Verify we received the reply quickly (would timeout if finalize not called)
            assert(receiver, "Should get a receiver from session.get");
            const reply = await timeout(
                receiver.receive(),
                500,
                "Reply not received within 500ms - query may not have been finalized"
            );
            assert(reply !== undefined, "Should receive a reply");
            const result = reply.result();
            assert(result instanceof Sample, "Reply should contain a Sample");
            if (result instanceof Sample) {
                assertEquals(result.payload().toString(), "response", "Reply payload should match");
            }

            await using querier = await session.declareQuerier("test/querier");

            await using _publisherMatchingListener = await publisher.matchingListener({
                handler: (_status: MatchingStatus) => {},
            });

            await using _querierMatchingListener = await querier.matchingListener({
                handler: (_status: MatchingStatus) => {},
            });

            await using _token = await session.liveliness().declareToken("test/liveliness/token");

            await using _livelinessSubscriber = await session.liveliness().declareSubscriber("test/liveliness/**", {
                handler: (_sample: Sample) => {},
            });

            // Objects should be automatically disposed at end of scope
        }

        await sleep(100); // Wait for disposal to complete
    } catch (e) {
        assert(false, `Test failed with exception: ${e}`);
    }
});
