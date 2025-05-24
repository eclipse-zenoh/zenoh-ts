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
    ZBytesSerializer, 
    ZBytesDeserializer, 
    ZSerializeable, 
    ZDeserializeable, 
    zserialize, 
    zdeserialize, 
    NumberFormat, 
    BigIntFormat, 
    ZS, 
    ZD 
} from "@eclipse-zenoh/zenoh-ts/ext";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

/**
 * Configuration for the performance tests
 */
const TEST_CONFIG = {
    // Basic test configuration
    dataArraySize: 5000,   // Size of test arrays
    iterations: 300,      // Number of iterations per test
    warmupIterations: 20, // Number of warmup iterations
    
    // String test configuration
    stringLength: 100,    // Length of test strings
    
    // Map test configuration
    mapSize: 100,        // Number of entries in test maps
};

/**
 * Complex data structure that includes all serializable types for testing
 */
class ComplexSerializationTest implements ZSerializeable, ZDeserializeable {
    // Numbers
    uint8: number;
    uint16: number;
    uint32: number;
    uint64: number;
    int8: number;
    int16: number;
    int32: number;
    int64: number;
    float32: number;
    float64: number;
    bigint: bigint;

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
        // Initialize numbers
        this.uint8 = 255;
        this.uint16 = 65535;
        this.uint32 = 4294967295;
        this.uint64 = Number.MAX_SAFE_INTEGER;
        this.int8 = -128;
        this.int16 = -32768;
        this.int32 = -2147483648;
        this.int64 = -Number.MAX_SAFE_INTEGER;
        this.float32 = Math.PI;
        this.float64 = Math.E;
        this.bigint = 9223372036854775807n;

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
        // Serialize numbers
        serializer.serialize(this.uint8, ZS.number(NumberFormat.Uint8));
        serializer.serialize(this.uint16, ZS.number(NumberFormat.Uint16));
        serializer.serialize(this.uint32, ZS.number(NumberFormat.Uint32));
        serializer.serialize(this.uint64, ZS.number(NumberFormat.Uint64));
        serializer.serialize(this.int8, ZS.number(NumberFormat.Int8));
        serializer.serialize(this.int16, ZS.number(NumberFormat.Int16));
        serializer.serialize(this.int32, ZS.number(NumberFormat.Int32));
        serializer.serialize(this.int64, ZS.number(NumberFormat.Int64));
        serializer.serialize(this.float32, ZS.number(NumberFormat.Float32));
        serializer.serialize(this.float64, ZS.number(NumberFormat.Float64));
        serializer.serialize(this.bigint, ZS.bigint(BigIntFormat.Int64));

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
        // Deserialize numbers
        this.uint8 = deserializer.deserialize(ZD.number(NumberFormat.Uint8));
        this.uint16 = deserializer.deserialize(ZD.number(NumberFormat.Uint16));
        this.uint32 = deserializer.deserialize(ZD.number(NumberFormat.Uint32));
        this.uint64 = deserializer.deserialize(ZD.number(NumberFormat.Uint64));
        this.int8 = deserializer.deserialize(ZD.number(NumberFormat.Int8));
        this.int16 = deserializer.deserialize(ZD.number(NumberFormat.Int16));
        this.int32 = deserializer.deserialize(ZD.number(NumberFormat.Int32));
        this.int64 = deserializer.deserialize(ZD.number(NumberFormat.Int64));
        this.float32 = deserializer.deserialize(ZD.number(NumberFormat.Float32));
        this.float64 = deserializer.deserialize(ZD.number(NumberFormat.Float64));
        this.bigint = deserializer.deserialize(ZD.bigint(BigIntFormat.Int64));

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
    throughput: number; 
    bytesPerSecond: number 
} {
    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length;
    const stddev = Math.sqrt(variance);

    const throughput = TEST_CONFIG.dataArraySize / avg * 1000;
    const bytesPerSecond = bytesSize / avg * 1000;
    
    return { avg, min, max, stddev, throughput, bytesPerSecond };
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
  Throughput:      ${Math.floor(serStats.throughput)} items/sec serialization, ${Math.floor(deserStats.throughput)} items/sec deserialization
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
        const bytes = zserialize(testData);
        zdeserialize(ZD.object(ComplexSerializationTest), bytes);
    }
    
    // Main test
    console.log("Running performance measurements...");
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        // Measure serialization
        const serializeStart = performance.now();
        const bytes = zserialize(testData);
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
