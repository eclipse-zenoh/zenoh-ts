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

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function deepEqual(actual: any, expected: any): boolean {
    if (actual === expected) return true;
    
    if (actual instanceof Map && expected instanceof Map) {
        if (actual.size !== expected.size) return false;
        for (const [key, value] of actual) {
            if (!expected.has(key)) return false;
            if (!deepEqual(value, expected.get(key))) return false;
        }
        return true;
    }

    if (Array.isArray(actual) && Array.isArray(expected)) {
        if (actual.length !== expected.length) return false;
        return actual.every((val, idx) => deepEqual(val, expected[idx]));
    }

    if (actual instanceof Float32Array && expected instanceof Float32Array ||
        actual instanceof Float64Array && expected instanceof Float64Array) {
        if (actual.length !== expected.length) return false;
        return actual.every((val, idx) => Math.abs(val - expected[idx]) < 0.0001);
    }

    if (typeof actual === 'object' && actual !== null &&
        typeof expected === 'object' && expected !== null) {
        return Object.keys(actual).length === Object.keys(expected).length &&
               Object.keys(actual).every(key => deepEqual(actual[key], expected[key]));
    }

    return false;
}

export function assert_eq<T>(actual: T, expected: T, message: string): void {
    if (!deepEqual(actual, expected)) {
        throw new Error(`${message}: expected ${expected}, but got ${actual}`);
    }
}