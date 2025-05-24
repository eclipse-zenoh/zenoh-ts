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

import { ZBytesSerializer, ZBytesDeserializer, ZSerializeable, ZDeserializeable, zserialize, zdeserialize, NumberFormat, BigIntFormat, ZS, ZD } from "@eclipse-zenoh/zenoh-ts/ext";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

// Test classes
class CustomStruct implements ZSerializeable, ZDeserializeable {
    constructor(
        public vd: number[] = [],
        public i: number = 0,
        public s: string = ""
    ) {}

    serializeWithZSerializer(serializer: ZBytesSerializer): void {
        serializer.serialize(this.vd, ZS.array(ZS.number()));
        serializer.serialize(this.i, ZS.number(NumberFormat.Int32));
        serializer.serialize(this.s, ZS.string());
    }

    deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
        this.vd = deserializer.deserialize(ZD.array(ZD.number()));
        this.i = deserializer.deserialize(ZD.number(NumberFormat.Int32));
        this.s = deserializer.deserialize(ZD.string());
    }
}

class MixedTypedArrayCollection implements ZSerializeable, ZDeserializeable {
    uint16: Uint16Array;
    int32: Int32Array;
    float64: Float64Array;
    
    constructor(
        uint16: Uint16Array = new Uint16Array(0),
        int32: Int32Array = new Int32Array(0),
        float64: Float64Array = new Float64Array(0)
    ) {
        this.uint16 = uint16;
        this.int32 = int32;
        this.float64 = float64;
    }
    
    serializeWithZSerializer(serializer: ZBytesSerializer): void {
        serializer.serialize(this.uint16, ZS.uint16array());
        serializer.serialize(this.int32, ZS.int32array());
        serializer.serialize(this.float64, ZS.float64array());
    }
    
    deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
        this.uint16 = deserializer.deserialize(ZD.uint16array());
        this.int32 = deserializer.deserialize(ZD.int32array());
        this.float64 = deserializer.deserialize(ZD.float64array());
    }
}

// Helper functions
function compareFloatArrays(a: ArrayLike<number>, b: ArrayLike<number>, tolerance = 0.0001): boolean {
    if (a.length !== b.length) return false;
    return Array.from(a).every((val, idx) => Math.abs(val - b[idx]) < tolerance);
}

/**
 * 1. PRIMITIVE TYPE TESTS
 */
Deno.test("Serialization - Primitive Number Types", () => {
    // === UINT FORMATS ===
    // Test Uint8
    for (const val of [0, 5, 127, 255]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Uint8));
        const result = zdeserialize(ZD.number(NumberFormat.Uint8), bytes);
        assertEquals(result, val, `Uint8 serialization failed for value: ${val}`);
    }

    // Test Uint16
    for (const val of [0, 500, 65535]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Uint16));
        const result = zdeserialize(ZD.number(NumberFormat.Uint16), bytes);
        assertEquals(result, val, `Uint16 serialization failed for value: ${val}`);
    }

    // Test Uint32
    for (const val of [0, 50000, 4294967295]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Uint32));
        const result = zdeserialize(ZD.number(NumberFormat.Uint32), bytes);
        assertEquals(result, val, `Uint32 serialization failed for value: ${val}`);
    }

    // Test Uint64 (within safe integer range)
    for (const val of [0, 1000000, Number.MAX_SAFE_INTEGER]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Uint64));
        const result = zdeserialize(ZD.number(NumberFormat.Uint64), bytes);
        assertEquals(result, val, `Uint64 serialization failed for value: ${val}`);
    }

    // === INT FORMATS ===
    // Test Int8
    for (const val of [-128, -5, 0, 5, 127]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int8));
        const result = zdeserialize(ZD.number(NumberFormat.Int8), bytes);
        assertEquals(result, val, `Int8 serialization failed for value: ${val}`);
    }

    // Test Int16
    for (const val of [-32768, -500, 0, 500, 32767]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int16));
        const result = zdeserialize(ZD.number(NumberFormat.Int16), bytes);
        assertEquals(result, val, `Int16 serialization failed for value: ${val}`);
    }

    // Test Int32
    for (const val of [-2147483648, -50000, 0, 50000, 2147483647]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int32));
        const result = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
        assertEquals(result, val, `Int32 serialization failed for value: ${val}`);
    }

    // Test Int64 (within safe integer range)
    for (const val of [-Number.MAX_SAFE_INTEGER, -1000000, 0, 1000000, Number.MAX_SAFE_INTEGER]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int64));
        const result = zdeserialize(ZD.number(NumberFormat.Int64), bytes);
        assertEquals(result, val, `Int64 serialization failed for value: ${val}`);
    }

    // === FLOAT FORMATS ===
    // Test Float32
    for (const val of [-3.14, 0, 0.5, 3.14]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Float32));
        const result = zdeserialize(ZD.number(NumberFormat.Float32), bytes);
        assert(Math.abs(val - result) < 0.0001, `Float32 serialization failed for value: ${val}`);
    }

    // Test Float64
    for (const val of [-123.45, 0, 123.45]) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Float64));
        const result = zdeserialize(ZD.number(NumberFormat.Float64), bytes);
        assert(Math.abs(val - result) < 0.0001, `Float64 serialization failed for value: ${val}`);
    }
});

