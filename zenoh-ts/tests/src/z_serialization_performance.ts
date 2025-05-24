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
import { assert, assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

// Type alias for TypedArray to fix compilation issues
type TypedArray = 
    | Int8Array 
    | Uint8Array 
    | Uint8ClampedArray 
    | Int16Array 
    | Uint16Array 
    | Int32Array 
    | Uint32Array 
    | Float32Array 
    | Float64Array 
    | BigInt64Array 
    | BigUint64Array;

// Performance test configuration
const PERF_CONFIG = {
    // Data sizes for scalability testing
    small: 100,
    medium: 1000,
    large: 10000,
    xlarge: 100000,
    
    // Number of iterations for timing tests
    iterations: {
        small: 1000,
        medium: 500,
        large: 100,
        xlarge: 10
    },
    
    // Warmup iterations to stabilize performance
    warmupIterations: 50
};

// Performance measurement utilities
class PerformanceMeasurement {
    private measurements: number[] = [];
    
    addMeasurement(duration: number): void {
        this.measurements.push(duration);
    }
    
    getStatistics(): {
        mean: number;
        median: number;
        min: number;
        max: number;
        standardDeviation: number;
    } {
        if (this.measurements.length === 0) {
            throw new Error("No measurements available");
        }
        
        const sorted = [...this.measurements].sort((a, b) => a - b);
        const mean = this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        
        const variance = this.measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.measurements.length;
        const standardDeviation = Math.sqrt(variance);
        
        return { mean, median, min, max, standardDeviation };
    }
    
    reset(): void {
        this.measurements = [];
    }
}

// Benchmark runner utility
class BenchmarkRunner {
    private perfMeasurement = new PerformanceMeasurement();
    
    async runBenchmark<T>(
        name: string, 
        setup: () => T, 
        operation: (data: T) => void | Promise<void>,
        iterations: number,
        dataSize?: number
    ): Promise<void> {
        // Warmup
        for (let i = 0; i < PERF_CONFIG.warmupIterations; i++) {
            const data = setup();
            await operation(data);
        }
        
        this.perfMeasurement.reset();
        
        // Actual measurements
        for (let i = 0; i < iterations; i++) {
            const data = setup();
            const start = performance.now();
            await operation(data);
            const end = performance.now();
            this.perfMeasurement.addMeasurement(end - start);
        }
        
        const stats = this.perfMeasurement.getStatistics();
        
        console.log(`\n=== ${name} ===`);
        console.log(`Iterations: ${iterations}`);
        if (dataSize !== undefined) {
            console.log(`Data size: ${dataSize} elements`);
        }
        console.log(`Mean: ${stats.mean.toFixed(3)} ms`);
        console.log(`Median: ${stats.median.toFixed(3)} ms`);
        console.log(`Min: ${stats.min.toFixed(3)} ms`);
        console.log(`Max: ${stats.max.toFixed(3)} ms`);
        console.log(`Std Dev: ${stats.standardDeviation.toFixed(3)} ms`);
        
        if (dataSize !== undefined) {
            const opsPerSecond = 1000 / stats.mean;
            const elementsPerSecond = opsPerSecond * dataSize;
            console.log(`Throughput: ${opsPerSecond.toFixed(0)} ops/sec, ${elementsPerSecond.toFixed(0)} elements/sec`);
        }
    }
}

// Test data generators
class TestDataGenerator {
    static generateNumbers(size: number): number[] {
        const data: number[] = [];
        for (let i = 0; i < size; i++) {
            data.push(Math.random() * 1000000 - 500000);
        }
        return data;
    }
    
    static generateStrings(size: number, stringLength: number = 20): string[] {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const data: string[] = [];
        for (let i = 0; i < size; i++) {
            let str = '';
            for (let j = 0; j < stringLength; j++) {
                str += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            data.push(str);
        }
        return data;
    }
    
    static generateBigInts(size: number): bigint[] {
        const data: bigint[] = [];
        for (let i = 0; i < size; i++) {
            data.push(BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
        }
        return data;
    }
    
    static generateUint8Array(size: number): Uint8Array {
        const array = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
    
    static generateInt8Array(size: number): Int8Array {
        const array = new Int8Array(size);
        for (let i = 0; i < size; i++) {
            array[i] = Math.floor(Math.random() * 256) - 128;
        }
        return array;
    }
    
    static generateFloat32Array(size: number): Float32Array {
        const array = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            array[i] = Math.random() * 1000 - 500;
        }
        return array;
    }
    
    static generateFloat64Array(size: number): Float64Array {
        const array = new Float64Array(size);
        for (let i = 0; i < size; i++) {
            array[i] = Math.random() * 1000 - 500;
        }
        return array;
    }
    
    static generateTypedArray<T extends TypedArray>(
        constructor: new (size: number) => T, 
        size: number
    ): T {
        const array = new constructor(size);
        
        // Fill with appropriate values based on type
        if (array instanceof BigInt64Array || array instanceof BigUint64Array) {
            for (let i = 0; i < size; i++) {
                (array as any)[i] = BigInt(Math.floor(Math.random() * 1000000));
            }
        } else if (array instanceof Float32Array || array instanceof Float64Array) {
            for (let i = 0; i < size; i++) {
                (array as any)[i] = Math.random() * 1000 - 500;
            }
        } else {
            // Integer arrays
            const max = array instanceof Int8Array ? 127 : 
                       array instanceof Uint8Array ? 255 :
                       array instanceof Int16Array ? 32767 :
                       array instanceof Uint16Array ? 65535 :
                       array instanceof Int32Array ? 2147483647 :
                       array instanceof Uint32Array ? 4294967295 : 1000;
                       
            for (let i = 0; i < size; i++) {
                (array as any)[i] = Math.floor(Math.random() * max);
            }
        }
        
        return array;
    }
    
    static generateMap<K, V>(
        size: number, 
        keyGenerator: () => K, 
        valueGenerator: () => V
    ): Map<K, V> {
        const map = new Map<K, V>();
        for (let i = 0; i < size; i++) {
            map.set(keyGenerator(), valueGenerator());
        }
        return map;
    }
    
    static generateMixedObject(size: number): ComplexTestObject {
        return new ComplexTestObject(
            TestDataGenerator.generateNumbers(size),
            TestDataGenerator.generateStrings(size, 20),
            TestDataGenerator.generateUint8Array(size),
            TestDataGenerator.generateFloat64Array(size),
            TestDataGenerator.generateTypedArray(Uint32Array, size)
        );
    }
}

// Complex test object for benchmarking
class ComplexTestObject implements ZSerializeable, ZDeserializeable {
    constructor(
        public numbers: number[] = [],
        public strings: string[] = [],
        public uint8Data: Uint8Array = new Uint8Array(0),
        public float64Data: Float64Array = new Float64Array(0),
        public uint32Data: Uint32Array = new Uint32Array(0)
    ) {}
    
    serializeWithZSerializer(serializer: ZBytesSerializer): void {
        serializer.serialize(this.numbers, ZS.array(ZS.number(NumberFormat.Float64)));
        serializer.serialize(this.strings, ZS.array(ZS.string()));
        serializer.serialize(this.uint8Data, ZS.uint8array());
        serializer.serialize(this.float64Data, ZS.float64array());
        serializer.serialize(this.uint32Data, ZS.uint32array());
    }
    
    deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
        this.numbers = deserializer.deserialize(ZD.array(ZD.number(NumberFormat.Float64)));
        this.strings = deserializer.deserialize(ZD.array(ZD.string()));
        this.uint8Data = deserializer.deserialize(ZD.uint8array());
        this.float64Data = deserializer.deserialize(ZD.float64array());
        this.uint32Data = deserializer.deserialize(ZD.uint32array());
    }
}

// Simple test to verify the framework is working
Deno.test("Performance - Basic Test", () => {
    const data = [1, 2, 3, 4, 5];
    const bytes = zserialize(data, ZS.array(ZS.number()));
    const result = zdeserialize(ZD.array(ZD.number()), bytes);
    assertEquals(result, data, "Basic serialization test failed");
    console.log("✅ Basic performance test framework is working!");
});
Deno.test("Performance - Numbers Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    // Test different sizes
    for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
        if (sizeName === 'iterations') continue;
        
        const sizeValue = size as number;
        const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
        
        await runner.runBenchmark(
            `Numbers Serialization (${sizeName}: ${sizeValue} elements)`,
            () => TestDataGenerator.generateNumbers(sizeValue),
            (data) => {
                const bytes = zserialize(data, ZS.array(ZS.number()));
                const result = zdeserialize(ZD.array(ZD.number()), bytes);
                assert(result.length === data.length, "Length mismatch in number serialization");
            },
            iterations,
            sizeValue
        );
    }
});

