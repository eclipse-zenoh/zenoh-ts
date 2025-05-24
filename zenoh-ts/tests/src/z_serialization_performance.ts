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
interface TypePerformanceData {
    serializationTimes: number[];
    deserializationTimes: number[];
    size: number;
}

interface TypeResults {
    [key: string]: TypePerformanceData;
}

Deno.test("Serialization Performance Test", () => {
    console.log("\n=== Zenoh-TS Serialization Performance Test ===");
    console.log(`Array Size:      ${TEST_CONFIG.arraySize} elements`);
    console.log(`Map Size:        ${TEST_CONFIG.arraySize} entries`);
    console.log(`String Length:   ${TEST_CONFIG.maxStringLength} characters`);
    console.log(`String Array:    ${TEST_CONFIG.arraySize} strings`);
    console.log(`Total Strings:   ${TEST_CONFIG.arraySize * TEST_CONFIG.maxStringLength} characters`);
    console.log(`Iterations:      ${TEST_CONFIG.iterations}`);
    
    const testData = new ComplexSerializationTest();
    const typeResults: TypeResults = {
        uint8Array: { serializationTimes: [], deserializationTimes: [], size: testData.uint8Array.byteLength },
        uint16Array: { serializationTimes: [], deserializationTimes: [], size: testData.uint16Array.byteLength },
        uint32Array: { serializationTimes: [], deserializationTimes: [], size: testData.uint32Array.byteLength },
        bigUint64Array: { serializationTimes: [], deserializationTimes: [], size: testData.bigUint64Array.byteLength },
        int8Array: { serializationTimes: [], deserializationTimes: [], size: testData.int8Array.byteLength },
        int16Array: { serializationTimes: [], deserializationTimes: [], size: testData.int16Array.byteLength },
        int32Array: { serializationTimes: [], deserializationTimes: [], size: testData.int32Array.byteLength },
        bigInt64Array: { serializationTimes: [], deserializationTimes: [], size: testData.bigInt64Array.byteLength },
        float32Array: { serializationTimes: [], deserializationTimes: [], size: testData.float32Array.byteLength },
        float64Array: { serializationTimes: [], deserializationTimes: [], size: testData.float64Array.byteLength },
        strings: { serializationTimes: [], deserializationTimes: [], size: testData.strings.reduce((total, str) => total + str.length * 2, 0) },
        numberMap: { serializationTimes: [], deserializationTimes: [], size: testData.numberMap.size * 16 }  // 8 bytes each for key and value
    };

    // Warmup using full testData
    console.log("\nPerforming warmup...");
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        const bytes = zserialize(testData, ZS.object());
        const _ = zdeserialize(ZD.object(ComplexSerializationTest), bytes);
    }
    
    // Test each type separately
    console.log("Running performance measurements for each type...");
    
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        // uint8Array
        let start = performance.now();
        let bytes = zserialize(testData.uint8Array, ZS.uint8array());
        let end = performance.now();
        typeResults.uint8Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const uint8Result = zdeserialize(ZD.uint8array(), bytes);
        end = performance.now();
        typeResults.uint8Array.deserializationTimes.push(end - start);
        assert(uint8Result.length === testData.uint8Array.length, "Uint8Array length mismatch");

        // uint16Array
        start = performance.now();
        bytes = zserialize(testData.uint16Array, ZS.uint16array());
        end = performance.now();
        typeResults.uint16Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const uint16Result = zdeserialize(ZD.uint16array(), bytes);
        end = performance.now();
        typeResults.uint16Array.deserializationTimes.push(end - start);
        assert(uint16Result.length === testData.uint16Array.length, "Uint16Array length mismatch");

        // uint32Array
        start = performance.now();
        bytes = zserialize(testData.uint32Array, ZS.uint32array());
        end = performance.now();
        typeResults.uint32Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const uint32Result = zdeserialize(ZD.uint32array(), bytes);
        end = performance.now();
        typeResults.uint32Array.deserializationTimes.push(end - start);
        assert(uint32Result.length === testData.uint32Array.length, "Uint32Array length mismatch");

        // bigUint64Array
        start = performance.now();
        bytes = zserialize(testData.bigUint64Array, ZS.biguint64array());
        end = performance.now();
        typeResults.bigUint64Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const bigUint64Result = zdeserialize(ZD.biguint64array(), bytes);
        end = performance.now();
        typeResults.bigUint64Array.deserializationTimes.push(end - start);
        assert(bigUint64Result.length === testData.bigUint64Array.length, "BigUint64Array length mismatch");

        // int8Array
        start = performance.now();
        bytes = zserialize(testData.int8Array, ZS.int8array());
        end = performance.now();
        typeResults.int8Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const int8Result = zdeserialize(ZD.int8array(), bytes);
        end = performance.now();
        typeResults.int8Array.deserializationTimes.push(end - start);
        assert(int8Result.length === testData.int8Array.length, "Int8Array length mismatch");

        // int16Array
        start = performance.now();
        bytes = zserialize(testData.int16Array, ZS.int16array());
        end = performance.now();
        typeResults.int16Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const int16Result = zdeserialize(ZD.int16array(), bytes);
        end = performance.now();
        typeResults.int16Array.deserializationTimes.push(end - start);
        assert(int16Result.length === testData.int16Array.length, "Int16Array length mismatch");

        // int32Array
        start = performance.now();
        bytes = zserialize(testData.int32Array, ZS.int32array());
        end = performance.now();
        typeResults.int32Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const int32Result = zdeserialize(ZD.int32array(), bytes);
        end = performance.now();
        typeResults.int32Array.deserializationTimes.push(end - start);
        assert(int32Result.length === testData.int32Array.length, "Int32Array length mismatch");

        // bigInt64Array
        start = performance.now();
        bytes = zserialize(testData.bigInt64Array, ZS.bigint64array());
        end = performance.now();
        typeResults.bigInt64Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const bigInt64Result = zdeserialize(ZD.bigint64array(), bytes);
        end = performance.now();
        typeResults.bigInt64Array.deserializationTimes.push(end - start);
        assert(bigInt64Result.length === testData.bigInt64Array.length, "BigInt64Array length mismatch");

        // float32Array
        start = performance.now();
        bytes = zserialize(testData.float32Array, ZS.float32array());
        end = performance.now();
        typeResults.float32Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const float32Result = zdeserialize(ZD.float32array(), bytes);
        end = performance.now();
        typeResults.float32Array.deserializationTimes.push(end - start);
        assert(float32Result.length === testData.float32Array.length, "Float32Array length mismatch");

        // float64Array
        start = performance.now();
        bytes = zserialize(testData.float64Array, ZS.float64array());
        end = performance.now();
        typeResults.float64Array.serializationTimes.push(end - start);
        
        start = performance.now();
        const float64Result = zdeserialize(ZD.float64array(), bytes);
        end = performance.now();
        typeResults.float64Array.deserializationTimes.push(end - start);
        assert(float64Result.length === testData.float64Array.length, "Float64Array length mismatch");

        // strings
        start = performance.now();
        bytes = zserialize(testData.strings, ZS.array(ZS.string()));
        end = performance.now();
        typeResults.strings.serializationTimes.push(end - start);
        
        start = performance.now();
        const stringsResult = zdeserialize(ZD.array(ZD.string()), bytes);
        end = performance.now();
        typeResults.strings.deserializationTimes.push(end - start);
        assert(stringsResult.length === testData.strings.length, "String array length mismatch");

        // numberMap
        start = performance.now();
        bytes = zserialize(testData.numberMap, ZS.map(ZS.number(), ZS.number()));
        end = performance.now();
        typeResults.numberMap.serializationTimes.push(end - start);
        
        start = performance.now();
        const mapResult = zdeserialize(ZD.map(ZD.number(), ZD.number()), bytes);
        end = performance.now();
        typeResults.numberMap.deserializationTimes.push(end - start);
        assert(mapResult.size === testData.numberMap.size, "Map size mismatch");
    }
    
    // Calculate and print statistics for each type
    console.log("\nResults per type:");
    for (const [typeName, data] of Object.entries(typeResults)) {
        const serStats = calculateStats(data.serializationTimes, data.size);
        const deserStats = calculateStats(data.deserializationTimes, data.size);
        console.log(`\n${typeName}:`);
        console.log(formatStats(`  ${typeName} Performance`, serStats, deserStats));
        console.log(`  Size: ${(data.size / 1024).toFixed(2)} KB`);
    }
});
