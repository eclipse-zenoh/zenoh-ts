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

import { Parameters } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("Parameters - Basic", async () => {
  // Test empty string initialization
  const emptyParams = new Parameters("");
  assert(emptyParams.is_empty(), "Empty string should create empty parameters");

  // Test single parameter with value
  const singleParam = new Parameters("p1=v1");
  assertEquals(singleParam.get("p1"), "v1", "Single parameter with value not matched");

  // Test multiple parameters with trailing semicolon
  const multiParamTrailing = new Parameters("p1=v1;p2=v2;");
  assertEquals(multiParamTrailing.get("p1"), "v1", "First parameter not matched");
  assertEquals(multiParamTrailing.get("p2"), "v2", "Second parameter not matched");

  // Test parameters with extra delimiters
  const extraDelim = new Parameters("p1=v1;p2=v2;|=");
  assertEquals(extraDelim.get("p1"), "v1", "Parameter p1 not matched with extra delimiters");
  assertEquals(extraDelim.get("p2"), "v2", "Parameter p2 not matched with extra delimiters");

  // Test mix of parameters with and without values
  const mixedParams = new Parameters("p1=v1;p2;p3=v3");
  assertEquals(mixedParams.get("p1"), "v1", "Parameter p1 not matched in mixed params");
  assertEquals(mixedParams.get("p2"), "", "Parameter p2 should have empty value");
  assertEquals(mixedParams.get("p3"), "v3", "Parameter p3 not matched in mixed params");

  // Test parameters with spaces in values and keys
  const spacedParams = new Parameters("p1=v 1;p 2=v2");
  assertEquals(spacedParams.get("p1"), "v 1", "Parameter with space in value not matched");
  assertEquals(spacedParams.get("p 2"), "v2", "Parameter with space in key not matched");

  // Test parameters with equals signs in values
  const equalsParams = new Parameters("p1=x=y;p2=a==b");
  assertEquals(equalsParams.get("p1"), "x=y", "Parameter with equals in value not matched");
  assertEquals(equalsParams.get("p2"), "a==b", "Parameter with multiple equals in value not matched");

  // Test `values(key)` function
  const mulitivalueParams = new Parameters("p1=v1|v2|v3|v4;p2=v5|v6|v7|v8");
  assertEquals([...mulitivalueParams.values("p1")], ["v1", "v2", "v3", "v4"], "values() function not returning expected values");
  assertEquals([...mulitivalueParams.values("p2")], ["v5", "v6", "v7", "v8"], "values() function not returning expected values");
});

Deno.test("Parameters - Nonexistent", async () => {
  const params = new Parameters("key1=value1");
  assertEquals(params.get("nonexistent"), undefined, "Nonexistent parameter should return undefined");
});

Deno.test("Parameters - Iterator", async () => {
  const map = new Map<string, string>();
  map.set("p1", "v1");
  map.set("p2", "v2");
  map.set("p3", "v3");
  const mapParams = new Parameters(map);
  let count = 0;
  for (const [key, value] of mapParams.iter()) {
    count++;
    assertEquals(mapParams.get(key), value, `Iterated key ${key} does not match expected value ${value}`);
  }
  assertEquals(count, 3, "Iterating over parameters should yield 3 results");

  // Test iterating over empty parameters
  const emptyParams = new Parameters("");
  let count0 = 0;
  for (const _ of emptyParams.iter()) {
    count0++;
  }
  assertEquals(count0, 0, "Iterating over empty parameters should yield no results");
});

Deno.test("Parameters - Map", async () => {
  // Test Map initialization
  const map = new Map<string, string>();
  map.set("p1", "v1");
  const mapParams = new Parameters(map);
  const stringParams = new Parameters("p1=v1");
  assertEquals(mapParams.toString(), stringParams.toString(), "Map initialization not equivalent to string initialization");

  // Test parameter without value using Map
  const singleNoValue = new Parameters("p1");
  const emptyMap = new Map<string, string>();
  emptyMap.set("p1", "");
  const singleNoValueExpected = new Parameters(emptyMap);
  assertEquals(singleNoValue.toString(), singleNoValueExpected.toString(), 
    "Parameter without value should be equivalent to empty value");
});