Deno.test("Serialization - BigInt Types", () => {
    // Test BigInt Uint64
    for (const val of [0n, 500000000000n, 18446744073709551615n]) {
        const bytes = zserialize(val, ZS.bigint(BigIntFormat.Uint64));
        const result = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
        assertEquals(result, val, `BigInt Uint64 serialization failed for value: ${val}`);
    }

    // Test BigInt Int64
    for (const val of [-9223372036854775808n, -500000000000n, 0n, 500000000000n, 9223372036854775807n]) {
        const bytes = zserialize(val, ZS.bigint(BigIntFormat.Int64));
        const result = zdeserialize(ZD.bigint(BigIntFormat.Int64), bytes);
        assertEquals(result, val, `BigInt Int64 serialization failed for value: ${val}`);
    }

    // Test number larger than 32 bit but less than 53 bit
    const large32BitNum = 0x1_0000_0001; // Just over 32 bits
    const bytes = zserialize(large32BitNum, ZS.number(NumberFormat.Int64));
    const result = zdeserialize(ZD.number(NumberFormat.Int64), bytes);
    assertEquals(result, large32BitNum, "large number (>32bit) serialization failed");

    // Test that deserializing number larger than 53 bit throws error
    const tooLargeNum = 9876543210123456789n; // Larger than 53 bits and less than 64 bits
    assert(tooLargeNum > BigInt(Number.MAX_SAFE_INTEGER), "number is not larger than 53 bits");
    assert(tooLargeNum < BigInt(2) ** BigInt(64), "number is not less than 2^64");

    let threw = false;
    const largeBytes = zserialize(tooLargeNum, ZS.bigint(BigIntFormat.Uint64));
    try {
        zdeserialize(ZD.number(NumberFormat.Uint64), largeBytes);
    } catch (e) {
        threw = true;
        assert(e instanceof Error && e.message.includes("exceeds the safe range"), 
               "wrong error message for large number deserialization");
    }
    assert(threw, "Should throw when deserializing bigint > MAX_SAFE_INTEGER as number");
});

Deno.test("Serialization - Boolean", () => {
    // Test boolean true
    let bytes = zserialize(true, ZS.boolean());
    let result = zdeserialize(ZD.boolean(), bytes);
    assertEquals(result, true, "Boolean true serialization failed");

    // Test boolean false
    bytes = zserialize(false, ZS.boolean());
    result = zdeserialize(ZD.boolean(), bytes);
    assertEquals(result, false, "Boolean false serialization failed");
});

/**
 * 2. CONTAINER TYPES TESTS
 */
Deno.test("Serialization - String", () => {
    // Test empty string
    let str = "";
    let bytes = zserialize(str, ZS.string());
    let result = zdeserialize(ZD.string(), bytes);
    assertEquals(result, str, "Empty string serialization failed");

    // Test simple string
    str = "abcdefg";
    bytes = zserialize(str);
    result = zdeserialize(ZD.string(), bytes);
    assertEquals(result, str, "String serialization failed");

    // Test string with special characters
    str = "Special: áéíóú ñ 你好";
    bytes = zserialize(str);
    result = zdeserialize(ZD.string(), bytes);
    assertEquals(result, str, "String with special characters serialization failed");
});

