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
import { assert_eq } from "./common/assertions.ts";

async function queryableGetCallbackTest() {
    const ke_queryable = new KeyExpr("zenoh/test/*");
    const ke_get = new KeyExpr("zenoh/test/1");
    const queries: Query[] = [];
    const replies: Reply[] = [];

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = session1.declare_queryable(ke_queryable, {
        handler: async (query: Query) => {
            queries.push(query);
            if (query.parameters().toString() === "p=ok") {
                let payload = query.payload() || "";
                query.reply(query.key_expr(), payload);
            } else {
                query.reply_err("err");
            }
        },
    });

    // sleep for 1 seconds to ensure the queryable is ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Similar test in C++ passes just "ok" in parameters, but this doesn't work in
    // zenoh-ts due to https://github.com/eclipse-zenoh/zenoh-ts/issues/191
    // TODO: restore just "ok" in parameters after fixing the issue
    const handler = async (reply: Reply) => { replies.push(reply); };

    session2.get(new Selector(ke_get, "p=ok"), {
        payload: "1",
        handler: handler,
    });

    // sleep to ensure the request is handled
    await new Promise((resolve) => setTimeout(resolve, 100));

    session2.get(new Selector(ke_get, "p=err"), {
        payload: "2",
        handler: handler,
    });

    // sleep to ensure the request is handled
    await new Promise((resolve) => setTimeout(resolve, 100));

    await queryable.undeclare();

    assert_eq(queries.length, 2, "Queries received");
    assert_eq(replies.length, 2, "Replies received");

    assert_eq(queries[0].key_expr().toString(), ke_get.toString(), "Query 0 key mismatch");
    assert_eq(queries[0].parameters().toString(), "p=ok", "Query 0 parameters mismatch");
    assert_eq(queries[0].payload()?.to_string(), "1", "Query 0 payload mismatch");
    assert_eq(queries[1].key_expr().toString(), ke_get.toString(), "Query 1 key mismatch");
    assert_eq(queries[1].parameters().toString(), "p=err", "Query 1 parameters mismatch");
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

async function queryableGetChannelTest() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke, { complete: true });

    // Similar test in C++ passes just "ok" in parameters, but this doesn't work in
    // zenoh-ts due to https://github.com/eclipse-zenoh/zenoh-ts/issues/191
    // TODO: restore just "ok" in parameters after fixing the issue
    const receiver1 = await session2.get(new Selector(selector, "p=ok"), { payload: "1" });
    let query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
        assert_eq(query.parameters().toString(), "p=ok", "Parameters mismatch");
        let decoder = new TextDecoder();
        assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
        query.reply(query.key_expr(), "1");
    }

    if (receiver1) {
        let reply = await receiver1.receive();
        assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
        if (reply instanceof Reply) {
            const result = reply.result();
            assert_eq(result instanceof ReplyError, false, "Reply should be OK");
            if (!(result instanceof ReplyError)) {
                assert_eq(result.payload().to_string(), "1", "Reply payload mismatch");
            }
        }
    }

    const receiver2 = await session2.get(new Selector(selector, "p=err"), { payload: "3" });
    query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
        assert_eq(query.parameters().toString(), "p=err", "Parameters mismatch");
        assert_eq(query.payload()?.to_string(), "3", "Payload mismatch");
        query.reply_err("err");
    }

    if (receiver2) {
        let reply = await receiver2.receive();
        assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
        if (reply instanceof Reply) {
            const result = reply.result();
            assert_eq(result instanceof ReplyError, true, "Reply should be an error");
            if (result instanceof ReplyError) {
                assert_eq(result.payload().to_string(), "err", "Error payload mismatch");
            }
        }
    }

    await queryable.undeclare();

    await session1.close();
    await session2.close();
}

async function querierChannelTest() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = session1.declare_queryable(ke, { complete: true });
    
    // sleep for 1 second to ensure the queryable is ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const querier = session2.declare_querier(selector, {
        target: QueryTarget.BestMatching
    });

    // First query with ok parameters
    const receiver1 = await querier.get(new Parameters("p=ok"), { payload: "1" });
    let query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
        assert_eq(query.parameters().toString(), "p=ok", "Parameters mismatch");
        assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
        query.reply(query.key_expr(), "1");
    }

    // sleep to ensure the reply is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (receiver1) {
        let reply = await receiver1.receive();
        assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
        if (reply instanceof Reply) {
            const result = reply.result();
            assert_eq(result instanceof ReplyError, false, "Reply should be OK");
            if (!(result instanceof ReplyError)) {
                assert_eq(result.payload().to_string(), "1", "Reply payload mismatch");
            }
        }
    }

    // Second query using the same querier with error parameters
    const receiver2 = await querier.get(new Parameters("p=err"), { payload: "2" });
    query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.key_expr().toString(), selector.toString(), "Key mismatch");
        assert_eq(query.parameters().toString(), "p=err", "Parameters mismatch");
        assert_eq(query.payload()?.to_string(), "2", "Payload mismatch");
        query.reply_err("err");
    }

    // sleep to ensure the reply is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (receiver2) {
        let reply = await receiver2.receive();
        assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
        if (reply instanceof Reply) {
            const result = reply.result();
            assert_eq(result instanceof ReplyError, true, "Reply should be an error");
            if (result instanceof ReplyError) {
                assert_eq(result.payload().to_string(), "err", "Error payload mismatch");
            }
        }
    }

    querier.undeclare();
    await queryable.undeclare();
    await session1.close();
    await session2.close();
}

await queryableGetCallbackTest();
await queryableGetChannelTest();
await querierChannelTest();