Deno.test("Performance - Strings Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    // Test different sizes and string lengths
    const stringLengths = [10, 50, 200];
    
    for (const stringLength of stringLengths) {
        for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
            if (sizeName === 'iterations') continue;
            
            const sizeValue = size as number;
            const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
            
            await runner.runBenchmark(
                `Strings Serialization (${sizeName}: ${sizeValue} strings, ${stringLength} chars each)`,
                () => TestDataGenerator.generateStrings(sizeValue, stringLength),
                (data) => {
                    const bytes = zserialize(data, ZS.array(ZS.string()));
                    const result = zdeserialize(ZD.array(ZD.string()), bytes);
                    assert(result.length === data.length, "Length mismatch in string serialization");
                },
                iterations,
                sizeValue
            );
        }
    }
});

Deno.test("Performance - BigInt Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
        if (sizeName === 'iterations') continue;
        
        const sizeValue = size as number;
        const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
        
        await runner.runBenchmark(
            `BigInt Serialization (${sizeName}: ${sizeValue} elements)`,
            () => TestDataGenerator.generateBigInts(sizeValue),
            (data) => {
                const bytes = zserialize(data, ZS.array(ZS.bigint()));
                const result = zdeserialize(ZD.array(ZD.bigint()), bytes);
                assert(result.length === data.length, "Length mismatch in bigint serialization");
            },
            iterations,
            sizeValue
        );
    }
});

