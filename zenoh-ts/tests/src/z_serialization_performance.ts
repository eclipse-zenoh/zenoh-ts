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
    zserialize, 
    zdeserialize, 
    ZS, 
    ZD
} from "@eclipse-zenoh/zenoh-ts/ext";
import { ZBytes } from "@eclipse-zenoh/zenoh-ts";
import { assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

/**
 * Configuration for the performance tests
 */
const TEST_CONFIG = {
    arraySize: 10000,   // Size of test arrays - increased for more significant data volume
    maxStringLength: 8,  // Length of test strings is randomized but capped
    iterations: 10,      // Number of test iterations
    warmupIterations: 2, // Warmup iterations before actual testing
};

/**
 * Statistics from a performance test
 */
interface PerformanceStats {
    avg: number;
    min: number;
    max: number;
    stddev: number;
    bytesPerSecond: number;
}

/**
 * Test case definition for a specific type
 */
interface TestCase<T> {
    name: string;
    data: T;
    serialize(value: T): ZBytes;
    deserialize(bytes: ZBytes): T;
    validate(original: T, deserialized: T): void;
    getSize(data: T): number;
}

/**
 * Results from running a test case
 */
interface TestResults {
    serializationStats: PerformanceStats;
    deserializationStats: PerformanceStats;
    size: number;
}

/**
 * Helper function to calculate statistics including standard deviation
 */
function calculateStats(times: number[], bytesSize: number): PerformanceStats {
    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    const variance = times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length;
    const stddev = Math.sqrt(variance);

    const bytesPerSecond = bytesSize / avg * 1000;
    
    return { avg, min, max, stddev, bytesPerSecond };
}

/**
 * Helper function to format statistics
 */
function formatTestResults(name: string, results: TestResults): string {
    const { serializationStats: ser, deserializationStats: deser, size } = results;
    return `${name}:
  Serialization:   ${ser.avg.toFixed(3)} ms (min: ${ser.min.toFixed(3)}, max: ${ser.max.toFixed(3)}, stddev: ${ser.stddev.toFixed(3)})
  Deserialization: ${deser.avg.toFixed(3)} ms (min: ${deser.min.toFixed(3)}, max: ${deser.max.toFixed(3)}, stddev: ${deser.stddev.toFixed(3)})
  Total:           ${(ser.avg + deser.avg).toFixed(3)} ms
  Bandwidth:       ${Math.floor(ser.bytesPerSecond / 1024)} KB/sec serialization, ${Math.floor(deser.bytesPerSecond / 1024)} KB/sec deserialization
  Size: ${(size / 1024).toFixed(2)} KB`;
}

/**
 * Helper function to generate random test data
 */
function generateTestData() {
    const stringGen = () => {
        const len = Math.floor(Math.random() * TEST_CONFIG.maxStringLength) + 1;
        return Array.from({ length: len }, () => 
            String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('');
    };

    return {
        uint8Array: new Uint8Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 256)),
        uint16Array: new Uint16Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 65536)),
        uint32Array: new Uint32Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 4294967296)),
        bigUint64Array: new BigUint64Array(TEST_CONFIG.arraySize)
            .fill(BigInt(Number.MAX_SAFE_INTEGER)),
        int8Array: new Int8Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 256) - 128),
        int16Array: new Int16Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 65536) - 32768),
        int32Array: new Int32Array(TEST_CONFIG.arraySize)
            .map(() => Math.floor(Math.random() * 4294967296) - 2147483648),
        bigInt64Array: new BigInt64Array(TEST_CONFIG.arraySize)
            .fill(BigInt("-9223372036854775808")),
        float32Array: new Float32Array(TEST_CONFIG.arraySize)
            .map(() => Math.random() * 1000),
        float64Array: new Float64Array(TEST_CONFIG.arraySize)
            .map(() => Math.random() * 1000),
        strings: Array.from({ length: TEST_CONFIG.arraySize }, stringGen),
        numberMap: new Map(
            Array.from({ length: TEST_CONFIG.arraySize }, (_, i) => [i, i] as [number, number])
        ),
    };
}

type TypedArrayConstructor = 
    | Uint8ArrayConstructor
    | Uint16ArrayConstructor
    | Uint32ArrayConstructor
    | BigUint64ArrayConstructor
    | Int8ArrayConstructor
    | Int16ArrayConstructor
    | Int32ArrayConstructor
    | BigInt64ArrayConstructor
    | Float32ArrayConstructor
    | Float64ArrayConstructor;

type TypedArrayInstance = 
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | BigUint64Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigInt64Array
    | Float32Array
    | Float64Array;

/**
 * Helper to create a test case for typed arrays
 */
function createTypedArrayTestCase<T extends TypedArrayInstance>(
    name: string,
    data: T,
    serializeFn: (v: T) => ZBytes,
    deserializeFn: (b: ZBytes) => unknown
): TestCase<T> {
    return {
        name,
        data,
        serialize: serializeFn,
        deserialize: (bytes: ZBytes) => deserializeFn(bytes) as T,
        validate: (orig: T, des: T) => {
            assert(des.length === orig.length, `${name}: Length mismatch ${des.length} !== ${orig.length}`);
            for (let i = 0; i < orig.length; i++) {
                assert(des[i] === orig[i], `${name}: Value mismatch at index ${i}: ${des[i]} !== ${orig[i]}`);
            }
        },
        getSize: (d: T) => d.byteLength,
    };
}

/**
 * Define test cases for each type
 */
