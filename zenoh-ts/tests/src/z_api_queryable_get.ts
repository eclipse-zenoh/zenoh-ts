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

import { Config, Session, Query, Reply, KeyExpr, Selector, ReplyError, Parameters, Sample, QueryTarget, Queryable, ChannelReceiver, Querier, ConsolidationMode } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("API - Session Get with Callback", async () => {
    const keQueryable = new KeyExpr("zenoh/test/*");
    const keGet = new KeyExpr("zenoh/test/1");
    const queries: Query[] = [];
    const replies: Reply[] = [];

    let session1: Session | undefined;
    let session2: Session | undefined;
    let queryable: Queryable | undefined;

    try {
        session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
        session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

        queryable = await session1.declareQueryable(keQueryable, {
            handler: (query: Query) => {
                queries.push(query);
                if (query.parameters().toString() === "ok") {
                    const payload = query.payload() || "";
                    query.reply(query.keyExpr(), payload);
                } else {
                    query.replyErr("err");
                }
                query.finalize();
            },
        });

        // sleep for 1 seconds to ensure the queryable is ready
        await sleep(1000);

        const handler = (reply: Reply) => { replies.push(reply); };

        await session2.get(new Selector(keGet, "ok"), {
            payload: "1",
            handler: handler,
        });

        // sleep to ensure the request is handled
        await sleep(100);

        await session2.get(new Selector(keGet, "err"), {
            payload: "2",
            handler: handler,
        });

        // sleep to ensure the request is handled
        await sleep(100);

        assertEquals(queries.length, 2, "Queries received");
        assertEquals(replies.length, 2, "Replies received");

        assertEquals(queries[0].keyExpr().toString(), keGet.toString(), "Query 0 key mismatch");
        assertEquals(queries[0].parameters().toString(), "ok", "Query 0 parameters mismatch");
        assertEquals(queries[0].payload()?.toString(), "1", "Query 0 payload mismatch");
        assertEquals(queries[1].keyExpr().toString(), keGet.toString(), "Query 1 key mismatch");
        assertEquals(queries[1].parameters().toString(), "err", "Query 1 parameters mismatch");
        assertEquals(queries[1].payload()?.toString(), "2", "Query 1 payload mismatch");
        assertEquals(replies[0].result() instanceof Sample, true, "Reply 0 should be Sample");
        assertEquals(replies[1].result() instanceof ReplyError, true, "Reply 1 should be ReplyError");
        if (replies[0].result() instanceof Sample) {
            assertEquals(replies[0].result().payload().toString(), "1", "Reply 0 payload mismatch");
        }
        if (replies[1].result() instanceof ReplyError) {
            assertEquals(replies[1].result().payload().toString(), "err", "Reply 1 payload mismatch");
        }
    } finally {
        // Cleanup in reverse order of creation
        if (queryable) {
            await queryable.undeclare();
        }
        if (session2) {
            await session2.close();
        }
        if (session1) {
            await session1.close();
        }
        await sleep(100);
    }
});

Deno.test("API - Session Get with Channel", async () => {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    let session1: Session | undefined;
    let session2: Session | undefined;
    let queryable: Queryable | undefined;
    let receiver1: ChannelReceiver<Reply> | undefined;
    let receiver2: ChannelReceiver<Reply> | undefined;

    try {
        session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
        session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

        queryable = await session1.declareQueryable(ke, { complete: true });

        receiver1 = await session2.get(new Selector(selector, "ok"), { payload: "1" });
        if (!receiver1) {
            throw new Error("Failed to get receiver");
        }

        const query = await queryable.receiver()?.receive();
        if (!query) {
            throw new Error("Failed to get query");
        }

        assertEquals(query.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query.parameters().toString(), "ok", "Parameters mismatch");
        assertEquals(query.payload()?.toString(), "1", "Payload mismatch");
        query.reply(query.keyExpr(), "1");
        query.finalize();

        let reply = await receiver1.receive();
        const result = reply.result();
        assertEquals(result instanceof ReplyError, false, "Reply should be OK");
        if (!(result instanceof ReplyError)) {
            assertEquals(result.payload().toString(), "1", "Reply payload mismatch");
        }

        receiver2 = await session2.get(new Selector(selector, "err"), { payload: "3" });
        if (!receiver2) {
            throw new Error("Failed to get receiver");
        }

        const query2 = await queryable.receiver()?.receive();
        if (!query2) {
            throw new Error("Failed to get query");
        }
        assertEquals(query2.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query2.parameters().toString(), "err", "Parameters mismatch");
        assertEquals(query2.payload()?.toString(), "3", "Payload mismatch");
        query2.replyErr("err");
        query2.finalize();

        reply = await receiver2.receive();
        const result2 = reply.result();
        assertEquals(result2 instanceof ReplyError, true, "Reply should be an error");
        if (result2 instanceof ReplyError) {
            assertEquals(result2.payload().toString(), "err", "Error payload mismatch");
        }
    } finally {
        // Cleanup in reverse order of creation
        if (queryable) {
            await queryable.undeclare();
        }
        if (session2) {
            await session2.close();
        }
        if (session1) {
            await session1.close();
        }
        await sleep(100);
    }
});