/**
 * TYPED ARRAYS PERFORMANCE TESTS
 */
Deno.test("Performance - TypedArrays Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    const typedArrayTests: Array<{
        name: string;
        constructor: new (size: number) => TypedArray;
        serializer: any;
        deserializer: any;
    }> = [
        { name: "Uint8Array", constructor: Uint8Array, serializer: ZS.uint8array(), deserializer: ZD.uint8array() },
        { name: "Int8Array", constructor: Int8Array, serializer: ZS.int8array(), deserializer: ZD.int8array() },
        { name: "Uint16Array", constructor: Uint16Array, serializer: ZS.uint16array(), deserializer: ZD.uint16array() },
        { name: "Int16Array", constructor: Int16Array, serializer: ZS.int16array(), deserializer: ZD.int16array() },
        { name: "Uint32Array", constructor: Uint32Array, serializer: ZS.uint32array(), deserializer: ZD.uint32array() },
        { name: "Int32Array", constructor: Int32Array, serializer: ZS.int32array(), deserializer: ZD.int32array() },
        { name: "Float32Array", constructor: Float32Array, serializer: ZS.float32array(), deserializer: ZD.float32array() },
        { name: "Float64Array", constructor: Float64Array, serializer: ZS.float64array(), deserializer: ZD.float64array() },
        { name: "BigUint64Array", constructor: BigUint64Array, serializer: ZS.biguint64array(), deserializer: ZD.biguint64array() },
        { name: "BigInt64Array", constructor: BigInt64Array, serializer: ZS.bigint64array(), deserializer: ZD.bigint64array() }
    ];
    
    for (const arrayTest of typedArrayTests) {
        for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
            if (sizeName === 'iterations') continue;
            
            const sizeValue = size as number;
            const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
            
            await runner.runBenchmark(
                `${arrayTest.name} Serialization (${sizeName}: ${sizeValue} elements)`,
                () => TestDataGenerator.generateTypedArray(arrayTest.constructor, sizeValue),
                (data) => {
                    const bytes = zserialize(data as any, arrayTest.serializer);
                    const result = zdeserialize(arrayTest.deserializer, bytes) as TypedArray;
                    assert(result.length === data.length, `Length mismatch in ${arrayTest.name} serialization`);
                },
                iterations,
                sizeValue
            );
        }
    }
});

