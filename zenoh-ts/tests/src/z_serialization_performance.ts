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
    ZBytesSerializer, 
    ZBytesDeserializer,
    ZSerializeable,
    ZDeserializeable,
    zserialize, 
    zdeserialize, 
    ZS, 
    ZD 
} from "@eclipse-zenoh/zenoh-ts/ext";
import { assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

/**
 * Configuration for the performance tests
 */
const TEST_CONFIG = {
    // Basic test configuration
    dataArraySize: 10000,   // Size of test arrays - increased for more significant data volume
    iterations: 10,      // Reduced iterations for quicker testing
    warmupIterations: 2, // Reduced warmup iterations

    // String test configuration
    stringLength: 10000,  // Length of test strings - increased significantly
    
    // Map test configuration
    mapSize: 5000,      // Number of entries in test maps - increased significantly
};

/**
 * Complex data structure that includes all serializable types for testing
 */
class ComplexSerializationTest implements ZSerializeable, ZDeserializeable {
    // Arrays
    uint8Array: Uint8Array;
    uint16Array: Uint16Array;
    uint32Array: Uint32Array;
    bigUint64Array: BigUint64Array;
    int8Array: Int8Array;
    int16Array: Int16Array;
    int32Array: Int32Array;
    bigInt64Array: BigInt64Array;
    float32Array: Float32Array;
    float64Array: Float64Array;

    // String and Map
    str: string;
    numberMap: Map<number, string>;

    constructor() {
        // Initialize arrays
        const size = TEST_CONFIG.dataArraySize;
        this.uint8Array = new Uint8Array(size).map(() => Math.floor(Math.random() * 256));
        this.uint16Array = new Uint16Array(size).map(() => Math.floor(Math.random() * 65536));
        this.uint32Array = new Uint32Array(size).map(() => Math.floor(Math.random() * 4294967296));
        this.bigUint64Array = new BigUint64Array(size).fill(BigInt(Number.MAX_SAFE_INTEGER));
        this.int8Array = new Int8Array(size).map(() => Math.floor(Math.random() * 256) - 128);
        this.int16Array = new Int16Array(size).map(() => Math.floor(Math.random() * 65536) - 32768);
        this.int32Array = new Int32Array(size).map(() => Math.floor(Math.random() * 4294967296) - 2147483648);
        this.bigInt64Array = new BigInt64Array(size).fill(BigInt("-9223372036854775808"));
        this.float32Array = new Float32Array(size).map(() => Math.random() * 1000);
        this.float64Array = new Float64Array(size).map(() => Math.random() * 1000);

        // Initialize string
        this.str = "a".repeat(TEST_CONFIG.stringLength);

        // Initialize map
        this.numberMap = new Map();
        for (let i = 0; i < TEST_CONFIG.mapSize; i++) {
            this.numberMap.set(i, `value${i}`);
        }
    }

    serializeWithZSerializer(serializer: ZBytesSerializer): void {
        // Serialize arrays
        serializer.serialize(this.uint8Array, ZS.uint8array());
        serializer.serialize(this.uint16Array, ZS.uint16array());
        serializer.serialize(this.uint32Array, ZS.uint32array());
        serializer.serialize(this.bigUint64Array, ZS.biguint64array());
        serializer.serialize(this.int8Array, ZS.int8array());
        serializer.serialize(this.int16Array, ZS.int16array());
        serializer.serialize(this.int32Array, ZS.int32array());
        serializer.serialize(this.bigInt64Array, ZS.bigint64array());
        serializer.serialize(this.float32Array, ZS.float32array());
        serializer.serialize(this.float64Array, ZS.float64array());

        // Serialize string and map
        serializer.serialize(this.str, ZS.string());
        serializer.serialize(this.numberMap, ZS.map(ZS.number(), ZS.string()));
    }

    deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
        // Deserialize arrays
        this.uint8Array = deserializer.deserialize(ZD.uint8array());
        this.uint16Array = deserializer.deserialize(ZD.uint16array());
        this.uint32Array = deserializer.deserialize(ZD.uint32array());
        this.bigUint64Array = deserializer.deserialize(ZD.biguint64array());
        this.int8Array = deserializer.deserialize(ZD.int8array());
        this.int16Array = deserializer.deserialize(ZD.int16array());
        this.int32Array = deserializer.deserialize(ZD.int32array());
        this.bigInt64Array = deserializer.deserialize(ZD.bigint64array());
        this.float32Array = deserializer.deserialize(ZD.float32array());
        this.float64Array = deserializer.deserialize(ZD.float64array());

        // Deserialize string and map
        this.str = deserializer.deserialize(ZD.string());
        this.numberMap = deserializer.deserialize(ZD.map(ZD.number(), ZD.string()));
    }
}

/**
 * Helper function to calculate statistics including standard deviation
 */
function calculateStats(
    times: number[], 
    bytesSize: number
): { 
    avg: number; 
    min: number; 
    max: number; 
    stddev: number;
    bytesPerSecond: number 
} {
    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length;
    const stddev = Math.sqrt(variance);

    const bytesPerSecond = bytesSize / avg * 1000;
    
    return { avg, min, max, stddev, bytesPerSecond };
}

/**
 * Helper function to format statistics
 */
function formatStats(
    name: string, 
    serStats: ReturnType<typeof calculateStats>, 
    deserStats: ReturnType<typeof calculateStats>
): string {
    return `${name}:
  Serialization:   ${serStats.avg.toFixed(3)} ms (min: ${serStats.min.toFixed(3)}, max: ${serStats.max.toFixed(3)}, stddev: ${serStats.stddev.toFixed(3)})
  Deserialization: ${deserStats.avg.toFixed(3)} ms (min: ${deserStats.min.toFixed(3)}, max: ${deserStats.max.toFixed(3)}, stddev: ${deserStats.stddev.toFixed(3)})
  Total:           ${(serStats.avg + deserStats.avg).toFixed(3)} ms
  Bandwidth:       ${Math.floor(serStats.bytesPerSecond / 1024)} KB/sec serialization, ${Math.floor(deserStats.bytesPerSecond / 1024)} KB/sec deserialization`;
}