Deno.test("Serialization - Arrays", () => {
    // Test empty array
    const emptyArray: number[] = [];
    let bytes = zserialize(emptyArray, ZS.array(ZS.number()));
    let result = zdeserialize(ZD.array(ZD.number()), bytes);
    assertEquals(result, emptyArray, "Empty array serialization failed");
    
    // Test homogeneous number array
    const numArray = [0.5, 1.0, 2.0];
    bytes = zserialize(numArray, ZS.array(ZS.number()));
    result = zdeserialize(ZD.array(ZD.number()), bytes);
    assertEquals(result, numArray, "Number array serialization failed");

    // Test homogeneous string array
    const strArray = ["abc", "def", "hij"];
    bytes = zserialize(strArray, ZS.array(ZS.string()));
    const strResult = zdeserialize(ZD.array(ZD.string()), bytes);
    assertEquals(strResult, strArray, "String array serialization failed");

    // Test array of floats
    const floats = [0.1, 0.2, -0.5, 1000.578];
    bytes = zserialize(floats, ZS.array(ZS.number(NumberFormat.Float32)));
    const floatResult = zdeserialize(ZD.array(ZD.number(NumberFormat.Float32)), bytes);
    assert(floatResult.every((val, idx) => Math.abs(val - floats[idx]) < 0.0001), 
           "Array of floats serialization failed");
           
    // Test nested array
    const nestedArray = [[1, 2, 3], [4, 5, 6]];
    bytes = zserialize(nestedArray, ZS.array(ZS.array(ZS.number())));
    const nestedResult = zdeserialize(ZD.array(ZD.array(ZD.number())), bytes);
    assertEquals(nestedResult, nestedArray, "Nested array serialization failed");

    // Test array of bigints
    const int64Array = [-100n, 500n, 100000n, -20000000n];
    bytes = zserialize(int64Array, ZS.array(ZS.bigint()));
    const int64Result = zdeserialize(ZD.array(ZD.bigint()), bytes);
    assertEquals(int64Result, int64Array, "Array of bigints serialization failed");
});

Deno.test("Serialization - Sets and Maps", () => {
    // Test Set conversion to/from array
    const set = new Set([1, 2, 3, -5, 10000, -999999999]);
    const setBytes = zserialize(Array.from(set));
    const setResult = new Set(zdeserialize(ZD.array(ZD.number()), setBytes));
    assertEquals(setResult, set, "Set serialization failed");

    // Test empty Map
    const emptyMap = new Map<number, string>();
    let mapBytes = zserialize(emptyMap);
    let mapResult = zdeserialize(ZD.map(ZD.number(), ZD.string()), mapBytes);
    assertEquals(mapResult, emptyMap, "Empty map serialization failed");

    // Test Map with entries
    const map = new Map<number, string>();
    map.set(100, "abc");
    map.set(10000, "def");
    map.set(2000000000, "hij");
    mapBytes = zserialize(map);
    mapResult = zdeserialize(ZD.map(ZD.number(), ZD.string()), mapBytes);
    assertEquals(mapResult, map, "Map serialization failed");
});

Deno.test("Serialization - Custom Objects", () => {
    // Test empty CustomStruct
    const emptyStruct = new CustomStruct();
    let bytes = zserialize(emptyStruct);
    let result = zdeserialize(ZD.object(CustomStruct), bytes);
    assertEquals(result.vd, emptyStruct.vd, "Empty CustomStruct.vd serialization failed");
    assertEquals(result.i, emptyStruct.i, "Empty CustomStruct.i serialization failed");
    assertEquals(result.s, emptyStruct.s, "Empty CustomStruct.s serialization failed");
    
    // Test CustomStruct with values
    const filledStruct = new CustomStruct([0.1, 0.2, -1000.55], 32, "test");
    bytes = zserialize(filledStruct);
    result = zdeserialize(ZD.object(CustomStruct), bytes);
    assertEquals(result.vd, filledStruct.vd, "CustomStruct.vd serialization failed");
    assertEquals(result.i, filledStruct.i, "CustomStruct.i serialization failed");
    assertEquals(result.s, filledStruct.s, "CustomStruct.s serialization failed");
});