/**
 * CONTAINER TYPES PERFORMANCE TESTS
 */
Deno.test("Performance - Maps Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    // Test string-to-number maps
    for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
        if (sizeName === 'iterations') continue;
        
        const sizeValue = size as number;
        const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
        
        await runner.runBenchmark(
            `Map<string, number> Serialization (${sizeName}: ${sizeValue} entries)`,
            () => TestDataGenerator.generateMap(sizeValue, 
                () => Math.random().toString(36).substring(7),
                () => Math.random() * 1000
            ),
            (data) => {
                const bytes = zserialize(data, ZS.map(ZS.string(), ZS.number()));
                const result = zdeserialize(ZD.map(ZD.string(), ZD.number()), bytes);
                assert(result.size === data.size, `Size mismatch in Map<string, number> serialization`);
            },
            iterations,
            sizeValue
        );
    }
    
    // Test number-to-string maps
    for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
        if (sizeName === 'iterations') continue;
        
        const sizeValue = size as number;
        const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
        
        await runner.runBenchmark(
            `Map<number, string> Serialization (${sizeName}: ${sizeValue} entries)`,
            () => TestDataGenerator.generateMap(sizeValue, 
                () => Math.floor(Math.random() * 1000000),
                () => Math.random().toString(36).substring(2, 15)
            ),
            (data) => {
                const bytes = zserialize(data, ZS.map(ZS.number(), ZS.string()));
                const result = zdeserialize(ZD.map(ZD.number(), ZD.string()), bytes);
                assert(result.size === data.size, `Size mismatch in Map<number, string> serialization`);
            },
            iterations,
            sizeValue
        );
    }
});

/**
 * COMPLEX OBJECTS PERFORMANCE TESTS
 */
Deno.test("Performance - Complex Objects Serialization", async () => {
    const runner = new BenchmarkRunner();
    
    for (const [sizeName, size] of Object.entries(PERF_CONFIG)) {
        if (sizeName === 'iterations') continue;
        
        const sizeValue = size as number;
        const iterations = PERF_CONFIG.iterations[sizeName as keyof typeof PERF_CONFIG.iterations];
        
        await runner.runBenchmark(
            `Complex Objects Serialization (${sizeName}: ${sizeValue} elements per field)`,
            () => TestDataGenerator.generateMixedObject(sizeValue),
            (data) => {
                const bytes = zserialize(data);
                const result = zdeserialize(ZD.object(ComplexTestObject), bytes);
                assert(result.numbers.length === data.numbers.length, "Numbers length mismatch");
                assert(result.strings.length === data.strings.length, "Strings length mismatch");
                assert(result.uint32Data.length === data.uint32Data.length, "Uint32Data length mismatch");
                assert(result.float64Data.length === data.float64Data.length, "Float64Data length mismatch");
            },
            iterations,
            sizeValue
        );
    }
});

/**
 * SERIALIZATION FORMAT COMPARISON TESTS
 */
Deno.test("Performance - Number Format Comparison", async () => {
    const runner = new BenchmarkRunner();
    const dataSize = PERF_CONFIG.medium;
    const iterations = PERF_CONFIG.iterations.medium;
    
    const numberFormats = [
        { name: "Float64 (default)", format: NumberFormat.Float64 },
        { name: "Float32", format: NumberFormat.Float32 },
        { name: "Int64", format: NumberFormat.Int64 },
        { name: "Int32", format: NumberFormat.Int32 },
        { name: "Int16", format: NumberFormat.Int16 },
        { name: "Int8", format: NumberFormat.Int8 }
    ];
    
    for (const formatTest of numberFormats) {
        await runner.runBenchmark(
            `Number Format: ${formatTest.name}`,
            () => {
                // Generate appropriate test data for each format
                const data: number[] = [];
                for (let i = 0; i < dataSize; i++) {
                    switch (formatTest.format) {
                        case NumberFormat.Int8:
                            data.push(Math.floor(Math.random() * 255) - 128);
                            break;
                        case NumberFormat.Int16:
                            data.push(Math.floor(Math.random() * 65535) - 32768);
                            break;
                        case NumberFormat.Int32:
                            data.push(Math.floor(Math.random() * 4294967295) - 2147483648);
                            break;
                        default:
                            data.push(Math.random() * 1000000 - 500000);
                    }
                }
                return data;
            },
            (data) => {
                const bytes = zserialize(data, ZS.array(ZS.number(formatTest.format)));
                const result = zdeserialize(ZD.array(ZD.number(formatTest.format)), bytes);
                assert(result.length === data.length, `Length mismatch in ${formatTest.name} serialization`);
            },
            iterations,
            dataSize
        );
    }
});

