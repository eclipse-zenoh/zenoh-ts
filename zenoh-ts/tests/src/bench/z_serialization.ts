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
    // Create typed arrays first
    const uint8Array = new Uint8Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 256));
    const uint16Array = new Uint16Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 65536));
    const uint32Array = new Uint32Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 4294967296));
    const bigUint64Array = new BigUint64Array(TEST_CONFIG.arraySize)
        .fill(BigInt(Number.MAX_SAFE_INTEGER));
    const int8Array = new Int8Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 256) - 128);
    const int16Array = new Int16Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 65536) - 32768);
    const int32Array = new Int32Array(TEST_CONFIG.arraySize)
        .map(() => Math.floor(Math.random() * 4294967296) - 2147483648);
    const bigInt64Array = new BigInt64Array(TEST_CONFIG.arraySize)
        .fill(BigInt("-9223372036854775808"));
    const float32Array = new Float32Array(TEST_CONFIG.arraySize)
        .map(() => Math.random() * 1000);
    const float64Array = new Float64Array(TEST_CONFIG.arraySize)
        .map(() => Math.random() * 1000);

    return [
        {
            name: "uint8Array",
            data: uint8Array,
            serialize: (v: Uint8Array) => zserialize(v, ZS.uint8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint8array(), b) as Uint8Array,
        },
        {
            name: "uint8[]",
            data: Array.from(uint8Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "uint16Array",
            data: uint16Array,
            serialize: (v: Uint16Array) => zserialize(v, ZS.uint16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint16array(), b) as Uint16Array,
        },
        {
            name: "uint16[]",
            data: Array.from(uint16Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "uint32Array",
            data: uint32Array,
            serialize: (v: Uint32Array) => zserialize(v, ZS.uint32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.uint32array(), b) as Uint32Array,
        },
        {
            name: "uint32[]",
            data: Array.from(uint32Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "bigUint64Array",
            data: bigUint64Array,
            serialize: (v: BigUint64Array) => zserialize(v, ZS.biguint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.biguint64array(), b) as BigUint64Array,
        },
        {
            name: "bigUint64[]",
            data: Array.from(bigUint64Array),
            serialize: (v: bigint[]) => zserialize(v, ZS.array(ZS.bigint())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.bigint()), b) as bigint[],
        },
        {
            name: "int8Array",
            data: int8Array,
            serialize: (v: Int8Array) => zserialize(v, ZS.int8array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int8array(), b) as Int8Array,
        },
        {
            name: "int8[]",
            data: Array.from(int8Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "int16Array",
            data: int16Array,
            serialize: (v: Int16Array) => zserialize(v, ZS.int16array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int16array(), b) as Int16Array,
        },
        {
            name: "int16[]",
            data: Array.from(int16Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "int32Array",
            data: int32Array,
            serialize: (v: Int32Array) => zserialize(v, ZS.int32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.int32array(), b) as Int32Array,
        },
        {
            name: "int32[]",
            data: Array.from(int32Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "bigInt64Array",
            data: bigInt64Array,
            serialize: (v: BigInt64Array) => zserialize(v, ZS.bigint64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.bigint64array(), b) as BigInt64Array,
        },
        {
            name: "bigInt64[]",
            data: Array.from(bigInt64Array),
            serialize: (v: bigint[]) => zserialize(v, ZS.array(ZS.bigint())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.bigint()), b) as bigint[],
        },
        {
            name: "float32Array",
            data: float32Array,
            serialize: (v: Float32Array) => zserialize(v, ZS.float32array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float32array(), b) as Float32Array,
        },
        {
            name: "float32[]",
            data: Array.from(float32Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "float64Array",
            data: float64Array,
            serialize: (v: Float64Array) => zserialize(v, ZS.float64array()),
            deserialize: (b: ZBytes) => zdeserialize(ZD.float64array(), b) as Float64Array,
        },
        {
            name: "float64[]",
            data: Array.from(float64Array),
            serialize: (v: number[]) => zserialize(v, ZS.array(ZS.number())),
            deserialize: (b: ZBytes) => zdeserialize(ZD.array(ZD.number()), b) as number[],
        },
        {
            name: "string[]",
            data: Array.from({ length: TEST_CONFIG.arraySize }, stringGen),
            serialize: (value: string[]) => zserialize(value, ZS.array(ZS.string())),
            deserialize: (bytes: ZBytes) => zdeserialize(ZD.array(ZD.string()), bytes) as string[],
        },
        {
            name: "Map<number, number>",
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
