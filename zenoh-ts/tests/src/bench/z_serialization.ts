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
    zserialize, 
    zdeserialize, 
    ZS, 
    ZD
} from "@eclipse-zenoh/zenoh-ts/ext";
import { ZBytes } from "@eclipse-zenoh/zenoh-ts";
/**
 * Configuration for the performance tests
 */
const TEST_CONFIG = {
    arraySize: 10000,   // Size of test arrays
    maxStringLength: 8,  // Length of test strings is randomized but capped
};

/**
 * Test case definition for a specific type
 */
interface TestCase<T> {
    name: string;
    data: T;
    serialize(value: T): ZBytes;
    deserialize(bytes: ZBytes): T;
}

/**
 * Helper function to generate a random string
 */
function stringGen() {
    const len = Math.floor(Math.random() * TEST_CONFIG.maxStringLength) + 1;
    return Array.from({ length: len }, () => 
        String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('');
}

/**
 * Create test cases for each data type
 */
function createTestCases(): TestCase<unknown>[] {
    return [
        {
            name: "uint8Array",
            data: new Uint8Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 256)),
            serialize: (v: Uint8Array) => zserialize(v, ZS.uint8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint8array(), b) as Uint8Array,
        },
        {
            name: "uint16Array",
            data: new Uint16Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 65536)),
            serialize: (v: Uint16Array) => zserialize(v, ZS.uint16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint16array(), b) as Uint16Array,
        },
        {
            name: "uint32Array",
            data: new Uint32Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 4294967296)),
            serialize: (v: Uint32Array) => zserialize(v, ZS.uint32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint32array(), b) as Uint32Array,
        },
        {
            name: "bigUint64Array",
            data: new BigUint64Array(TEST_CONFIG.arraySize)
                .fill(BigInt(Number.MAX_SAFE_INTEGER)),
            serialize: (v: BigUint64Array) => zserialize(v, ZS.biguint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.biguint64array(), b) as BigUint64Array,
        },
        {
            name: "int8Array",
            data: new Int8Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 256) - 128),
            serialize: (v: Int8Array) => zserialize(v, ZS.int8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int8array(), b) as Int8Array,
        },
        {
            name: "int16Array",
            data: new Int16Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 65536) - 32768),
            serialize: (v: Int16Array) => zserialize(v, ZS.int16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int16array(), b) as Int16Array,
        },
        {
            name: "int32Array",
            data: new Int32Array(TEST_CONFIG.arraySize)
                .map(() => Math.floor(Math.random() * 4294967296) - 2147483648),
            serialize: (v: Int32Array) => zserialize(v, ZS.int32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int32array(), b) as Int32Array,
        },
        {
            name: "bigInt64Array",
            data: new BigInt64Array(TEST_CONFIG.arraySize)
                .fill(BigInt("-9223372036854775808")),
            serialize: (v: BigInt64Array) => zserialize(v, ZS.bigint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.bigint64array(), b) as BigInt64Array,
        },
        {
            name: "float32Array",
            data: new Float32Array(TEST_CONFIG.arraySize)
                .map(() => Math.random() * 1000),
            serialize: (v: Float32Array) => zserialize(v, ZS.float32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float32array(), b) as Float32Array,
        },
        {
            name: "float64Array",
            data: new Float64Array(TEST_CONFIG.arraySize)
                .map(() => Math.random() * 1000),
            serialize: (v: Float64Array) => zserialize(v, ZS.float64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float64array(), b) as Float64Array,
        },
        {
            name: "strings",
            data: Array.from({ length: TEST_CONFIG.arraySize }, stringGen),
            serialize: (value: string[]) => zserialize(value, ZS.array(ZS.string())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.array(ZD.string()), bytes) as string[],
        },
        {
            name: "numberMap",
            data: new Map(
                Array.from({ length: TEST_CONFIG.arraySize }, (_, i) => [i, i] as [number, number])
            ),
            serialize: (value: Map<number, number>) => zserialize(value, ZS.map(ZS.number(), ZS.number())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.map(ZD.number(), ZD.number()), bytes) as Map<number, number>,
        }
    ];
}

// Create test cases once to reuse across benchmarks
const testCases = createTestCases();

// Run serialization benchmarks
for (const testCase of testCases) {
    Deno.bench({
        name: `serialize ${testCase.name}`,
        fn: () => {
            testCase.serialize(testCase.data);
        }
    });
}

// Run deserialization benchmarks
for (const testCase of testCases) {
    // Pre-serialize data once for deserialization benchmarks
    const serializedData = testCase.serialize(testCase.data);
    Deno.bench({
        name: `deserialize ${testCase.name}`,
        fn: () => {
            testCase.deserialize(serializedData);
        }
    });
}
