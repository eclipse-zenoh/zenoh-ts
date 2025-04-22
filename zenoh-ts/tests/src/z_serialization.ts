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
import { assert, assert_eq } from "./common/assertions.ts";

class CustomStruct implements ZSerializeable, ZDeserializeable {
    constructor(
        public vd: number[] = [],
        public i: number = 0,
        public s: string = ""
    ) {}

    serialize_with_zserializer(serializer: ZBytesSerializer): void {
        serializer.serialize(this.vd, ZS.array(ZS.number()));
        serializer.serialize(this.i, ZS.number(NumberFormat.Int32));
        serializer.serialize(this.s, ZS.string());
    }

    deserialize_with_zdeserializer(deserializer: ZBytesDeserializer): void {
        this.vd = deserializer.deserialize(ZD.array(ZD.number()));
        this.i = deserializer.deserialize(ZD.number(NumberFormat.Int32));
        this.s = deserializer.deserialize(ZD.string());
    }
}

export async function testSerializePrimitive() {
    // Uint tests
    let bytes = zserialize(5, ZS.number(NumberFormat.Uint8));
    let deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint8), bytes);
    assert_eq(deserialized_num, 5, "uint8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Uint16));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint16), bytes);
    assert_eq(deserialized_num, 500, "uint16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Uint32));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Uint32), bytes);
    assert_eq(deserialized_num, 50000, "uint32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Uint64));
    let deserialized_bigint = zdeserialize(ZD.bigint(BigIntFormat.Uint64), bytes);
    assert_eq(deserialized_bigint, BigInt(500000000000), "uint64 serialization failed");

    // Int tests
    bytes = zserialize(-5, ZS.number(NumberFormat.Int8));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int8), bytes);
    assert_eq(deserialized_num, -5, "int8 serialization failed");

    bytes = zserialize(500, ZS.number(NumberFormat.Int16));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int16), bytes);
    assert_eq(deserialized_num, 500, "int16 serialization failed");

    bytes = zserialize(50000, ZS.number(NumberFormat.Int32));
    deserialized_num = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
    assert_eq(deserialized_num, 50000, "int32 serialization failed");

    bytes = zserialize(BigInt(500000000000), ZS.bigint(BigIntFormat.Int64));
    deserialized_bigint = zdeserialize(ZD.bigint(BigIntFormat.Int64), bytes);
    assert_eq(deserialized_bigint, BigInt(500000000000), "int64 serialization failed");

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
    assert_eq(deserialized_bool, true, "boolean true serialization failed");

    bytes = zserialize(false, ZS.boolean());
    deserialized_bool = zdeserialize(ZD.boolean(), bytes);
    assert_eq(deserialized_bool, false, "boolean false serialization failed");
}

export async function testSerializeTuple() {
    // Test homogeneous number array/tuple
    const numTuple = [0.5, 1.0, 2.0];
    const numBytes = zserialize(numTuple, ZS.array(ZS.number()));
    const numResult = zdeserialize(ZD.array(ZD.number()), numBytes);
    assert_eq(numResult, numTuple, "number tuple serialization failed");

    // Test homogeneous string array/tuple
    const strTuple = ["abc", "def", "hij"];
    const strBytes = zserialize(strTuple, ZS.array(ZS.string()));
    const strResult = zdeserialize(ZD.array(ZD.string()), strBytes);
    assert_eq(strResult, strTuple, "string tuple serialization failed");

    // Test nested array
    const nestedArray = [[1, 2, 3], [4, 5, 6]];
    const nestedBytes = zserialize(nestedArray, ZS.array(ZS.array(ZS.number())));
    const nestedResult = zdeserialize(ZD.array(ZD.array(ZD.number())), nestedBytes);
    assert_eq(nestedResult, nestedArray, "nested array serialization failed");
}

