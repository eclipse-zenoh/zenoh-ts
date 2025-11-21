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
/// <reference lib="deno.ns" />

import {
  Config,
  Session,
  KeyExpr,
  IntoKeyExpr,
  Sample,
  Publisher,
  Subscriber,
  PublisherOptions,
  PublisherPutOptions,
  PublisherDeleteOptions,
  SubscriberOptions,
  Encoding,
  Priority,
  CongestionControl,
  ZBytes,
  Locality,
  Reliability,
  SampleKind,
  Timestamp,
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { StableRandom } from "./commonTestUtils.ts";

const N_OPERATIONS_PER_TEST = 3; // Change this to increase/decrease test coverage
const RANDOM_SEED = 42; // Fixed seed for reproducible test results

//
// Define all 8 possible operation types, only N_OPERATIONS_PER_TEST of them will be used in each test case
//
const allOperations = [
  {
    usePublisher: false,
    useCallback: false,
    useSameSession: false,
  },
  {
    usePublisher: false,
    useCallback: false,
    useSameSession: true,
  },
  {
    usePublisher: false,
    useCallback: true,
    useSameSession: false,
  },
  {
    usePublisher: false,
    useCallback: true,
    useSameSession: true,
  },
  {
    usePublisher: true,
    useCallback: false,
    useSameSession: false,
  },
  {
    usePublisher: true,
    useCallback: false,
    useSameSession: true,
  },
  {
    usePublisher: true,
    useCallback: true,
    useSameSession: false,
  },
  {
    usePublisher: true,
    useCallback: true,
    useSameSession: true,
  },
];

//
// Define all possible option variants for testing. Each option is iterated over
// One test case is generated for each option. Combinations are not generated to
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
  publisherLocalityValues: [
    undefined,
    Locality.SESSION_LOCAL,
    Locality.REMOTE,
    Locality.ANY,
  ],
  subscriberLocalityValues: [
    undefined,
    Locality.SESSION_LOCAL,
    Locality.REMOTE,
    Locality.ANY,
  ],
  reliabilityValues: [
    undefined,
    Reliability.BEST_EFFORT,
    Reliability.RELIABLE,
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
};

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
  assertEquals(
    actual.timestamp(),
    expected.timestamp(),
    `Sample timestamp mismatch for ${description}`
  );
}

/**
 * Class representing a test case with all parameters that can be used in publish/subscribe operations.
 * This includes all parameters for PublisherOptions, PublisherPutOptions, PublisherDeleteOptions, and SubscriberOptions.
 */
class TestCase {
  public timestamp: Timestamp | undefined = undefined; // Will be set during test execution

  constructor(
    public keyexpr: IntoKeyExpr,
    public publisherOptions: PublisherOptions,
    public putOptions: PublisherPutOptions,
    public deleteOptions: PublisherDeleteOptions,
    public payload: string | undefined,
    public subscriberOptions: SubscriberOptions
  ) {}

  toString(): string {
    return `TestCase(keyexpr=${this.keyexpr}, publisherOptions=${JSON.stringify(
      this.publisherOptions
    )}, putOptions=${JSON.stringify(
      this.putOptions
    )}, deleteOptions=${JSON.stringify(
      this.deleteOptions
    )}, payload=${this.payload}, subscriberOptions=${JSON.stringify(this.subscriberOptions)})`;
  }

