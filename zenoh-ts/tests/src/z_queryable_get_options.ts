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
  ReplyError,
  KeyExpr,
  IntoKeyExpr,
  Selector,
  Sample,
  QueryTarget,
  ChannelReceiver,
  Querier,
  Queryable,
  GetOptions,
  QuerierGetOptions,
  QuerierOptions,
  ReplyOptions,
  ReplyErrOptions,
  ReplyDelOptions,
  Encoding,
  Priority,
  CongestionControl,
  ZBytes,
  ConsolidationMode,
  SampleKind,
  Locality,
  ReplyKeyExpr,
  IntoParameters,
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { Duration } from "typed-duration";
import { StableRandom } from "./commonTestUtils.ts";

const N_OPERATIONS_PER_TEST = 3; // Change this to increase/decrease test coverage
const RANDOM_SEED = 42; // Fixed seed for reproducible test results

//
// Define all 8 possible operation types, only N_OPERATIONS_PER_TEST of them will be used in each test case
//
const allOperations = [
  {
    useQuerier: false,
    useCallback: false,
    useSameSession: false,
  },
  {
    useQuerier: false,
    useCallback: false,
    useSameSession: true,
  },
  {
    useQuerier: false,
    useCallback: true,
    useSameSession: false,
  },
  {
    useQuerier: false,
    useCallback: true,
    useSameSession: true,
  },
  {
    useQuerier: true,
    useCallback: false,
    useSameSession: false,
  },
  {
    useQuerier: true,
    useCallback: false,
    useSameSession: true,
  },
  {
    useQuerier: true,
    useCallback: true,
    useSameSession: false,
  },
  {
    useQuerier: true,
    useCallback: true,
    useSameSession: true,
  },
];

//
// Define all possible option variants for testing. Each option is iterated over
// One test case is generated for each option. Combination are not generated to
// avoid combinatorial explosion of test cases.
//
const optionVariants = {
  priorityValues: [
    undefined,
    Priority.REAL_TIME,
    Priority.INTERACTIVE_HIGH,
    Priority.INTERACTIVE_LOW,
    Priority.DATA_HIGH,
    Priority.DATA,
    Priority.DATA_LOW,
    Priority.BACKGROUND,
  ],
  congestionControlValues: [
    undefined,
    CongestionControl.DROP,
    CongestionControl.BLOCK,
  ],
  localityValues: [
    undefined,
    Locality.SESSION_LOCAL,
    Locality.REMOTE,
    Locality.ANY,
  ],
  queryTargetValues: [
    undefined,
    QueryTarget.BEST_MATCHING,
    QueryTarget.ALL,
    QueryTarget.ALL_COMPLETE,
  ],
  consolidationModeValues: [
    undefined,
    ConsolidationMode.AUTO,
    ConsolidationMode.NONE,
    ConsolidationMode.MONOTONIC,
    ConsolidationMode.LATEST,
  ],
    replyKeyExprValues: [
      undefined,
      ReplyKeyExpr.ANY,
      ReplyKeyExpr.MATCHING_QUERY,
    ],
    encodingValues: [
      undefined,
      Encoding.default(),
      Encoding.TEXT_PLAIN,
      Encoding.APPLICATION_JSON,
    ],
    payloadValues: [undefined, "test-payload"],
    attachmentValues: [undefined, new ZBytes("test-attachment")],
    expressValues: [undefined, false, true],
    timeoutValues: [undefined, Duration.milliseconds.of(1000)],
};

/**
 * Helper function to assert if a query should be received based on locality settings and return the expected query
 * @param testCase The test case containing the locality settings
 * @param useSameSession Whether the query and queryable are using the same session
 * @param query The actual query received (or undefined if no query was received)
 * @param description Test description to include in error messages
 * @returns testCase.expectedQuery() if the query should be received, undefined otherwise
 */
