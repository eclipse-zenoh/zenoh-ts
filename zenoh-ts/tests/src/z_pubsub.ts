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

class PutTestCase {
  constructor(
    public description: string,
    public payload: string,
    public options?: PutOptions
  ) {}
  
  expectedEncoding(): Encoding {
    return this.options?.encoding ?? Encoding.default();
  }
  
  expectedPriority(): Priority {
    return this.options?.priority ?? Priority.DATA;
  }
  
  expectedAttachment(): string | undefined {
    return this.options?.attachment?.toString();
  }
}

class DeleteTestCase {
  constructor(
    public description: string,
    public options?: DeleteOpts
  ) {}
  
  expectedPriority(): Priority {
    return this.options?.priority ?? Priority.DATA;
  }
  
  expectedAttachment(): string | undefined {
    return this.options?.attachment?.toString();
  }
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
      new PutTestCase("Basic put without options", "message without options"),
      new PutTestCase("Basic put with encoding", "message with encoding", { encoding: Encoding.TEXT_PLAIN }),
      new PutTestCase("Put with priority and congestion control", "message with priority", {
        encoding: Encoding.APPLICATION_JSON,
        priority: Priority.REAL_TIME,
        congestionControl: CongestionControl.BLOCK,
      }),
      new PutTestCase("Put with express flag", "express message", {
        encoding: Encoding.ZENOH_STRING,
        express: true,
      }),
      new PutTestCase("Put with attachment", "message with attachment", {
        encoding: Encoding.TEXT_PLAIN,
        attachment: attachmentData,
      }),
      new PutTestCase("Put with timestamp", "message with timestamp", {
        encoding: Encoding.APPLICATION_JSON,
        timestamp: timestamp,
        priority: Priority.DATA_HIGH,
      }),
      new PutTestCase("Put with all options combined", "message with all options", {
        encoding: Encoding.APPLICATION_CBOR,
        congestionControl: CongestionControl.DROP,
        priority: Priority.INTERACTIVE_HIGH,
        express: false,
        attachment: fullOptionsAttachment,
      }),
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
      
      const expectedEncoding = testCase.expectedEncoding();
      assertEquals(sample.encoding(), expectedEncoding, `${testCase.description}: encoding mismatch`);
      
      const expectedPriority = testCase.expectedPriority();
      assertEquals(sample.priority(), expectedPriority, `${testCase.description}: priority mismatch`);
      
      const expectedAttachment = testCase.expectedAttachment();
      if (expectedAttachment) {
        assertEquals(sample.attachment()?.toString(), expectedAttachment, `${testCase.description}: attachment mismatch`);
      } else {
        assertEquals(sample.attachment(), undefined, `${testCase.description}: attachment should be undefined`);
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
      new DeleteTestCase("Basic delete without options"),
      new DeleteTestCase("Delete with priority and congestion control", {
        priority: Priority.REAL_TIME,
        congestionControl: CongestionControl.BLOCK,
      }),
      new DeleteTestCase("Delete with express flag", {
        express: true,
      }),
      new DeleteTestCase("Delete with attachment", {
        attachment: deleteAttachment,
      }),
      new DeleteTestCase("Delete with timestamp", {
        timestamp: deleteTimestamp,
        priority: Priority.DATA_HIGH,
      }),
      new DeleteTestCase("Delete with all options combined", {
        congestionControl: CongestionControl.DROP,
        priority: Priority.INTERACTIVE_HIGH,
        express: false,
        attachment: fullDeleteAttachment,
      }),
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
      
      const expectedPriority = testCase.expectedPriority();
      assertEquals(sample.priority(), expectedPriority, `${testCase.description}: priority mismatch`);
      
      const expectedAttachment = testCase.expectedAttachment();
      if (expectedAttachment) {
        assertEquals(sample.attachment()?.toString(), expectedAttachment, `${testCase.description}: attachment mismatch`);
      } else {
        assertEquals(sample.attachment(), undefined, `${testCase.description}: attachment should be undefined`);
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
