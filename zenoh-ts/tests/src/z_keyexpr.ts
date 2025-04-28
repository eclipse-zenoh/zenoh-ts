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
  // Test empty string initialization
  const emptyParams = new Parameters("");
  assert(emptyParams.is_empty(), "Empty string should create empty parameters");

  // Test single parameter without value
  const singleNoValue = new Parameters("p1");
  const singleNoValueExpected = new Parameters("p1=");
  assert_eq(singleNoValue.toString(), singleNoValueExpected.toString(), "Parameter without value should be equivalent to empty value");

  // Test single parameter with value
  const singleParam = new Parameters("p1=v1");
  assert_eq(singleParam.get("p1"), "v1", "Single parameter with value not matched");

  // Test multiple parameters with trailing semicolon
  const multiParamTrailing = new Parameters("p1=v1;p2=v2;");
  assert_eq(multiParamTrailing.get("p1"), "v1", "First parameter not matched");
  assert_eq(multiParamTrailing.get("p2"), "v2", "Second parameter not matched");

  // Test parameters with extra delimiters
  const extraDelim = new Parameters("p1=v1;p2=v2;|=");
  assert_eq(extraDelim.get("p1"), "v1", "Parameter p1 not matched with extra delimiters");
  assert_eq(extraDelim.get("p2"), "v2", "Parameter p2 not matched with extra delimiters");

  // Test mix of parameters with and without values
  const mixedParams = new Parameters("p1=v1;p2;p3=v3");
  assert_eq(mixedParams.get("p1"), "v1", "Parameter p1 not matched in mixed params");
  assert_eq(mixedParams.get("p2"), "", "Parameter p2 should have empty value");
  assert_eq(mixedParams.get("p3"), "v3", "Parameter p3 not matched in mixed params");

  // Test parameters with spaces in values and keys
  const spacedParams = new Parameters("p1=v 1;p 2=v2");
  assert_eq(spacedParams.get("p1"), "v 1", "Parameter with space in value not matched");
  assert_eq(spacedParams.get("p 2"), "v2", "Parameter with space in key not matched");

  // Test parameters with equals signs in values
  const equalsParams = new Parameters("p1=x=y;p2=a==b");
  assert_eq(equalsParams.get("p1"), "x=y", "Parameter with equals in value not matched");
  assert_eq(equalsParams.get("p2"), "a==b", "Parameter with multiple equals in value not matched");

  // Test Map initialization
  const map = new Map<string, string>();
  map.set("p1", "v1");
  const mapParams = new Parameters(map);
  const stringParams = new Parameters("p1=v1");
  assert_eq(mapParams.toString(), stringParams.toString(), "Map initialization not equivalent to string initialization");
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