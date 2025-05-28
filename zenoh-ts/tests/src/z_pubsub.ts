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
  ZBytes,
  SampleKind 
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

    const samples: Array<Sample> = [];

    // Declare a subscriber on session2
    subscriber = await session2.declareSubscriber("zenoh/test/options", {
      handler: (sample: Sample) => {
        samples.push(sample);
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
    assertEquals(samples.length, 6, "Expected 6 messages with different options");

    // Verify basic encoding option
    assertEquals(samples[0].encoding(), Encoding.TEXT_PLAIN, "First message should have text/plain encoding");
    assertEquals(samples[0].payload().toString(), "message with encoding", "First message payload mismatch");

    // Verify priority and congestion control (priority should be reflected in sample)
    assertEquals(samples[1].encoding(), Encoding.APPLICATION_JSON, "Second message should have application/json encoding");
    assertEquals(samples[1].payload().toString(), "message with priority", "Second message payload mismatch");
    assertEquals(samples[1].priority(), Priority.REAL_TIME, "Second message should have REAL_TIME priority");

    // Verify express message
    assertEquals(samples[2].encoding(), Encoding.ZENOH_STRING, "Third message should have zenoh/string encoding");
    assertEquals(samples[2].payload().toString(), "express message", "Third message payload mismatch");

    // Verify attachment
    assertEquals(samples[3].attachment()?.toString(), "metadata: important", "Fourth message should have attachment");
    assertEquals(samples[3].payload().toString(), "message with attachment", "Fourth message payload mismatch");

    // Verify timestamp message
    assertEquals(samples[4].encoding(), Encoding.APPLICATION_JSON, "Fifth message should have application/json encoding");
    assertEquals(samples[4].priority(), Priority.DATA_HIGH, "Fifth message should have DATA_HIGH priority");
    assertEquals(samples[4].payload().toString(), "message with timestamp", "Fifth message payload mismatch");

    // Verify all options combined
    assertEquals(samples[5].encoding(), Encoding.APPLICATION_CBOR, "Sixth message should have application/cbor encoding");
    assertEquals(samples[5].priority(), Priority.INTERACTIVE_HIGH, "Sixth message should have INTERACTIVE_HIGH priority");
    assertEquals(samples[5].attachment()?.toString(), "full-options-metadata", "Sixth message should have full options attachment");
    assertEquals(samples[5].payload().toString(), "message with all options", "Sixth message payload mismatch");

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

Deno.test("API - Delete with DeleteOptions", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let subscriber: Subscriber | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    const samples: Array<Sample> = [];

    // Declare a subscriber on session2 to capture delete operations
    subscriber = await session2.declareSubscriber("zenoh/test/delete", {
      handler: (sample: Sample) => {
        samples.push(sample);
      },
    });

    // Delay to ensure subscriber is ready
    await sleep(100);

    // First, put some data to later delete
    await session1.put("zenoh/test/delete", "data to be deleted", {
      encoding: Encoding.TEXT_PLAIN,
    });

    // Wait for the put to be received
    await sleep(100);

    // Verify we received the put operation
    assertEquals(samples.length, 1, "Expected 1 PUT message");
    assertEquals(samples[0].kind(), SampleKind.PUT, "First sample should be PUT");
    assertEquals(samples[0].payload().toString(), "data to be deleted", "PUT payload mismatch");

    // Test 1: Basic delete without options
    await session1.delete("zenoh/test/delete", {});

    // Test 2: Delete with priority and congestion control
    await session1.delete("zenoh/test/delete", {
      priority: Priority.REAL_TIME,
      congestionControl: CongestionControl.BLOCK,
    });

    // Test 3: Delete with express flag
    await session1.delete("zenoh/test/delete", {
      express: true,
    });

    // Test 4: Delete with attachment
    const deleteAttachment = new ZBytes("delete metadata");
    await session1.delete("zenoh/test/delete", {
      attachment: deleteAttachment,
    });

    // Test 5: Delete with timestamp
    const deleteTimestamp = await session1.newTimestamp();
    await session1.delete("zenoh/test/delete", {
      timestamp: deleteTimestamp,
      priority: Priority.DATA_HIGH,
    });

    // Test 6: Delete with all options combined
    const fullDeleteAttachment = new ZBytes("full-delete-metadata");
    await session1.delete("zenoh/test/delete", {
      congestionControl: CongestionControl.DROP,
      priority: Priority.INTERACTIVE_HIGH,
      express: false,
      attachment: fullDeleteAttachment,
    });

    // Delay to ensure all delete messages are received
    await sleep(200);

    // Verify we received all messages (1 PUT + 6 DELETE)
    assertEquals(samples.length, 7, "Expected 7 messages total (1 PUT + 6 DELETE)");

    // Verify all delete operations
    for (let i = 1; i < samples.length; i++) {
      assertEquals(samples[i].kind(), SampleKind.DELETE, `Sample ${i} should be DELETE`);
    }

    // Verify basic delete (sample index 1)
    assertEquals(samples[1].kind(), SampleKind.DELETE, "Second sample should be DELETE");

    // Verify delete with priority and congestion control (sample index 2)
    assertEquals(samples[2].kind(), SampleKind.DELETE, "Third sample should be DELETE");
    assertEquals(samples[2].priority(), Priority.REAL_TIME, "Third sample should have REAL_TIME priority");

    // Verify express delete (sample index 3)
    assertEquals(samples[3].kind(), SampleKind.DELETE, "Fourth sample should be DELETE");

    // Verify delete with attachment (sample index 4)
    assertEquals(samples[4].kind(), SampleKind.DELETE, "Fifth sample should be DELETE");
    assertEquals(samples[4].attachment()?.toString(), "delete metadata", "Fifth sample should have attachment");

    // Verify delete with timestamp (sample index 5)
    assertEquals(samples[5].kind(), SampleKind.DELETE, "Sixth sample should be DELETE");
    assertEquals(samples[5].priority(), Priority.DATA_HIGH, "Sixth sample should have DATA_HIGH priority");

    // Verify delete with all options (sample index 6)
    assertEquals(samples[6].kind(), SampleKind.DELETE, "Seventh sample should be DELETE");
    assertEquals(samples[6].priority(), Priority.INTERACTIVE_HIGH, "Seventh sample should have INTERACTIVE_HIGH priority");
    assertEquals(samples[6].attachment()?.toString(), "full-delete-metadata", "Seventh sample should have full delete attachment");

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
