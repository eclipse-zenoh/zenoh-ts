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

import { ZBytesSerializer, ZBytesDeserializer, ZSerializeable, ZDeserializeable, zserialize, zdeserialize, NumberFormat, BigIntFormat, ZS, ZD } from "@eclipse-zenoh/zenoh-ts/ext";
import { ZenohId, ZBytes } from "@eclipse-zenoh/zenoh-ts";
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

Deno.test("Serialization - Comprehensive Array Tests", () => {
    // Test arrays of all numeric types
    const uint8Array = [0, 127, 255];
    const uint8Bytes = zserialize(uint8Array, ZS.array(ZS.number(NumberFormat.Uint8)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Uint8)), uint8Bytes), uint8Array, "uint8 array serialization failed");

    const int8Array = [-128, 0, 127];
    const int8Bytes = zserialize(int8Array, ZS.array(ZS.number(NumberFormat.Int8)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Int8)), int8Bytes), int8Array, "int8 array serialization failed");

    const uint16Array = [0, 32767, 65535];
    const uint16Bytes = zserialize(uint16Array, ZS.array(ZS.number(NumberFormat.Uint16)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Uint16)), uint16Bytes), uint16Array, "uint16 array serialization failed");

    const int16Array = [-32768, 0, 32767];
    const int16Bytes = zserialize(int16Array, ZS.array(ZS.number(NumberFormat.Int16)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Int16)), int16Bytes), int16Array, "int16 array serialization failed");

    const uint32Array = [0, 2147483647, 4294967295];
    const uint32Bytes = zserialize(uint32Array, ZS.array(ZS.number(NumberFormat.Uint32)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Uint32)), uint32Bytes), uint32Array, "uint32 array serialization failed");

    const int32Array = [-2147483648, 0, 2147483647];
    const int32Bytes = zserialize(int32Array, ZS.array(ZS.number(NumberFormat.Int32)));
    assertEquals(zdeserialize(ZD.array(ZD.number(NumberFormat.Int32)), int32Bytes), int32Array, "int32 array serialization failed");

    // Test array of float32 with tolerance check
    const float32Array = [-3.14, 0, 3.14, 1e-7, 1e7];
    const float32Bytes = zserialize(float32Array, ZS.array(ZS.number(NumberFormat.Float32)));
    const float32Result = zdeserialize(ZD.array(ZD.number(NumberFormat.Float32)), float32Bytes);
    assert(float32Result.every((val, idx) => Math.abs(val - float32Array[idx]) < 0.0001), 
           "float32 array serialization failed");

    // Test array of float64 with tolerance check
    const float64Array = [-3.14159265359, 0, 3.14159265359, 1e-15, 1e15];
    const float64Bytes = zserialize(float64Array, ZS.array(ZS.number(NumberFormat.Float64)));
    const float64Result = zdeserialize(ZD.array(ZD.number(NumberFormat.Float64)), float64Bytes);
    assert(float64Result.every((val, idx) => Math.abs(val - float64Array[idx]) < 0.000000001), 
           "float64 array serialization failed");

    // Test array of bigints (uint64 and int64)
    const uint64Array = [0n, 9007199254740991n, 18446744073709551615n];
    const uint64Bytes = zserialize(uint64Array, ZS.array(ZS.bigint(BigIntFormat.Uint64)));
    assertEquals(zdeserialize(ZD.array(ZD.bigint(BigIntFormat.Uint64)), uint64Bytes), uint64Array, "uint64 array serialization failed");

    const int64Array = [-9223372036854775808n, 0n, 9223372036854775807n];
    const int64Bytes = zserialize(int64Array, ZS.array(ZS.bigint(BigIntFormat.Int64)));
    assertEquals(zdeserialize(ZD.array(ZD.bigint(BigIntFormat.Int64)), int64Bytes), int64Array, "int64 array serialization failed");

    // Test array of booleans
    const boolArray = [true, false, true, false, true];
    const boolBytes = zserialize(boolArray, ZS.array(ZS.boolean()));
    assertEquals(zdeserialize(ZD.array(ZD.boolean()), boolBytes), boolArray, "boolean array serialization failed");

    // Test array of custom objects
    const customArray = [
        new CustomStruct([1.1, 2.2], 1, "first"),
        new CustomStruct([3.3, 4.4], 2, "second"),
        new CustomStruct([5.5, 6.6], 3, "third")
    ];
    const customBytes = zserialize(customArray);
    const customResult = zdeserialize(ZD.array(ZD.object(CustomStruct)), customBytes) as CustomStruct[];
    
    // Compare each custom object in the array
    assertEquals(customResult.length, customArray.length, "custom object array length mismatch");
    for (let i = 0; i < customArray.length; i++) {
        assertEquals(customResult[i].vd, customArray[i].vd, `CustomStruct[${i}].vd serialization failed`);
        assertEquals(customResult[i].i, customArray[i].i, `CustomStruct[${i}].i serialization failed`);
        assertEquals(customResult[i].s, customArray[i].s, `CustomStruct[${i}].s serialization failed`);
    }

    // Test empty arrays
    const emptyNumArray: number[] = [];
    const emptyBytes = zserialize(emptyNumArray, ZS.array(ZS.number()));
    assertEquals(zdeserialize(ZD.array(ZD.number()), emptyBytes), emptyNumArray, "empty array serialization failed");
});

