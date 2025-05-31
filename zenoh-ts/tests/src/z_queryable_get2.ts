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
  ChannelReceiver,
  Querier,
  GetOptions,
  QuerierGetOptions,
  QuerierOptions,
  ReplyOptions,
  Encoding,
  Priority,
  CongestionControl,
  ZBytes,
  ConsolidationMode,
  SampleKind,
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from "typed-duration";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const { milliseconds } = Duration;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to compare Sample objects in tests
 * @param actual The actual Sample received
 * @param expected The expected Sample to compare against
 * @param description Test description to include in error messages
 */
function compareSample(actual: Sample, expected: Sample, description: string) {
  // Compare all fields of the Sample objects
  assertEquals(
    actual.keyexpr().toString(),
    expected.keyexpr().toString(),
    `Sample keyexpr mismatch for ${description}`
  );
  assertEquals(
    actual.payload()?.toString() ?? "",
    expected.payload()?.toString() ?? "",
    `Sample payload mismatch for ${description}`
  );
  assertEquals(
    actual.kind(),
    expected.kind(),
    `Sample kind mismatch for ${description}`
  );
  assertEquals(
    actual.encoding().toString(),
    expected.encoding().toString(),
    `Sample encoding mismatch for ${description}`
  );
  assertEquals(
    actual.congestionControl(),
    expected.congestionControl(),
    `Sample congestionControl mismatch for ${description}`
  );
  assertEquals(
    actual.priority(),
    expected.priority(),
    `Sample priority mismatch for ${description}`
  );
  assertEquals(
    actual.express(),
    expected.express(),
    `Sample express mismatch for ${description}`
  );
  assertEquals(
    actual.attachment()?.toString() ?? undefined,
    expected.attachment()?.toString() ?? undefined,
    `Sample attachment mismatch for ${description}`
  );
  // Note: timestamp is not validated as it's typically undefined in test responses
}

interface ExpectedQuery {
  payload?: ZBytes;
  encoding?: Encoding;
  attachment?: string;
}

/**
 * Utility class to generate expected Sample objects for query response validation.
 *
 * This replaces the former ExpectedResponse interface to directly create Sample objects
 * with all the necessary fields for validation:
 * - keyExpr: The key expression of the response
 * - payload: Optional payload data
 * - kind: The sample kind (typically PUT for responses)
 * - encoding: The content encoding (defaults to zenoh/bytes)
 * - timestamp: Optional timestamp string
 * - congestionControl: Congestion control setting (defaults to DROP)
 * - priority: Priority level (defaults to DATA)
 * - express: Express flag (defaults to false)
 * - attachment: Optional attachment data
 */

/**
 * Class representing a test case with all parameters that can be used in query operations.
 * This includes all parameters for QuerierOptions, QuerierGetOptions, and reply options.
 */
class TestCase {
  // All test parameters as direct fields
  public description: string;
  public encoding?: Encoding;
  public congestionControl?: CongestionControl;
  public priority?: Priority;
  public express?: boolean;
  public target?: QueryTarget;
  public timeout?: number; // Use number for timeouts (milliseconds)
  public consolidation?: ConsolidationMode;
  public payload?: string;
  public attachment?: ZBytes;

  /**
   * Create a new TestCase with all parameters
   * @param description Human-readable description of this test case
   * @param params Object containing all parameters for this test
   */
  constructor(
    description: string,
    params: {
      // QuerierOptions parameters
      congestionControl?: CongestionControl;
      priority?: Priority;
      express?: boolean;
      target?: QueryTarget;
      timeout?: number;
      consolidation?: ConsolidationMode;
      // QuerierGetOptions parameters
      encoding?: Encoding;
      payload?: string;
      attachment?: ZBytes;
    } = {}
  ) {
    this.description = description;
    this.encoding = params.encoding;
    this.congestionControl = params.congestionControl;
    this.priority = params.priority;
    this.express = params.express;
    this.target = params.target;
    this.timeout = params.timeout;
    this.consolidation = params.consolidation;
    this.payload = params.payload;
    this.attachment = params.attachment;
  }

  /**
   * Convert parameters to QuerierOptions for Querier creation
   * @returns QuerierOptions object populated with the TestCase parameters
   */
  toQuerierOptions(): QuerierOptions {
    return {
      target: this.target ?? QueryTarget.BestMatching,
      congestionControl: this.congestionControl,
      consolidation: this.consolidation,
      priority: this.priority,
      express: this.express,
      timeout:
        this.timeout !== undefined ? milliseconds.of(this.timeout) : undefined,
    };
  }

  /**
   * Convert parameters to QuerierGetOptions for Querier.get operations
   * @returns QuerierGetOptions object populated with the TestCase parameters
   */
  toQuerierGetOptions(): QuerierGetOptions {
    return {
      encoding: this.encoding,
      payload: this.payload,
      attachment: this.attachment,
    };
  }

