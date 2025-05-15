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

import { Config, Session, Query, Reply, KeyExpr, Receiver, ZBytes, Selector, ReplyError, Parameters, Sample, QueryTarget } from "@eclipse-zenoh/zenoh-ts";
import { assert_eq, run_test } from "./common/assertions.ts";
import { ChannelReceiver } from "../../dist/index";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryableSessionGetCallbackTest() {
    const ke_queryable = new KeyExpr("zenoh/test/*");
    const ke_get = new KeyExpr("zenoh/test/1");
    const queries: Query[] = [];
    const replies: Reply[] = [];

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke_queryable, {
        handler: (query: Query) => {
            queries.push(query);
            if (query.parameters().toString() === "ok") {
                let payload = query.payload() || "";
                query.reply(query.key_expr(), payload);
            } else {
                query.reply_err("err");
            }
        },
    });

    // sleep for 1 seconds to ensure the queryable is ready
    await sleep(1000);

    const handler = (reply: Reply) => { replies.push(reply); };

    await session2.get(new Selector(ke_get, "ok"), {
        payload: "1",
        handler: handler,
    });

    // sleep to ensure the request is handled
    await sleep(100);

    await session2.get(new Selector(ke_get, "err"), {
        payload: "2",
        handler: handler,
    });

    // sleep to ensure the request is handled
    await sleep(100);

    await queryable.undeclare();

    assert_eq(queries.length, 2, "Queries received");
    assert_eq(replies.length, 2, "Replies received");

    assert_eq(queries[0].key_expr().toString(), ke_get.toString(), "Query 0 key mismatch");
    assert_eq(queries[0].parameters().toString(), "ok", "Query 0 parameters mismatch");
    assert_eq(queries[0].payload()?.to_string(), "1", "Query 0 payload mismatch");
    assert_eq(queries[1].key_expr().toString(), ke_get.toString(), "Query 1 key mismatch");
    assert_eq(queries[1].parameters().toString(), "err", "Query 1 parameters mismatch");
    assert_eq(queries[1].payload()?.to_string(), "2", "Query 1 payload mismatch");
    assert_eq(replies[0].result() instanceof Sample, true, "Reply 0 should be Sample");
    assert_eq(replies[1].result() instanceof ReplyError, true, "Reply 1 should be ReplyError");
    if (replies[0].result() instanceof Reply) {
        assert_eq(replies[0].result().payload().to_string(), "1", "Reply 0 payload mismatch");
    }
    if (replies[1].result() instanceof ReplyError) {
        assert_eq(replies[1].result().payload().to_string(), "err", "Reply 1 payload mismatch");
    }

    await session1.close();
    await session2.close();
}

async function queryableSessionGetChannelTest() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke, { complete: true });

    const receiver1 = await session2.get(new Selector(selector, "ok"), { payload: "1" }) as ChannelReceiver<Reply>;
    let query = await (queryable.receiver() as ChannelReceiver<Query>).receive();
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "ok", "Parameters mismatch");
    let decoder = new TextDecoder();
    assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
    query.reply(query.key_expr(), "1");

    let reply = await receiver1.receive();
    let result = reply.result();
    assert_eq(result instanceof ReplyError, false, "Reply should be OK");
    if (!(result instanceof ReplyError)) {
        assert_eq(result.payload().to_string(), "1", "Reply payload mismatch");
    }

    const receiver2 = await session2.get(new Selector(selector, "err"), { payload: "3" }) as ChannelReceiver<Reply>;
    query = await (queryable.receiver() as ChannelReceiver<Query>).receive();
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "err", "Parameters mismatch");
    assert_eq(query.payload()?.to_string(), "3", "Payload mismatch");
    query.reply_err("err");

    reply = await receiver2.receive();
    result = reply.result();
    assert_eq(result instanceof ReplyError, true, "Reply should be an error");
    if (result instanceof ReplyError) {
        assert_eq(result.payload().to_string(), "err", "Error payload mismatch");
    }

    await queryable.undeclare();

    await session1.close();
    await session2.close();
}

