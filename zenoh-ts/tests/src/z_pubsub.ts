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
  SampleKind,
  PutOptions,
  DeleteOpts
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PutTestCase {
  description: string;
  payload: string;
  options?: PutOptions;
  expectedEncoding?: Encoding;
  expectedPriority?: Priority;
  expectedAttachment?: string;
}

interface DeleteTestCase {
  description: string;
  options?: DeleteOpts;
  expectedPriority?: Priority;
  expectedAttachment?: string;
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

    // Define test cases
    const attachmentData = new ZBytes("metadata: important");
    const fullOptionsAttachment = new ZBytes("full-options-metadata");
    const timestamp = await session1.newTimestamp();

    const putTestCases: PutTestCase[] = [
      {
        description: "Basic put without options",
        payload: "message without options",
      },
      {
        description: "Basic put with encoding",
        payload: "message with encoding",
        options: { encoding: Encoding.TEXT_PLAIN },
        expectedEncoding: Encoding.TEXT_PLAIN,
      },
      {
        description: "Put with priority and congestion control",
        payload: "message with priority",
        options: {
          encoding: Encoding.APPLICATION_JSON,
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
        },
        expectedEncoding: Encoding.APPLICATION_JSON,
        expectedPriority: Priority.REAL_TIME,
      },
      {
        description: "Put with express flag",
        payload: "express message",
        options: {
          encoding: Encoding.ZENOH_STRING,
          express: true,
        },
        expectedEncoding: Encoding.ZENOH_STRING,
      },
      {
        description: "Put with attachment",
        payload: "message with attachment",
        options: {
          encoding: Encoding.TEXT_PLAIN,
          attachment: attachmentData,
        },
        expectedEncoding: Encoding.TEXT_PLAIN,
        expectedAttachment: "metadata: important",
      },
      {
        description: "Put with timestamp",
        payload: "message with timestamp",
        options: {
          encoding: Encoding.APPLICATION_JSON,
          timestamp: timestamp,
          priority: Priority.DATA_HIGH,
        },
        expectedEncoding: Encoding.APPLICATION_JSON,
        expectedPriority: Priority.DATA_HIGH,
      },
      {
        description: "Put with all options combined",
        payload: "message with all options",
        options: {
          encoding: Encoding.APPLICATION_CBOR,
          congestionControl: CongestionControl.DROP,
          priority: Priority.INTERACTIVE_HIGH,
          express: false,
          attachment: fullOptionsAttachment,
        },
        expectedEncoding: Encoding.APPLICATION_CBOR,
        expectedPriority: Priority.INTERACTIVE_HIGH,
        expectedAttachment: "full-options-metadata",
      },
    ];

    // Execute all put operations
    for (const testCase of putTestCases) {
      if (testCase.options) {
        await session1.put("zenoh/test/options", testCase.payload, testCase.options);
      } else {
        await session1.put("zenoh/test/options", testCase.payload);
      }
    }

    // Delay to ensure all messages are received
    await sleep(200);

    // Verify we received all messages
    assertEquals(samples.length, putTestCases.length, `Expected ${putTestCases.length} messages with different options`);

    // Verify each test case
    for (let i = 0; i < putTestCases.length; i++) {
      const testCase = putTestCases[i];
      const sample = samples[i];

      assertEquals(sample.payload().toString(), testCase.payload, `${testCase.description}: payload mismatch`);
      
      if (testCase.expectedEncoding) {
        assertEquals(sample.encoding(), testCase.expectedEncoding, `${testCase.description}: encoding mismatch`);
      }
      
      if (testCase.expectedPriority) {
        assertEquals(sample.priority(), testCase.expectedPriority, `${testCase.description}: priority mismatch`);
      }
      
      if (testCase.expectedAttachment) {
        assertEquals(sample.attachment()?.toString(), testCase.expectedAttachment, `${testCase.description}: attachment mismatch`);
      }
    }

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

    // Define delete test cases
    const deleteAttachment = new ZBytes("delete metadata");
    const fullDeleteAttachment = new ZBytes("full-delete-metadata");
    const deleteTimestamp = await session1.newTimestamp();

    const deleteTestCases: DeleteTestCase[] = [
      {
        description: "Basic delete without options",
      },
      {
        description: "Delete with priority and congestion control",
        options: {
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
        },
        expectedPriority: Priority.REAL_TIME,
      },
      {
        description: "Delete with express flag",
        options: {
          express: true,
        },
      },
      {
        description: "Delete with attachment",
        options: {
          attachment: deleteAttachment,
        },
        expectedAttachment: "delete metadata",
      },
      {
        description: "Delete with timestamp",
        options: {
          timestamp: deleteTimestamp,
          priority: Priority.DATA_HIGH,
        },
        expectedPriority: Priority.DATA_HIGH,
      },
      {
        description: "Delete with all options combined",
        options: {
          congestionControl: CongestionControl.DROP,
          priority: Priority.INTERACTIVE_HIGH,
          express: false,
          attachment: fullDeleteAttachment,
        },
        expectedPriority: Priority.INTERACTIVE_HIGH,
        expectedAttachment: "full-delete-metadata",
      },
    ];

    // Execute all delete operations
    for (const testCase of deleteTestCases) {
      if (testCase.options) {
        await session1.delete("zenoh/test/delete", testCase.options);
      } else {
        await session1.delete("zenoh/test/delete", {});
      }
    }

    // Delay to ensure all delete messages are received
    await sleep(200);

    // Verify we received all messages (deleteTestCases.length DELETE)
    const expectedTotal = deleteTestCases.length;
    assertEquals(samples.length, expectedTotal, `Expected ${expectedTotal} messages total (${deleteTestCases.length} DELETE operations)`);

    // Verify all delete operations
    for (let i = 0; i < deleteTestCases.length; i++) {
      const testCase = deleteTestCases[i];
      const sample = samples[i];

      assertEquals(sample.kind(), SampleKind.DELETE, `${testCase.description}: should be DELETE`);
      
      if (testCase.expectedPriority) {
        assertEquals(sample.priority(), testCase.expectedPriority, `${testCase.description}: priority mismatch`);
      }
      
      if (testCase.expectedAttachment) {
        assertEquals(sample.attachment()?.toString(), testCase.expectedAttachment, `${testCase.description}: attachment mismatch`);
      }
    }

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