/**
 * SCALABILITY TESTS
 */
Deno.test("Performance - Scalability Analysis", async () => {
    const runner = new BenchmarkRunner();
    
    // Test how performance scales with data size
    const sizes = [100, 500, 1000, 5000, 10000, 50000];
    
    console.log("\n=== Scalability Analysis ===");
    console.log("Size\tTime (ms)\tThroughput (elements/sec)");
    
    for (const size of sizes) {
        const iterations = Math.max(1, Math.floor(10000 / size)); // Adjust iterations based on size
        
        const measurements: number[] = [];
        
        // Warmup
        for (let i = 0; i < 10; i++) {
            const data = TestDataGenerator.generateNumbers(size);
            const start = performance.now();
            const bytes = zserialize(data, ZS.array(ZS.number()));
            zdeserialize(ZD.array(ZD.number()), bytes);
            const end = performance.now();
            measurements.push(end - start);
        }
        
        // Actual measurements
        const actualMeasurements: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const data = TestDataGenerator.generateNumbers(size);
            const start = performance.now();
            const bytes = zserialize(data, ZS.array(ZS.number()));
            zdeserialize(ZD.array(ZD.number()), bytes);
            const end = performance.now();
            actualMeasurements.push(end - start);
        }
        
        const avgTime = actualMeasurements.reduce((sum, val) => sum + val, 0) / actualMeasurements.length;
        const throughput = (size * 1000) / avgTime; // elements per second
        
        console.log(`${size}\t${avgTime.toFixed(3)}\t${throughput.toFixed(0)}`);
    }
});

/**
 * CONCURRENT SERIALIZATION TESTS
 */
Deno.test("Performance - Concurrent Serialization", async () => {
    const runner = new BenchmarkRunner();
    const concurrencyLevels = [1, 2, 4, 8, 16];
    const dataSize = 1000;
    
    console.log("\n=== Concurrent Serialization Performance ===");
    
    for (const concurrency of concurrencyLevels) {
        const start = performance.now();
        
        const promises: Promise<void>[] = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push((async () => {
                const data = TestDataGenerator.generateNumbers(dataSize);
                const bytes = zserialize(data, ZS.array(ZS.number()));
                const result = zdeserialize(ZD.array(ZD.number()), bytes);
                assert(result.length === data.length, "Concurrent serialization failed");
            })());
        }
        
        await Promise.all(promises);
        const end = performance.now();
        
        const totalTime = end - start;
        const avgTimePerOp = totalTime / concurrency;
        
        console.log(`Concurrency ${concurrency}: ${totalTime.toFixed(3)} ms total, ${avgTimePerOp.toFixed(3)} ms avg per operation`);
    }
});

/**
 * EDGE CASE PERFORMANCE TESTS
 */
Deno.test("Performance - Edge Cases", async () => {
    const runner = new BenchmarkRunner();
    
    // Test empty data structures
    await runner.runBenchmark(
        "Empty Array Serialization",
        () => [],
        (data) => {
            const bytes = zserialize(data, ZS.array(ZS.number()));
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === 0, "Empty array serialization failed");
        },
        10000
    );
    
    // Test single element arrays
    await runner.runBenchmark(
        "Single Element Array Serialization",
        () => [Math.random()],
        (data) => {
            const bytes = zserialize(data, ZS.array(ZS.number()));
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === 1, "Single element array serialization failed");
        },
        10000
    );
    
    // Test very large strings
    await runner.runBenchmark(
        "Large String Serialization",
        () => 'A'.repeat(10000),
        (data) => {
            const bytes = zserialize(data, ZS.string());
            const result = zdeserialize(ZD.string(), bytes);
            assert(result.length === data.length, "Large string serialization failed");
        },
        100
    );
    
    // Test extreme numeric values
    await runner.runBenchmark(
        "Extreme Numeric Values Serialization",
        () => [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_VALUE, Number.MIN_VALUE, 0, -0, Infinity, -Infinity],
        (data) => {
            const bytes = zserialize(data, ZS.array(ZS.number()));
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === data.length, "Extreme numeric values serialization failed");
        },
        1000
    );
});