Deno.test("Serialization - TypedArrays", () => {
    // Test TypedArray serialization
    const uint8Array = new Uint8Array([0, 127, 255]);
    const uint8Bytes = zserialize(uint8Array);
    assertEquals(new Uint8Array(zdeserialize(ZD.uint8array(), uint8Bytes)), uint8Array, "Uint8Array serialization failed");

    const int8Array = new Int8Array([-128, 0, 127]);
    const int8Bytes = zserialize(int8Array);
    assertEquals(new Int8Array(zdeserialize(ZD.int8array(), int8Bytes)), int8Array, "Int8Array serialization failed");

    const uint16Array = new Uint16Array([0, 32767, 65535]);
    const uint16Bytes = zserialize(uint16Array);
    assertEquals(new Uint16Array(zdeserialize(ZD.uint16array(), uint16Bytes)), uint16Array, "Uint16Array serialization failed");

    const int16Array = new Int16Array([-32768, 0, 32767]);
    const int16Bytes = zserialize(int16Array);
    assertEquals(new Int16Array(zdeserialize(ZD.int16array(), int16Bytes)), int16Array, "Int16Array serialization failed");

    const uint32Array = new Uint32Array([0, 2147483647, 4294967295]);
    const uint32Bytes = zserialize(uint32Array);
    assertEquals(new Uint32Array(zdeserialize(ZD.uint32array(), uint32Bytes)), uint32Array, "Uint32Array serialization failed");

    const int32Array = new Int32Array([-2147483648, 0, 2147483647]);
    const int32Bytes = zserialize(int32Array);
    assertEquals(new Int32Array(zdeserialize(ZD.int32array(), int32Bytes)), int32Array, "Int32Array serialization failed");

    const float32Array = new Float32Array([-3.14, 0, 3.14, 1e-7, 1e7]);
    const float32Bytes = zserialize(float32Array);
    assertEquals(new Float32Array(zdeserialize(ZD.float32array(), float32Bytes)), float32Array, "Float32Array serialization failed");

    const float64Array = new Float64Array([-3.14159265359, 0, 3.14159265359, 1e-15, 1e15]);
    const float64Bytes = zserialize(float64Array);
    assertEquals(new Float64Array(zdeserialize(ZD.float64array(), float64Bytes)), float64Array, "Float64Array serialization failed");

    const bigUint64Array = new BigUint64Array([0n, 9007199254740991n, 18446744073709551615n]);
    const bigUint64Bytes = zserialize(bigUint64Array);
    assertEquals(new BigUint64Array(zdeserialize(ZD.biguint64array(), bigUint64Bytes)), bigUint64Array, "BigUint64Array serialization failed");

    const bigInt64Array = new BigInt64Array([-9223372036854775808n, 0n, 9223372036854775807n]);
    const bigInt64Bytes = zserialize(bigInt64Array);
    assertEquals(new BigInt64Array(zdeserialize(ZD.bigint64array(), bigInt64Bytes)), bigInt64Array, "BigInt64Array serialization failed");
});

