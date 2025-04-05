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

import { Config, Session, Query, Reply, KeyExpr, Receiver, ZBytes, Selector } from "@eclipse-zenoh/zenoh-ts";
import { assert_eq } from "./common/assertions";

async function queryable_get_callback() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");
    const queries: { key: string; params: string; payload: string }[] = [];
    const replies: string[] = [];
    const errors: string[] = [];

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = session1.declare_queryable(ke, {
        handler: async (query: Query) => {
            assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
            const payload = query.payload()?.to_string() || "";
            queries.push({
                key: query.key_expr().toString(),
                params: query.parameters().toString(),
                payload: payload,
            });
            if (query.parameters().toString() === "ok") {
                query.reply(query.key_expr(), payload);
            } else {
                query.reply_err("err");
            }
        },
    });

    session2.get(new Selector(selector, "ok"), {
        payload: "1",
        handler: async (reply: Reply) => {
            if (reply.isOk()) {
                replies.push(reply.payload().to_string());
            } else {
                errors.push(reply.payload().to_string());
            }
        },
    });

    await session2.get(selector, "err", {
        payload: "2",
        onReply: (reply: Reply) => {
            if (reply.isOk()) {
                replies.push(reply.payload().to_string());
            } else {
                errors.push(reply.payload().to_string());
            }
        },
    });

    await queryable.undeclare();

    assert_eq(queries.length, 2, "Expected 2 queries");
    assert_eq(replies.length, 1, "Expected 1 reply");
    assert_eq(errors.length, 1, "Expected 1 error");
}

async function queryable_get_channel() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const queryable = await session1.declare_queryable(ke, { complete: true });

    const receiver1 = await session2.get(selector, { payload: "1" });
    let query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.keyexpr().to_string(), selector.to_string(), "Key mismatch");
        assert_eq(query.parameters(), "ok", "Parameters mismatch");
        assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
        query.reply(query.keyexpr(), "1");
    }

    let reply = await receiver1.receive();
    assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
    if (reply instanceof Reply) {
        assert_eq(reply.isOk(), true, "Reply should be OK");
        assert_eq(reply.payload().to_string(), "1", "Reply payload mismatch");
    }

    const receiver2 = await session2.get(selector, { payload: "3" });
    query = await queryable.receive();
    assert_eq(query instanceof Query, true, "Expected query to be an instance of Query");
    if (query instanceof Query) {
        assert_eq(query.keyexpr().to_string(), selector.to_string(), "Key mismatch");
        assert_eq(query.parameters(), "err", "Parameters mismatch");
        assert_eq(query.payload()?.to_string(), "3", "Payload mismatch");
        query.replyErr("err");
    }

    reply = await receiver2.receive();
    assert_eq(reply instanceof Reply, true, "Expected reply to be an instance of Reply");
    if (reply instanceof Reply) {
        assert_eq(reply.isOk(), false, "Reply should be an error");
        assert_eq(reply.payload().to_string(), "err", "Error payload mismatch");
    }

    await queryable.undeclare();
}

(async () => {
    await queryable_get_callback();
    await queryable_get_channel();
    console.log("Tests completed successfully");
})();