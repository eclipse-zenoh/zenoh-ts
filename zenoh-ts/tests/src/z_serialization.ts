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

Deno.test("Serialization - Primitive", () => {
    // Uint tests
    let bytes = zserialize(5, ZS.number(NumberFormat.Uint8));
    let deserializedNum = zdeserialize(ZD.number(NumberFormat.Uint8), bytes);
    assertEquals(deserializedNum, 5, "uint8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Uint16));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Uint16), bytes);
    assertEquals(deserializedNum, 500, "uint16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Uint32));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Uint32), bytes);
    assertEquals(deserializedNum, 50000, "uint32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Uint64));
    let deserializedBigint = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
    assertEquals(deserializedBigint, BigInt(500000000000), "uint64 serialization failed");

    // Int tests
    bytes = zserialize(-5, ZS.number(NumberFormat.Int8));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Int8), bytes);
    assertEquals(deserializedNum, -5, "int8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Int16));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Int16), bytes);
    assertEquals(deserializedNum, 500, "int16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Int32));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
    assertEquals(deserializedNum, 50000, "int32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Int64));
    deserializedBigint = zdeserialize(ZD.bigint(BigIntFormat.Int64), bytes);
    assertEquals(deserializedBigint, BigInt(500000000000), "int64 serialization failed");

    // Test number larger than 32 bit but less than 53 bit
    const large32BitNum = 0x1_0000_0001; // Just over 32 bits
    bytes = zserialize(large32BitNum, ZS.number(NumberFormat.Int64));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Int64), bytes);
    assertEquals(deserializedNum, large32BitNum, "large number (>32bit) serialization failed");

    // Test that deserializing number larger than 53 bit throws error
    const tooLargeNum = 9876543210123456789n; // Larger than 53 bits and less than 64 bits
    assert(tooLargeNum > BigInt(Number.MAX_SAFE_INTEGER), "number is not larger than 53 bits");
    assert(tooLargeNum < BigInt(2) ** BigInt(64), "number is not less than 2^64");

    let threw = false;
    bytes = zserialize(tooLargeNum, ZS.bigint(BigIntFormat.Uint64));
    try {
        deserializedBigint = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
        assertEquals(deserializedBigint, tooLargeNum, "large number (>53bit) serialization failed");
        deserializedNum = zdeserialize(ZD.number(NumberFormat.Uint64), bytes);
    } catch (e) {
        threw = true;
        assert(e instanceof Error && e.message.includes("exceeds the safe range"), 
               "wrong error message for large number deserialization");
    }
    assert(threw, `deserialized value ${deserializedNum} instead of throwing exception on attempt to deserialize ${tooLargeNum} into number`);

    // Float tests
    bytes = zserialize(0.5, ZS.number(NumberFormat.Float32));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Float32), bytes);
    assert(Math.abs(0.5 - deserializedNum) < 0.0001, "float32 serialization failed");

    bytes = zserialize(123.45, ZS.number(NumberFormat.Float64));
    deserializedNum = zdeserialize(ZD.number(NumberFormat.Float64), bytes);
    assert(Math.abs(123.45 - deserializedNum) < 0.0001, "float64 serialization failed");

    // Boolean tests
    bytes = zserialize(true, ZS.boolean());
    let deserializedBool = zdeserialize(ZD.boolean(), bytes);
    assertEquals(deserializedBool, true, "boolean true serialization failed");

    bytes = zserialize(false, ZS.boolean());
    deserializedBool = zdeserialize(ZD.boolean(), bytes);
    assertEquals(deserializedBool, false, "boolean false serialization failed");
});

Deno.test("Serialization - Tuple", () => {
    // Test homogeneous number array/tuple
    const numTuple = [0.5, 1.0, 2.0];
    const numBytes = zserialize(numTuple, ZS.array(ZS.number()));
    const numResult = zdeserialize(ZD.array(ZD.number()), numBytes);
    assertEquals(numResult, numTuple, "number tuple serialization failed");

    // Test homogeneous string array/tuple
    const strTuple = ["abc", "def", "hij"];
    const strBytes = zserialize(strTuple, ZS.array(ZS.string()));
    const strResult = zdeserialize(ZD.array(ZD.string()), strBytes);
    assertEquals(strResult, strTuple, "string tuple serialization failed");

    // Test nested array
    const nestedArray = [[1, 2, 3], [4, 5, 6]];
    const nestedBytes = zserialize(nestedArray, ZS.array(ZS.array(ZS.number())));
    const nestedResult = zdeserialize(ZD.array(ZD.array(ZD.number())), nestedBytes);
    assertEquals(nestedResult, nestedArray, "nested array serialization failed");
});