Deno.test("Serialization - Binary Format Equivalence", () => {
    // Test that Uint8Array and array of Uint8 produce the same binary format
    const regularUint8Array = [0, 127, 255];
    const typedUint8Array = new Uint8Array(regularUint8Array);
    const regularBytes = zserialize(regularUint8Array, ZS.array(ZS.number(NumberFormat.Uint8)));
    const typedBytes = zserialize(typedUint8Array);
    assertEquals(typedBytes, regularBytes, "Uint8Array and array<Uint8> should produce same binary format");

    // Test that Int8Array and array of Int8 produce the same binary format
    const regularInt8Array = [-128, 0, 127];
    const typedInt8Array = new Int8Array(regularInt8Array);
    const regularInt8Bytes = zserialize(regularInt8Array, ZS.array(ZS.number(NumberFormat.Int8)));
    const typedInt8Bytes = zserialize(typedInt8Array);
    assertEquals(typedInt8Bytes, regularInt8Bytes, "Int8Array and array<Int8> should produce same binary format");

    // Test that Uint16Array and array of Uint16 produce the same binary format
    const regularUint16Array = [0, 32767, 65535];
    const typedUint16Array = new Uint16Array(regularUint16Array);
    const regularUint16Bytes = zserialize(regularUint16Array, ZS.array(ZS.number(NumberFormat.Uint16)));
    const typedUint16Bytes = zserialize(typedUint16Array);
    assertEquals(typedUint16Bytes, regularUint16Bytes, "Uint16Array and array<Uint16> should produce same binary format");

    // Test that Int16Array and array of Int16 produce the same binary format
    const regularInt16Array = [-32768, 0, 32767];
    const typedInt16Array = new Int16Array(regularInt16Array);
    const regularInt16Bytes = zserialize(regularInt16Array, ZS.array(ZS.number(NumberFormat.Int16)));
    const typedInt16Bytes = zserialize(typedInt16Array);
    assertEquals(typedInt16Bytes, regularInt16Bytes, "Int16Array and array<Int16> should produce same binary format");

    // Test that Uint32Array and array of Uint32 produce the same binary format
    const regularUint32Array = [0, 2147483647, 4294967295];
    const typedUint32Array = new Uint32Array(regularUint32Array);
    const regularUint32Bytes = zserialize(regularUint32Array, ZS.array(ZS.number(NumberFormat.Uint32)));
    const typedUint32Bytes = zserialize(typedUint32Array);
    assertEquals(typedUint32Bytes, regularUint32Bytes, "Uint32Array and array<Uint32> should produce same binary format");

    // Test that Int32Array and array of Int32 produce the same binary format
    const regularInt32Array = [-2147483648, 0, 2147483647];
    const typedInt32Array = new Int32Array(regularInt32Array);
    const regularInt32Bytes = zserialize(regularInt32Array, ZS.array(ZS.number(NumberFormat.Int32)));
    const typedInt32Bytes = zserialize(typedInt32Array);
    assertEquals(typedInt32Bytes, regularInt32Bytes, "Int32Array and array<Int32> should produce same binary format");

    // Test that Float32Array and array of Float32 produce the same binary format
    const regularFloat32Array = [-3.14, 0, 3.14, 1e-7, 1e7];
    const typedFloat32Array = new Float32Array(regularFloat32Array);
    const regularFloat32Bytes = zserialize(regularFloat32Array, ZS.array(ZS.number(NumberFormat.Float32)));
    const typedFloat32Bytes = zserialize(typedFloat32Array);
    assertEquals(typedFloat32Bytes, regularFloat32Bytes, "Float32Array and array<Float32> should produce same binary format");

    // Test that Float64Array and array of Float64 produce the same binary format
    const regularFloat64Array = [-3.14159265359, 0, 3.14159265359, 1e-15, 1e15];
    const typedFloat64Array = new Float64Array(regularFloat64Array);
    const regularFloat64Bytes = zserialize(regularFloat64Array, ZS.array(ZS.number(NumberFormat.Float64)));
    const typedFloat64Bytes = zserialize(typedFloat64Array);
    assertEquals(typedFloat64Bytes, regularFloat64Bytes, "Float64Array and array<Float64> should produce same binary format");

    // Test that Number arrays with Int64/Uint64 format (within safe integer limits) produce same binary format as BigInt arrays
    const regularInt64Array = [Number.MIN_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER];
    const typedInt64Array = new BigInt64Array(regularInt64Array.map(BigInt));
    const regularInt64Bytes = zserialize(regularInt64Array, ZS.array(ZS.number(NumberFormat.Int64)));
    const typedInt64Bytes = zserialize(typedInt64Array);
    assertEquals(typedInt64Bytes, regularInt64Bytes, "Int64Array and array<Int64> should produce same binary format");

    const regularUint64Array = [0, 1000000, Number.MAX_SAFE_INTEGER];
    const typedUint64Array = new BigUint64Array(regularUint64Array.map(BigInt));
    const regularUint64Bytes = zserialize(regularUint64Array, ZS.array(ZS.number(NumberFormat.Uint64)));
    const typedUint64Bytes = zserialize(typedUint64Array);
    assertEquals(typedUint64Bytes, regularUint64Bytes, "Uint64Array and array<Uint64> should produce same binary format");
});