function verifyReceivedQuery(
  testCase: TestCase,
  useSameSession: boolean,
  query: Query | undefined,
  description: string
): ExpectedQuery | undefined {
  const allowedDestination = testCase.getOptions.allowedDestination;

  let queryExpected = true;

  // If allowedDestination is REMOTE but we're using the same session, query should NOT be received
  if (allowedDestination === Locality.REMOTE && useSameSession) {
    queryExpected = false;
  }

  // If allowedDestination is SESSION_LOCAL but we're using different sessions, query should NOT be received
  if (allowedDestination === Locality.SESSION_LOCAL && !useSameSession) {
    queryExpected = false;
  }

  // Assert that the query was received as expected
  assertEquals(
    query !== undefined,
    queryExpected,
    `Query should ${
      queryExpected ? "be" : "NOT be"
    } received for ${description} (locality ${
      allowedDestination ?? "is default"
    }, target ${testCase.getOptions.target ?? "is default"})`
  );

  return queryExpected ? testCase.expectedQuery() : undefined;
}

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

/**
 * ExpectedQuery class that mirrors the Query class interface for testing
 * Provides the same data access methods that Query class provides
 */
class ExpectedQuery {
  constructor(
    public keyexpr: KeyExpr,
    public payload?: ZBytes,
    public encoding?: Encoding,
    public attachment?: ZBytes
  ) {
    // specific case: if encoding is set, we return an empty ZBytes even if payload is undefined
    // TODO: check if this behavior is necessary or if we can remove it
    if (this.encoding && !this.payload) {
      this.payload = new ZBytes("");
    }
  }
}

/**
 * Compare actual Query object with expected Query data
 * @param actual The actual Query received
 * @param expected The expected Query data to compare against
 * @param keyexpr The expected key expression to compare against
 * @param description Test description to include in error messages
 */