  /**
   * Create expected Sample object for validation
   * @returns Sample object with expected properties
   */
  expectedSample(): Sample {
    // Determine the effective encoding:
    // 1. Use putOptions.encoding if provided
    // 2. Otherwise use publisherOptions.encoding if provided
    // 3. Otherwise use default encoding
    const effectiveEncoding = this.putOptions.encoding
      ? Encoding.from(this.putOptions.encoding)
      : this.publisherOptions.encoding
      ? Encoding.from(this.publisherOptions.encoding)
      : Encoding.default();

    // Determine the effective payload
    const effectivePayload = new ZBytes(this.payload ?? "");

    // Determine the effective attachment from putOptions
    const effectiveAttachment = this.putOptions.attachment
      ? new ZBytes(this.putOptions.attachment)
      : undefined;

    // Priority: use publisherOptions.priority or default to DATA
    const effectivePriority =
      this.publisherOptions.priority !== undefined
        ? this.publisherOptions.priority
        : Priority.DATA;

    // CongestionControl: use publisherOptions.congestionControl or default to DROP
    const effectiveCongestionControl =
      this.publisherOptions.congestionControl !== undefined
        ? this.publisherOptions.congestionControl
        : CongestionControl.DROP;

    // Express: use publisherOptions.express or default to false
    const effectiveExpress =
      this.publisherOptions.express !== undefined
        ? this.publisherOptions.express
        : false;

    // Create a new Sample object with all the expected properties
    const sample = new Sample(
      new KeyExpr(this.keyexpr),
      effectivePayload,
      SampleKind.PUT,
      effectiveEncoding,
      effectiveAttachment,
      this.timestamp, // Use the timestamp that was sent
      effectivePriority,
      effectiveCongestionControl,
      effectiveExpress
    );

    return sample;
  }

  /**
   * Create expected Sample object for delete operation validation
   * @returns Sample object with expected properties for DELETE kind
   */
  expectedDeleteSample(): Sample {
    // Delete samples have no payload (empty ZBytes)
    const effectivePayload = new ZBytes("");

    // Determine the effective attachment from deleteOptions
    const effectiveAttachment = this.deleteOptions.attachment
      ? new ZBytes(this.deleteOptions.attachment)
      : undefined;

    // Priority: use publisherOptions.priority or default to DATA
    const effectivePriority =
      this.publisherOptions.priority !== undefined
        ? this.publisherOptions.priority
        : Priority.DATA;

    // CongestionControl: use publisherOptions.congestionControl or default to DROP
    const effectiveCongestionControl =
      this.publisherOptions.congestionControl !== undefined
        ? this.publisherOptions.congestionControl
        : CongestionControl.DROP;

    // Express: use publisherOptions.express or default to false
    const effectiveExpress =
      this.publisherOptions.express !== undefined
        ? this.publisherOptions.express
        : false;

    // Create a new Sample object with DELETE kind
    const sample = new Sample(
      new KeyExpr(this.keyexpr),
      effectivePayload,
      SampleKind.DELETE,
      Encoding.default(), // Delete samples use default encoding
      effectiveAttachment,
      this.timestamp, // Use the timestamp that was sent
      effectivePriority,
      effectiveCongestionControl,
      effectiveExpress
    );

    return sample;
  }
}

/**
 * Helper function to compare publisher properties with expected values from PublisherOptions
 * @param publisher The Publisher object to test
 * @param expectedKeyExpr The expected key expression
 * @param expectedOptions The expected PublisherOptions to compare against
 * @param description Test description to include in error messages
 */
function comparePublisherProperties(
  publisher: Publisher,
  expectedKeyExpr: KeyExpr,
  expectedOptions: PublisherOptions,
  description: string
) {
  // Test keyExpr() method
  assertEquals(
    publisher.keyExpr().toString(),
    expectedKeyExpr.toString(),
    `Publisher keyExpr should match for ${description}`
  );

  // Test encoding() method
  const expectedEncoding = expectedOptions.encoding
    ? Encoding.from(expectedOptions.encoding)
    : Encoding.default();
  assertEquals(
    publisher.encoding().toString(),
    expectedEncoding.toString(),
    `Publisher encoding should match for ${description}`
  );

  // Test congestionControl() method
  const expectedCongestionControl =
    expectedOptions.congestionControl ?? CongestionControl.DROP;
  assertEquals(
    publisher.congestionControl(),
    expectedCongestionControl,
    `Publisher congestionControl should match for ${description}`
  );

  // Test priority() method
  const expectedPriority = expectedOptions.priority ?? Priority.DATA;
  assertEquals(
    publisher.priority(),
    expectedPriority,
    `Publisher priority should match for ${description}`
  );

  // Test reliability() method
  const expectedReliability =
    expectedOptions.reliability ?? Reliability.RELIABLE;
  assertEquals(
    publisher.reliability(),
    expectedReliability,
    `Publisher reliability should match for ${description}`
  );
}