Deno.test("Serialization - ZenohId", () => {
    // Create a ZenohId with known bytes (16 bytes)
    const testBytes = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10
    ]);
    const zenohId = new ZenohId(testBytes);
    
    // Serialize the ZenohId bytes
    const serialized = zserialize(zenohId.toLeBytes());
    
    // Deserialize back to Uint8Array
    const deserialized = zdeserialize(ZD.uint8array(), serialized);
    
    // Verify the bytes match
    assertEquals(deserialized, testBytes, "ZenohId serialization failed");
    
    // Verify we can create a ZenohId from deserialized bytes
    const reconstructedZenohId = new ZenohId(deserialized);
    assertEquals(reconstructedZenohId.toString(), zenohId.toString(), "ZenohId round-trip failed");
    
    // Test with a different ZenohId (all zeros)
    const zeroBytes = new Uint8Array(16).fill(0);
    const zeroZenohId = new ZenohId(zeroBytes);
    const serializedZero = zserialize(zeroZenohId.toLeBytes());
    const deserializedZero = zdeserialize(ZD.uint8array(), serializedZero);
    assertEquals(deserializedZero, zeroBytes, "ZenohId (zeros) serialization failed");
    
    // Test with a different ZenohId (all 0xff)
    const maxBytes = new Uint8Array(16).fill(0xff);
    const maxZenohId = new ZenohId(maxBytes);
    const serializedMax = zserialize(maxZenohId.toLeBytes());
    const deserializedMax = zdeserialize(ZD.uint8array(), serializedMax);
    assertEquals(deserializedMax, maxBytes, "ZenohId (max) serialization failed");
});

Deno.test("Serialization - ZBytes with Empty Payload", () => {
    // Create an empty ZBytes instance using the empty() method from a dummy instance
    const dummy = new ZBytes("");
    const zbytes = dummy.empty();

    // Verify initial state with isEmpty() and len()
    assert(zbytes.isEmpty(), "ZBytes instance should be empty");
    assertEquals(zbytes.len(), 0, "ZBytes instance should have length 0");

    // Serialize the underlying buffer of the empty ZBytes
    const serialized = zserialize(zbytes.toBytes());

    // Deserialize back to a Uint8Array
    const deserializedBytes = zdeserialize(ZD.uint8array(), serialized);

    // Reconstruct ZBytes and verify
    const reconstructedZBytes = new ZBytes(deserializedBytes);
    assertEquals(reconstructedZBytes.toBytes(), zbytes.toBytes(), "ZBytes with empty payload round-trip serialization failed");
    assert(reconstructedZBytes.isEmpty(), "Reconstructed ZBytes should be empty");
    assertEquals(reconstructedZBytes.len(), 0, "Reconstructed ZBytes should have length 0");
});