// Utility function to estimate data size
function getDataSize(data: any): number {
    if (data instanceof Array) {
        if (data.length === 0) return 0;
        
        if (typeof data[0] === 'number') {
            return data.length * 8; // Assume Float64
        } else if (typeof data[0] === 'string') {
            return data.reduce((sum: number, str: string) => sum + str.length * 2, 0); // UTF-16
        }
    } else if (data instanceof Uint8Array) {
        return data.byteLength;
    } else if (data instanceof Uint16Array) {
        return data.byteLength;
    } else if (data instanceof Uint32Array) {
        return data.byteLength;
    } else if (data instanceof Float32Array) {
        return data.byteLength;
    } else if (data instanceof Float64Array) {
        return data.byteLength;
    } else if (data instanceof BigUint64Array || data instanceof BigInt64Array) {
        return data.byteLength;
    }
    
    return 0; // Unknown size
}

/**
 * COMPARATIVE PERFORMANCE TESTS
 */
Deno.test("Performance - Auto vs Explicit Serialization", async () => {
    const runner = new BenchmarkRunner();
    const dataSize = PERF_CONFIG.medium;
    const iterations = PERF_CONFIG.iterations.medium;
    
    // Compare auto-detection vs explicit serializers
    const testData = TestDataGenerator.generateNumbers(dataSize);
    
    await runner.runBenchmark(
        "Auto-Detection Serialization",
        () => testData,
        (data) => {
            const bytes = zserialize(data); // Let auto-detection work
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === data.length, "Auto-detection serialization failed");
        },
        iterations,
        dataSize
    );
    
    await runner.runBenchmark(
        "Explicit Serialization",
        () => testData,
        (data) => {
            const bytes = zserialize(data, ZS.array(ZS.number())); // Explicit serializer
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === data.length, "Explicit serialization failed");
        },
        iterations,
        dataSize
    );
});

Deno.test("Performance - Direct API vs Convenience Methods", async () => {
    const runner = new BenchmarkRunner();
    const dataSize = PERF_CONFIG.medium;
    const iterations = PERF_CONFIG.iterations.medium;
    
    const testData = TestDataGenerator.generateNumbers(dataSize);
    
    await runner.runBenchmark(
        "Convenience Methods (zserialize/zdeserialize)",
        () => testData,
        (data) => {
            const bytes = zserialize(data, ZS.array(ZS.number()));
            const result = zdeserialize(ZD.array(ZD.number()), bytes);
            assert(result.length === data.length, "Convenience methods failed");
        },
        iterations,
        dataSize
    );
    
    await runner.runBenchmark(
        "Direct API (ZBytesSerializer/ZBytesDeserializer)",
        () => testData,
        (data) => {
            const serializer = new ZBytesSerializer();
            serializer.serialize(data, ZS.array(ZS.number()));
            const bytes = serializer.finish();
            
            const deserializer = new ZBytesDeserializer(bytes);
            const result = deserializer.deserialize(ZD.array(ZD.number()));
            assert(result.length === data.length, "Direct API failed");
        },
        iterations,
        dataSize
    );
});

/**
 * REAL-WORLD SCENARIO TESTS
 */