Deno.test("Serialization - Container", () => {
    // Test string
    const str = "abcdefg";
    assertEquals(zdeserialize(ZD.string(), zserialize(str)), str, "string serialization failed");

    // Test array of floats - using tolerance for float comparison
    const floats = [0.1, 0.2, -0.5, 1000.578];
    const floatBytes = zserialize(floats, ZS.array(ZS.number(NumberFormat.Float32)));
    const floatResult = zdeserialize(ZD.array(ZD.number(NumberFormat.Float32)), floatBytes);
    assert(floatResult.every((val, idx) => Math.abs(val - floats[idx]) < 0.0001), 
           "array of floats serialization failed");

    // Test Set conversion to/from array
    const set = new Set([1, 2, 3, -5, 10000, -999999999]);
    const setBytes = zserialize(Array.from(set));
    const setResult = new Set(zdeserialize(ZD.array(ZD.number()), setBytes));
    assertEquals(setResult, set, "set serialization failed");

    // Test fixed size array
    const fixedArray = [1, 2, 3, -5, 5, -500];
    const fixedArrayBytes = zserialize(fixedArray);
    const fixedArrayResult = zdeserialize(ZD.array(ZD.number()), fixedArrayBytes);
    assertEquals(fixedArrayResult, fixedArray, "fixed size array serialization failed");

    // Test Map
    const map = new Map<number, string>();
    map.set(100, "abc");
    map.set(10000, "def");
    map.set(2000000000, "hij");
    const mapBytes = zserialize(map);
    const mapResult = zdeserialize(ZD.map(ZD.number(), ZD.string()), mapBytes);
    assertEquals(mapResult, map, "map serialization failed");
});

Deno.test("Serialization - Custom", () => {
    const original = new CustomStruct([0.1, 0.2, -1000.55], 32, "test");
    const bytes = zserialize(original);
    const result = zdeserialize(ZD.object(CustomStruct), bytes);
    
    // Compare all fields
    assertEquals(result.vd, original.vd, "CustomStruct.vd serialization failed");
    assertEquals(result.i, original.i, "CustomStruct.i serialization failed");
    assertEquals(result.s, original.s, "CustomStruct.s serialization failed");
});

Deno.test("Serialization - Binary Format", () => {
    // Test specific binary formats
    const int32Tests = [1234566, -49245];
    for (const val of int32Tests) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int32));
        const result = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
        assertEquals(result, val, "int32 serialization failed");
    }

    // Test string encoding
    const str = "test";
    const singleStrBytes = zserialize(str);
    const singleStrResult = zdeserialize(ZD.string(), singleStrBytes);
    assertEquals(singleStrResult, str, "string serialization failed");

    // Test numbers and string separately since TypeScript arrays must be homogeneous
    const num1 = 500;
    const num2 = 1234.0;
    const testStr = "test";
    
    const bytes1 = zserialize(num1, ZS.number());
    const bytes2 = zserialize(num2, ZS.number());
    const bytes3 = zserialize(testStr, ZS.string());

    assertEquals(zdeserialize(ZD.number(), bytes1), num1, "number serialization failed");
    assertEquals(zdeserialize(ZD.number(), bytes2), num2, "number serialization failed");
    assertEquals(zdeserialize(ZD.string(), bytes3), testStr, "string serialization failed");

    // Test array of int64
    const int64Array = [-100n, 500n, 100000n, -20000000n];
    const int64Bytes = zserialize(int64Array, ZS.array(ZS.bigint()));
    const int64Result = zdeserialize(ZD.array(ZD.bigint()), int64Bytes);
    assertEquals(int64Result, int64Array, "array of int64 serialization failed");

    // Test array of string-number pairs as two separate arrays
    const numbers = [10, -10000];
    const strings = ["s1", "s2"];
    
    const arrayNumBytes = zserialize(numbers, ZS.array(ZS.number()));
    const arrayStrBytes = zserialize(strings, ZS.array(ZS.string()));
    
    const numResult = zdeserialize(ZD.array(ZD.number()), arrayNumBytes);
    const strResult = zdeserialize(ZD.array(ZD.string()), arrayStrBytes);
    
    assertEquals(numResult, numbers, "number array serialization failed");
    assertEquals(strResult, strings, "string array serialization failed");
});

