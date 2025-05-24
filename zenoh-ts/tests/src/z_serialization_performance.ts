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
import { assert as _assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

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
 * Define test cases for each type
 */
function createTestCases(): TestCase<unknown>[] {
    const stringGen = () => {
        const len = Math.floor(Math.random() * TEST_CONFIG.maxStringLength) + 1;
        return Array.from({ length: len }, () => 
            String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('');
    };

    return [
        {
            name: "uint8Array",
            data: new Uint8Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 256)),
            serialize: (v: Uint8Array) => zserialize(v, ZS.uint8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint8array(), b) as Uint8Array,
            getSize: (d: Uint8Array) => d.byteLength,
        },
        {
            name: "uint16Array",
            data: new Uint16Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 65536)),
            serialize: (v: Uint16Array) => zserialize(v, ZS.uint16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint16array(), b) as Uint16Array,
            getSize: (d: Uint16Array) => d.byteLength,
        },
        {
            name: "uint32Array",
            data: new Uint32Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 4294967296)),
            serialize: (v: Uint32Array) => zserialize(v, ZS.uint32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint32array(), b) as Uint32Array,
            getSize: (d: Uint32Array) => d.byteLength,
        },
        {
            name: "bigUint64Array",
            data: new BigUint64Array(TEST_CONFIG.arraySize)
                .fill(BigInt(Number.MAX_SAFE_INTEGER)),
            serialize: (v: BigUint64Array) => zserialize(v, ZS.biguint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.biguint64array(), b) as BigUint64Array,
            getSize: (d: BigUint64Array) => d.byteLength,
        },
        {
            name: "int8Array",
            data: new Int8Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 256) - 128),
            serialize: (v: Int8Array) => zserialize(v, ZS.int8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int8array(), b) as Int8Array,
            getSize: (d: Int8Array) => d.byteLength,
        },
        {
            name: "int16Array",
            data: new Int16Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 65536) - 32768),
            serialize: (v: Int16Array) => zserialize(v, ZS.int16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int16array(), b) as Int16Array,
            getSize: (d: Int16Array) => d.byteLength,
        },
        {
            name: "int32Array",
            data: new Int32Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 4294967296) - 2147483648),
            serialize: (v: Int32Array) => zserialize(v, ZS.int32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int32array(), b) as Int32Array,
            getSize: (d: Int32Array) => d.byteLength,
        },
        {
            name: "bigInt64Array",
            data: new BigInt64Array(TEST_CONFIG.arraySize)
                .fill(BigInt("-9223372036854775808")),
            serialize: (v: BigInt64Array) => zserialize(v, ZS.bigint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.bigint64array(), b) as BigInt64Array,
            getSize: (d: BigInt64Array) => d.byteLength,
        },
        {
            name: "float32Array",
            data: new Float32Array(TEST_CONFIG.arraySize)
                .map(() => Math.random() * 1000),
            serialize: (v: Float32Array) => zserialize(v, ZS.float32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float32array(), b) as Float32Array,
            getSize: (d: Float32Array) => d.byteLength,
        },
        {
            name: "float64Array",
            data: new Float64Array(TEST_CONFIG.arraySize)
                .map(() => Math.random() * 1000),
            serialize: (v: Float64Array) => zserialize(v, ZS.float64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float64array(), b) as Float64Array,
            getSize: (d: Float64Array) => d.byteLength,
        },
        {
            name: "strings",
            data: Array.from({ length: TEST_CONFIG.arraySize }, stringGen),
            serialize: (value: string[]) => zserialize(value, ZS.array(ZS.string())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.array(ZD.string()), bytes) as string[],
            getSize: (d: string[]) => d.reduce((total: number, str: string) => total + str.length * 2, 0),
        },
        {
            name: "numberMap",
            data: new Map(
                Array.from({ length: TEST_CONFIG.arraySize }, (_, i) => [i, i] as [number, number])
            ),
            serialize: (value: Map<number, number>) => zserialize(value, ZS.map(ZS.number(), ZS.number())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.map(ZD.number(), ZD.number()), bytes) as Map<number, number>,
            getSize: (d: Map<number, number>) => d.size * 16,
        }
    ];
}

/**
 * Performance test for a single test case
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
        const _deserialized = testCase.deserialize(bytes);
        end = performance.now();
        deserializationTimes.push(end - start);
    }

    return {
        serializationStats: calculateStats(serializationTimes, size),
        deserializationStats: calculateStats(deserializationTimes, size),
        size,
    };
}

/**
 * Run performance tests for all cases
 */
Deno.test("Serialization Performance Test", () => {
    console.log("\n=== Zenoh-TS Serialization Performance Test ===");
    console.log(`Array Size:      ${TEST_CONFIG.arraySize} elements`);
    console.log(`String Length:   ${TEST_CONFIG.maxStringLength} characters`);
    console.log(`Total Strings:   ${TEST_CONFIG.arraySize * TEST_CONFIG.maxStringLength} characters`);
    console.log(`Iterations:      ${TEST_CONFIG.iterations}`);
    console.log("");
    
    const testCases = createTestCases();
    
    for (const testCase of testCases) {
        const results = runTestCase(testCase);
        console.log(formatTestResults(testCase.name, results));
    }
});
