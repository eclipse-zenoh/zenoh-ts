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

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { Encoding } from "@eclipse-zenoh/zenoh-ts";

Deno.test("Encoding - Basic", () => {
    assertEquals(Encoding.default(), Encoding.ZENOH_BYTES);
    assertEquals(Encoding.default().toString(), "zenoh/bytes");
    assertEquals(Encoding.default().withSchema("foobar").toString(), "zenoh/bytes;foobar");
    assertEquals(Encoding.TEXT_PLAIN.toString(), "text/plain");
    assertEquals(Encoding.TEXT_PLAIN.withSchema("charset=utf-8").toString(), "text/plain;charset=utf-8");
    assertEquals(Encoding.fromString("text/plain;charset=utf-8").withSchema("charset=ascii").toString(), "text/plain;charset=ascii");
    assertEquals(Encoding.fromString("zenoh/bytes"), Encoding.ZENOH_BYTES);
    assertEquals(Encoding.fromString("zenoh/bytes;foobar").toString(), "zenoh/bytes;foobar");
    assertEquals(Encoding.fromString("custom/encoding").toString(), "custom/encoding");
    assertEquals(Encoding.fromString("custom/encoding;foobar"), Encoding.fromString("custom/encoding").withSchema("foobar"));
});