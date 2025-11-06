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

import { Publisher, Subscriber, Config, Session, CancellationToken, ChannelState, Queryable, Querier, LivelinessToken, TryReceivedKind } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("API - Cancel Get", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let queryable: Queryable | undefined;

  try {
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));
    await sleep(100);

    queryable = await session1.declareQueryable("test/query_cancellation");

    await sleep(1000);
    let ct = new CancellationToken();
    let replies = await session2.get("test/query_cancellation", { cancellationToken: ct });

    await sleep(1000);

    assertEquals(replies!.state(), ChannelState.empty)
    assertEquals(ct.isCancelled(), false);

    ct.cancel();
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
    assertEquals(ct.isCancelled(), true)
    
    const query = await queryable.receiver()!.receive();
    query.reply(query.keyExpr(), "ok");
    query.finalize();

    // cancellation token automatically cancels query
    replies = await session2.get("test/query_cancellation", { cancellationToken: ct });
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
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


Deno.test("API - Cancel Querier Get", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let queryable: Queryable | undefined;
  let querier: Querier | undefined;

  try {
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));
    await sleep(100);

    queryable = await session1.declareQueryable("test/querier_cancellation");
    querier = await session2.declareQuerier("test/querier_cancellation");

    await sleep(1000);
    let ct = new CancellationToken();
    let replies = await querier.get({ cancellationToken: ct });

    await sleep(1000);

    assertEquals(replies!.state(), ChannelState.empty)
    assertEquals(ct.isCancelled(), false);

    ct.cancel();
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
    assertEquals(ct.isCancelled(), true)
    
    const query = await queryable.receiver()!.receive();
    query.reply(query.keyExpr(), "ok");
    query.finalize();

    // cancellation token automatically cancels query
    replies = await querier.get({ cancellationToken: ct });
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
  } finally {
    // Cleanup in reverse order of creation
    if (queryable) {
      await queryable.undeclare();
    }
    if (querier) {
      await querier.undeclare();
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


Deno.test("API - Cancel Liveliness Get", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let token: LivelinessToken | undefined;

  try {
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));
    await sleep(100);

    token = await session1.liveliness().declareToken("test/liveliness_query_cancellation");

    await sleep(1000);
    let ct = new CancellationToken();
    let replies = await session2.liveliness().get("test/liveliness_query_cancellation", { cancellationToken: ct });

    assertEquals(replies!.state(), ChannelState.empty)
    assertEquals(ct.isCancelled(), false);

    ct.cancel();
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
    assertEquals(ct.isCancelled(), true);

    // cancellation token automatically cancels query
    replies = await  session2.liveliness().get("test/liveliness_query_cancellation", { cancellationToken: ct });
    assertEquals(replies!.tryReceive().kind, TryReceivedKind.close);
    assertEquals(replies!.state(), ChannelState.close)
  } finally {
    // Cleanup in reverse order of creation
    if (token) {
      await token.undeclare();
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