function compareQuery(
  actual: Query,
  expected: ExpectedQuery,
  keyexpr: KeyExpr,
  description: string
) {
  assertEquals(
    actual.keyExpr().toString(),
    keyexpr.toString(),
    `Query keyexpr mismatch for ${description}`
  );

  assertEquals(
    actual.payload(),
    expected.payload,
    `Query payload mismatch for ${description}`
  );

  assertEquals(
    actual.encoding(),
    expected.encoding,
    `Query encoding mismatch for ${description}`
  );

  assertEquals(
    actual.attachment(),
    expected.attachment,
    `Query attachment mismatch for ${description}`
  );
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
  constructor(
    public keyexpr: IntoKeyExpr,
    public parameters: IntoParameters,
    public getOptions: GetOptions
  ) {}

  toString(): string {
    return `TestCase(keyexpr=${this.keyexpr}, parameters=${
      this.parameters
    }, getOptions=${JSON.stringify(this.getOptions)})`;
  }

  /**
   * Convert parameters to QuerierOptions for Querier creation
   * @returns QuerierOptions object populated with the TestCase parameters
   */
  toQuerierOptions(): QuerierOptions {
    return {
      congestionControl: this.getOptions.congestionControl,
      priority: this.getOptions.priority,
      express: this.getOptions.express,
      target: this.getOptions.target,
      consolidation: this.getOptions.consolidation,
      timeout: this.getOptions.timeout,
      allowedDestination: this.getOptions.allowedDestination,
      acceptReplies: this.getOptions.acceptReplies,
    };
  }

  /**
   * Convert parameters to QuerierGetOptions for Querier.get operations
   * @returns QuerierGetOptions object populated with the TestCase parameters
   */
  toQuerierGetOptions(): QuerierGetOptions {
    return {
      parameters: this.parameters,
      encoding: this.getOptions.encoding,
      payload: this.getOptions.payload,
      attachment: this.getOptions.attachment,
    };
  }

  /**
   * Convert parameters to reply options for queryable's reply method
   * @returns ReplyOptions object containing options for the Query.reply method
   */
  toReplyOptions(): ReplyOptions {
    // Create options object with named fields
    return {
      encoding: this.getOptions.encoding,
      congestionControl: this.getOptions.congestionControl,
      priority: this.getOptions.priority,
      express: this.getOptions.express,
      attachment: this.getOptions.attachment,
    };
  }

  /**
   * Convert parameters to reply error options for queryable's replyErr method
   * @returns ReplyErrOptions object containing options for the Query.replyErr method
   */
  toReplyErrOptions(): ReplyErrOptions {
    return {
      encoding: this.getOptions.encoding
        ? Encoding.from(this.getOptions.encoding)
        : undefined,
    };
  }

  /**
   * Convert parameters to reply delete options for queryable's replyDel method
   * @returns ReplyDelOptions object containing options for the Query.replyDel method
   */
  toReplyDelOptions(): ReplyDelOptions {
    return {
      congestionControl: this.getOptions.congestionControl,
      priority: this.getOptions.priority,
      express: this.getOptions.express,
      attachment: this.getOptions.attachment,
    };
  }

  expectedQuery(): ExpectedQuery {
    return new ExpectedQuery(
      new KeyExpr(this.keyexpr), // This will be replaced with the actual keGet in the calling code
      this.getOptions.payload ? new ZBytes(this.getOptions.payload) : undefined,
      // If payload is provided but no encoding is explicitly set, use default encoding
      this.getOptions.encoding
        ? Encoding.from(this.getOptions.encoding)
        : this.getOptions.payload
        ? Encoding.default()
        : undefined,
      this.getOptions.attachment
        ? new ZBytes(this.getOptions.attachment)
        : undefined
    );
  }

  expectedSample(): Sample {
    // For the response, we construct a Sample object based on:
    // 1. The test case's keyexpr (this will be the response keyExpr)
    // 2. The payload sent in the query (this becomes the response payload)
    // 3. Values specific to the test case for other fields
    //
    // Now we're setting explicit reply options for each test case,
    // so we should use the test case's actual values rather than defaults

    // Payload is preserved from the query

    // Create a new Sample object with all the expected properties
    const sample = new Sample(
      new KeyExpr(this.keyexpr),
      new ZBytes(this.getOptions.payload ?? ""),
      SampleKind.PUT, // Sample kind for query responses is always PUT
      this.getOptions.encoding
        ? Encoding.from(this.getOptions.encoding)
        : Encoding.default(),
      this.getOptions.attachment
        ? new ZBytes(this.getOptions.attachment)
        : undefined,
      undefined, // Timestamp is not set in test responses
      this.getOptions.priority === undefined
        ? Priority.DATA
        : this.getOptions.priority,
      this.getOptions.congestionControl === undefined
        ? CongestionControl.DEFAULT_RESPONSE
        : this.getOptions.congestionControl,
      this.getOptions.express === undefined ? false : this.getOptions.express
    );

    return sample;
  }

  /**
   * Create expected ReplyError object for error reply validation
   * @returns ReplyError object with expected properties using the query payload
   */
  expectedReplyError(): ReplyError {
    // Create expected ReplyError with the query payload and encoding from test case options
    // This mirrors how sample replies work - they echo back the query payload
    return new ReplyError(
      new ZBytes(this.getOptions.payload ?? ""),
      this.getOptions.encoding
        ? Encoding.from(this.getOptions.encoding)
        : Encoding.default()
    );
  }

  /**
   * Create expected Sample object for delete reply validation
   * @returns Sample object with expected properties using DELETE kind and no payload
   */
  expectedDeleteSample(): Sample {
    // Create expected delete Sample with the test case's keyexpr and DELETE kind
    // Delete samples typically have no payload, so we use an empty ZBytes
    return new Sample(
      new KeyExpr(this.keyexpr),
      new ZBytes(""), // Delete samples typically have no payload
      SampleKind.DELETE, // Sample kind for delete replies is DELETE
      Encoding.default(), // Delete samples use default encoding
      this.getOptions.attachment
        ? new ZBytes(this.getOptions.attachment)
        : undefined,
      undefined, // Timestamp is not set in test responses
      this.getOptions.priority === undefined
        ? Priority.DEFAULT
        : this.getOptions.priority,
      this.getOptions.congestionControl === undefined
        ? CongestionControl.DEFAULT_RESPONSE
        : this.getOptions.congestionControl,
      this.getOptions.express === undefined ? false : this.getOptions.express
    );
  }
}