function createTestCases(testData: ReturnType<typeof generateTestData>): TestCase<unknown>[] {
    return [
        createTypedArrayTestCase(
            "uint8Array",
            testData.uint8Array,
            v => zserialize(v, ZS.uint8array()),
            b => zdeserialize(ZD.uint8array(), b)
        ),
        createTypedArrayTestCase(
            "uint16Array",
            testData.uint16Array,
            v => zserialize(v, ZS.uint16array()),
            b => zdeserialize(ZD.uint16array(), b)
        ),
        createTypedArrayTestCase(
            "uint32Array",
            testData.uint32Array,
            v => zserialize(v, ZS.uint32array()),
            b => zdeserialize(ZD.uint32array(), b)
        ),
        createTypedArrayTestCase(
            "bigUint64Array",
            testData.bigUint64Array,
            v => zserialize(v, ZS.biguint64array()),
            b => zdeserialize(ZD.biguint64array(), b)
        ),
        createTypedArrayTestCase(
            "int8Array",
            testData.int8Array,
            v => zserialize(v, ZS.int8array()),
            b => zdeserialize(ZD.int8array(), b)
        ),
        createTypedArrayTestCase(
            "int16Array",
            testData.int16Array,
            v => zserialize(v, ZS.int16array()),
            b => zdeserialize(ZD.int16array(), b)
        ),
        createTypedArrayTestCase(
            "int32Array",
            testData.int32Array,
            v => zserialize(v, ZS.int32array()),
            b => zdeserialize(ZD.int32array(), b)
        ),
        createTypedArrayTestCase(
            "bigInt64Array",
            testData.bigInt64Array,
            v => zserialize(v, ZS.bigint64array()),
            b => zdeserialize(ZD.bigint64array(), b)
        ),
        createTypedArrayTestCase(
            "float32Array",
            testData.float32Array,
            v => zserialize(v, ZS.float32array()),
            b => zdeserialize(ZD.float32array(), b)
        ),
        createTypedArrayTestCase(
            "float64Array",
            testData.float64Array,
            v => zserialize(v, ZS.float64array()),
            b => zdeserialize(ZD.float64array(), b)
        ),
        {
            name: "strings",
            data: testData.strings,
            serialize: (value: string[]) => zserialize(value, ZS.array(ZS.string())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.array(ZD.string()), bytes),
            validate: (orig: string[], des: string[]) => {
                assert(des.length === orig.length, `strings: Length mismatch ${des.length} !== ${orig.length}`);
                for (let i = 0; i < orig.length; i++) {
                    assert(des[i] === orig[i], `strings: Value mismatch at index ${i}: "${des[i]}" !== "${orig[i]}"`);
                }
            },
            getSize: (d: string[]) => d.reduce((total: number, str: string) => total + str.length * 2, 0),
        },
        {
            name: "numberMap",
            data: testData.numberMap,
            serialize: (value: Map<number, number>) => zserialize(value, ZS.map(ZS.number(), ZS.number())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.map(ZD.number(), ZD.number()), bytes),
            validate: (orig: Map<number, number>, des: Map<number, number>) => {
                assert(des.size === orig.size, `numberMap: Size mismatch ${des.size} !== ${orig.size}`);
                for (const [key, value] of orig.entries()) {
                    assert(des.has(key), `numberMap: Missing key ${key}`);
                    assert(des.get(key) === value, `numberMap: Value mismatch for key ${key}: ${des.get(key)} !== ${value}`);
                }
            },
            getSize: (d: Map<number, number>) => d.size * 16,
        }
    ];
}

/**
 * Run performance test for a single test case
 */
function runTestCase<T>(testCase: TestCase<T>): TestResults {
    const serializationTimes: number[] = [];
    const deserializationTimes: number[] = [];
    const size = testCase.getSize(testCase.data);

    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        let start = performance.now();
        const bytes = testCase.serialize(testCase.data);
        let end = performance.now();
        serializationTimes.push(end - start);

        start = performance.now();
        const deserialized = testCase.deserialize(bytes);
        end = performance.now();
        deserializationTimes.push(end - start);

        testCase.validate(testCase.data, deserialized);
    }

    return {
        serializationStats: calculateStats(serializationTimes, size),
        deserializationStats: calculateStats(deserializationTimes, size),
        size,
    };
}

/**
 * Main test function
 */
Deno.test("Serialization Performance Test", () => {
    console.log("\n=== Zenoh-TS Serialization Performance Test ===");
    console.log(`Array Size:      ${TEST_CONFIG.arraySize} elements`);
    console.log(`Map Size:        ${TEST_CONFIG.arraySize} entries`);
    console.log(`String Length:   ${TEST_CONFIG.maxStringLength} characters`);
    console.log(`String Array:    ${TEST_CONFIG.arraySize} strings`);
    console.log(`Total Strings:   ${TEST_CONFIG.arraySize * TEST_CONFIG.maxStringLength} characters`);
    console.log(`Iterations:      ${TEST_CONFIG.iterations}`);
    
    const testData = generateTestData();
    const testCases = createTestCases(testData);

    // Warmup phase
    console.log("\nPerforming warmup...");
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        testCases.forEach(testCase => {
            const bytes = testCase.serialize(testCase.data);
            testCase.deserialize(bytes);
        });
    }
    
    // Run tests
    console.log("Running performance measurements for each type...");
    console.log("\nResults per type:");
    testCases.forEach(testCase => {
        const results = runTestCase(testCase);
        console.log(formatTestResults(testCase.name, results));
    });
});
