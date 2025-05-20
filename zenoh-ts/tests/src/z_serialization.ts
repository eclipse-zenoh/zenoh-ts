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
    let deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint8), bytes);
    assertEquals(deserialized_num, 5, "uint8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Uint16));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint16), bytes);
    assertEquals(deserialized_num, 500, "uint16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Uint32));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint32), bytes);
    assertEquals(deserialized_num, 50000, "uint32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Uint64));
    let deserialized_bigint = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
    assertEquals(deserialized_bigint, BigInt(500000000000), "uint64 serialization failed");

    // Int tests
    bytes = zserialize(-5, ZS.number(NumberFormat.Int8));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int8), bytes);
    assertEquals(deserialized_num, -5, "int8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Int16));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int16), bytes);
    assertEquals(deserialized_num, 500, "int16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Int32));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
    assertEquals(deserialized_num, 50000, "int32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Int64));
    deserialized_bigint = zdeserialize(ZD.bigint(BigIntFormat.Int64), bytes);
    assertEquals(deserialized_bigint, BigInt(500000000000), "int64 serialization failed");

    // Test number larger than 32 bit but less than 53 bit
    const large32BitNum = 0x1_0000_0001; // Just over 32 bits
    bytes = zserialize(large32BitNum, ZS.number(NumberFormat.Int64));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int64), bytes);
    assertEquals(deserialized_num, large32BitNum, "large number (>32bit) serialization failed");

    // Test that deserializing number larger than 53 bit throws error
    const tooLargeNum = 9876543210123456789n; // Larger than 53 bits and less than 64 bits
    assert(tooLargeNum > BigInt(Number.MAX_SAFE_INTEGER), "number is not larger than 53 bits");
    assert(tooLargeNum < BigInt(2) ** BigInt(64), "number is not less than 2^64");

    let threw = false;
    bytes = zserialize(tooLargeNum, ZS.bigint(BigIntFormat.Uint64));
    try {
        deserialized_bigint = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
        assertEquals(deserialized_bigint, tooLargeNum, "large number (>53bit) serialization failed");
        deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint64), bytes);
    } catch (e) {
        threw = true;
        assert(e instanceof Error && e.message.includes("exceeds the safe range"), 
               "wrong error message for large number deserialization");
    }
    assert(threw, `deserialized value ${deserialized_num} instead of throwing exception on attempt to deserialize ${tooLargeNum} into number`);

    // Float tests
    bytes = zserialize(0.5, ZS.number(NumberFormat.Float32));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Float32), bytes);
    assert(Math.abs(0.5 - deserialized_num) < 0.0001, "float32 serialization failed");

    bytes = zserialize(123.45, ZS.number(NumberFormat.Float64));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Float64), bytes);
    assert(Math.abs(123.45 - deserialized_num) < 0.0001, "float64 serialization failed");

    // Boolean tests
    bytes = zserialize(true, ZS.boolean());
    let deserialized_bool = zdeserialize(ZD.boolean(), bytes);
    assertEquals(deserialized_bool, true, "boolean true serialization failed");

    bytes = zserialize(false, ZS.boolean());
    deserialized_bool = zdeserialize(ZD.boolean(), bytes);
    assertEquals(deserialized_bool, false, "boolean false serialization failed");
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