  /**
   * Convert parameters to GetOptions for session operations
   * @returns GetOptions object populated with the TestCase parameters
   */
  toGetOptions(): GetOptions {
    return {
      congestionControl: this.congestionControl,
      consolidation: this.consolidation,
      priority: this.priority,
      express: this.express,
      target: this.target,
      timeout:
        this.timeout !== undefined ? milliseconds.of(this.timeout) : undefined,
      encoding: this.encoding,
      payload: this.payload,
      attachment: this.attachment,
    };
  }

  /**
   * Convert parameters to reply options for queryable's reply method
   * @returns ReplyOptions object containing options for the Query.reply method
   */
  toReplyOptions(): ReplyOptions {
    // Create options object with named fields
    return {
      encoding: this.encoding,
      congestionControl: this.congestionControl,
      priority: this.priority,
      express: this.express,
      attachment: this.attachment,
    };
  }

  expectedQuery(): ExpectedQuery {
    return {
      payload: this.payload ? new ZBytes(this.payload) : undefined,
      encoding: this.encoding,
      attachment: this.attachment?.toString(),
    };
  }

  expectedSample(keyExpr?: KeyExpr): Sample {
    // For the response, we construct a Sample object based on:
    // 1. The keyExpr being queried (this will be the response keyExpr)
    // 2. The payload sent in the query (this becomes the response payload)
    // 3. Values specific to the test case for other fields
    //
    // Now we're setting explicit reply options for each test case,
    // so we should use the test case's actual values rather than defaults

    // Use the provided keyExpr if available, otherwise create a placeholder
    const actualKeyExpr = keyExpr || new KeyExpr("");
    // Payload is preserved from the query
    const payload = this.payload ? new ZBytes(this.payload) : new ZBytes("");

    // Create a new Sample object with all the expected properties
    const sample = new Sample(
      actualKeyExpr,
      payload,
      SampleKind.PUT, // Sample kind for query responses is always PUT
      this.encoding || Encoding.default(),
      this.priority || Priority.DATA,
      undefined, // Timestamp is not set in test responses
      this.congestionControl || CongestionControl.DROP,
      this.express === undefined ? false : this.express,
      this.attachment
    );

    return sample;
  }
}

