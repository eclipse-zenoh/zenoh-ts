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
    zserialize, 
    zdeserialize,
    ZS, 
    ZD 
} from "@eclipse-zenoh/zenoh-ts/ext";
import { assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

/**
 * Configuration for the performance test
 */
const TEST_CONFIG = {
    dataSize: 1000,       // Number of elements in test array
    iterations: 100,      // Number of iterations for measurement
    warmupIterations: 10  // Number of warmup iterations
};

/**
 * Generates an array of random numbers for testing
 */
function generateTestData(size: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < size; i++) {
        data.push(Math.random() * 1000);
    }
    return data;
}

/**
 * A simple performance test that measures serialization and deserialization times
 * for an array of numbers using the zenoh-ts serialization framework.
 */
Deno.test("Serialization Performance Test", () => {
    console.log("\n=== Serialization Performance Test ===");
    console.log(`Data size: ${TEST_CONFIG.dataSize} elements`);
    console.log(`Iterations: ${TEST_CONFIG.iterations}`);
    
    const testData = generateTestData(TEST_CONFIG.dataSize);
    const serializationTimes: number[] = [];
    const deserializationTimes: number[] = [];
    
    // Warmup
    console.log("\nPerforming warmup...");
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        const bytes = zserialize(testData, ZS.array(ZS.number()));
        zdeserialize(ZD.array(ZD.number()), bytes);
    }
    
    // Main test
    console.log("Running performance measurements...");
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        // Measure serialization
        const serializeStart = performance.now();
        const bytes = zserialize(testData, ZS.array(ZS.number()));
        const serializeEnd = performance.now();
        serializationTimes.push(serializeEnd - serializeStart);
        
        // Measure deserialization
        const deserializeStart = performance.now();
        const result = zdeserialize(ZD.array(ZD.number()), bytes);
        const deserializeEnd = performance.now();
        deserializationTimes.push(deserializeEnd - deserializeStart);
        
        // Verify correctness
        assert(result.length === testData.length, "Deserialization length mismatch");
    }
    
    // Calculate statistics
    const avgSerializationTime = serializationTimes.reduce((a, b) => a + b) / TEST_CONFIG.iterations;
    const avgDeserializationTime = deserializationTimes.reduce((a, b) => a + b) / TEST_CONFIG.iterations;
    
    // Calculate throughput
    const serializationThroughput = (TEST_CONFIG.dataSize / avgSerializationTime) * 1000; // elements per second
    const deserializationThroughput = (TEST_CONFIG.dataSize / avgDeserializationTime) * 1000; // elements per second
    
    // Print results
    console.log("\nResults:");
    console.log(`Serialization:   ${avgSerializationTime.toFixed(3)} ms (${serializationThroughput.toFixed(0)} elements/sec)`);
    console.log(`Deserialization: ${avgDeserializationTime.toFixed(3)} ms (${deserializationThroughput.toFixed(0)} elements/sec)`);
    console.log(`Total:          ${(avgSerializationTime + avgDeserializationTime).toFixed(3)} ms`);
});