Deno.test("Parameters - Insert", async () => {
  const params = Parameters.empty();
  params.insert("key1", "value1");
  assertEquals(params.get("key1"), "value1", "Parameter insert failed");
});

Deno.test("Parameters - Extend", async () => {
  const params1 = new Parameters("key1=value1");
  const params2 = new Parameters("key2=value2;key1=updated");
  
  params1.extend(params2);
  assertEquals(params1.get("key1"), "updated", "Parameter extend should update existing key");
  assertEquals(params1.get("key2"), "value2", "Parameter extend should add new key");
});

Deno.test("Parameters - Empty", async () => {
  const params = Parameters.empty();
  assert(params.is_empty(), "Empty parameters should be empty");
  params.insert("key1", "value1");
  assert(!params.is_empty(), "Parameters with values should not be empty");
});

Deno.test("Parameters - Delete", async () => {
  const params = Parameters.empty();
  params.insert("key1", "value1");
  params.remove("key1");
  assertEquals(params.get("key1"), undefined, "Parameter removal failed");
});

Deno.test("Parameters - Duplicates", async () => {
  // Test duplicate handling in insert
  const params = new Parameters("key1=value1;key2=value2;key1=duplicate");
  assertEquals(params.get("key1"), "value1", "Should return first occurrence of key1");

  // Test duplicate handling in remove
  const params2 = new Parameters("key1=value1;key2=value2;key1=duplicate;key3=value3");
  params2.remove("key1");
  assertEquals(params2.toString(), "key2=value2;key3=value3", "Remove should remove all occurrences of key1");
  assertEquals(params2.toString().split("key1").length - 1, 0, "Should have no occurrences of key1 after remove");
  assertEquals(params2.get("key2"), "value2", "Other keys should remain intact");
  assertEquals(params2.get("key3"), "value3", "Other keys should remain intact");

  // Insert should overwrite all duplicates
  params.insert("key1", "newvalue");
  assertEquals(params.get("key1"), "newvalue", "Insert should remove duplicates");
  assertEquals(params.toString().split("key1").length - 1, 1, "Should only have one occurrence of key1 after insert");
});

// Only run this test when performance testing is needed
Deno.test("Parameters - Performance", { ignore: true }, async () => {
  const numOperations = 10000;
  const params = Parameters.empty();
  
  // Test insert performance
  const insertStart = performance.now();
  for (let i = 0; i < numOperations; i++) {
    params.insert(`key${i}`, `value${i}`);
  }
  const insertEnd = performance.now();
  const insertTime = insertEnd - insertStart;
  console.log(`Insert ${numOperations} parameters took ${insertTime.toFixed(2)}ms (${(insertTime/numOperations).toFixed(3)}ms per operation)`);

  // Verify all insertions were successful
  for (let i = 0; i < numOperations; i++) {
    assertEquals(params.get(`key${i}`), `value${i}`, `Insert verification failed for key${i}`);
  }

  // Test remove performance
  const removeStart = performance.now();
  for (let i = 0; i < numOperations; i++) {
    params.remove(`key${i}`);
  }
  const removeEnd = performance.now();
  const removeTime = removeEnd - removeStart;
  console.log(`Remove ${numOperations} parameters took ${removeTime.toFixed(2)}ms (${(removeTime/numOperations).toFixed(3)}ms per operation)`);

  // Verify all removals were successful
  for (let i = 0; i < numOperations; i++) {
    assertEquals(params.get(`key${i}`), undefined, `Remove verification failed for key${i}`);
  }

  assert(params.is_empty(), "Parameters should be empty after removing all entries");
});