/**
 * Helper function to compare ReplyError objects in tests
 * @param actual The actual ReplyError received
 * @param expected The expected ReplyError to compare against
 * @param description Test description to include in error messages
 */
function compareReplyError(
  actual: ReplyError,
  expected: ReplyError,
  description: string
) {
  assertEquals(
    actual.payload().toString(),
    expected.payload().toString(),
    `ReplyError payload mismatch for ${description}`
  );
  assertEquals(
    actual.encoding().toString(),
    expected.encoding().toString(),
    `ReplyError encoding mismatch for ${description}`
  );
}

/**
 * Helper function to compare querier properties with expected values from QuerierOptions
 * @param querier The Querier object to test
 * @param expectedKeyExpr The expected key expression
 * @param expectedOptions The expected QuerierOptions to compare against
 * @param description Test description to include in error messages
 */
function compareQuerierProperties(
  querier: Querier,
  expectedKeyExpr: KeyExpr,
  expectedOptions: QuerierOptions,
  description: string
) {
  // Test keyExpr() method
  assertEquals(
    querier.keyExpr().toString(),
    expectedKeyExpr.toString(),
    `Querier keyExpr should match for ${description}`
  );

  // Test congestionControl() method
  const expectedCongestionControl =
    expectedOptions.congestionControl ?? CongestionControl.DEFAULT_REQUEST;
  assertEquals(
    querier.congestionControl(),
    expectedCongestionControl,
    `Querier congestionControl should match for ${description}`
  );

  // Test priority() method
  const expectedPriority = expectedOptions.priority ?? Priority.DEFAULT;
  assertEquals(
    querier.priority(),
    expectedPriority,
    `Querier priority should match for ${description}`
  );

  // Test acceptReplies() method
  const acceptRepliesValue = querier.acceptReplies();
  assertEquals(
    typeof acceptRepliesValue,
    "number",
    `Querier acceptReplies should return a number for ${description}`
  );

  // The expected value should come from options or default to MATCHING_QUERY (1)
  const expectedAcceptReplies = expectedOptions.acceptReplies ?? 1; // ReplyKeyExpr.DEFAULT which is MATCHING_QUERY = 1
  assertEquals(
    acceptRepliesValue,
    expectedAcceptReplies,
    `Querier acceptReplies should return expected value for ${description}`
  );
}

/**
 * Helper function to compare queryable properties with expected values
 * @param queryable The Queryable object to test
 * @param expectedKeyExpr The expected key expression
 * @param description Test description to include in error messages
 */
function compareQueryableProperties(
  queryable: Queryable,
  expectedKeyExpr: KeyExpr,
  description: string
) {
  // Test keyExpr() method
  assertEquals(
    queryable.keyExpr().toString(),
    expectedKeyExpr.toString(),
    `Queryable keyExpr should match for ${description}`
  );

  // Note: Unlike Querier, Queryable class doesn't expose methods to access
  // the 'complete' and 'allowedOrigin' properties that were set during creation.
  // These properties are used internally but not accessible for testing.
}

/**
 * Options for configuring which values to test for each option type
 */
interface GenerateTestCasesOptions {
  priorityValues?: (Priority | undefined)[];
  congestionControlValues?: (CongestionControl | undefined)[];
  localityValues?: (Locality | undefined)[];
  queryTargetValues?: (QueryTarget | undefined)[];
  consolidationModeValues?: (ConsolidationMode | undefined)[];
  replyKeyExprValues?: (ReplyKeyExpr | undefined)[];
  encodingValues?: (Encoding | undefined)[];
  payloadValues?: (string | undefined)[];
  attachmentValues?: (ZBytes | undefined)[];
  expressValues?: (boolean | undefined)[];
  timeoutValues?: (ReturnType<typeof Duration.milliseconds.of> | undefined)[];
}

