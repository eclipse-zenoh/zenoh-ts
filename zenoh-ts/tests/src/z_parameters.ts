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
import { assert, assert_eq, run_test } from "./common/assertions.ts";

export async function testParametersBasic() {
  // Test empty string initialization
  const emptyParams = new Parameters("");
  assert(emptyParams.is_empty(), "Empty string should create empty parameters");

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

  // Test `values(key)` function
  const mulitivalueParams = new Parameters("p1=v1|v2|v3|v4;p2=v5|v6|v7|v8");
  assert_eq([...mulitivalueParams.values("p1")], ["v1", "v2", "v3", "v4"], "values() function not returning expected values");
  assert_eq([...mulitivalueParams.values("p2")], ["v5", "v6", "v7", "v8"], "values() function not returning expected values");
}

export async function testParametersNonexistent() {
  const params = new Parameters("key1=value1");
  assert_eq(params.get("nonexistent"), undefined, "Nonexistent parameter should return undefined");
}

export async function testParametersIter() {
  const map = new Map<string, string>();
  map.set("p1", "v1");
  map.set("p2", "v2");
  map.set("p3", "v3");
  const mapParams = new Parameters(map);
  let count = 0;
  for (const [key, value] of mapParams.iter()) {
    count++;
    assert_eq(mapParams.get(key), value, `Iterated key ${key} does not match expected value ${value}`);
  }
  assert_eq(count, 3, "Iterating over parameters should yield 3 results");
  // Test iterating over empty parameters
  const emptyParams = new Parameters("");
  let count0 = 0;
  for (const _ of emptyParams.iter()) {
    count0++;
  }
  assert_eq(count0, 0, "Iterating over empty parameters should yield no results");
}

export async function testParametersMap() {
  // Test Map initialization
  const map = new Map<string, string>();
  map.set("p1", "v1");
  const mapParams = new Parameters(map);
  const stringParams = new Parameters("p1=v1");
  assert_eq(mapParams.toString(), stringParams.toString(), "Map initialization not equivalent to string initialization");

  // Test parameter without value using Map
  const singleNoValue = new Parameters("p1");
  const emptyMap = new Map<string, string>();
  emptyMap.set("p1", "");
  const singleNoValueExpected = new Parameters(emptyMap);
  assert_eq(singleNoValue.toString(), singleNoValueExpected.toString(), "Parameter without value should be equivalent to empty value");
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

export async function testParametersDuplicates() {
  // Test duplicate handling in insert
  const params = new Parameters("key1=value1;key2=value2;key1=duplicate");
  assert_eq(params.get("key1"), "value1", "Should return first occurrence of key1");

  // Test duplicate handling in remove
  const params2 = new Parameters("key1=value1;key2=value2;key1=duplicate;key3=value3");
  params2.remove("key1");
  assert_eq(params2.toString(), "key2=value2;key3=value3", "Remove should remove all occurrences of key1");
  assert_eq(params2.toString().split("key1").length - 1, 0, "Should have no occurrences of key1 after remove");
  assert_eq(params2.get("key2"), "value2", "Other keys should remain intact");
  assert_eq(params2.get("key3"), "value3", "Other keys should remain intact");

  // Insert should overwrite all duplicates
  params.insert("key1", "newvalue");
  assert_eq(params.get("key1"), "newvalue", "Insert should remove duplicates");
  assert_eq(params.toString().split("key1").length - 1, 1, "Should only have one occurrence of key1 after insert");
}

export async function testParametersPerformance() {
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
    assert_eq(params.get(`key${i}`), `value${i}`, `Insert verification failed for key${i}`);
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
    assert_eq(params.get(`key${i}`), undefined, `Remove verification failed for key${i}`);
  }

  assert(params.is_empty(), "Parameters should be empty after removing all entries");
}

// Run all tests
await run_test(testParametersBasic);
await run_test(testParametersNonexistent);
await run_test(testParametersIter);
await run_test(testParametersMap);
await run_test(testParametersInsert);
await run_test(testParametersExtend);
await run_test(testParametersEmpty);
await run_test(testParametersDelete);
await run_test(testParametersDuplicates);
// await run_test(testParametersPerformance);