Deno.test("Serialization - TypedArrays", () => {
    // Test Uint16Array
    const uint16Data = new Uint16Array([100, 200, 300, 40000]);
    const uint16Bytes = zserialize(uint16Data, ZS.uint16array());
    const uint16Result = zdeserialize(ZD.uint16array(), uint16Bytes);
    assert(uint16Result instanceof Uint16Array, "Result should be Uint16Array");
    assertEquals(
        Array.from(uint16Result), 
        Array.from(uint16Data),
        "Uint16Array serialization failed"
    );

    // Test Uint32Array
    const uint32Data = new Uint32Array([100000, 200000, 300000, 4000000000]);
    const uint32Bytes = zserialize(uint32Data, ZS.uint32array());
    const uint32Result = zdeserialize(ZD.uint32array(), uint32Bytes);
    assert(uint32Result instanceof Uint32Array, "Result should be Uint32Array");
    assertEquals(
        Array.from(uint32Result), 
        Array.from(uint32Data),
        "Uint32Array serialization failed"
    );
    
    // Test Int16Array
    const int16Data = new Int16Array([100, -200, 300, -30000]);
    const int16Bytes = zserialize(int16Data, ZS.int16array());
    const int16Result = zdeserialize(ZD.int16array(), int16Bytes);
    assert(int16Result instanceof Int16Array, "Result should be Int16Array");
    assertEquals(
        Array.from(int16Result), 
        Array.from(int16Data),
        "Int16Array serialization failed"
    );
    
    // Test Int32Array
    const int32Data = new Int32Array([100000, -200000, 300000, -2000000000]);
    const int32Bytes = zserialize(int32Data, ZS.int32array());
    const int32Result = zdeserialize(ZD.int32array(), int32Bytes);
    assert(int32Result instanceof Int32Array, "Result should be Int32Array");
    assertEquals(
        Array.from(int32Result), 
        Array.from(int32Data),
        "Int32Array serialization failed"
    );
    
    // Test BigUint64Array
    const bigUint64Data = new BigUint64Array([
        100000n, 
        200000n, 
        300000n, 
        4000000000n
    ]);
    const bigUint64Bytes = zserialize(bigUint64Data, ZS.biguint64array());
    const bigUint64Result = zdeserialize(ZD.biguint64array(), bigUint64Bytes);
    assert(bigUint64Result instanceof BigUint64Array, "Result should be BigUint64Array");
    assertEquals(
        Array.from(bigUint64Result), 
        Array.from(bigUint64Data),
        "BigUint64Array serialization failed"
    );
    
    // Test BigInt64Array
    const bigInt64Data = new BigInt64Array([
        100000n, 
        -200000n, 
        300000n, 
        -2000000000n
    ]);
    const bigInt64Bytes = zserialize(bigInt64Data, ZS.bigint64array());
    const bigInt64Result = zdeserialize(ZD.bigint64array(), bigInt64Bytes);
    assert(bigInt64Result instanceof BigInt64Array, "Result should be BigInt64Array");
    assertEquals(
        Array.from(bigInt64Result), 
        Array.from(bigInt64Data),
        "BigInt64Array serialization failed"
    );
    
    // Test Float32Array
    const float32Data = new Float32Array([1.5, -2.25, 3.75, -4.125]);
    const float32Bytes = zserialize(float32Data, ZS.float32array());
    const float32Result = zdeserialize(ZD.float32array(), float32Bytes);
    assert(float32Result instanceof Float32Array, "Result should be Float32Array");
    assert(
        Array.from(float32Result).every((val, idx) => 
            Math.abs(val - float32Data[idx]) < 0.0001),
        "Float32Array serialization failed"
    );
    
    // Test Float64Array
    const float64Data = new Float64Array([1.12345, -2.34567, 3.45678, -4.56789]);
    const float64Bytes = zserialize(float64Data, ZS.float64array());
    const float64Result = zdeserialize(ZD.float64array(), float64Bytes);
    assert(float64Result instanceof Float64Array, "Result should be Float64Array");
    assert(
        Array.from(float64Result).every((val, idx) => 
            Math.abs(val - float64Data[idx]) < 0.0001),
        "Float64Array serialization failed"
    );
});

