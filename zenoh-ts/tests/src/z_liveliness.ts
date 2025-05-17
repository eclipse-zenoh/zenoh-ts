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

import { Config, Session, Sample, KeyExpr, SampleKind } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Liveliness - Token Get", async () => {
  // Open two sessions
  const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
  const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Delay to ensure sessions are ready
  await sleep(1000);

  const ke = new KeyExpr("zenoh/liveliness/test/*");
  const tokenKe = new KeyExpr("zenoh/liveliness/test/1");
  
  // Declare a token on session1
  const token = await session1.liveliness().declare_token(tokenKe);

  // Delay to ensure token is declared
  await sleep(500);
  
  // Get liveliness on session2
  const receiver = await session2.liveliness().get(ke);
  if (!receiver) {
    assert(false, "Failed to get liveliness receiver");
    return;
  }
  let reply = await receiver.receive();
  
  const result = reply.result();
  // Check that the result is a Sample and not a ReplyError
  if (result instanceof Sample) {
    assertEquals(result.keyexpr().toString(), "zenoh/liveliness/test/1", "Key mismatch for liveliness token");
  } else {
    assert(false, "Expected result to be a Sample, got ReplyError");
  }

  // Cleanup
  await token.undeclare();
  await sleep(100);

  const receiver2 = await session2.liveliness().get(ke);
  if (!receiver2) {
    assert(false, "Failed to get liveliness receiver");
    return;
  }
  try {
    reply = await receiver2.receive();
    assert(false, "Received reply on undeclared token");
  } catch {
    // we should correctly fail to recieve reply on undeclared token
  }

  await session1.close();
  await session2.close();
});

Deno.test("Liveliness - Subscriber", async () => {
  // Open two sessions
  const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
  const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Delay to ensure sessions are ready
  await sleep(1000);

  const ke = new KeyExpr("zenoh/liveliness/test/*");
  const tokenKe1 = new KeyExpr("zenoh/liveliness/test/1");
  const tokenKe2 = new KeyExpr("zenoh/liveliness/test/2");

  const putTokens: Set<string> = new Set();
  const deleteTokens: Set<string> = new Set();

  // Declare a subscriber on session1
  const subscriber = await session1.liveliness().declare_subscriber(ke, {
    handler: (sample: Sample) => {
      if (sample.kind() === SampleKind.PUT) {
        putTokens.add(sample.keyexpr().toString());
      } else if (sample.kind() === SampleKind.DELETE) {
        deleteTokens.add(sample.keyexpr().toString());
      }
    },
    history: true
  });

  // Delay to ensure subscriber is ready
  await sleep(1000);

  // Declare tokens on session2
  const token1 = await session2.liveliness().declare_token(tokenKe1);
  const token2 = await session2.liveliness().declare_token(tokenKe2);

  // Delay to ensure tokens are declared
  await sleep(1000);

  assertEquals(putTokens.size, 2, "Expected 2 PUT tokens");
  assert(putTokens.has("zenoh/liveliness/test/1"), "Expected token 1 in PUT set");
  assert(putTokens.has("zenoh/liveliness/test/2"), "Expected token 2 in PUT set");

  // Undeclare first token
  await token1.undeclare();
  
  // Delay to ensure token is undeclared
  await sleep(1000);

  assertEquals(deleteTokens.size, 1, "Expected 1 DELETE token");
  assert(deleteTokens.has("zenoh/liveliness/test/1"), "Expected token 1 in DELETE set");

  // Undeclare second token
  await token2.undeclare();

  // Delay to ensure token is undeclared
  await sleep(1000);

  assertEquals(deleteTokens.size, 2, "Expected 2 DELETE tokens");
  assert(deleteTokens.has("zenoh/liveliness/test/2"), "Expected token 2 in DELETE set");

  // Cleanup
  await subscriber.undeclare();
  await session1.close();
  await session2.close();
});