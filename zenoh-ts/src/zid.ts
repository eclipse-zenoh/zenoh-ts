//
// Copyright (c) 2024 ZettaScale Technology
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

import { ZBytesDeserializer, ZBytesSerializer } from "./ext";

export class Zid {
    private static KEY = '0123456789abcdef';
    private constructor(private readonly zid: Uint8Array) {
        if (zid.length != 16 ) {
            throw new Error("Zid should contain exactly 16 bytes");
        }
    }

    toString() {
        let out: string = "";
        for (let b of this.zid) {
            out += Zid.KEY[b >> 4];
            out += Zid.KEY[b & 15];
        }
        return out;
    }

    static deserialize(deserializer: ZBytesDeserializer): Zid {
        return new Zid(deserializer.deserializeUint8Array());
    }

    serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeUint8Array(this.zid);
    }
}