Deno.test("Serialization - TypedArray Auto Detection", () => {
    // Test auto detection for Uint16Array
    const uint16Data = new Uint16Array([100, 200, 300, 40000]);
    const uint16Bytes = zserialize(uint16Data); // No explicit serializer tag
    const uint16Result = zdeserialize(ZD.uint16array(), uint16Bytes);
    assert(uint16Result instanceof Uint16Array, "Result should be Uint16Array");
    assertEquals(
        Array.from(uint16Result), 
        Array.from(uint16Data),
        "Auto-detected Uint16Array serialization failed"
    );

    // Test auto detection for Uint32Array
    const uint32Data = new Uint32Array([100000, 200000, 300000, 4000000000]);
    const uint32Bytes = zserialize(uint32Data); // No explicit serializer tag
    const uint32Result = zdeserialize(ZD.uint32array(), uint32Bytes);
    assert(uint32Result instanceof Uint32Array, "Result should be Uint32Array");
    assertEquals(
        Array.from(uint32Result), 
        Array.from(uint32Data),
        "Auto-detected Uint32Array serialization failed"
    );
    
    // Test auto detection for Int16Array
    const int16Data = new Int16Array([100, -200, 300, -30000]);
    const int16Bytes = zserialize(int16Data); // No explicit serializer tag
    const int16Result = zdeserialize(ZD.int16array(), int16Bytes);
    assert(int16Result instanceof Int16Array, "Result should be Int16Array");
    assertEquals(
        Array.from(int16Result), 
        Array.from(int16Data),
        "Auto-detected Int16Array serialization failed"
    );
    
    // Test auto detection for Int32Array
    const int32Data = new Int32Array([100000, -200000, 300000, -2000000000]);
    const int32Bytes = zserialize(int32Data); // No explicit serializer tag
    const int32Result = zdeserialize(ZD.int32array(), int32Bytes);
    assert(int32Result instanceof Int32Array, "Result should be Int32Array");
    assertEquals(
        Array.from(int32Result), 
        Array.from(int32Data),
        "Auto-detected Int32Array serialization failed"
    );
    
    // Test auto detection for BigUint64Array
    const bigUint64Data = new BigUint64Array([100000n, 200000n, 300000n, 4000000000n]);
    const bigUint64Bytes = zserialize(bigUint64Data); // No explicit serializer tag
    const bigUint64Result = zdeserialize(ZD.biguint64array(), bigUint64Bytes);
    assert(bigUint64Result instanceof BigUint64Array, "Result should be BigUint64Array");
    assertEquals(
        Array.from(bigUint64Result), 
        Array.from(bigUint64Data),
        "Auto-detected BigUint64Array serialization failed"
    );
    
    // Test auto detection for BigInt64Array
    const bigInt64Data = new BigInt64Array([100000n, -200000n, 300000n, -2000000000n]);
    const bigInt64Bytes = zserialize(bigInt64Data); // No explicit serializer tag
    const bigInt64Result = zdeserialize(ZD.bigint64array(), bigInt64Bytes);
    assert(bigInt64Result instanceof BigInt64Array, "Result should be BigInt64Array");
    assertEquals(
        Array.from(bigInt64Result), 
        Array.from(bigInt64Data),
        "Auto-detected BigInt64Array serialization failed"
    );
    
    // Test auto detection for Float32Array
    const float32Data = new Float32Array([1.5, -2.25, 3.75, -4.125]);
    const float32Bytes = zserialize(float32Data); // No explicit serializer tag
    const float32Result = zdeserialize(ZD.float32array(), float32Bytes);
    assert(float32Result instanceof Float32Array, "Result should be Float32Array");
    assert(
        Array.from(float32Result).every((val, idx) => 
            Math.abs(val - float32Data[idx]) < 0.0001),
        "Auto-detected Float32Array serialization failed"
    );
    
    // Test auto detection for Float64Array
    const float64Data = new Float64Array([1.12345, -2.34567, 3.45678, -4.56789]);
    const float64Bytes = zserialize(float64Data); // No explicit serializer tag
    const float64Result = zdeserialize(ZD.float64array(), float64Bytes);
    assert(float64Result instanceof Float64Array, "Result should be Float64Array");
    assert(
        Array.from(float64Result).every((val, idx) => 
            Math.abs(val - float64Data[idx]) < 0.0001),
        "Auto-detected Float64Array serialization failed"
    );
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
                assert(
                    Array.from(resultValue).every((val, idx) => 
                        Math.abs(val - value[idx]) < 0.0001),
                    "Map value mismatch"
                );
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
    
    // Custom serialization/deserialization for the mixed collection
    class MixedCollection implements ZSerializeable, ZDeserializeable {
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
    
    const mixed = new MixedCollection(
        mixedCollection.uint16,
        mixedCollection.int32,
        mixedCollection.float64
    );
    
    const mixedBytes = zserialize(mixed);
    const mixedResult = zdeserialize(ZD.object(MixedCollection), mixedBytes);
    
    assert(mixedResult instanceof MixedCollection, "Result should be a MixedCollection");
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
        Array.from(mixedResult.float64).every((val, idx) => 
            Math.abs(val - mixedCollection.float64[idx]) < 0.0001),
        "float64 mismatch"
    );
});