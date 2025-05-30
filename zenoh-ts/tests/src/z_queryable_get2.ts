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
  Parameters,
  Sample,
  QueryTarget,
  Queryable,
  ChannelReceiver,
  Querier,
  GetOptions,
  QuerierGetOptions,
  QuerierOptions,
  Encoding,
  Priority,
  CongestionControl,
  ZBytes,
  ConsolidationMode,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from "typed-duration";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const { milliseconds } = Duration;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TestCase {
  constructor(
    public description: string,
    public querierOptions?: QuerierOptions,
    public querierGetOptions?: QuerierGetOptions
  ) {}

  // Convert QuerierOptions + QuerierGetOptions to GetOptions for session operations
  toGetOptions(): GetOptions | undefined {
    const getOptions: GetOptions = {
      // Copy from QuerierOptions (for session operations, these are supported)
      ...(this.querierOptions && {
        congestionControl: this.querierOptions.congestionControl,
        consolidation: this.querierOptions.consolidation,
        priority: this.querierOptions.priority,
        express: this.querierOptions.express,
        target: this.querierOptions.target,
        timeout: this.querierOptions.timeout,
      }),
      // Copy from QuerierGetOptions (these are supported in both)
      ...(this.querierGetOptions && {
        encoding: this.querierGetOptions.encoding,
        attachment: this.querierGetOptions.attachment,
        payload: this.querierGetOptions.payload,
      }),
    };

    // Return undefined if no fields were added to getOptions
    return Object.keys(getOptions).length > 0 ? getOptions : undefined;
  }

  expectedEncoding(): Encoding {
    return this.querierGetOptions?.encoding ?? Encoding.default();
  }

  expectedPriority(): Priority {
    return this.querierOptions?.priority ?? Priority.DATA;
  }

  expectedTimeout(): number | undefined {
    const timeout = this.querierOptions?.timeout;
    return timeout ? Duration.milliseconds.from(timeout) : undefined;
  }

  expectedAttachment(): string | undefined {
    return this.querierGetOptions?.attachment?.toString();
  }

  expectedTarget(): QueryTarget | undefined {
    return this.querierOptions?.target;
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
          const payload = query.payload()?.toString();
          // Echo back the received payload, or empty string if no payload was received
          const replyPayload = payload !== undefined ? payload : "";
          query.reply(query.keyExpr(), replyPayload);
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
      // Basic test without options
      new TestCase("Basic test without options"),

      // Test with empty payload
      new TestCase("With empty payload", undefined, {
        payload: "",
      }),

      // Test without payload field
      new TestCase("Without payload field", undefined, {
        encoding: Encoding.TEXT_PLAIN,
      }),

      // Test with encoding only
      new TestCase("With encoding", undefined, {
        encoding: Encoding.TEXT_PLAIN,
        payload: "encoded-payload",
      }),

      // Test with querier options (priority, congestion control, etc.)
      new TestCase(
        "With priority and congestion control",
        {
          priority: Priority.REAL_TIME,
          congestionControl: CongestionControl.BLOCK,
          target: QueryTarget.BestMatching,
        },
        { encoding: Encoding.APPLICATION_JSON, payload: "priority-payload" }
      ),

      // Test with express flag
      new TestCase(
        "With express flag",
        {
          express: true,
          target: QueryTarget.BestMatching,
        },
        { encoding: Encoding.ZENOH_STRING, payload: "express-payload" }
      ),

      // Test with attachment
      new TestCase(
        "With attachment",
        { target: QueryTarget.BestMatching },
        {
          encoding: Encoding.TEXT_PLAIN,
          attachment: attachmentData,
          payload: "attachment-payload",
        }
      ),

      // Test with timeout
      new TestCase(
        "With timeout",
        {
          timeout: timeout1000ms,
          priority: Priority.DATA_HIGH,
          target: QueryTarget.BestMatching,
        },
        { encoding: Encoding.APPLICATION_JSON, payload: "timeout-payload" }
      ),

      // Test with target
      new TestCase(
        "With target",
        {
          target: QueryTarget.All,
          priority: Priority.INTERACTIVE_HIGH,
        },
        { encoding: Encoding.APPLICATION_CBOR, payload: "target-payload" }
      ),

      // Test with consolidation
      new TestCase(
        "With consolidation",
        {
          consolidation: ConsolidationMode.None,
          priority: Priority.DATA_LOW,
          target: QueryTarget.BestMatching,
        },
        {
          encoding: Encoding.APPLICATION_YAML,
          payload: "consolidation-payload",
        }
      ),

      // Test with all options combined
      new TestCase(
        "With all options combined",
        {
          congestionControl: CongestionControl.DROP,
          priority: Priority.BACKGROUND,
          express: false,
          timeout: timeout5000ms,
          target: QueryTarget.BestMatching,
          consolidation: ConsolidationMode.Latest,
        },
        {
          encoding: Encoding.APPLICATION_XML,
          attachment: fullOptionsAttachment,
          payload: "all-options-payload",
        }
      ),

      // Test with all options but empty payload
      new TestCase(
        "With all options but empty payload",
        {
          congestionControl: CongestionControl.BLOCK,
          priority: Priority.REAL_TIME,
          express: true,
          timeout: timeout1000ms,
          target: QueryTarget.All,
          consolidation: ConsolidationMode.Latest,
        },
        {
          encoding: Encoding.APPLICATION_JSON,
          attachment: attachmentData,
          payload: "",
        }
      ),

      // Test with all options but no payload
      new TestCase(
        "With all options but no payload",
        {
          congestionControl: CongestionControl.DROP,
          priority: Priority.DATA_HIGH,
          express: false,
          timeout: timeout5000ms,
          target: QueryTarget.BestMatching,
          consolidation: ConsolidationMode.None,
        },
        {
          encoding: Encoding.APPLICATION_CBOR,
          attachment: fullOptionsAttachment,
        }
      ),
    ];

    // Execute all operations - run all 4 variants for each test case
    let testCounter = 0;
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      // Define the 4 operation types
      const operations = [
        {
          type: "Session Get with Callback",
          useSession: true,
          useCallback: true,
        },
        {
          type: "Session Get with Channel",
          useSession: true,
          useCallback: false,
        },
        {
          type: "Querier Get with Callback",
          useSession: false,
          useCallback: true,
        },
        {
          type: "Querier Get with Channel",
          useSession: false,
          useCallback: false,
        },
      ];

      for (const operation of operations) {
        const testId = `test_${testCounter}`;
        const fullDescription = `${testCase.description} - ${operation.type}`;
        console.log(`Executing: ${fullDescription}`);

        const replies: Reply[] = [];
        let receiver: ChannelReceiver<Reply> | undefined;

        const handler = (reply: Reply) => {
          replies.push(reply);
        };

        const keGet = new KeyExpr(`zenoh/test/options/${testId}`);

        // Declare a querier for this specific test if needed
        let testQuerier: Querier | undefined;
        if (!operation.useSession) {
          testQuerier = await session2.declareQuerier(keGet, {
            target: QueryTarget.BestMatching,
          });
        }

        try {
          if (operation.useSession) {
            // Session-based operation
            const getOptions = testCase.toGetOptions();

            if (operation.useCallback) {
              const finalOptions = { ...getOptions, handler };
              await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                finalOptions
              );
            } else {
              receiver = await session2.get(
                new Selector(keGet, `ok;test_id=${testId}`),
                getOptions
              );
            }
          } else {
            // Querier-based operation
            const querierGetOptions: QuerierGetOptions = {
              ...testCase.querierGetOptions,
            };

            if (operation.useCallback) {
              querierGetOptions.handler = handler;
              await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                querierGetOptions
              );
            } else {
              receiver = await testQuerier!.get(
                new Parameters(`ok;test_id=${testId}`),
                querierGetOptions
              );
            }
          }

          // Wait for query to be processed
          await sleep(100);

          // Verify the query was received correctly
          const query = queries.get(testId);
          assertEquals(
            query !== undefined,
            true,
            `Query should be received for ${fullDescription}`
          );

          assertEquals(
            query!.keyExpr().toString(),
            keGet.toString(),
            `Key expression mismatch for ${fullDescription}`
          );

          assertEquals(
            query!.parameters().get("test_id"),
            testId,
            `Test ID mismatch for ${fullDescription}`
          );

          const actualQueryPayload = query!.payload()?.toString() ?? "";
          const expectedQueryPayload = testCase.querierGetOptions?.payload ?? "";
          assertEquals(
            actualQueryPayload,
            expectedQueryPayload,
            `Payload mismatch for ${fullDescription}`
          );

          // For operations with encoding option, verify encoding
          if (testCase.querierGetOptions?.encoding) {
            assertEquals(
              query!.encoding()?.toString(),
              testCase.expectedEncoding().toString(),
              `Encoding mismatch for ${fullDescription}`
            );
          }

          // For operations with attachment option, verify attachment
          if (testCase.querierGetOptions?.attachment) {
            assertEquals(
              query!.attachment()?.toString(),
              testCase.expectedAttachment(),
              `Attachment mismatch for ${fullDescription}`
            );
          }

          // Handle replies for channel-based operations
          if (receiver) {
            const reply = await receiver.receive();
            assertEquals(
              reply.result() instanceof Sample,
              true,
              `Reply should be Sample for ${fullDescription}`
            );
            if (reply.result() instanceof Sample) {
              const actualPayload = reply.result().payload().toString();
              const expectedPayload = testCase.querierGetOptions?.payload ?? "";
              assertEquals(
                actualPayload,
                expectedPayload,
                `Reply payload mismatch for ${fullDescription}`
              );
            }
          } else {
            // For callback operations, wait for handler to be called
            await sleep(100);
            assertEquals(
              replies.length > 0,
              true,
              `Reply should be received via handler for ${fullDescription}`
            );
            const reply = replies[replies.length - 1];
            assertEquals(
              reply.result() instanceof Sample,
              true,
              `Reply should be Sample for ${fullDescription}`
            );
            if (reply.result() instanceof Sample) {
              const actualPayload = reply.result().payload().toString();
              const expectedPayload = testCase.querierGetOptions?.payload ?? "";
              assertEquals(
                actualPayload,
                expectedPayload,
                `Reply payload mismatch for ${fullDescription}`
              );
            }
          }

          console.log(`✓ Completed: ${fullDescription}`);
        } catch (error) {
          console.error(`✗ Failed: ${fullDescription} - ${error}`);
          throw error;
        } finally {
          // Clean up test querier if it was created
          if (testQuerier) {
            await testQuerier.undeclare();
          }
        }

        // Small delay between test cases
        await sleep(50);
        testCounter++;
      }
    }

    const totalTests = testCases.length * 4; // 4 variants per test case
    console.log(`All ${totalTests} test cases completed successfully`);
    assertEquals(queries.size, totalTests, "All queries should be received");
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
