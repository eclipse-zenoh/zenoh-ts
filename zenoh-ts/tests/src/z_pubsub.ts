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

import { 
  Config, 
  Session, 
  Subscriber, 
  Sample, 
  Encoding, 
  CongestionControl, 
  Priority, 
  ZBytes 
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("API - Put/Subscribe with PutOptions", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let subscriber: Subscriber | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    const receivedMessages: Array<{ 
      key: string; 
      payload: ZBytes; 
      encoding?: Encoding; 
      priority?: Priority;
      attachment?: ZBytes;
    }> = [];

    // Declare a subscriber on session2
    subscriber = await session2.declareSubscriber("zenoh/test/options", {
      handler: (sample: Sample) => {
        receivedMessages.push({
          key: sample.keyexpr().toString(),
          payload: sample.payload(),
          encoding: sample.encoding(),
          priority: sample.priority(),
          attachment: sample.attachment(),
        });
      },
    });

    // Delay to ensure subscriber is ready
    await sleep(100);

    // Test 1: Basic put with encoding
    await session1.put("zenoh/test/options", "message with encoding", {
      encoding: Encoding.TEXT_PLAIN,
    });

    // Test 2: Put with priority and congestion control
    await session1.put("zenoh/test/options", "message with priority", {
      encoding: Encoding.APPLICATION_JSON,
      priority: Priority.REAL_TIME,
      congestionControl: CongestionControl.BLOCK,
    });

    // Test 3: Put with express flag
    await session1.put("zenoh/test/options", "express message", {
      encoding: Encoding.ZENOH_STRING,
      express: true,
    });

    // Test 4: Put with attachment
    const attachmentData = new ZBytes("metadata: important");
    await session1.put("zenoh/test/options", "message with attachment", {
      encoding: Encoding.TEXT_PLAIN,
      attachment: attachmentData,
    });

    // Test 5: Put with timestamp
    const timestamp = await session1.newTimestamp();
    await session1.put("zenoh/test/options", "message with timestamp", {
      encoding: Encoding.APPLICATION_JSON,
      timestamp: timestamp,
      priority: Priority.DATA_HIGH,
    });

    // Test 6: Put with all options combined
    const fullOptionsAttachment = new ZBytes("full-options-metadata");
    await session1.put("zenoh/test/options", "message with all options", {
      encoding: Encoding.APPLICATION_CBOR,
      congestionControl: CongestionControl.DROP,
      priority: Priority.INTERACTIVE_HIGH,
      express: false,
      attachment: fullOptionsAttachment,
    });

    // Delay to ensure all messages are received
    await sleep(200);

    // Verify we received all messages
    assertEquals(receivedMessages.length, 6, "Expected 6 messages with different options");

    // Verify basic encoding option
    assertEquals(receivedMessages[0].encoding, Encoding.TEXT_PLAIN, "First message should have text/plain encoding");
    assertEquals(receivedMessages[0].payload.toString(), "message with encoding", "First message payload mismatch");

    // Verify priority and congestion control (priority should be reflected in sample)
    assertEquals(receivedMessages[1].encoding, Encoding.APPLICATION_JSON, "Second message should have application/json encoding");
    assertEquals(receivedMessages[1].payload.toString(), "message with priority", "Second message payload mismatch");
    assertEquals(receivedMessages[1].priority, Priority.REAL_TIME, "Second message should have REAL_TIME priority");

    // Verify express message
    assertEquals(receivedMessages[2].encoding, Encoding.ZENOH_STRING, "Third message should have zenoh/string encoding");
    assertEquals(receivedMessages[2].payload.toString(), "express message", "Third message payload mismatch");

    // Verify attachment
    assertEquals(receivedMessages[3].attachment?.toString(), "metadata: important", "Fourth message should have attachment");
    assertEquals(receivedMessages[3].payload.toString(), "message with attachment", "Fourth message payload mismatch");

    // Verify timestamp message
    assertEquals(receivedMessages[4].encoding, Encoding.APPLICATION_JSON, "Fifth message should have application/json encoding");
    assertEquals(receivedMessages[4].priority, Priority.DATA_HIGH, "Fifth message should have DATA_HIGH priority");
    assertEquals(receivedMessages[4].payload.toString(), "message with timestamp", "Fifth message payload mismatch");

    // Verify all options combined
    assertEquals(receivedMessages[5].encoding, Encoding.APPLICATION_CBOR, "Sixth message should have application/cbor encoding");
    assertEquals(receivedMessages[5].priority, Priority.INTERACTIVE_HIGH, "Sixth message should have INTERACTIVE_HIGH priority");
    assertEquals(receivedMessages[5].attachment?.toString(), "full-options-metadata", "Sixth message should have full options attachment");
    assertEquals(receivedMessages[5].payload.toString(), "message with all options", "Sixth message payload mismatch");

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
