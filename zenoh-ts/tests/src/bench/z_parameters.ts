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

// Performance benchmark for Parameters
Deno.bench("Parameters - Insert Performance", () => {
  const numParams = 1024;
  const params = Parameters.empty();
  
  // Test insert performance
  for (let i = 0; i < numParams; i++) {
    params.insert(`key${i}`, `value${i}`);
  }
});

// Prepare parameters for removal benchmark
const numParamsRemove = 1024;
const paramsForRemoval = Parameters.empty();
for (let i = 0; i < numParamsRemove; i++) {
  paramsForRemoval.insert(`key${i}`, `value${i}`);
}

Deno.bench("Parameters - Remove Performance", () => {
  // Create a copy of the prepared parameters for each benchmark run
  const params = new Parameters(paramsForRemoval.toString());
  
  // Test remove performance
  for (let i = 0; i < numParamsRemove; i++) {
    params.remove(`key${i}`);
  }
});