/**
 * Helper function to compare subscriber properties with expected values
 * @param subscriber The Subscriber object to test
 * @param expectedKeyExpr The expected key expression
 * @param description Test description to include in error messages
 */
function compareSubscriberProperties(
  subscriber: Subscriber,
  expectedKeyExpr: KeyExpr,
  description: string
) {
  // Test keyExpr() method
  assertEquals(
    subscriber.keyExpr().toString(),
    expectedKeyExpr.toString(),
    `Subscriber keyExpr should match for ${description}`
  );

  // Note: Unlike Publisher, Subscriber class doesn't expose methods to access
  // the 'allowedOrigin' property that was set during creation.
  // This property is used internally but not accessible for testing.
}

/**
 * Options for configuring which values to test for each option type
 */
interface GenerateTestCasesOptions {
  priorityValues?: (Priority | undefined)[];
  congestionControlValues?: (CongestionControl | undefined)[];
  publisherLocalityValues?: (Locality | undefined)[];
  subscriberLocalityValues?: (Locality | undefined)[];
  reliabilityValues?: (Reliability | undefined)[];
  encodingValues?: (Encoding | undefined)[];
  payloadValues?: (string | undefined)[];
  attachmentValues?: (ZBytes | undefined)[];
  expressValues?: (boolean | undefined)[];
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
    const publisherOptions = { ...baseCase.publisherOptions, priority };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for congestionControl
  for (const congestionControl of options.congestionControlValues ?? []) {
    const keyexpr = `zenoh/test/congestionControl/${
      congestionControl ?? "undefined"
    }`;
    const publisherOptions = { ...baseCase.publisherOptions, congestionControl };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for express
  for (const express of options.expressValues ?? []) {
    const keyexpr = `zenoh/test/express/${express ?? "undefined"}`;
    const publisherOptions = { ...baseCase.publisherOptions, express };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for reliability
  for (const reliability of options.reliabilityValues ?? []) {
    const keyexpr = `zenoh/test/reliability/${reliability ?? "undefined"}`;
    const publisherOptions = { ...baseCase.publisherOptions, reliability };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for publisher allowedDestination (locality)
  for (const allowedDestination of options.publisherLocalityValues ?? []) {
    const keyexpr = `zenoh/test/publisher_allowedDestination/${
      allowedDestination ?? "undefined"
    }`;
    const publisherOptions = { ...baseCase.publisherOptions, allowedDestination };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for subscriber allowedOrigin (locality)
  for (const allowedOrigin of options.subscriberLocalityValues ?? []) {
    const keyexpr = `zenoh/test/subscriber_allowedOrigin/${
      allowedOrigin ?? "undefined"
    }`;
    const subscriberOptions = { ...baseCase.subscriberOptions, allowedOrigin };
    testCases.push(
      new TestCase(
        keyexpr,
        baseCase.publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        subscriberOptions
      )
    );
  }

  // Generate test cases for publisher encoding
  for (const encoding of options.encodingValues ?? []) {
    const keyexpr = `zenoh/test/publisher_encoding/${
      encoding?.toString() ?? "undefined"
    }`;
    const publisherOptions = { ...baseCase.publisherOptions, encoding };
    testCases.push(
      new TestCase(
        keyexpr,
        publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for put encoding (overrides publisher encoding)
  for (const encoding of options.encodingValues ?? []) {
    const keyexpr = `zenoh/test/put_encoding/${
      encoding?.toString() ?? "undefined"
    }`;
    const putOptions = { ...baseCase.putOptions, encoding };
    testCases.push(
      new TestCase(
        keyexpr,
        baseCase.publisherOptions,
        putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for payload
  for (const payload of options.payloadValues ?? []) {
    const keyexpr = `zenoh/test/payload/${payload ?? "undefined"}`;
    testCases.push(
      new TestCase(
        keyexpr,
        baseCase.publisherOptions,
        baseCase.putOptions,
        baseCase.deleteOptions,
        payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for attachment
  for (const attachment of options.attachmentValues ?? []) {
    const keyexpr = `zenoh/test/attachment/${
      attachment?.toString() ?? "undefined"
    }`;
    const putOptions = { ...baseCase.putOptions, attachment };
    testCases.push(
      new TestCase(
        keyexpr,
        baseCase.publisherOptions,
        putOptions,
        baseCase.deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  // Generate test cases for delete attachment
  for (const attachment of options.attachmentValues ?? []) {
    const keyexpr = `zenoh/test/delete_attachment/${
      attachment?.toString() ?? "undefined"
    }`;
    const deleteOptions = { ...baseCase.deleteOptions, attachment };
    testCases.push(
      new TestCase(
        keyexpr,
        baseCase.publisherOptions,
        baseCase.putOptions,
        deleteOptions,
        baseCase.payload,
        baseCase.subscriberOptions
      )
    );
  }

  return testCases;
}

Deno.test("API - Comprehensive Publisher/Subscriber Operations with Options", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));

    // Delay to ensure sessions are ready
    await sleep(100);

    // Generate test cases using the generateTestCases function
    const baseTestCase = new TestCase("zenoh/test/base", {}, {}, {}, "test-payload", {});

    // Generate comprehensive test cases by cycling through all available option values
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

      let subscriber: Subscriber | undefined;
      let publisher: Publisher | undefined;
      let samples: Sample[] = [];

      for (const operation of selectedOperations) {
        // Generate description based on operation properties
        const publisherType = operation.usePublisher
          ? "Publisher"
          : "Session.put";
        const callbackType = operation.useCallback ? "Callback" : "Channel";
        const sessionMode = operation.useSameSession ? "Same" : "Different";
        const fullDescription = `${testCase.keyexpr.toString()} - ${publisherType} ${callbackType} ${sessionMode}Session`;

        subscriber = undefined;
        publisher = undefined;
        samples = [];

        // Choose session based on useSameSession flag
        const publisherSession = operation.useSameSession ? session1 : session2;
        const subscriberSession = session1; // Subscriber is always on session1

        // Declare a subscriber on session1
        const keSubscriber = testCase.keyexpr;

        if (operation.useCallback) {
          subscriber = await subscriberSession.declareSubscriber(
            keSubscriber,
            {
              ...testCase.subscriberOptions,
              handler: (s: Sample) => {
                // Store the samples for validation
                samples.push(s);
              },
            }
          );
        } else {
          subscriber = await subscriberSession.declareSubscriber(
            keSubscriber,
            testCase.subscriberOptions
          );
        }

        // Test subscriber properties
        compareSubscriberProperties(
          subscriber,
          new KeyExpr(keSubscriber),
          fullDescription
        );

        // Short delay to ensure subscriber is ready
        await sleep(100);

        try {
          if (operation.usePublisher) {
            // Declare a publisher
            const kePublisher = testCase.keyexpr;
            publisher = await publisherSession!.declarePublisher(
              kePublisher,
              testCase.publisherOptions
            );

            // Test publisher properties
            comparePublisherProperties(
              publisher,
              new KeyExpr(kePublisher),
              testCase.publisherOptions,
              fullDescription
            );

            // Generate timestamp for this test case
            testCase.timestamp = await publisherSession!.newTimestamp();

            // Put using publisher
            await publisher.put(
              testCase.payload ?? "",
              {
                ...testCase.putOptions,
                timestamp: testCase.timestamp,
              }
            );

            // Wait for put sample to be processed
            await sleep(100);

            // Delete using publisher
            await publisher.delete({
              ...testCase.deleteOptions,
              timestamp: testCase.timestamp,
            });
          } else {
            // Generate timestamp for this test case
            testCase.timestamp = await publisherSession!.newTimestamp();

            // Put using session directly - combine publisher and put options
            await publisherSession!.put(
              testCase.keyexpr,
              testCase.payload ?? "",
              {
                // Merge publisher options and put options
                // Put options take precedence for encoding and attachment
                encoding:
                  testCase.putOptions.encoding ??
                  testCase.publisherOptions.encoding,
                attachment: testCase.putOptions.attachment,
                timestamp: testCase.timestamp,
                congestionControl: testCase.publisherOptions.congestionControl,
                priority: testCase.publisherOptions.priority,
                express: testCase.publisherOptions.express,
                allowedDestination: testCase.publisherOptions.allowedDestination,
              }
            );

            // Wait for put sample to be processed
            await sleep(100);

            // Delete using session directly
            await publisherSession!.delete(
              testCase.keyexpr,
              {
                attachment: testCase.deleteOptions.attachment,
                timestamp: testCase.timestamp,
                congestionControl: testCase.publisherOptions.congestionControl,
                priority: testCase.publisherOptions.priority,
                express: testCase.publisherOptions.express,
                allowedDestination: testCase.publisherOptions.allowedDestination,
              }
            );
          }

          // Wait for delete sample to be processed
          await sleep(100);

          // For channel operations, read from receiver first (read both PUT and DELETE samples)
          if (!operation.useCallback) {
            const receiver = subscriber!.receiver();
            if (receiver) {
              // Try to read samples with a timeout (expect up to 2: PUT and DELETE)
              const readPromise = (async () => {
                for await (const s of receiver) {
                  samples.push(s);
                  if (samples.length >= 2) break; // Expect PUT and DELETE samples
                }
              })();

              // Wait for the read with a timeout
              await Promise.race([
                readPromise,
                sleep(300) // Additional wait time for channel reads
              ]);
            }
          }

          // Verify samples were received correctly based on locality settings
          // We expect to receive both PUT and DELETE if locality allows
          const sampleExpected = (() => {
            const allowedDestination = testCase.publisherOptions.allowedDestination;
            const allowedOrigin = testCase.subscriberOptions.allowedOrigin;

            let expected = true;

            // If allowedDestination is REMOTE but we're using the same session, sample should NOT be received
            if (allowedDestination === Locality.REMOTE && operation.useSameSession) {
              expected = false;
            }

            // If allowedDestination is SESSION_LOCAL but we're using different sessions, sample should NOT be received
            if (allowedDestination === Locality.SESSION_LOCAL && !operation.useSameSession) {
              expected = false;
            }

            // If allowedOrigin is REMOTE but we're using the same session, sample should NOT be received
            if (allowedOrigin === Locality.REMOTE && operation.useSameSession) {
              expected = false;
            }

            // If allowedOrigin is SESSION_LOCAL but we're using different sessions, sample should NOT be received
            if (allowedOrigin === Locality.SESSION_LOCAL && !operation.useSameSession) {
              expected = false;
            }

            return expected;
          })();

          // Handle samples only if expected to be received
          if (sampleExpected) {
            // Should receive exactly 2 samples: PUT and DELETE
            assertEquals(
              samples.length,
              2,
              `Should receive exactly 2 samples (PUT and DELETE) for ${fullDescription}, got ${samples.length}`
            );

            // Separate PUT and DELETE samples
            const putSamples = samples.filter(s => s.kind() === SampleKind.PUT);
            const deleteSamples = samples.filter(s => s.kind() === SampleKind.DELETE);

            assertEquals(
              putSamples.length,
              1,
              `Should receive exactly one PUT sample for ${fullDescription}`
            );
            assertEquals(
              deleteSamples.length,
              1,
              `Should receive exactly one DELETE sample for ${fullDescription}`
            );

            // Verify PUT Sample
            compareSample(putSamples[0], testCase.expectedSample(), fullDescription + " (PUT)");

            // Verify DELETE Sample
            compareSample(deleteSamples[0], testCase.expectedDeleteSample(), fullDescription + " (DELETE)");
          } else {
            // Sample was not expected due to locality restrictions - verify no sample was received
            assertEquals(
              samples.length,
              0,
              `No sample should be received when blocked by locality for ${fullDescription}`
            );
          }

          console.log(`✓ Completed: ${fullDescription}`);
        } catch (error) {
          console.error(`✗ Failed: ${fullDescription} - ${error}`);
          throw error;
        } finally {
          // Clean up test-specific resources
          if (publisher) {
            await publisher.undeclare();
          }
          if (subscriber) {
            await subscriber.undeclare();
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