Deno.test("API - Querier Get with Channel", async () => {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    let session1: Session | undefined;
    let session2: Session | undefined;
    let queryable: Queryable | undefined;
    let querier: Querier | undefined;
    let receiver1: ChannelReceiver<Reply> | undefined;
    let receiver2: ChannelReceiver<Reply> | undefined;

    try {
        session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
        session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

        queryable = await session1.declareQueryable(ke, { complete: true });
        
        // sleep for 1 second to ensure the queryable is ready
        await sleep(1000);
        
        querier = await session2.declareQuerier(selector, {
            target: QueryTarget.BEST_MATCHING
        });

        // First query with ok parameters
        receiver1 = await querier.get({ parameters: new Parameters("ok"), payload: "1" });
        if (!receiver1) {
            throw new Error("Failed to get receiver");
        }

        const query = await queryable.receiver()?.receive();
        if (!query) {
            throw new Error("Failed to get query");
        }

        assertEquals(query.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query.parameters().toString(), "ok", "Parameters mismatch");
        assertEquals(query.payload()?.toString(), "1", "Payload mismatch");
        query.reply(query.keyExpr(), "1");
        query.finalize();

        // sleep to ensure the reply is processed
        await sleep(100);

        let reply = await receiver1.receive();
        let result = reply.result();
        assertEquals(result instanceof ReplyError, false, "Reply should be OK");
        if (!(result instanceof ReplyError)) {
            assertEquals(result.payload().toString(), "1", "Reply payload mismatch");
        }

        // Second query using the same querier with error parameters
        receiver2 = await querier.get({ parameters: new Parameters("err"), payload: "2" });
        if (!receiver2) {
            throw new Error("Failed to get receiver");
        }

        const query2 = await queryable.receiver()?.receive();
        if (!query2) {
            throw new Error("Failed to get query");
        }

        assertEquals(query2.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query2.parameters().toString(), "err", "Parameters mismatch");
        assertEquals(query2.payload()?.toString(), "2", "Payload mismatch");
        query2.replyErr("err");
        query2.finalize();
        
        // sleep to ensure the reply is processed
        await sleep(100);

        reply = await receiver2.receive();
        result = reply.result();
        assertEquals(result instanceof ReplyError, true, "Reply should be an error");
        if (result instanceof ReplyError) {
            assertEquals(result.payload().toString(), "err", "Error payload mismatch");
        }
    } finally {
        // Cleanup in reverse order of creation
        if (querier) {
            await querier.undeclare();
        }
        if (queryable) {
            await queryable.undeclare();
        }
        if (session2) {
            await session2.close();
        }
        if (session1) {
            await session1.close();
        }
        await sleep(100);
    }
});

