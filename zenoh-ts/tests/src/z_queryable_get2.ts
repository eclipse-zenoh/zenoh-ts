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
  Query,
  Reply,
  KeyExpr,
  Selector,
  ReplyError,
  Parameters,
  Sample,
  QueryTarget,
  Queryable,
  ChannelReceiver,
  Querier,
  GetOptions,
  QuerierGetOptions,
  Encoding,
  Priority,
  CongestionControl,
  ZBytes,
  ConsolidationMode,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration';
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const { milliseconds } = Duration;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

enum OperationType {
  SESSION_GET_CALLBACK = "Session Get with Callback",
  SESSION_GET_CHANNEL = "Session Get with Channel", 
  QUERIER_GET_CALLBACK = "Querier Get with Callback",
  QUERIER_GET_CHANNEL = "Querier Get with Channel",
}

class TestCase {
  constructor(
    public description: string,
    public operationType: OperationType,
    public options?: GetOptions | QuerierGetOptions,
    public payload?: string
  ) {}

  expectedEncoding(): Encoding {
    if (this.operationType === OperationType.SESSION_GET_CALLBACK || 
        this.operationType === OperationType.SESSION_GET_CHANNEL) {
      return (this.options as GetOptions)?.encoding ?? Encoding.default();
    } else {
      return (this.options as QuerierGetOptions)?.encoding ?? Encoding.default();
    }
  }

  expectedPriority(): Priority {
    // Only Session operations support priority in GetOptions
    if (this.operationType === OperationType.SESSION_GET_CALLBACK || 
        this.operationType === OperationType.SESSION_GET_CHANNEL) {
      return (this.options as GetOptions)?.priority ?? Priority.DATA;
    }
    return Priority.DATA; // Default for querier operations
  }

  expectedTimeout(): number | undefined {
    // Only Session operations support timeout in GetOptions
    if (this.operationType === OperationType.SESSION_GET_CALLBACK || 
        this.operationType === OperationType.SESSION_GET_CHANNEL) {
      const timeout = (this.options as GetOptions)?.timeout;
      return timeout ? Duration.milliseconds.from(timeout) : undefined;
    }
    return undefined; // Querier operations don't support timeout in get options
  }

  expectedAttachment(): string | undefined {
    return this.options?.attachment?.toString();
  }

  expectedTarget(): QueryTarget | undefined {
    if (this.operationType === OperationType.SESSION_GET_CALLBACK || 
        this.operationType === OperationType.SESSION_GET_CHANNEL) {
      return (this.options as GetOptions)?.target;
    }
    // Querier operations don't have target in get options
    return undefined;
  }
}

