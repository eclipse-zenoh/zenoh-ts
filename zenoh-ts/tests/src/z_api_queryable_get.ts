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

import { Config, Session, Query, Reply, KeyExpr, ZBytes, Receiver, Sample, FifoChannel } from "@eclipse-zenoh/zenoh-ts";
import { assert, assert_eq } from "./common/assertions.ts";

interface QueryData {
    key: string;
    params: string;
    payload: string;
}

    // const queryable = await session1.declare_queryable(ke, {
    //     handler: async (query: Query) => {
    //         const payload = query.payload()?.to_string() || "";
    //         const params = query.parameters().toString();
    //         const qd: QueryData = {
    //             key: query.key_expr().toString(),
    //             params: params,
    //             payload: payload,
    //         };
    //         queries.push(qd);
    //         if (params === "ok") {
    //             query.reply(query.key_expr(), payload);
    //         } else {
    //             query.reply_err("err");
    //         }
    //     },
    // });

async function queryable_get_channel() {
    const ke = new KeyExpr("zenoh/test/*");
    const selector = new KeyExpr("zenoh/test/1");
    const queries: QueryData[] = [];

    const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    const replies = await session1.declare_queryable(ke, { handler: new FifoChannel(3) });

    const receiver1 = await session2.get(selector, { payload: "1" }) as Receiver;

    let query_ = await replies.receive();
    assert(query_ instanceof Query, "Expected a Query");
    let query = query_ as Query;
    assert_eq(query.key_expr().toString(), "zenoh/test/1", "Key mismatch");
    assert_eq(query.payload()?.to_string(), "1", "Payload mismatch");
    assert_eq(query.parameters().toString(), "ok", "Parameters mismatch");
    query.reply(query.key_expr(), query.payload() as ZBytes);

    let reply = await receiver1.receive();
    assert(reply instanceof Reply, "Expected a Reply");
    let result = (reply as Reply).result();
    assert(result instanceof Sample, "Expected a Sample");
    let sample = result as Sample;
    assert_eq(sample.keyexpr().toString(), "zenoh/test/1", "Key mismatch");
    assert_eq(sample.payload().to_string(), "1", "Payload mismatch");

    let reply2 = await receiver1.receive();


    // while (reply !== null) {
    //     if (reply instanceof Reply && reply.isOk()) {
    //         replies.push(reply.payload().to_string());
    //     } else if (reply instanceof Reply) {
    //         errors.push(reply.payload().to_string());
    //     }
    //     reply = await receiver1.receive();
    // }

    // const receiver2 = await session2.get(selector, { payload: "2" });
    // reply = await receiver2.receive();
    // while (reply !== null) {
    //     if (reply instanceof Reply && reply.isOk()) {
    //         replies.push(reply.payload().to_string());
    //     } else if (reply instanceof Reply) {
    //         errors.push(reply.payload().to_string());
    //     }
    //     reply = await receiver2.receive();
    // }

    // const receiver3 = await session2.get(selector, { payload: "3" });
    // reply = await receiver3.receive();
    // while (reply !== null) {
    //     if (reply instanceof Reply && reply.isOk()) {
    //         replies.push(reply.payload().to_string());
    //     } else if (reply instanceof Reply) {
    //         errors.push(reply.payload().to_string());
    //     }
    //     reply = await receiver3.receive();
    // }

    // await queryable.undeclare();

    // assert_eq(queries.length, 3, "Expected 3 queries");
    // assert_eq(
    //     JSON.stringify(queries[0]),
    //     JSON.stringify({ key: "zenoh/test/1", params: "ok", payload: "1" }),
    //     "First query mismatch"
    // );
    // assert_eq(
    //     JSON.stringify(queries[1]),
    //     JSON.stringify({ key: "zenoh/test/1", params: "ok", payload: "2" }),
    //     "Second query mismatch"
    // );
    // assert_eq(
    //     JSON.stringify(queries[2]),
    //     JSON.stringify({ key: "zenoh/test/1", params: "err", payload: "3" }),
    //     "Third query mismatch"
    // );

    // assert_eq(replies.length, 2, "Expected 2 replies");
    // assert_eq(replies[0], "1", "First reply mismatch");
    // assert_eq(replies[1], "2", "Second reply mismatch");

    // assert_eq(errors.length, 1, "Expected 1 error");
    // assert_eq(errors[0], "err", "Error mismatch");

    await session1.close();
    await session2.close();
}

queryable_get_channel()