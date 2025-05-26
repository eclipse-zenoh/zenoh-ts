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

import { KeyExpr } from "./key_expr.js";
import { ZBytes } from "./z_bytes.js";
import { Encoding } from "./encoding.js";
import { CongestionControl, Priority, SampleKind } from "./enums.js";
import { Timestamp } from "./timestamp.js";

export class Sample {
    /**
     * @internal
     */
    constructor(
        private readonly keyexpr_: KeyExpr,
        private readonly payload_: ZBytes,
        private readonly kind_: SampleKind,
        private readonly encoding_: Encoding,
        private readonly attachment_: ZBytes | undefined,
        private readonly timestamp_: Timestamp | undefined,
        private readonly priority_: Priority,
        private readonly congestionControl_: CongestionControl,
        private readonly express_: boolean,
    ) { }

    keyexpr(): KeyExpr {
        return this.keyexpr_;
    }
    payload(): ZBytes {
        return this.payload_;
    }
    kind(): SampleKind {
        return this.kind_;
    }
    encoding(): Encoding {
        return this.encoding_;
    }
    timestamp(): Timestamp | undefined {
        return this.timestamp_;
    }
    congestionControl(): CongestionControl {
        return this.congestionControl_;
    }
    priority(): Priority {
        return this.priority_;
    }
    express(): boolean {
        return this.express_;
    }
    attachment(): ZBytes | undefined {
        return this.attachment_;
    }
}
