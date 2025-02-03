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

import { ZBytes } from "@eclipse-zenoh/zenoh-ts";
import { ZBytesSerializer, ZBytesDeserializer, ZSerializeable, ZDeserializeable, zserialize, zdeserialize, ZS, ZD, NumberFormat, BigIntFormat } from "@eclipse-zenoh/zenoh-ts/ext";


class MyStruct implements ZSerializeable, ZDeserializeable {
    v1: number;
    v2: string;
    v3: number[];

    constructor(v1?: number, v2?: string, v3?: number[]) {
        if (typeof v1 !== `undefined`) {
            this.v1 = v1;
        } else {
            this.v1 = 0;
        }
        if (typeof v2 !== `undefined`) {
            this.v2 = v2;
        } else {
            this.v2 = ""
        }
        if (typeof v3 !== `undefined`) {
            this.v3 = v3;
        } else {
            this.v3 = new Array<number>()
        }
    }

    serialize_with_zserializer(serializer: ZBytesSerializer): void {
        serializer.serialize(this.v1, ZS.number(NumberFormat.Int32))
        serializer.serialize(this.v2)
        serializer.serialize(this.v3, ZS.array(ZS.number(NumberFormat.Int8)))
    }

    deserialize_with_zdeserializer(deserializer: ZBytesDeserializer): void {
        this.v1 = deserializer.deserialize(ZD.number(NumberFormat.Uint32))
        this.v2 = deserializer.deserialize(ZD.string())
        this.v3 = deserializer.deserialize(ZD.array(ZD.number(NumberFormat.Int8)))
    }

    to_string(): string {
        return JSON.stringify(this)
    }

}

export async function main() {
    // using raw data
    // string
    {
        let input = "test"
        let payload = new ZBytes(input)
        let output = payload.to_string()
        console.log(`Input: ${input}, Output: ${output}`)
    }
    // Uint8Array
    {
        let input = new Uint8Array([1, 2, 3, 4])
        let payload = new ZBytes(input)
        let output = payload.to_bytes()
        console.log(`Input: ${input}, Output: ${output}`)
    }

    // serialization
    // array
    {
        let input = [1, 2, 3, 4]
        // by default number is serialized/deserialized as 64-bit float, 
        // other formats, like Int32, for example, must be specified explicitly
        let payload = zserialize(input, ZS.array(ZS.number(NumberFormat.Int32)))
        let output = zdeserialize(ZD.array(ZD.number(NumberFormat.Int32)), payload)
        // let payload = zserialize(input)
        // let output = zdeserialize(ZD.array(ZD.number()), payload)
        console.log(`Input: ${input}, Output: ${output}`)
    }
    // typed array
    {
        let input = new Int32Array([1, 2, 3, 4])
        let payload = zserialize(input)
        let output = zdeserialize(ZD.int32array(), payload)
        console.log(`Input: ${input}, Output: ${output}`)
    }
    // map
    {
        let input = new Map<bigint, string>()
        input.set(0n, "abc")
        input.set(1n, "def")
        // by default bigint is serialized/deserialized as 64-bit signed integer, 
        // other formats, like UInt64, for example, must be specified explicitly
        let payload = zserialize(input, ZS.map(ZS.bigint(BigIntFormat.Uint64), ZS.string()))
        let output = zdeserialize(ZD.map(ZD.bigint(BigIntFormat.Uint64), ZD.string()), payload)
        // let payload = zserialize(input)
        // let output = zdeserialize(ZD.map(ZD.bigint(), ZD.string()), payload)
        console.log(`Input:`)
        console.table(input)
        console.log(`Output:`)
        console.table(output)
    }
    // Custom class
    {
        let input = new MyStruct(1234, "test", [1, 2, 3, 4])
        let payload = zserialize(input)
        let output = zdeserialize(ZD.object(MyStruct), payload)
        console.log(`Input: ${input.to_string()}, Output: ${output.to_string()}`)
    }
}

main();