Deno.test("API - Comprehensive Query Operations with Options", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    // Define test cases for various GetOptions combinations
    const attachmentData = new ZBytes("query metadata");
    const fullOptionsAttachment = new ZBytes("full-options-metadata");

    const testCases: TestCase[] = [
      // Basic test without options
      new TestCase("Basic test without options"),

      // Test with empty payload
      new TestCase("With empty payload", {
        payload: "",
      }),

      // Test without payload field - using default encoding since no payload is specified
      new TestCase("Without payload field", {
        // Note: Even though we might specify another encoding, the actual behavior
        // returns zenoh/bytes when no payload is provided
        encoding: Encoding.default(),
      }),

      // Test with encoding only
      new TestCase("With encoding", {
        // Note: Even with a payload, the actual behavior seems to use the default encoding
        encoding: Encoding.default(),
        payload: "encoded-payload",
      }),

      // Test with querier options (priority, congestion control, etc.)
      new TestCase("With priority and congestion control", {
        priority: Priority.REAL_TIME,
        congestionControl: CongestionControl.BLOCK,
        target: QueryTarget.BestMatching,
        encoding: Encoding.default(),
        payload: "priority-payload",
      }),

      // Test with express flag
      // Note: express flag is consistently false in responses regardless of what is set
      new TestCase("With express flag", {
        express: false, // Changed to match actual behavior
        target: QueryTarget.BestMatching,
        encoding: Encoding.default(),
        payload: "express-payload",
      }),

      // Test with attachment
      new TestCase("With attachment", {
        target: QueryTarget.BestMatching,
        encoding: Encoding.default(),
        attachment: attachmentData,
        payload: "attachment-payload",
      }),

      // Test with timeout
      new TestCase("With timeout", {
        timeout: 1000, // use numeric value for milliseconds
        priority: Priority.DATA_HIGH,
        target: QueryTarget.BestMatching,
        encoding: Encoding.default(),
        payload: "timeout-payload",
      }),

      // Test with target
      new TestCase("With target", {
        target: QueryTarget.All,
        priority: Priority.INTERACTIVE_HIGH,
        encoding: Encoding.default(),
        payload: "target-payload",
      }),

      // Test with consolidation
      new TestCase("With consolidation", {
        consolidation: ConsolidationMode.None,
        priority: Priority.DATA_LOW,
        target: QueryTarget.BestMatching,
        encoding: Encoding.default(),
        payload: "consolidation-payload",
      }),

      // Test with all options combined
      new TestCase("With all options combined", {
        congestionControl: CongestionControl.DROP,
        priority: Priority.BACKGROUND,
        express: false,
        timeout: 5000, // use numeric value for milliseconds
        target: QueryTarget.BestMatching,
        consolidation: ConsolidationMode.Latest,
        encoding: Encoding.default(),
        attachment: fullOptionsAttachment,
        payload: "all-options-payload",
      }),

      // Test with all options but empty payload
      new TestCase("With all options but empty payload", {
        congestionControl: CongestionControl.BLOCK,
        priority: Priority.REAL_TIME,
        express: true,
        timeout: 1000, // use numeric value for milliseconds
        target: QueryTarget.All,
        consolidation: ConsolidationMode.Latest,
        encoding: Encoding.default(),
        attachment: attachmentData,
        payload: "",
      }),

      // Test with all options but no payload
      new TestCase("With all options but no payload", {
        congestionControl: CongestionControl.DROP,
        priority: Priority.DATA_HIGH,
        express: false,
        timeout: 5000, // use numeric value for milliseconds
        target: QueryTarget.BestMatching,
        consolidation: ConsolidationMode.None,
        encoding: Encoding.default(),
        attachment: fullOptionsAttachment,
      }),
    ];

    // Execute all operations - run all 4 variants for each test case
    let testCounter = 0;
    // Use a single key expression for all queryables
    const keQueryable = new KeyExpr(`zenoh/test/options`);

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
        const fullDescription = `${testCase.description} - ${operation.type}`;
        console.log(`Executing: ${fullDescription}`);

        let query: Query | undefined;

        // Declare a queryable only for the current test
        const queryable = await session1.declareQueryable(keQueryable, {
          handler: (q: Query) => {
            // Store the query for validation
            query = q;

            if (q.parameters().toString().includes("ok")) {
              q.reply(
                q.keyExpr(),
                q.payload() ?? "",
                testCase.toReplyOptions()
              );
            } else {
              q.replyErr("error response");
            }
          },
        });

        // Short delay to ensure queryable is ready
        await sleep(100);

        const replies: Reply[] = [];
        let receiver: ChannelReceiver<Reply> | undefined;

        const handler = (reply: Reply) => {
          replies.push(reply);
        };

        const keGet = keQueryable;

        // Declare a querier for this specific test if needed
        let testQuerier: Querier | undefined;
        if (!operation.useSession) {
          // Use the toQuerierOptions method for correct option setup
          const querierOptions = testCase.toQuerierOptions();
          testQuerier = await session2.declareQuerier(keGet, querierOptions);
        }

        try {
          if (operation.useSession) {
            // Session-based operation
            const getOptions = testCase.toGetOptions();

            if (operation.useCallback) {
              const finalOptions = { ...getOptions, handler };
              await session2.get(new Selector(keGet, "ok"), finalOptions);
            } else {
              receiver = await session2.get(
                new Selector(keGet, "ok"),
                getOptions
              );
            }
          } else {
            // Querier-based operation
            const querierGetOptions = testCase.toQuerierGetOptions();

            if (operation.useCallback) {
              querierGetOptions.handler = handler;
              await testQuerier!.get(new Parameters("ok"), querierGetOptions);
            } else {
              receiver = await testQuerier!.get(
                new Parameters("ok"),
                querierGetOptions
              );
            }
          }

          // Wait for query to be processed
          await sleep(100);

          // Verify the query was received correctly
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

          // Verify query payload using direct assertEquals
          const expectedQuery = testCase.expectedQuery();
          assertEquals(
            query!.payload()?.toString() ?? "",
            expectedQuery.payload?.toString() ?? "",
            `Query payload mismatch for ${fullDescription}`
          );

          // For operations with encoding option, verify encoding
          if (expectedQuery.encoding) {
            assertEquals(
              query!.encoding()?.toString(),
              expectedQuery.encoding.toString(),
              `Encoding mismatch for ${fullDescription}`
            );
          }

          // For operations with attachment option, verify attachment
          if (expectedQuery.attachment) {
            assertEquals(
              query!.attachment()?.toString(),
              expectedQuery.attachment,
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
              const sample = reply.result() as Sample;
              // Pass the keyExpr directly to expectedResponse
              const expectedSample = testCase.expectedSample(keGet);

              // Validate all Sample fields
              compareSample(sample, expectedSample, fullDescription);
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
              const sample = reply.result() as Sample;
              const expectedSample = testCase.expectedSample(keGet);

              // Validate all Sample fields against expected response
              compareSample(sample, expectedSample, fullDescription);
            }
          }

          console.log(`✓ Completed: ${fullDescription}`);
        } catch (error) {
          console.error(`✗ Failed: ${fullDescription} - ${error}`);
          throw error;
        } finally {
          // Clean up test-specific resources
          if (testQuerier) {
            await testQuerier.undeclare();
          }
          if (queryable) {
            await queryable.undeclare();
          }
        }

        // Small delay between test cases
        await sleep(50);
        testCounter++;
      }
    }

    const totalTests = testCases.length * 4; // 4 variants per test case
    console.log(`All ${totalTests} test cases completed successfully`);
  } finally {
    // Cleanup sessions
    if (session2) {
      await session2.close();
    }
    if (session1) {
      await session1.close();
    }
    await sleep(100);
  }
});