/**
 * 3. TYPED ARRAYS TESTS
 */
Deno.test("Serialization - Int Typed Arrays", () => {
    // Test Int8Array
    const int8Data = new Int8Array([-128, -100, -50, 0, 50, 100, 127]);
    let bytes = zserialize(int8Data, ZS.int8array());
    let result = zdeserialize(ZD.int8array(), bytes);
    assert(result instanceof Int8Array, "Result should be Int8Array");
    assertEquals(Array.from(result), Array.from(int8Data), "Int8Array serialization failed");

    // Test Int16Array
    const int16Data = new Int16Array([100, -200, 300, -30000]);
    bytes = zserialize(int16Data, ZS.int16array());
    const int16Result = zdeserialize(ZD.int16array(), bytes);
    assert(int16Result instanceof Int16Array, "Result should be Int16Array");
    assertEquals(Array.from(int16Result), Array.from(int16Data), "Int16Array serialization failed");
    
    // Test Int32Array
    const int32Data = new Int32Array([100000, -200000, 300000, -2000000000]);
    bytes = zserialize(int32Data, ZS.int32array());
    const int32Result = zdeserialize(ZD.int32array(), bytes);
    assert(int32Result instanceof Int32Array, "Result should be Int32Array");
    assertEquals(Array.from(int32Result), Array.from(int32Data), "Int32Array serialization failed");
    
    // Test BigInt64Array
    const bigInt64Data = new BigInt64Array([100000n, -200000n, 300000n, -2000000000n]);
    bytes = zserialize(bigInt64Data, ZS.bigint64array());
    const bigResult = zdeserialize(ZD.bigint64array(), bytes);
    assert(bigResult instanceof BigInt64Array, "Result should be BigInt64Array");
    assertEquals(Array.from(bigResult), Array.from(bigInt64Data), "BigInt64Array serialization failed");
});

Deno.test("Serialization - Uint Typed Arrays", () => {
    // Test Uint8Array
    const uint8Data = new Uint8Array([0, 127, 255]);
    let bytes = zserialize(uint8Data, ZS.uint8array());
    let result = zdeserialize(ZD.uint8array(), bytes);
    assert(result instanceof Uint8Array, "Result should be Uint8Array");
    assertEquals(Array.from(result), Array.from(uint8Data), "Uint8Array serialization failed");

    // Test Uint16Array
    const uint16Data = new Uint16Array([100, 200, 300, 40000]);
    bytes = zserialize(uint16Data, ZS.uint16array());
    const uint16Result = zdeserialize(ZD.uint16array(), bytes);
    assert(uint16Result instanceof Uint16Array, "Result should be Uint16Array");
    assertEquals(Array.from(uint16Result), Array.from(uint16Data), "Uint16Array serialization failed");

    // Test Uint32Array
    const uint32Data = new Uint32Array([100000, 200000, 300000, 4000000000]);
    bytes = zserialize(uint32Data, ZS.uint32array());
    const uint32Result = zdeserialize(ZD.uint32array(), bytes);
    assert(uint32Result instanceof Uint32Array, "Result should be Uint32Array");
    assertEquals(Array.from(uint32Result), Array.from(uint32Data), "Uint32Array serialization failed");
    
    // Test BigUint64Array
    const bigUint64Data = new BigUint64Array([100000n, 200000n, 300000n, 4000000000n]);
    bytes = zserialize(bigUint64Data, ZS.biguint64array());
    const bigResult = zdeserialize(ZD.biguint64array(), bytes);
    assert(bigResult instanceof BigUint64Array, "Result should be BigUint64Array");
    assertEquals(Array.from(bigResult), Array.from(bigUint64Data), "BigUint64Array serialization failed");
});