/**
 * Generate a list of TestCase objects by cycling through available values of each option
 * @param baseCase Initial test case with the parameters to keep constant
 * @param options Optional configuration for which values to test for each option type
 * @returns Array of TestCase objects with different option combinations
 */
function generateTestCases(
  baseCase: TestCase,
  options: GenerateTestCasesOptions
): TestCase[] {
  const testCases: TestCase[] = [];
  // Generate test cases for priority
  for (const priority of options.priorityValues ?? []) {
    const keyexpr = `zenoh/test/priority/${priority ?? "undefined"}`;
    const options = { ...baseCase.getOptions, priority };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for congestionControl
  for (const congestionControl of options.congestionControlValues ?? []) {
    const keyexpr = `zenoh/test/congestionControl/${
      congestionControl ?? "undefined"
    }`;
    const options = { ...baseCase.getOptions, congestionControl };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for express
  for (const express of options.expressValues ?? []) {
    const keyexpr = `zenoh/test/express/${express ?? "undefined"}`;
    const options = { ...baseCase.getOptions, express };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for allowedDestinaton (locality)
  for (const allowedDestinaton of options.localityValues ?? []) {
    const keyexpr = `zenoh/test/allowedDestinaton/${
      allowedDestinaton ?? "undefined"
    }`;
    const options = { ...baseCase.getOptions, allowedDestinaton };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for encoding
  for (const encoding of options.encodingValues ?? []) {
    const keyexpr = `zenoh/test/encoding/${
      encoding?.toString() ?? "undefined"
    }`;
    const options = { ...baseCase.getOptions, encoding };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for payload
  for (const payload of options.payloadValues ?? []) {
    const keyexpr = `zenoh/test/payload/${payload ?? "undefined"}`;
    const options = { ...baseCase.getOptions, payload };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for attachment
  for (const attachment of options.attachmentValues ?? []) {
    const keyexpr = `zenoh/test/attachment/${
      attachment?.toString() ?? "undefined"
    }`;
    const options = { ...baseCase.getOptions, attachment };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for timeout
  for (const timeout of options.timeoutValues ?? []) {
    // Convert timeout Duration to a readable string representation
    const timeoutStr = timeout ? `${timeout.value}ms` : "undefined";
    const keyexpr = `zenoh/test/timeout/${timeoutStr}`;
    const options = { ...baseCase.getOptions, timeout };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for target
  for (const target of options.queryTargetValues ?? []) {
    const keyexpr = `zenoh/test/target/${target ?? "undefined"}`;
    const options = { ...baseCase.getOptions, target };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for consolidation
  for (const consolidation of options.consolidationModeValues ?? []) {
    const keyexpr = `zenoh/test/consolidation/${consolidation ?? "undefined"}`;
    const options = { ...baseCase.getOptions, consolidation };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  // Generate test cases for acceptReplies
  for (const acceptReplies of options.replyKeyExprValues ?? []) {
    const keyexpr = `zenoh/test/acceptReplies/${acceptReplies ?? "undefined"}`;
    const options = { ...baseCase.getOptions, acceptReplies };
    testCases.push(new TestCase(keyexpr, baseCase.parameters, options));
  }

  return testCases;
}

Deno.test("API - Comprehensive Query Operations with Options", async () => {
  // Configuration: Number of random operations to test per test case
  let session1: Session | undefined;
  let session2: Session | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    // Generate test cases using the generateTestCases function
    const baseTestCase = new TestCase("zenoh/test/base", "test-params", {});

    // Generate comprehensive test cases by cycling through all available option values
    // const testCases: TestCase[] = generateTestCases(baseTestCase);
    const testCases: TestCase[] = generateTestCases(
      baseTestCase,
      optionVariants
    );
    let testCounter = 0;

    // Initialize stable random number generator
    const rng = new StableRandom(RANDOM_SEED);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      // Select N random operations for this test case using stable random generator
      // This ensures reproducible test runs while reducing the total number of operations tested
      const selectedOperations = rng
        .shuffle(allOperations)
        .slice(0, N_OPERATIONS_PER_TEST);

      let receiver: ChannelReceiver<Reply> | undefined;
      let query: Query | undefined;
      let querier: Querier | undefined;
      let replies: Reply[] = [];

      for (const operation of selectedOperations) {
        // Generate description based on operation properties
        const sessionType = operation.useQuerier ? "Querier" : "Get";
        const callbackType = operation.useCallback ? "Callback" : "Channel";
        const sessionMode = operation.useSameSession ? "Same" : "Different";
        const fullDescription = `${testCase.keyexpr.toString()} - ${sessionType} ${callbackType} ${sessionMode}Session`;

        receiver = undefined;
        querier = undefined;
        query = undefined;
        replies = [];

        // Declare a queryable on session1
        const keQueryable = testCase.keyexpr;
        const queryable = await session1.declareQueryable(keQueryable, {
          complete: true, // Required for QueryTarget.ALL_COMPLETE to work properly
          // TODO: Add tests for complete: false and for not receiveing queries when complete is false
          handler: (q: Query) => {
            // Store the query for validation
            query = q;

            // Verify the parameters were received correctly
            // Note: When acceptReplies is ReplyKeyExpr.ANY, Zenoh automatically appends ";_anyke" to parameters
            const expectedParams =
              testCase.getOptions.acceptReplies === ReplyKeyExpr.ANY
                ? testCase.parameters.toString() + ";_anyke"
                : testCase.parameters.toString();

            assertEquals(
              q.parameters().toString(),
              expectedParams,
              `Query parameters should match for ${fullDescription}`
            );

            //
            // IMPORTANT: queryable should return the queryable's keyExpr for the reply, not the keyexpr requested (q.keyexpr())
            // E.g. requet may be "zenoh/test/*" and reply should contain keyexpr "zenoh/test/testcase1"
            //

            // Send delete reply first
            try {
              q.replyDel(keQueryable, testCase.toReplyDelOptions());
            } catch (error) {
              throw new Error(
                `Delete reply failed for ${fullDescription}: ${error}`
              );
            }

            // Send normal reply second
            try {
              q.reply(
                keQueryable,
                q.payload() ?? "",
                testCase.toReplyOptions()
              );
            } catch (error) {
              throw new Error(
                `Normal reply failed for ${fullDescription}: ${error}`
              );
            }

            // Send also an error reply
            try {
              q.replyErr(q.payload() ?? "", testCase.toReplyErrOptions());
            } catch (error) {
              throw new Error(
                `Error reply failed for ${fullDescription}: ${error}`
              );
            }

            q.finalize();
          },
        });

        // Test queryable properties
        compareQueryableProperties(
          queryable,
          new KeyExpr(keQueryable),
          fullDescription
        );

        // Short delay to ensure queryable is ready
        await sleep(100);

        // Declare a querier for this specific test if needed
        try {
          // For QueryTarget.ALL_COMPLETE, use the exact key expression instead of wildcard
          // This is because ALL_COMPLETE requires more precise matching with complete queryables
          // For other query targets, use wildcard to allow broader matching
          const keGet =
            testCase.getOptions.target === QueryTarget.ALL_COMPLETE
              ? new KeyExpr(testCase.keyexpr.toString())
              : new KeyExpr(`zenoh/test/**`);

          // Choose session based on useSameSession flag
          const clientSession = operation.useSameSession ? session1 : session2;

          if (!operation.useQuerier) {
            if (operation.useCallback) {
              await clientSession!.get(
                new Selector(keGet, testCase.parameters),
                {
                  ...testCase.getOptions,
                  handler: (reply: Reply) => {
                    replies.push(reply);
                  },
                }
              );
            } else {
              receiver = await clientSession!.get(
                new Selector(keGet, testCase.parameters),
                testCase.getOptions
              );
            }
          } else {
            querier = await clientSession!.declareQuerier(
              keGet,
              testCase.toQuerierOptions()
            );

            // Test querier methods return values
            if (querier) {
              compareQuerierProperties(
                querier,
                keGet,
                testCase.toQuerierOptions(),
                fullDescription
              );
            }

            if (operation.useCallback) {
              await querier!.get({
                ...testCase.toQuerierGetOptions(),
                handler: (reply: Reply) => {
                  replies.push(reply);
                },
              });
            } else {
              receiver = await querier!.get({
                ...testCase.toQuerierGetOptions(),
              });
            }
          }

          // Wait for query to be processed
          await sleep(100);

          // Verify the query was received correctly based on locality settings
          const receivedQuery = verifyReceivedQuery(
            testCase,
            operation.useSameSession,
            query,
            fullDescription
          );

          if (query && receivedQuery) {
            // Verify the query was received correctly using compareQuery
            compareQuery(query as Query, receivedQuery, keGet, fullDescription);
          }

          // Handle replies only if query was expected to be received
          if (receivedQuery && receiver) {
            for await (const reply of receiver) {
              // Collect replies from the receiver
              replies.push(reply);
            }

            // Verify consolidation worked correctly based on the consolidation mode
            verifyConsolidation(
              replies,
              testCase.getOptions.consolidation,
              fullDescription
            );

            // Always expect 2 or 3 replies: PUT sample, ERROR reply, and DELETE sample
            // DELETE sample goes first, then PUT sample
            // So in case of consolidation, we may receive only PUT and ERROR replies
            // Categorize replies into separate lists
            const { samplePut, sampleDelete, replyErrors } =
              categorizeReplies(replies);

            // Verify we received exactly one PUT sample and one ReplyError
            // DELETE samples may or may not be received depending on consolidation
            assertEquals(
              samplePut.length,
              1,
              `Should receive exactly one PUT sample for ${fullDescription}`
            );
            assertEquals(
              replyErrors.length,
              1,
              `Should receive exactly one ReplyError for ${fullDescription}`
            );
            // DELETE sample is optional - it may be consolidated away
            if (sampleDelete.length > 1) {
              throw new Error(
                `Should receive at most one DELETE sample for ${fullDescription}, got ${sampleDelete.length}`
              );
            }

            // Verify Sample reply (PUT)
            compareSample(
              samplePut[0],
              testCase.expectedSample(),
              fullDescription
            );

            // Verify DELETE Sample reply if received
            if (sampleDelete.length === 1) {
              compareSample(
                sampleDelete[0],
                testCase.expectedDeleteSample(),
                fullDescription
              );
            }

            // Verify ReplyError reply
            const expectedError = testCase.expectedReplyError();
            compareReplyError(replyErrors[0], expectedError, fullDescription);
          } else if (!receivedQuery && receiver) {
            // Query was not expected due to locality restrictions - verify no reply is received
            // For channel operations, we can't easily check if no reply was received without waiting
            // This is expected behavior - the receiver would block waiting for a reply that never comes
            console.log(
              `  Query correctly blocked by locality restrictions for ${fullDescription}`
            );
          } else if (receivedQuery) {
            // For callback operations, wait for handlers to be called
            await sleep(100);

            // Verify consolidation worked correctly based on the consolidation mode
            verifyConsolidation(
              replies,
              testCase.getOptions.consolidation,
              fullDescription
            );

            // Categorize replies into separate lists
            const {
              samplePut,
              sampleDelete: _sampleDelete,
              replyErrors,
            } = categorizeReplies(replies);

            // Verify we received exactly one PUT sample and one ReplyError
            // DELETE replies may or may not be received depending on configuration
            assertEquals(
              samplePut.length,
              1,
              `Should receive exactly one PUT sample for ${fullDescription}`
            );
            assertEquals(
              replyErrors.length,
              1,
              `Should receive exactly one ReplyError for ${fullDescription}`
            );

            // Verify Sample reply (PUT)
            const expectedSample = testCase.expectedSample();
            compareSample(samplePut[0], expectedSample, fullDescription);

            // Verify ReplyError reply
            const expectedError = testCase.expectedReplyError();
            compareReplyError(replyErrors[0], expectedError, fullDescription);
          } else {
            // Query was not expected due to locality restrictions - verify no replies were received
            await sleep(100);
            assertEquals(
              replies.length,
              0,
              `No reply should be received when query is blocked by locality for ${fullDescription}`
            );
          }

          console.log(`✓ Completed: ${fullDescription}`);
        } catch (error) {
          console.error(`✗ Failed: ${fullDescription} - ${error}`);
          throw error;
        } finally {
          // Clean up test-specific resources
          if (querier) {
            await querier.undeclare();
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

    const totalTests = testCases.length * N_OPERATIONS_PER_TEST; // N random operations per test case
    console.log(
      `All ${totalTests} test cases completed successfully (${testCases.length} test cases × ${N_OPERATIONS_PER_TEST} operations each)`
    );
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

/**
 * Verify that consolidation worked correctly based on the consolidation mode and number of replies
 * @param replies Array of Reply objects received
 * @param consolidationMode The consolidation mode used in the query
 * @param description Test description for error messages
 */
function verifyConsolidation(
  replies: Reply[],
  consolidationMode: ConsolidationMode | undefined,
  description: string
): void {
  // If consolidation is undefined, AUTO or MONOTONIC, expect 2 or 3 replies
  // If consolidation is NONE, expect exactly 3 replies (PUT, DELETE, ERROR)
  // If consolidation is LATEST, expect 2 replies (PUT, ERROR) as DELETE must be consolidated away
  if (
    consolidationMode === undefined ||
    consolidationMode === ConsolidationMode.AUTO ||
    consolidationMode === ConsolidationMode.MONOTONIC
  ) {
    // Expect 2 or 3 replies (PUT, DELETE, ERROR)
    assertEquals(
      replies.length >= 2 && replies.length <= 3,
      true,
      `Expected 2 or 3 replies for ${description}, but got ${replies.length}`
    );
  } else if (consolidationMode === ConsolidationMode.NONE) {
    // Expect exactly 3 replies (PUT, DELETE, ERROR)
    assertEquals(
      replies.length,
      3,
      `Expected exactly 3 replies for ${description}, but got ${replies.length}`
    );
  } else if (consolidationMode === ConsolidationMode.LATEST) {
    // Expect exactly 2 replies (PUT, ERROR)
    assertEquals(
      replies.length,
      2,
      `Expected exactly 2 replies for ${description}, but got ${replies.length}`
    );
  }
}

/**
 * Categorize replies into separate lists for PUT samples, DELETE samples, and ReplyErrors
 * @param replies Array of Reply objects to categorize
 * @returns Object containing three arrays: samplePut, sampleDelete, and replyErrors
 */
function categorizeReplies(replies: Reply[]): {
  samplePut: Sample[];
  sampleDelete: Sample[];
  replyErrors: ReplyError[];
} {
  const samplePut: Sample[] = [];
  const sampleDelete: Sample[] = [];
  const replyErrors: ReplyError[] = [];

  for (const reply of replies) {
    const result = reply.result();

    if (result instanceof Sample) {
      if (result.kind() === SampleKind.PUT) {
        samplePut.push(result);
      } else if (result.kind() === SampleKind.DELETE) {
        sampleDelete.push(result);
      }
    } else if (result instanceof ReplyError) {
      replyErrors.push(result);
    }
  }

  return { samplePut, sampleDelete, replyErrors };
}