Deno.test("Performance - Real-World Data Scenarios", async () => {
    const runner = new BenchmarkRunner();
    
    // Simulate sensor data (time series)
    class SensorData implements ZSerializeable, ZDeserializeable {
        constructor(
            public timestamp: number = 0,
            public sensorId: string = "",
            public values: Float32Array = new Float32Array(0),
            public metadata: Map<string, string> = new Map()
        ) {}
        
        serializeWithZSerializer(serializer: ZBytesSerializer): void {
            serializer.serialize(this.timestamp, ZS.number(NumberFormat.Int64));
            serializer.serialize(this.sensorId, ZS.string());
            serializer.serialize(this.values, ZS.float32array());
            serializer.serialize(this.metadata, ZS.map(ZS.string(), ZS.string()));
        }
        
        deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
            this.timestamp = deserializer.deserialize(ZD.number(NumberFormat.Int64));
            this.sensorId = deserializer.deserialize(ZD.string());
            this.values = deserializer.deserialize(ZD.float32array());
            this.metadata = deserializer.deserialize(ZD.map(ZD.string(), ZD.string()));
        }
    }
    
    await runner.runBenchmark(
        "Sensor Data Scenario (IoT Time Series)",
        () => {
            const sensorData = new SensorData();
            sensorData.timestamp = Date.now();
            sensorData.sensorId = `sensor_${Math.floor(Math.random() * 1000)}`;
            sensorData.values = TestDataGenerator.generateTypedArray(Float32Array, 100); // 100 sensor readings
            sensorData.metadata.set("location", "building_A");
            sensorData.metadata.set("type", "temperature");
            sensorData.metadata.set("unit", "celsius");
            return sensorData;
        },
        (data) => {
            const bytes = zserialize(data);
            const result = zdeserialize(ZD.object(SensorData), bytes);
            assert(result.values.length === data.values.length, "Sensor data serialization failed");
        },
        1000
    );
    
    // Simulate image/video metadata
    class ImageMetadata implements ZSerializeable, ZDeserializeable {
        constructor(
            public width: number = 0,
            public height: number = 0,
            public format: string = "",
            public histogram: Uint32Array = new Uint32Array(0),
            public tags: string[] = [],
            public coordinates: { lat: number; lon: number } | null = null
        ) {}
        
        serializeWithZSerializer(serializer: ZBytesSerializer): void {
            serializer.serialize(this.width, ZS.number(NumberFormat.Uint32));
            serializer.serialize(this.height, ZS.number(NumberFormat.Uint32));
            serializer.serialize(this.format, ZS.string());
            serializer.serialize(this.histogram, ZS.uint32array());
            serializer.serialize(this.tags, ZS.array(ZS.string()));
            serializer.serialize(this.coordinates !== null, ZS.boolean());
            if (this.coordinates !== null) {
                serializer.serialize(this.coordinates.lat, ZS.number(NumberFormat.Float64));
                serializer.serialize(this.coordinates.lon, ZS.number(NumberFormat.Float64));
            }
        }
        
        deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
            this.width = deserializer.deserialize(ZD.number(NumberFormat.Uint32));
            this.height = deserializer.deserialize(ZD.number(NumberFormat.Uint32));
            this.format = deserializer.deserialize(ZD.string());
            this.histogram = deserializer.deserialize(ZD.uint32array());
            this.tags = deserializer.deserialize(ZD.array(ZD.string()));
            const hasCoordinates = deserializer.deserialize(ZD.boolean());
            if (hasCoordinates) {
                this.coordinates = {
                    lat: deserializer.deserialize(ZD.number(NumberFormat.Float64)),
                    lon: deserializer.deserialize(ZD.number(NumberFormat.Float64))
                };
            }
        }
    }
    
    await runner.runBenchmark(
        "Image Metadata Scenario (Media Processing)",
        () => {
            const metadata = new ImageMetadata();
            metadata.width = 1920;
            metadata.height = 1080;
            metadata.format = "JPEG";
            metadata.histogram = TestDataGenerator.generateTypedArray(Uint32Array, 256); // Color histogram
            metadata.tags = ["landscape", "outdoor", "nature"];
            metadata.coordinates = { lat: 37.7749, lon: -122.4194 };
            return metadata;
        },
        (data) => {
            const bytes = zserialize(data);
            const result = zdeserialize(ZD.object(ImageMetadata), bytes);
            assert(result.histogram.length === data.histogram.length, "Image metadata serialization failed");
        },
        1000
    );
});

console.log("\n🚀 Performance tests completed! Check the detailed timing results above.");
