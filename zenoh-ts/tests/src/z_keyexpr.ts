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

import { Config, Session, KeyExpr, Parameters } from "@eclipse-zenoh/zenoh-ts";
import { assert, assert_eq, run_test } from "./common/assertions.ts";

export async function testKeyExprBasic() {
  const foo = new KeyExpr("FOO");
  assert(foo.toString() === "FOO", "KeyExpr string representation mismatch");
}

export async function testKeyExprCanonize() {
  const non_canon = "a/**/**/c";
  const canon = "a/**/c";

  // Test autocanonization
  const k_ok = KeyExpr.autocanonize(non_canon);
  assert_eq(k_ok.toString(), canon, "Canonization failed");

  // Verify that canonized expression remains unchanged when canonized again
  const k_ok2 = KeyExpr.autocanonize(canon);
  assert_eq(k_ok2.toString(), canon, "Re-canonization changed canonical form");
}

export async function testKeyExprConcat() {
  const foo = new KeyExpr("FOO");
  const foobar = foo.concat("BAR");
  assert_eq(foobar.toString(), "FOOBAR", "Concatenation failed");
}

export async function testKeyExprJoin() {
  const foo = new KeyExpr("FOO");
  const bar = new KeyExpr("BAR");
  const foobar = foo.join(bar);
  assert_eq(foobar.toString(), "FOO/BAR", "Join failed");
}

export async function testKeyExprEquals() {
  const foo = new KeyExpr("FOO");
  const foo2 = new KeyExpr("FOO");
  const bar = new KeyExpr("BAR");

  assert(foo.toString() !== bar.toString(), "Expected foo != bar");
  assert(foo.toString() === foo.toString(), "Expected foo == foo");
  assert(foo.toString() === foo2.toString(), "Expected foo == foo2");
  assert(foo.toString() === "FOO", "Expected foo == 'FOO'");
  assert(foo.toString() !== "BAR", "Expected foo != 'BAR'");
}

export async function testKeyExprIncludes() {
  const foostar = new KeyExpr("FOO/*");
  const foobar = new KeyExpr("FOO/BAR");
  assert(foostar.includes(foobar), "Expected FOO/* to include FOO/BAR");
  assert(!foobar.includes(foostar), "Expected FOO/BAR to not include FOO/*");
}

export async function testKeyExprIntersects() {
  const foostar = new KeyExpr("FOO/*");
  const foobar = new KeyExpr("FOO/BAR");
  const starbuz = new KeyExpr("*/BUZ");
  const foobuz = new KeyExpr("FOO/BUZ");

  assert(foostar.intersects(foobar), "Expected FOO/* to intersect with FOO/BAR");
  assert(!starbuz.intersects(foobar), "Expected */BUZ to not intersect with FOO/BAR");
  assert(foobuz.intersects(starbuz), "Expected FOO/BUZ to intersect with */BUZ");
  assert(starbuz.intersects(foobuz), "Expected */BUZ to intersect with FOO/BUZ");
}

export async function testKeyExprDeclare() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  
  const foobar = new KeyExpr("FOO/BAR");
  const foostar = new KeyExpr("FOO/*");
  const declared = session.declare_keyexpr(foobar);

  assert_eq(declared.toString(), "FOO/BAR", "Declared keyexpr mismatch");
  assert_eq(declared.toString(), foobar.toString(), "Declared keyexpr != foobar");
  assert(foostar.includes(declared), "Expected FOO/* to include declared");
  assert(declared.intersects(foobar), "Expected declared to intersect with FOO/BAR");

  await session.close();
}

export async function testParameters() {
  // Test string initialization
  const params = new Parameters("key1=value1;key2=value2");
  assert_eq(params.get("key1"), "value1", "Parameter key1 value mismatch");
  assert_eq(params.get("key2"), "value2", "Parameter key2 value mismatch");
  assert_eq(params.get("nonexistent"), undefined, "Nonexistent parameter should return undefined");

  // Test contains_key
  assert(params.contains_key("key1"), "Parameter should contain key1");
  assert(!params.contains_key("nonexistent"), "Parameter should not contain nonexistent key");
}

export async function testParametersInsert() {
  const params = Parameters.empty();
  params.insert("key1", "value1");
  assert_eq(params.get("key1"), "value1", "Parameter insert failed");
}

export async function testParametersExtend() {
  const params1 = new Parameters("key1=value1");
  const params2 = new Parameters("key2=value2;key1=updated");
  
  params1.extend(params2);
  assert_eq(params1.get("key1"), "updated", "Parameter extend should update existing key");
  assert_eq(params1.get("key2"), "value2", "Parameter extend should add new key");
}

export async function testParametersEmpty() {
  const params = Parameters.empty();
  assert(params.is_empty(), "Empty parameters should be empty");
  params.insert("key1", "value1");
  assert(!params.is_empty(), "Parameters with values should not be empty");
}

export async function testParametersDelete() {
  const params = Parameters.empty();
  params.insert("key1", "value1");
  params.remove("key1");
  
  assert_eq(params.get("key1"), undefined, "Parameter removal failed");
}

// Run all tests
await run_test(testKeyExprBasic);
await run_test(testKeyExprCanonize);
await run_test(testKeyExprConcat);
await run_test(testKeyExprJoin);
await run_test(testKeyExprEquals);
await run_test(testKeyExprIncludes);
await run_test(testKeyExprIntersects);
await run_test(testKeyExprDeclare);
await run_test(testParameters);
await run_test(testParametersInsert);
await run_test(testParametersExtend);
await run_test(testParametersEmpty);
await run_test(testParametersDelete);