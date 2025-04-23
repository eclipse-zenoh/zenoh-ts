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

import { Config, Session, Subscriber, Sample, Receiver, KeyExpr, SampleKind, Reply, RecvErr } from "@eclipse-zenoh/zenoh-ts";
import { assert, assert_eq, run_test } from "./common/assertions.ts";

async function testLivelinessGet() {
  // Open two sessions
  const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
  const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Delay to ensure sessions are ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const ke = new KeyExpr("zenoh/liveliness/test/*");
  const tokenKe = new KeyExpr("zenoh/liveliness/test/1");
  
  // Declare a token on session1
  const token = session1.liveliness().declare_token(tokenKe);
  
  // Get liveliness on session2
  const receiver: Receiver = session2.liveliness().get(ke) as Receiver;
  const reply = await receiver.receive();
  
  // Now we know it's a Reply
  if (reply instanceof Reply) {
    const result = reply.result();
    // Check that the result is a Sample and not a ReplyError
    if (result instanceof Sample) {
      assert_eq(result.keyexpr().toString(), "zenoh/liveliness/test/1", "Key mismatch for liveliness token");
    } else {
      assert(false, "Expected result to be a Sample, got ReplyError");
    }
  } else {
    assert(false, "Expected reply to be instanceof Reply");
  }

  // Cleanup
  token.undeclare();
  await session1.close();
  await session2.close();
}

async function testLivelinessSubscriber() {
  // Open two sessions
  const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
  const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Delay to ensure sessions are ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const ke = new KeyExpr("zenoh/liveliness/test/*");
  const tokenKe1 = new KeyExpr("zenoh/liveliness/test/1");
  const tokenKe2 = new KeyExpr("zenoh/liveliness/test/2");

  const putTokens: Set<string> = new Set();
  const deleteTokens: Set<string> = new Set();

  // Declare a subscriber on session1
  const subscriber = session1.liveliness().declare_subscriber(ke, {
    handler: async (sample: Sample) => {
      if (sample.kind() === SampleKind.PUT) {
        putTokens.add(sample.keyexpr().toString());
      } else if (sample.kind() === SampleKind.DELETE) {
        deleteTokens.add(sample.keyexpr().toString());
      }
    },
    history: true
  });

  // Delay to ensure subscriber is ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Declare tokens on session2
  const token1 = session2.liveliness().declare_token(tokenKe1);
  const token2 = session2.liveliness().declare_token(tokenKe2);

  // Delay to ensure tokens are declared
  await new Promise((resolve) => setTimeout(resolve, 1000));

  assert_eq(putTokens.size, 2, "Expected 2 PUT tokens");
  assert(putTokens.has("zenoh/liveliness/test/1"), "Expected token 1 in PUT set");
  assert(putTokens.has("zenoh/liveliness/test/2"), "Expected token 2 in PUT set");

  // Undeclare first token
  token1.undeclare();
  
  // Delay to ensure token is undeclared
  await new Promise((resolve) => setTimeout(resolve, 1000));

  assert_eq(deleteTokens.size, 1, "Expected 1 DELETE token");
  assert(deleteTokens.has("zenoh/liveliness/test/1"), "Expected token 1 in DELETE set");

  // Undeclare second token
  token2.undeclare();

  // Delay to ensure token is undeclared
  await new Promise((resolve) => setTimeout(resolve, 1000));

  assert_eq(deleteTokens.size, 2, "Expected 2 DELETE tokens");
  assert(deleteTokens.has("zenoh/liveliness/test/2"), "Expected token 2 in DELETE set");

  // Cleanup
  subscriber.undeclare();
  await session1.close();
  await session2.close();
}

// Run the tests
await run_test(testLivelinessGet);
await run_test(testLivelinessSubscriber);