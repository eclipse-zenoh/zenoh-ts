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
  DeleteOptions,
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TestCase {
  constructor(
    public description: string,
    public sampleKind: SampleKind,
    public options?: PutOptions | DeleteOptions,
    public payload?: string
  ) {}

  expectedEncoding(): Encoding {
    if (this.sampleKind === SampleKind.PUT) {
      const encoding = (this.options as PutOptions)?.encoding;
      return encoding ? Encoding.from(encoding) : Encoding.default();
    }
    return Encoding.default(); // DELETE doesn't have encoding
  }

  expectedPriority(): Priority {
    return this.options?.priority ?? Priority.DATA;
  }

  expectedAttachment(): string | undefined {
    return this.options?.attachment?.toString();
  }
}

Deno.test("API - Put/Delete Operations with Options", async () => {
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
    subscriber = await session2.declareSubscriber("zenoh/test/operations", {
      handler: (sample: Sample) => {
        samples.push(sample);
      },
    });

    // Delay to ensure subscriber is ready
    await sleep(100);

    // Define test cases
    const attachmentData = new ZBytes("metadata: important");
    const fullOptionsAttachment = new ZBytes("full-options-metadata");
    const deleteAttachment = new ZBytes("delete metadata");
    const fullDeleteAttachment = new ZBytes("full-delete-metadata");
    const putTimestamp = await session1.newTimestamp();
    const deleteTimestamp = await session1.newTimestamp();

    const testCases: TestCase[] = [
      // PUT operations
      new TestCase(
        "Basic put without options",
        SampleKind.PUT,
        undefined,
        "message without options"
      ),
      new TestCase(
        "Basic put with encoding",
        SampleKind.PUT,
        { encoding: Encoding.TEXT_PLAIN },
        "message with encoding"
      ),
      new TestCase(
        "Put with priority and congestion control",
        SampleKind.PUT,
        {
          encoding: Encoding.APPLICATION_JSON,
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
        },
        "message with priority"
      ),
      new TestCase(
        "Put with express flag",
        SampleKind.PUT,
        {
          encoding: Encoding.ZENOH_STRING,
          express: true,
        },
        "express message"
      ),
      new TestCase(
        "Put with attachment",
        SampleKind.PUT,
        {
          encoding: Encoding.TEXT_PLAIN,
          attachment: attachmentData,
        },
        "message with attachment"
      ),
      new TestCase(
        "Put with timestamp",
        SampleKind.PUT,
        {
          encoding: Encoding.APPLICATION_JSON,
          timestamp: putTimestamp,
          priority: Priority.DATA_HIGH,
        },
        "message with timestamp"
      ),
      new TestCase(
        "Put with all options combined",
        SampleKind.PUT,
        {
          encoding: Encoding.APPLICATION_CBOR,
          congestionControl: CongestionControl.DROP,
          priority: Priority.INTERACTIVE_HIGH,
          express: false,
          attachment: fullOptionsAttachment,
        },
        "message with all options"
      ),
      // DELETE operations
      new TestCase("Basic delete without options", SampleKind.DELETE),
      new TestCase(
        "Delete with priority and congestion control",
        SampleKind.DELETE,
        {
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
        }
      ),
      new TestCase("Delete with express flag", SampleKind.DELETE, {
        express: true,
      }),
      new TestCase("Delete with attachment", SampleKind.DELETE, {
        attachment: deleteAttachment,
      }),
      new TestCase("Delete with timestamp", SampleKind.DELETE, {
        timestamp: deleteTimestamp,
        priority: Priority.DATA_HIGH,
      }),
      new TestCase("Delete with all options combined", SampleKind.DELETE, {
        congestionControl: CongestionControl.DROP,
        priority: Priority.INTERACTIVE_HIGH,
        express: false,
        attachment: fullDeleteAttachment,
      }),
    ];

    // Execute all operations
    for (const testCase of testCases) {
      if (testCase.sampleKind === SampleKind.PUT) {
        if (testCase.options) {
          await session1.put(
            "zenoh/test/operations",
            testCase.payload!,
            testCase.options as PutOptions
          );
        } else {
          await session1.put("zenoh/test/operations", testCase.payload!);
        }
      } else if (testCase.sampleKind === SampleKind.DELETE) {
        if (testCase.options) {
          await session1.delete(
            "zenoh/test/operations",
            testCase.options as DeleteOptions
          );
        } else {
          await session1.delete("zenoh/test/operations", {});
        }
      }
    }

    // Delay to ensure all messages are received
    await sleep(200);

    // Verify we received all messages
    assertEquals(
      samples.length,
      testCases.length,
      `Expected ${testCases.length} messages total`
    );

    // Verify each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const sample = samples[i];

      // Verify sample kind
      assertEquals(
        sample.kind(),
        testCase.sampleKind,
        `${testCase.description}: sample kind mismatch`
      );

      // Verify payload for PUT operations
      if (testCase.sampleKind === SampleKind.PUT) {
        assertEquals(
          sample.payload().toString(),
          testCase.payload,
          `${testCase.description}: payload mismatch`
        );

        // Verify encoding for PUT operations
        assertEquals(
          sample.encoding(),
          testCase.expectedEncoding(),
          `${testCase.description}: encoding mismatch`
        );
      }

      // Verify priority
      assertEquals(
        sample.priority(),
        testCase.expectedPriority(),
        `${testCase.description}: priority mismatch`
      );

      // Verify attachment
      assertEquals(
        sample.attachment()?.toString(),
        testCase.expectedAttachment(),
        `${testCase.description}: attachment mismatch`
      );
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