/**
 * A comprehensive performance test that measures serialization and deserialization times
 * for all serializable types in the zenoh-ts serialization framework.
 */
Deno.test("Serialization Performance Test", () => {
    console.log("\n=== Zenoh-TS Serialization Performance Test ===");
    console.log(`Array Size:  ${TEST_CONFIG.dataArraySize} elements`);
    console.log(`Map Size:    ${TEST_CONFIG.mapSize} entries`);
    console.log(`String Size: ${TEST_CONFIG.stringLength} characters`);
    console.log(`Iterations:  ${TEST_CONFIG.iterations}`);
    
    const testData = new ComplexSerializationTest();
    const serializationTimes: number[] = [];
    const deserializationTimes: number[] = [];
    let serializedBytesSize = 0;
    
    // Warmup
    console.log("\nPerforming warmup...");
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        const bytes = zserialize(testData, ZS.object());
        const _result = zdeserialize(ZD.object(ComplexSerializationTest), bytes);
    }
    
    // Main test
    console.log("Running performance measurements...");
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        // Measure serialization
        const serializeStart = performance.now();
        const bytes = zserialize(testData, ZS.object());
        const serializeEnd = performance.now();
        serializationTimes.push(serializeEnd - serializeStart);
        
        if (i === 0) {
            serializedBytesSize = bytes.len();
        }
        
        // Measure deserialization
        const deserializeStart = performance.now();
        const result = zdeserialize(ZD.object(ComplexSerializationTest), bytes);
        const deserializeEnd = performance.now();
        deserializationTimes.push(deserializeEnd - deserializeStart);
        
        // Calculate actual structure size on first iteration
        if (i === 0) {
            // Calculate size of each array type
            const uint8Size = testData.uint8Array.byteLength;
            const uint16Size = testData.uint16Array.byteLength;
            const uint32Size = testData.uint32Array.byteLength;
            const uint64Size = testData.bigUint64Array.byteLength;
            const int8Size = testData.int8Array.byteLength;
            const int16Size = testData.int16Array.byteLength;
            const int32Size = testData.int32Array.byteLength;
            const int64Size = testData.bigInt64Array.byteLength;
            const float32Size = testData.float32Array.byteLength;
            const float64Size = testData.float64Array.byteLength;

            const arrayTotalSize = uint8Size + uint16Size + uint32Size + uint64Size +
                                 int8Size + int16Size + int32Size + int64Size +
                                 float32Size + float64Size;
                
            // Calculate string size (2 bytes per character in JS)
            const stringSize = testData.str.length * 2;
                
            // Calculate map size (rough estimate: 8 bytes per number key + string lengths)
            const mapSize = Array.from(testData.numberMap.values())
                .reduce((total, str) => total + 8 + str.length * 2, 0);
                
            // Add size of individual number fields (8 bytes each for numbers)
            const numberFieldsSize = 11 * 8;  // 11 number/bigint fields
                
            const totalSize = arrayTotalSize + stringSize + mapSize + numberFieldsSize;

            console.log(`\nMemory structure size details:
  Uint8Array:     ${(uint8Size / 1024).toFixed(2)} KB (${uint8Size} bytes)
  Uint16Array:    ${(uint16Size / 1024).toFixed(2)} KB (${uint16Size} bytes)
  Uint32Array:    ${(uint32Size / 1024).toFixed(2)} KB (${uint32Size} bytes)
  BigUint64Array: ${(uint64Size / 1024).toFixed(2)} KB (${uint64Size} bytes)
  Int8Array:      ${(int8Size / 1024).toFixed(2)} KB (${int8Size} bytes)
  Int16Array:     ${(int16Size / 1024).toFixed(2)} KB (${int16Size} bytes)
  Int32Array:     ${(int32Size / 1024).toFixed(2)} KB (${int32Size} bytes)
  BigInt64Array:  ${(int64Size / 1024).toFixed(2)} KB (${int64Size} bytes)
  Float32Array:   ${(float32Size / 1024).toFixed(2)} KB (${float32Size} bytes)
  Float64Array:   ${(float64Size / 1024).toFixed(2)} KB (${float64Size} bytes)
  String:         ${(stringSize / 1024).toFixed(2)} KB
  Map:            ${(mapSize / 1024).toFixed(2)} KB
  Numbers:        ${(numberFieldsSize / 1024).toFixed(2)} KB
  --------------
  Total:          ${(totalSize / 1024).toFixed(2)} KB`);
        }
        
        // Verify correctness of a few key fields
        assert(result.uint8Array.length === testData.uint8Array.length, "Uint8Array length mismatch");
        assert(result.float64Array.length === testData.float64Array.length, "Float64Array length mismatch");
        assert(result.str.length === testData.str.length, "String length mismatch");
        assert(result.numberMap.size === testData.numberMap.size, "Map size mismatch");
    }
    
    // Calculate and print statistics
    const serStats = calculateStats(serializationTimes, serializedBytesSize);
    const deserStats = calculateStats(deserializationTimes, serializedBytesSize);
    
    console.log("\nResults:");
    console.log(formatStats("Complex Type Performance", serStats, deserStats));
    console.log(`\nSerialized Size: ${(serializedBytesSize / 1024).toFixed(2)} KB`);
});
