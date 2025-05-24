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
    arraySize: 10000,   // Size of test arrays - increased for more significant data volume
    maxStringLength: 8,  // Length of test strings is randomized but capped
    iterations: 10,      // Reduced iterations for quicker testing
    warmupIterations: 2, // Reduced warmup iterations
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

    // String Array and Map
    strings: string[];
    numberMap: Map<number, number>;

    constructor() {
        // Initialize arrays
        const size = TEST_CONFIG.arraySize;
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

        // Initialize string array wirh random strings of max length TEST_CONFIG.maxStringLength
        this.strings = Array.from({ length: TEST_CONFIG.arraySize }, () => {
            const stringLength = Math.floor(Math.random() * TEST_CONFIG.maxStringLength) + 1; // Random length between 1 and max
            return Array.from({ length: stringLength }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join(''); // Random lowercase letters
        });

        // Initialize map
        this.numberMap = new Map();
        for (let i = 0; i < TEST_CONFIG.arraySize / 2; i++) {
            this.numberMap.set(i, i);
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

        // Serialize string array and map
        serializer.serialize(this.strings, ZS.array(ZS.string()));
        serializer.serialize(this.numberMap, ZS.map(ZS.number(), ZS.number()));
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

        // Deserialize string array and map
        this.strings = deserializer.deserialize(ZD.array(ZD.string()));
        this.numberMap = deserializer.deserialize(ZD.map(ZD.number(), ZD.number()));
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
    console.log(`Array Size:      ${TEST_CONFIG.arraySize} elements`);
    console.log(`Map Size:        ${TEST_CONFIG.arraySize} entries`);
    console.log(`String Length:   ${TEST_CONFIG.maxStringLength} characters`);
    console.log(`String Array:    ${TEST_CONFIG.arraySize} strings`);
    console.log(`Total Strings:   ${TEST_CONFIG.arraySize * TEST_CONFIG.maxStringLength} characters`);
    console.log(`Iterations:      ${TEST_CONFIG.iterations}`);
    
    const testData = new ComplexSerializationTest();
    const serializationTimes: number[] = [];
    const deserializationTimes: number[] = [];
    let serializedBytesSize = 0;

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
        
    // Calculate string array size (2 bytes per character in JS)
    const stringArraySize = testData.strings.reduce((total: number, str: string) => total + str.length, 0);
        
    // Calculate map size: number of entries * size of each entry
    const mapSize = testData.numberMap.size * (8 + 8); // 8 bytes for key and 8 bytes for value
        
    const totalSize = arrayTotalSize + stringArraySize + mapSize;

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
String Array:   ${(stringArraySize / 1024).toFixed(2)} KB (${stringArraySize} bytes)
Map:            ${(mapSize / 1024).toFixed(2)} KB (${mapSize} bytes)
--------------
Total:          ${(totalSize / 1024).toFixed(2)} KB (${totalSize} bytes)`);

    // Warmup
    console.log("\nPerforming warmup...");
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        const bytes = zserialize(testData, ZS.object());
        const _ = zdeserialize(ZD.object(ComplexSerializationTest), bytes);
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
        
       
        // Verify correctness of key fields
        assert(result.uint8Array.length === testData.uint8Array.length, "Uint8Array length mismatch");
        assert(result.float64Array.length === testData.float64Array.length, "Float64Array length mismatch");
        assert(result.strings.length === testData.strings.length, "String array length mismatch");
        assert(result.strings[0].length === testData.strings[0].length, "String length mismatch");
        assert(result.numberMap.size === testData.numberMap.size, "Map size mismatch");
    }
    
    // Calculate and print statistics
    const serStats = calculateStats(serializationTimes, serializedBytesSize);
    const deserStats = calculateStats(deserializationTimes, serializedBytesSize);
    
    console.log("\nResults:");
    console.log(formatStats("Complex Type Performance", serStats, deserStats));
    console.log(`\nSerialized Size: ${(serializedBytesSize / 1024).toFixed(2)} KB`);
});
