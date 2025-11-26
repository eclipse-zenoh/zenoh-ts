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

import { Config, Session, Subscriber, MatchingListener, Publisher, Querier, Queryable, TryReceivedKind } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("API - Publisher/Matching status", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let publisher: Publisher | undefined;
  let subscriber: Subscriber | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    publisher = await session1.declarePublisher("zenoh/matching-publisher/test");

    assertEquals((await publisher.matchingStatus()).matching(), false, "Incorrect matching status");

    subscriber = await session2.declareSubscriber("zenoh/matching-publisher/test");
    await sleep(100)
    assertEquals((await publisher.matchingStatus()).matching(), true, "Incorrect matching status");


    await subscriber?.undeclare();
    await sleep(100)
    assertEquals((await publisher.matchingStatus()).matching(), false, "Incorrect matching status");

  } finally {
    // Cleanup in reverse order of creation
    if (publisher) {
      await publisher.undeclare();
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


Deno.test("API - Querier/Matching status", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let querier: Querier | undefined;
  let queryable: Queryable | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    querier = await session1.declareQuerier("zenoh/matching-querier/test");

    assertEquals((await querier.matchingStatus()).matching(), false, "Incorrect matching status");

    queryable = await session2.declareQueryable("zenoh/matching-querier/test");
    await sleep(100)
    assertEquals((await querier.matchingStatus()).matching(), true, "Incorrect matching status");


    await queryable?.undeclare();
    await sleep(100)
    assertEquals((await querier.matchingStatus()).matching(), false, "Incorrect matching status");

  } finally {
    // Cleanup in reverse order of creation
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


Deno.test("API - Publisher/Matching listener", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let publisher: Publisher | undefined;
  let subscriber: Subscriber | undefined;
  let listener: MatchingListener | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    publisher = await session1.declarePublisher("zenoh/matching-listener-publisher/test");

    listener = await publisher.matchingListener();

    await sleep(100);

    assertEquals(listener.receiver()?.tryReceive().kind, TryReceivedKind.notReceived);

    subscriber = await session2.declareSubscriber("zenoh/matching-listener-publisher/test");
    await sleep(100);

    let res = listener.receiver()?.tryReceive();
    assertEquals(res?.kind, TryReceivedKind.value);
    if (res?.kind == TryReceivedKind.value) {
        assertEquals(res.value.matching(), true);
    }

    await subscriber?.undeclare();
    await sleep(100)
    res = listener.receiver()?.tryReceive();
    assertEquals(res?.kind, TryReceivedKind.value);
    if (res?.kind == TryReceivedKind.value) {
        assertEquals(res.value.matching(), false);
    }

  } finally {
    // Cleanup in reverse order of creation
    if (listener) {
      await listener.undeclare();
    }
    if (publisher) {
      await publisher.undeclare();
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


Deno.test("API - Querier/Matching listener", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let querier: Querier | undefined;
  let queryable: Queryable | undefined;
  let listener: MatchingListener | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    querier = await session1.declareQuerier("zenoh/matching-listener-querier/test");

    listener = await querier.matchingListener();

    await sleep(100);

    assertEquals(listener.receiver()?.tryReceive().kind, TryReceivedKind.notReceived);

    queryable = await session2.declareQueryable("zenoh/matching-listener-querier/test");
    await sleep(100);

    let res = listener.receiver()?.tryReceive();
    assertEquals(res?.kind, TryReceivedKind.value);
    if (res?.kind == TryReceivedKind.value) {
        assertEquals(res.value.matching(), true);
    }

    await queryable?.undeclare();
    await sleep(100)
    res = listener.receiver()?.tryReceive();
    assertEquals(res?.kind, TryReceivedKind.value);
    if (res?.kind == TryReceivedKind.value) {
        assertEquals(res.value.matching(), false);
    }

  } finally {
    // Cleanup in reverse order of creation
    if (listener) {
      await listener.undeclare();
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