Deno.test("Serialization - Float Typed Arrays", () => {
    // Test Float32Array
    const float32Data = new Float32Array([1.5, -2.25, 3.75, -4.125]);
    const float32Bytes = zserialize(float32Data, ZS.float32array());
    const float32Result = zdeserialize(ZD.float32array(), float32Bytes);
    assert(float32Result instanceof Float32Array, "Result should be Float32Array");
    assert(compareFloatArrays(float32Result, float32Data), "Float32Array serialization failed");
    
    // Test Float64Array
    const float64Data = new Float64Array([1.12345, -2.34567, 3.45678, -4.56789]);
    const float64Bytes = zserialize(float64Data, ZS.float64array());
    const float64Result = zdeserialize(ZD.float64array(), float64Bytes);
    assert(float64Result instanceof Float64Array, "Result should be Float64Array");
    assert(compareFloatArrays(float64Result, float64Data), "Float64Array serialization failed");
});

Deno.test("Serialization - TypedArray Auto Detection", () => {
    // Test auto detection for Uint8Array
    const uint8Data = new Uint8Array([0, 127, 255]);
    const uint8Bytes = zserialize(uint8Data); // No explicit serializer tag
    const uint8Result = zdeserialize(ZD.uint8array(), uint8Bytes);
    assert(uint8Result instanceof Uint8Array, "Result should be Uint8Array");
    assertEquals(Array.from(uint8Result), Array.from(uint8Data), "Auto-detected Uint8Array serialization failed");

    // Test auto detection for Int8Array
    const int8Data = new Int8Array([-128, -100, -50, 0, 50, 100, 127]);
    const int8Bytes = zserialize(int8Data); // No explicit serializer tag
    const int8Result = zdeserialize(ZD.int8array(), int8Bytes);
    assert(int8Result instanceof Int8Array, "Result should be Int8Array");
    assertEquals(Array.from(int8Result), Array.from(int8Data), "Auto-detected Int8Array serialization failed");

    // Test auto detection for Float32Array
    const float32Data = new Float32Array([1.5, -2.25, 3.75, -4.125]);
    const float32Bytes = zserialize(float32Data); // No explicit serializer tag
    const float32Result = zdeserialize(ZD.float32array(), float32Bytes);
    assert(float32Result instanceof Float32Array, "Result should be Float32Array");
    assert(compareFloatArrays(float32Result, float32Data), "Auto-detected Float32Array serialization failed");
});

Deno.test("Serialization - TypedArray Collections", () => {
    // Test array of TypedArrays
    const typedArrayCollection = [
        new Uint16Array([1, 2, 3]),
        new Uint16Array([4, 5, 6]),
        new Uint16Array([7, 8, 9])
    ];
    
    const collectionBytes = zserialize(typedArrayCollection, ZS.array(ZS.uint16array()));
    const collectionResult = zdeserialize(ZD.array(ZD.uint16array()), collectionBytes);
    
    assert(Array.isArray(collectionResult), "Result should be an Array");
    assertEquals(collectionResult.length, typedArrayCollection.length, "Collection length mismatch");
    
    for (let i = 0; i < collectionResult.length; i++) {
        assert(collectionResult[i] instanceof Uint16Array, `Item ${i} should be Uint16Array`);
        assertEquals(
            Array.from(collectionResult[i]), 
            Array.from(typedArrayCollection[i]),
            `Item ${i} data mismatch`
        );
    }
    
    // Test Map with TypedArray keys and values
    const typedArrayMap = new Map<Uint8Array, Float32Array>();
    typedArrayMap.set(
        new Uint8Array([1, 2, 3]), 
        new Float32Array([1.1, 2.2, 3.3])
    );
    typedArrayMap.set(
        new Uint8Array([4, 5, 6]), 
        new Float32Array([4.4, 5.5, 6.6])
    );
    
    const mapBytes = zserialize(typedArrayMap, ZS.map(ZS.uint8array(), ZS.float32array()));
    const mapResult = zdeserialize(ZD.map(ZD.uint8array(), ZD.float32array()), mapBytes);
    
    assert(mapResult instanceof Map, "Result should be a Map");
    assertEquals(mapResult.size, typedArrayMap.size, "Map size mismatch");
    
    // Compare map entries - need to convert to strings for comparison since TypedArrays can't be directly compared
    for (const [key, value] of typedArrayMap.entries()) {
        // Find matching key in result
        let foundMatch = false;
        for (const [resultKey, resultValue] of mapResult.entries()) {
            if (Array.from(resultKey).toString() === Array.from(key).toString()) {
                foundMatch = true;
                assert(compareFloatArrays(resultValue, value), "Map value mismatch");
                break;
            }
        }
        assert(foundMatch, `No matching key found for ${Array.from(key)}`);
    }
    
    // Test mixed collection with different TypedArrays
    const mixedCollection = {
        uint16: new Uint16Array([1, 2]),
        int32: new Int32Array([3, 4]),
        float64: new Float64Array([5.5, 6.6])
    };
    
    const mixed = new MixedTypedArrayCollection(
        mixedCollection.uint16,
        mixedCollection.int32,
        mixedCollection.float64
    );
    
    const mixedBytes = zserialize(mixed);
    const mixedResult = zdeserialize(ZD.object(MixedTypedArrayCollection), mixedBytes);
    
    assert(mixedResult instanceof MixedTypedArrayCollection, "Result should be a MixedTypedArrayCollection");
    assertEquals(
        Array.from(mixedResult.uint16), 
        Array.from(mixedCollection.uint16),
        "uint16 mismatch"
    );
    assertEquals(
        Array.from(mixedResult.int32), 
        Array.from(mixedCollection.int32),
        "int32 mismatch"
    );
    assert(
        compareFloatArrays(mixedResult.float64, mixedCollection.float64),
        "float64 mismatch"
    );
});