Deno.test("API - Comprehensive Query Operations with Options", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;
  let queryable: Queryable | undefined;
  let querier: Querier | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    const queries: Map<string, Query> = new Map();
    const keQueryable = new KeyExpr("zenoh/test/options/*");

    // Declare a queryable on session1
    queryable = await session1.declareQueryable(keQueryable, {
      handler: (query: Query) => {
        const testId = query.parameters().get("test_id");
        if (testId) {
          queries.set(testId, query);
        }
        if (query.parameters().toString().includes("ok")) {
          const payload = query.payload()?.toString() || "response";
          query.reply(query.keyExpr(), payload);
        } else {
          query.replyErr("error response");
        }
      },
    });

    // Delay to ensure queryable and querier are ready
    await sleep(1000);

    // Define test cases for various GetOptions combinations
    const attachmentData = new ZBytes("query metadata");
    const fullOptionsAttachment = new ZBytes("full-options-metadata");
    const timeout1000ms = milliseconds.of(1000);
    const timeout5000ms = milliseconds.of(5000);

    const testCases: TestCase[] = [
      // Session Get with Callback operations
      new TestCase(
        "Session Get Callback - Basic without options",
        OperationType.SESSION_GET_CALLBACK,
        undefined,
        "basic-payload"
      ),
      new TestCase(
        "Session Get Callback - With encoding",
        OperationType.SESSION_GET_CALLBACK,
        { encoding: Encoding.TEXT_PLAIN },
        "encoded-payload"
      ),
      new TestCase(
        "Session Get Callback - With priority and congestion control",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_JSON,
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
        },
        "priority-payload"
      ),
      new TestCase(
        "Session Get Callback - With express flag",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.ZENOH_STRING,
          express: true,
        },
        "express-payload"
      ),
      new TestCase(
        "Session Get Callback - With attachment",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.TEXT_PLAIN,
          attachment: attachmentData,
        },
        "attachment-payload"
      ),
      new TestCase(
        "Session Get Callback - With timeout",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_JSON,
          timeout: timeout1000ms,
          priority: Priority.DATA_HIGH,
        },
        "timeout-payload"
      ),
      new TestCase(
        "Session Get Callback - With target",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_CBOR,
          target: QueryTarget.All,
          priority: Priority.INTERACTIVE_HIGH,
        },
        "target-payload"
      ),
      new TestCase(
        "Session Get Callback - With consolidation",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_YAML,
          consolidation: ConsolidationMode.None,
          priority: Priority.DATA_LOW,
        },
        "consolidation-payload"
      ),
      new TestCase(
        "Session Get Callback - With all options combined",
        OperationType.SESSION_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_XML,
          congestionControl: CongestionControl.DROP,
          priority: Priority.BACKGROUND,
          express: false,
          attachment: fullOptionsAttachment,
          timeout: timeout5000ms,
          target: QueryTarget.BestMatching,
          consolidation: ConsolidationMode.Latest,
        },
        "all-options-payload"
      ),

      // Session Get with Channel operations
      new TestCase(
        "Session Get Channel - Basic without options",
        OperationType.SESSION_GET_CHANNEL,
        undefined,
        "basic-channel-payload"
      ),
      new TestCase(
        "Session Get Channel - With encoding and attachment",
        OperationType.SESSION_GET_CHANNEL,
        {
          encoding: Encoding.TEXT_CSV,
          attachment: attachmentData,
        },
        "channel-attachment-payload"
      ),
      new TestCase(
        "Session Get Channel - With timeout and target",
        OperationType.SESSION_GET_CHANNEL,
        {
          encoding: Encoding.APPLICATION_SQL,
          timeout: timeout5000ms,
          target: QueryTarget.BestMatching,
        },
        "channel-timeout-payload"
      ),

      // Querier Get with Callback operations
      new TestCase(
        "Querier Get Callback - Basic without options",
        OperationType.QUERIER_GET_CALLBACK,
        undefined,
        "querier-basic-payload"
      ),
      new TestCase(
        "Querier Get Callback - With encoding",
        OperationType.QUERIER_GET_CALLBACK,
        { encoding: Encoding.TEXT_MARKDOWN },
        "querier-encoded-payload"
      ),
      new TestCase(
        "Querier Get Callback - With encoding and attachment",
        OperationType.QUERIER_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_COAP_PAYLOAD,
          attachment: attachmentData,
        },
        "querier-attachment-payload"
      ),
      new TestCase(
        "Querier Get Callback - With encoding only",
        OperationType.QUERIER_GET_CALLBACK,
        {
          encoding: Encoding.APPLICATION_JWT,
        },
        "querier-encoding-payload"
      ),

      // Querier Get with Channel operations
      new TestCase(
        "Querier Get Channel - Basic without options",
        OperationType.QUERIER_GET_CHANNEL,
        undefined,
        "querier-channel-basic-payload"
      ),
      new TestCase(
        "Querier Get Channel - With encoding and attachment",
        OperationType.QUERIER_GET_CHANNEL,
        {
          encoding: Encoding.APPLICATION_MP4,
          attachment: fullOptionsAttachment,
        },
        "querier-channel-attachment-payload"
      ),
    ];

    // Execute all operations
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testId = `test_${i}`;
      console.log(`Executing: ${testCase.description}`);
      
      const replies: Reply[] = [];
      let receiver: ChannelReceiver<Reply> | undefined;
      
      const handler = (reply: Reply) => {
        replies.push(reply);
      };

      const keGet = new KeyExpr(`zenoh/test/options/${testId}`);
      
      // Declare a querier for this specific test if needed
      let testQuerier: Querier | undefined;
      if (testCase.operationType === OperationType.QUERIER_GET_CALLBACK || 
          testCase.operationType === OperationType.QUERIER_GET_CHANNEL) {
        testQuerier = await session2.declareQuerier(keGet, {
          target: QueryTarget.BestMatching
        });
      }

      try {
        switch (testCase.operationType) {
          case OperationType.SESSION_GET_CALLBACK:
            if (testCase.options) {
              await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                { ...testCase.options as GetOptions, payload: testCase.payload, handler }
              );
            } else {
              await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                { payload: testCase.payload, handler }
              );
            }
            break;

          case OperationType.SESSION_GET_CHANNEL:
            if (testCase.options) {
              receiver = await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                { ...testCase.options as GetOptions, payload: testCase.payload }
              );
            } else {
              receiver = await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                { payload: testCase.payload }
              );
            }
            break;

          case OperationType.QUERIER_GET_CALLBACK:
            if (testCase.options) {
              await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                { ...testCase.options as QuerierGetOptions, payload: testCase.payload, handler }
              );
            } else {
              await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                { payload: testCase.payload, handler }
              );
            }
            break;

          case OperationType.QUERIER_GET_CHANNEL:
            if (testCase.options) {
              receiver = await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                { ...testCase.options as QuerierGetOptions, payload: testCase.payload }
              );
            } else {
              receiver = await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                { payload: testCase.payload }
              );
            }
            break;
        }

        // Wait for query to be processed
        await sleep(100);

        // Verify the query was received correctly
        const query = queries.get(testId);
        assertEquals(query !== undefined, true, `Query should be received for ${testCase.description}`);

        assertEquals(
          query!.keyExpr().toString(),
          keGet.toString(),
          `Key expression mismatch for ${testCase.description}`
        );

        assertEquals(
          query!.parameters().get("test_id"),
          testId,
          `Test ID mismatch for ${testCase.description}`
        );

        assertEquals(
          query!.payload()?.toString(),
          testCase.payload,
          `Payload mismatch for ${testCase.description}`
        );

        // For operations with encoding option, verify encoding
        if (testCase.options?.encoding) {
          assertEquals(
            query!.encoding()?.toString(),
            testCase.expectedEncoding().toString(),
            `Encoding mismatch for ${testCase.description}`
          );
        }

        // For operations with attachment option, verify attachment
        if (testCase.options?.attachment) {
          assertEquals(
            query!.attachment()?.toString(),
            testCase.expectedAttachment(),
            `Attachment mismatch for ${testCase.description}`
          );
        }

        // Handle replies for channel-based operations
        if (receiver) {
          const reply = await receiver.receive();
          assertEquals(
            reply.result() instanceof Sample,
            true,
            `Reply should be Sample for ${testCase.description}`
          );
          if (reply.result() instanceof Sample) {
            assertEquals(
              reply.result().payload().toString(),
              testCase.payload,
              `Reply payload mismatch for ${testCase.description}`
            );
          }
        } else {
          // For callback operations, wait for handler to be called
          await sleep(100);
          assertEquals(
            replies.length > 0,
            true,
            `Reply should be received via handler for ${testCase.description}`
          );
          const reply = replies[replies.length - 1];
          assertEquals(
            reply.result() instanceof Sample,
            true,
            `Reply should be Sample for ${testCase.description}`
          );
          if (reply.result() instanceof Sample) {
            assertEquals(
              reply.result().payload().toString(),
              testCase.payload,
              `Reply payload mismatch for ${testCase.description}`
            );
          }
        }

        console.log(`✓ Completed: ${testCase.description}`);
      } catch (error) {
        console.error(`✗ Failed: ${testCase.description} - ${error}`);
        throw error;
      } finally {
        // Clean up test querier if it was created
        if (testQuerier) {
          await testQuerier.undeclare();
        }
      }

      // Small delay between test cases
      await sleep(50);
    }

    console.log(`All ${testCases.length} test cases completed successfully`);
    assertEquals(queries.size, testCases.length, "All queries should be received");

  } finally {
    // Cleanup in reverse order of creation
    if (querier) {
      await querier.undeclare();
    }
    if (queryable) {
      await queryable.undeclare();
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