Deno.test("Serialization - Large Data (ensureBuffer/resetBuffer)", () => {
    // Test with array large enough to trigger ensureBuffer and resetBuffer
    // Default buffer size is 256 bytes, so we need arrays that exceed this
    
    // Test large array of numbers (each Float64 is 8 bytes)
    // Create array with 100 elements = 800 bytes + overhead > 256 bytes
    const largeNumArray = Array.from({ length: 100 }, (_, i) => i * 1.5);
    const largeNumBytes = zserialize(largeNumArray, ZS.array(ZS.number(NumberFormat.Float64)));
    const largeNumResult = zdeserialize(ZD.array(ZD.number(NumberFormat.Float64)), largeNumBytes);
    assertEquals(largeNumResult, largeNumArray, "large number array serialization failed");

    // Test large string (each character is at least 1 byte)
    // Create string with 500 characters > 256 bytes
    const largeString = "a".repeat(500);
    const largeStringBytes = zserialize(largeString);
    const largeStringResult = zdeserialize(ZD.string(), largeStringBytes);
    assertEquals(largeStringResult, largeString, "large string serialization failed");

    // Test very large array of strings
    // 100 strings of 20 chars each = 2000+ bytes
    const largeStringArray = Array.from({ length: 100 }, (_, i) => `string_${i}_${"x".repeat(15)}`);
    const largeStringArrayBytes = zserialize(largeStringArray, ZS.array(ZS.string()));
    const largeStringArrayResult = zdeserialize(ZD.array(ZD.string()), largeStringArrayBytes);
    assertEquals(largeStringArrayResult, largeStringArray, "large string array serialization failed");

    // Test large Int32Array (4 bytes each)
    // 200 elements = 800 bytes > 256 bytes
    const largeInt32Array = new Int32Array(Array.from({ length: 200 }, (_, i) => i - 100));
    const largeInt32Bytes = zserialize(largeInt32Array);
    const largeInt32Result = zdeserialize(ZD.int32array(), largeInt32Bytes);
    assertEquals(new Int32Array(largeInt32Result), largeInt32Array, "large Int32Array serialization failed");

    // Test large nested array
    // 50 subarrays with 10 elements each = 500 numbers = 4000+ bytes
    const largeNestedArray = Array.from({ length: 50 }, (_, i) => 
        Array.from({ length: 10 }, (_, j) => i * 10 + j)
    );
    const largeNestedBytes = zserialize(largeNestedArray, ZS.array(ZS.array(ZS.number())));
    const largeNestedResult = zdeserialize(ZD.array(ZD.array(ZD.number())), largeNestedBytes);
    assertEquals(largeNestedResult, largeNestedArray, "large nested array serialization failed");

    // Test large map (to trigger multiple buffer operations)
    // 150 entries with string keys and values
    const largeMap = new Map<string, string>();
    for (let i = 0; i < 150; i++) {
        largeMap.set(`key_${i}`, `value_${i}_${"data".repeat(5)}`);
    }
    const largeMapBytes = zserialize(largeMap);
    const largeMapResult = zdeserialize(ZD.map(ZD.string(), ZD.string()), largeMapBytes);
    assertEquals(largeMapResult, largeMap, "large map serialization failed");

    // Test large array of custom objects
    const largeCustomArray = Array.from({ length: 50 }, (_, i) => 
        new CustomStruct(
            Array.from({ length: 10 }, (_, j) => (i * 10 + j) * 0.5),
            i,
            `custom_object_${i}_${"x".repeat(20)}`
        )
    );
    const largeCustomBytes = zserialize(largeCustomArray);
    const largeCustomResult = zdeserialize(ZD.array(ZD.object(CustomStruct)), largeCustomBytes) as CustomStruct[];
    
    assertEquals(largeCustomResult.length, largeCustomArray.length, "large custom array length mismatch");
    for (let i = 0; i < largeCustomArray.length; i++) {
        assertEquals(largeCustomResult[i].vd, largeCustomArray[i].vd, `large custom array [${i}].vd failed`);
        assertEquals(largeCustomResult[i].i, largeCustomArray[i].i, `large custom array [${i}].i failed`);
        assertEquals(largeCustomResult[i].s, largeCustomArray[i].s, `large custom array [${i}].s failed`);
    }

    // Test extremely large typed array to stress test buffer management
    // 1000 Float64 values = 8000 bytes
    const veryLargeFloat64Array = new Float64Array(Array.from({ length: 1000 }, (_, i) => i * Math.PI));
    const veryLargeFloat64Bytes = zserialize(veryLargeFloat64Array);
    const veryLargeFloat64Result = zdeserialize(ZD.float64array(), veryLargeFloat64Bytes);
    assertEquals(new Float64Array(veryLargeFloat64Result), veryLargeFloat64Array, "very large Float64Array serialization failed");
});