export async function testSerializeContainer() {
    // Test string
    const str = "abcdefg";
    assert_eq(zdeserialize(ZD.string(), zserialize(str)), str, "string serialization failed");

    // Test array of floats - using tolerance for float comparison
    const floats = [0.1, 0.2, -0.5, 1000.578];
    const floatBytes = zserialize(floats, ZS.array(ZS.number(NumberFormat.Float32)));
    const floatResult = zdeserialize(ZD.array(ZD.number(NumberFormat.Float32)), floatBytes);
    assert(floatResult.every((val, idx) => Math.abs(val - floats[idx]) < 0.0001), 
           "array of floats serialization failed");

    // Test Set conversion to/from array
    const set = new Set([1, 2, 3, -5, 10000, -999999999]);
    const setArray = Array.from(set);
    const setBytes = zserialize(setArray);
    const setResult = new Set(zdeserialize(ZD.array(ZD.number()), setBytes));
    assert_eq(setResult, set, "set serialization failed");

    // Test fixed size array
    const fixedArray = [1, 2, 3, -5, 5, -500];
    const fixedArrayBytes = zserialize(fixedArray);
    const fixedArrayResult = zdeserialize(ZD.array(ZD.number()), fixedArrayBytes);
    assert_eq(fixedArrayResult, fixedArray, "fixed size array serialization failed");

    // Test Map
    const map = new Map<number, string>();
    map.set(100, "abc");
    map.set(10000, "def");
    map.set(2000000000, "hij");
    const mapBytes = zserialize(map);
    const mapResult = zdeserialize(ZD.map(ZD.number(), ZD.string()), mapBytes);
    assert_eq(mapResult, map, "map serialization failed");
}

export async function testSerializeCustom() {
    const original = new CustomStruct([0.1, 0.2, -1000.55], 32, "test");
    const bytes = zserialize(original);
    const result = zdeserialize(ZD.object(CustomStruct), bytes);
    
    // Compare all fields
    assert_eq(result.vd, original.vd, "CustomStruct.vd serialization failed");
    assert_eq(result.i, original.i, "CustomStruct.i serialization failed");
    assert_eq(result.s, original.s, "CustomStruct.s serialization failed");
}

export async function testBinaryFormat() {
    // Test specific binary formats
    const int32Tests = [1234566, -49245];
    for (const val of int32Tests) {
        const bytes = zserialize(val, ZS.number(NumberFormat.Int32));
        const result = zdeserialize(ZD.number(NumberFormat.Int32), bytes);
        assert_eq(result, val, "int32 serialization failed");
    }

    // Test string encoding
    const str = "test";
    const singleStrBytes = zserialize(str);
    const singleStrResult = zdeserialize(ZD.string(), singleStrBytes);
    assert_eq(singleStrResult, str, "string serialization failed");

    // Test numbers and string separately since TypeScript arrays must be homogeneous
    const num1 = 500;
    const num2 = 1234.0;
    const testStr = "test";
    
    const bytes1 = zserialize(num1, ZS.number());
    const bytes2 = zserialize(num2, ZS.number());
    const bytes3 = zserialize(testStr, ZS.string());
    
    assert_eq(zdeserialize(ZD.number(), bytes1), num1, "number serialization failed");
    assert_eq(zdeserialize(ZD.number(), bytes2), num2, "number serialization failed");
    assert_eq(zdeserialize(ZD.string(), bytes3), testStr, "string serialization failed");

    // Test array of int64
    const int64Array = [-100n, 500n, 100000n, -20000000n];
    const int64Bytes = zserialize(int64Array, ZS.array(ZS.bigint()));
    const int64Result = zdeserialize(ZD.array(ZD.bigint()), int64Bytes);
    assert_eq(int64Result, int64Array, "array of int64 serialization failed");

    // Test array of string-number pairs as two separate arrays
    const numbers = [10, -10000];
    const strings = ["s1", "s2"];
    
    const arrayNumBytes = zserialize(numbers, ZS.array(ZS.number()));
    const arrayStrBytes = zserialize(strings, ZS.array(ZS.string()));
    
    const numResult = zdeserialize(ZD.array(ZD.number()), arrayNumBytes);
    const strResult = zdeserialize(ZD.array(ZD.string()), arrayStrBytes);
    
    assert_eq(numResult, numbers, "number array serialization failed");
    assert_eq(strResult, strings, "string array serialization failed");
}

// Run all tests
testSerializePrimitive();
testSerializeTuple();
testSerializeContainer();
testSerializeCustom();
testBinaryFormat();