//
// Copyright (c) 2024 ZettaScale Technology
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

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assert_eq<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message}: expected '${expected}', but got '${actual}'`);
}

export async function putSubTest() {
  console.log("Starting zenoh Sessions");

  // Open two sessions
  const session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
  const session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Delay to ensure sessions are ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const receivedMessages: Array<{ key: string; payload: string }> = [];

  // Declare a subscriber on session2
  const subscriber: Subscriber = session2.declare_subscriber("zenoh/test", {
    handler: (sample: Sample) => {
      receivedMessages.push({
        key: sample.keyexpr().toString(),
        payload: sample.payload().to_string(),
      });
    },
  });

  console.log("Subscriber declared");

  // Delay to ensure subscriber is ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Publish messages using session1
  await session1.put("zenoh/test", "first");
  await session1.put("zenoh/test", "second");

  // Delay to ensure messages are received
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Assertions
    assert_eq(receivedMessages.length, 2, "Expected 2 messages");
    assert_eq(receivedMessages[0].key, "zenoh/test", "Key mismatch for first message");
    assert_eq(receivedMessages[0].payload, "first", "Payload mismatch for first message");
    assert_eq(receivedMessages[1].key, "zenoh/test", "Key mismatch for second message");
    assert_eq(receivedMessages[1].payload, "second", "Payload mismatch for second message");

    console.log("Test completed successfully");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1); // Exit with code 1 on failure
  } finally {
    // Cleanup
    subscriber.undeclare();
    await session1.close();
    await session2.close();
  }
}

putSubTest();