Deno.test("API - Querier Get with Callback", async () => {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    let session1: Session | undefined;
    let session2: Session | undefined;
    let queryable: Queryable | undefined;
    let querier: Querier | undefined;

    try {
        session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
        session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

        queryable = await session1.declareQueryable(ke, { complete: true });
        
        // sleep for 1 second to ensure the queryable is ready
        await sleep(1000);
        
        querier = await session2.declareQuerier(selector, {
            target: QueryTarget.BEST_MATCHING
        });

        // First query with ok parameters
        const replies: Reply[] = [];
        const handler = (reply: Reply) => {
            replies.push(reply);
        };

        const receiver1 = await querier.get({ parameters: new Parameters("ok"), payload: "1", handler });
        assertEquals(receiver1, undefined, "Receiver should be undefined when handler is provided");


        // sleep to ensure the request is handled
        await sleep(100);
        const query = await queryable.receiver()?.receive();
        if (!query) {
            throw new Error("Failed to get query");
        }

        assertEquals(query.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query.parameters().toString(), "ok", "Parameters mismatch");
        assertEquals(query.payload()?.toString(), "1", "Payload mismatch");
        query.reply(query.keyExpr(), "1");
        query.finalize();
        
        // sleep to ensure the reply is sent
        await sleep(200);

        assertEquals(replies.length, 1, "Replies received");
        assertEquals(replies[0].result() instanceof ReplyError, false, "Reply 0 should be OK");
        if (!(replies[0].result() instanceof ReplyError)) {
            assertEquals((replies[0].result()).payload().toString(), "1", "Reply payload mismatch");
        }

        // Second query using the same querier with error parameters
        const receiver2 = await querier.get({ parameters: new Parameters("err"), payload: "2", handler });
        assertEquals(receiver2, undefined, "Receiver should be undefined when handler is provided");

        const query2 = await queryable.receiver()?.receive();
        if (!query2) {
            throw new Error("Failed to get query");
        }

        assertEquals(query2.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query2.parameters().toString(), "err", "Parameters mismatch");
        assertEquals(query2.payload()?.toString(), "2", "Payload mismatch");
        query2.replyErr("err");
        query2.finalize();

        // sleep to ensure the reply is processed
        await sleep(100);
        
        assertEquals(replies.length, 2, "Replies received");
        assertEquals(replies[1].result() instanceof ReplyError, true, "Reply 1 should be an error");
        if (replies[1].result() instanceof ReplyError) {
            assertEquals((replies[1].result()).payload().toString(), "err", "Error payload mismatch");
        }
    } finally {
        // Cleanup in reverse order of creation
        if (querier) {
            await querier.undeclare();
        }
        if (queryable) {
            await queryable.undeclare();
        }
        if (session2) {
            await session2.close();
        }
        if (session1) {
            await session1.close();
        }
        await sleep(100);
    }
});

Deno.test("API - Session Get with multiple responses", async () => {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    let session1: Session | undefined;
    let session2: Session | undefined;
    let queryable: Queryable | undefined;
    let receiver1: ChannelReceiver<Reply> | undefined;
    let receiver2: ChannelReceiver<Reply> | undefined;

    try {
        session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
        session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

        queryable = await session1.declareQueryable(ke, { complete: true });

        receiver1 = await session2.get(new Selector(selector, "ok"), { payload: "1", consolidation: ConsolidationMode.NONE });
        if (!receiver1) {
            throw new Error("Failed to get receiver");
        }

        const query = await queryable.receiver()?.receive();
        if (!query) {
            throw new Error("Failed to get query");
        }

        assertEquals(query.keyExpr().toString(), selector.toString(), "Key mismatch");
        assertEquals(query.parameters().toString(), "ok", "Parameters mismatch");
        assertEquals(query.payload()?.toString(), "1", "Payload mismatch");
        query.reply(query.keyExpr(), "1");
        query.reply(query.keyExpr(), "2");
        query.replyErr("3");
        query.finalize();

        let replies = new Array<Reply>();
        for await (const reply of receiver1) {
            replies.push(reply);
        }
        assertEquals(replies.length, 3, "Should receive 3 replies");

        let result = replies[0].result();
        assertEquals(result instanceof ReplyError, false, "Reply should be OK");
        assertEquals(result.payload().toString(), "1", "Reply payload mismatch");

        result = replies[1].result();
        assertEquals(result instanceof ReplyError, false, "Reply should be OK");
        assertEquals(result.payload().toString(), "2", "Reply payload mismatch");

        result = replies[2].result();
        assertEquals(result instanceof ReplyError, true, "Reply should be ERROR");
        assertEquals(result.payload().toString(), "3", "Reply payload mismatch");


        receiver2 = await session2.get(new Selector(selector, "ok"), { payload: "1", consolidation: ConsolidationMode.NONE });
        if (!receiver2) {
            throw new Error("Failed to get receiver");
        }

        const query2 = await queryable.receiver()?.receive();
        if (!query2) {
            throw new Error("Failed to get query");
        }
        query2.finalize();

        let replies2 = new Array<Reply>();
        for await (const reply of receiver2) {
            replies2.push(reply);
        }
        assertEquals(replies2.length, 0, "Should receive 0 replies");

    } finally {
        // Cleanup in reverse order of creation
        if (queryable) {
            await queryable.undeclare();
        }
        if (session2) {
            await session2.close();
        }
        if (session1) {
            await session1.close();
        }
        await sleep(100);
    }
});