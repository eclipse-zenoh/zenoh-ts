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

import { Config, Session, Subscriber, Sample } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("API - Put/Subscribe", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let subscriber: Subscriber | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    const receivedMessages: Array<{ key: string; payload: string }> = [];

    // Declare a subscriber on session2
    subscriber = await session2.declareSubscriber("zenoh/test", {
      handler: (sample: Sample) => {
        receivedMessages.push({
          key: sample.keyexpr().toString(),
          payload: sample.payload().toString(),
        });
      },
    });

    // Delay to ensure subscriber is ready
    await sleep(100);

    // Publish messages using session1
    await session1.put("zenoh/test", "first");
    await session1.put("zenoh/test", "second");

    // Delay to ensure messages are received
    await sleep(100);

    assertEquals(receivedMessages.length, 2, "Expected 2 messages");
    assertEquals(receivedMessages[0].key, "zenoh/test", "Key mismatch for first message");
    assertEquals(receivedMessages[0].payload, "first", "Payload mismatch for first message");
    assertEquals(receivedMessages[1].key, "zenoh/test", "Key mismatch for second message");
    assertEquals(receivedMessages[1].payload, "second", "Payload mismatch for second message");
  } finally {
    // Cleanup in reverse order of creation
    if (subscriber) {
      await subscriber.undeclare();
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
