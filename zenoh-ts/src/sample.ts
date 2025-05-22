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

import { KeyExpr } from "./key_expr";
import { deserializeOptZBytes, ZBytes } from "./z_bytes";
import { Encoding } from "./encoding";
import { CongestionControl, Priority, Qos, SampleKind, sampleKindFromUint8 } from "./enums";
import { deserializeOptTimestamp, Timestamp } from "./timestamp";
import { ZBytesDeserializer } from "./ext";

export class Sample {
    constructor(
        public readonly keyexpr: KeyExpr,
        public readonly payload: ZBytes,
        public readonly kind: SampleKind,
        public readonly encoding: Encoding,
        public readonly attachment: ZBytes | undefined,
        public readonly timestamp: Timestamp | undefined,
        public readonly priority: Priority,
        public readonly congestionControl: CongestionControl,
        public readonly express: boolean,
    ) { }

    public static deserialize(deserializer: ZBytesDeserializer) {
        let keyexpr = new KeyExpr(deserializer.deserializeString());
        let payload = new ZBytes(deserializer.deserializeUint8Array());
        let kind = sampleKindFromUint8(deserializer.deserializeNumberUint8());
        let encoding = Encoding.deserialize(deserializer);
        let attachment = deserializeOptZBytes(deserializer);
        let timestamp = deserializeOptTimestamp(deserializer);
        let qos = Qos.fromUint8(deserializer.deserializeNumberUint8());

        return new Sample(
            keyexpr, payload, kind, encoding, attachment, timestamp, 
            qos.priority, qos.congestion_control, qos.express
        );
    }
}
