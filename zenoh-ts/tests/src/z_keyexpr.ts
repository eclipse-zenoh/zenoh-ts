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

import { Config, Session, KeyExpr } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("KeyExpr - Basic", () => {
  const foo = new KeyExpr("FOO");
  assert(foo.toString() === "FOO", "KeyExpr string representation mismatch");
});

Deno.test("KeyExpr - Canonize", () => {
  const non_canon = "a/**/**/c";
  const canon = "a/**/c";

  // Test autocanonization
  const k_ok = KeyExpr.autocanonize(non_canon);
  assertEquals(k_ok.toString(), canon, "Canonization failed");

  // Verify that canonized expression remains unchanged when canonized again
  const k_ok2 = KeyExpr.autocanonize(canon);
  assertEquals(k_ok2.toString(), canon, "Re-canonization changed canonical form");
});

Deno.test("KeyExpr - Concat", () => {
  const foo = new KeyExpr("FOO");
  const foobar = foo.concat("BAR");
  assertEquals(foobar.toString(), "FOOBAR", "Concatenation failed");
});

Deno.test("KeyExpr - Join", () => {
  const foo = new KeyExpr("FOO");
  const bar = new KeyExpr("BAR");
  const foobar = foo.join(bar);
  assertEquals(foobar.toString(), "FOO/BAR", "Join failed");
});

Deno.test("KeyExpr - Equals", () => {
  const foo = new KeyExpr("FOO");
  const foo2 = new KeyExpr("FOO");
  const bar = new KeyExpr("BAR");

  assert(foo.toString() !== bar.toString(), "Expected foo != bar");
  assert(foo.toString() === foo.toString(), "Expected foo == foo");
  assert(foo.toString() === foo2.toString(), "Expected foo == foo2");
  assertEquals(foo.toString(), "FOO", "Expected foo == 'FOO'");
  assert(foo.toString() !== "BAR", "Expected foo != 'BAR'");
});

Deno.test("KeyExpr - Includes", () => {
  const foostar = new KeyExpr("FOO/*");
  const foobar = new KeyExpr("FOO/BAR");
  assert(foostar.includes(foobar), "Expected FOO/* to include FOO/BAR");
  assert(!foobar.includes(foostar), "Expected FOO/BAR to not include FOO/*");
});

Deno.test("KeyExpr - Intersects", () => {
  const foostar = new KeyExpr("FOO/*");
  const foobar = new KeyExpr("FOO/BAR");
  const starbuz = new KeyExpr("*/BUZ");
  const foobuz = new KeyExpr("FOO/BUZ");

  assert(foostar.intersects(foobar), "Expected FOO/* to intersect with FOO/BAR");
  assert(!starbuz.intersects(foobar), "Expected */BUZ to not intersect with FOO/BAR");
  assert(foobuz.intersects(starbuz), "Expected FOO/BUZ to intersect with */BUZ");
  assert(starbuz.intersects(foobuz), "Expected */BUZ to intersect with FOO/BUZ");
});

Deno.test("KeyExpr - Declare", async () => {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  try {
    const foobar = new KeyExpr("FOO/BAR");
    const foostar = new KeyExpr("FOO/*");
    const declared = session.declare_keyexpr(foobar);

    assertEquals(declared.toString(), "FOO/BAR", "Declared keyexpr mismatch");
    assertEquals(declared.toString(), foobar.toString(), "Declared keyexpr != foobar");
    assert(foostar.includes(declared), "Expected FOO/* to include declared");
    assert(declared.intersects(foobar), "Expected declared to intersect with FOO/BAR");
  } finally {
    await session.close();
  }
});