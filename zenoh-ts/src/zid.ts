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

export class ZenohId {
    private static KEY = '0123456789abcdef';
    constructor(private readonly zid: Uint8Array) {
        if (zid.length != 16 ) {
            throw new Error("Zid should contain exactly 16 bytes");
        }
    }

    toString() {
        let out: string = "";
        for (let i = this.zid.length - 1; i >= 0; --i) {
            let b = this.zid[i] as number;
            out += ZenohId.KEY[b >> 4];
            out += ZenohId.KEY[b & 15];
        }
        return out;
    }

    toLeBytes() {
        return this.zid;
    }
}