/**
 * 4. LOW-LEVEL API TESTS
 */
Deno.test("Serialization - Direct Serializer/Deserializer API", () => {
    // Test direct API for numbers
    const numbers = [-128, 0, 127, 255];
    for (const val of numbers) {
        const serializer = new ZBytesSerializer();
        
        if (val >= 0 && val <= 255) {
            serializer.serialize(val, ZS.number(NumberFormat.Uint8));
        } else {
            serializer.serialize(val, ZS.number(NumberFormat.Int8));
        }
        
        const bytes = serializer.finish();
        const deserializer = new ZBytesDeserializer(bytes);
        
        let result;
        if (val >= 0 && val <= 255) {
            result = deserializer.deserialize(ZD.number(NumberFormat.Uint8));
        } else {
            result = deserializer.deserialize(ZD.number(NumberFormat.Int8));
        }
        
        assertEquals(result, val, `Direct serialization API failed for value: ${val}`);
    }
    
    // Test direct API for typed arrays
    const int8Data = new Int8Array([-128, -64, 0, 64, 127]);
    const serializer = new ZBytesSerializer();
    serializer.serialize(int8Data, ZS.int8array());
    const bytes = serializer.finish();
    
    const deserializer = new ZBytesDeserializer(bytes);
    const result = deserializer.deserialize(ZD.int8array());
    
    assert(result instanceof Int8Array, "Result should be Int8Array");
    assertEquals(Array.from(result), Array.from(int8Data), "Direct API for Int8Array failed");
});

/**
 * 5. EDGE CASES AND ERROR HANDLING
 */
Deno.test("Serialization - Edge Cases and Error Handling", () => {
    // Test serializing a value larger than MAX_SAFE_INTEGER
    const tooLargeNum = 9876543210123456789n; // Larger than 53 bits
    const bytes = zserialize(tooLargeNum, ZS.bigint(BigIntFormat.Uint64));
    
    // Should deserialize as BigInt without error
    const bigintResult = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
    assertEquals(bigintResult, tooLargeNum, "BigInt serialization failed");
    
    // Should throw when trying to deserialize as Number
    let threw = false;
    try {
        zdeserialize(ZD.number(NumberFormat.Uint64), bytes);
    } catch (e) {
        threw = true;
        assert(e instanceof Error && e.message.includes("exceeds the safe range"), 
               "Error message for large number deserialization is incorrect");
    }
    assert(threw, "Should throw when deserializing bigint > MAX_SAFE_INTEGER as number");
});