async function queriableQuerierGetChannelTest() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke, { complete: true });
    
    // sleep for 1 second to ensure the queryable is ready
    await sleep(1000);
    
    const querier = await session2.declare_querier(selector, {
        target: QueryTarget.BestMatching
    });

    // First query with ok parameters
    const receiver1 = await querier.get(new Parameters("ok"), { payload: "1" }) as ChannelReceiver<Reply>;
    let query = await (queryable.receiver() as ChannelReceiver<Query>).receive();
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "ok", "Parameters mismatch");
    assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
    query.reply(query.key_expr(), "1");

    // sleep to ensure the reply is processed
    await sleep(100);

    let reply = await receiver1.receive();
    let result = reply.result();
    assert_eq(result instanceof ReplyError, false, "Reply should be OK");
    if (!(result instanceof ReplyError)) {
        assert_eq(result.payload().to_string(), "1", "Reply payload mismatch");
    }

    // Second query using the same querier with error parameters
    let receiver2 = await querier.get(new Parameters("err"), { payload: "2" }) as ChannelReceiver<Reply>;
    query = await (queryable.receiver() as ChannelReceiver<Query>).receive();
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "err", "Parameters mismatch");
    assert_eq(query.payload()?.to_string(), "2", "Payload mismatch");
    query.reply_err("err");
    // sleep to ensure the reply is processed
    await sleep(100);

    reply = await receiver2.receive();
    result = reply.result();
    assert_eq(result instanceof ReplyError, true, "Reply should be an error");
    if (result instanceof ReplyError) {
        assert_eq(result.payload().to_string(), "err", "Error payload mismatch");
    }

    await querier.undeclare();
    await queryable.undeclare();
    await session1.close();
    await session2.close();
}

async function queriableQuerierGetCallbackTest() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");
    const queries: Query[] = [];
    const replies: Reply[] = [];

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke, { complete: true });
    
    // sleep for 1 second to ensure the queryable is ready
    await sleep(1000);
    
    const querier = await session2.declare_querier(selector, {
        target: QueryTarget.BestMatching
    });

    const handler = (reply: Reply) => { replies.push(reply); };

    // First query with ok parameters
    await querier.get(new Parameters("ok"), {
        payload: "1",
        handler: handler
    });

    // sleep to ensure the request is handled
    await sleep(100);

    let query =  await (queryable.receiver() as ChannelReceiver<Query>).receive();
    queries.push(query);
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "ok", "Parameters mismatch");
    assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
    query.reply(query.key_expr(), "1");

    // Second query using the same querier with error parameters
    querier.get(new Parameters("err"), {
        payload: "2",
        handler: handler
    });

    // sleep to ensure the request is handled
    await sleep(100);

    query = await (queryable.receiver() as ChannelReceiver<Query>).receive();
    queries.push(query);
    assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
    assert_eq(query.parameters().toString(), "err", "Parameters mismatch");
    assert_eq(query.payload()?.to_string(), "2", "Payload mismatch");
    query.reply_err("err");

    // sleep to ensure replies are processed
    await sleep(100);

    assert_eq(queries.length, 2, "Queries received");
    assert_eq(replies.length, 2, "Replies received");
    
    assert_eq(replies[0].result() instanceof Sample, true, "Reply 0 should be Sample");
    if (!(replies[0].result() instanceof ReplyError)) {
        assert_eq(replies[0].result().payload().to_string(), "1", "Reply payload mismatch");
    }
    assert_eq(replies[1].result() instanceof ReplyError, true, "Reply 1 should be ReplyError");
    if (replies[1].result() instanceof ReplyError) {
        assert_eq(replies[1].result().payload().to_string(), "err", "Error payload mismatch");
    }

    await querier.undeclare();
    await queryable.undeclare();
    await session1.close();
    await session2.close();
}

await run_test(queryableSessionGetCallbackTest);
await run_test(queryableSessionGetChannelTest);
await run_test(queriableQuerierGetChannelTest);
await run_test(queriableQuerierGetCallbackTest);