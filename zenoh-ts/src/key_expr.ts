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
// ██   ██ ███████ ██    ██     ███████ ██   ██ ██████  ██████
// ██  ██  ██       ██  ██      ██       ██ ██  ██   ██ ██   ██
// █████   █████     ████       █████     ███   ██████  ██████
// ██  ██  ██         ██        ██       ██ ██  ██      ██   ██
// ██   ██ ███████    ██        ███████ ██   ██ ██      ██   ██

import { new_key_expr, join, concat, includes, intersects } from "./key_expr/zenoh_keyexpr_wrapper.js"

export type IntoKeyExpr = KeyExpr | String | string;

export class KeyExpr {
  /**
   * Class to represent a Key Expression in Zenoh
   */
  // not to be used directly 
  private _inner: string;

  constructor(keyexpr: IntoKeyExpr) {
    let ke;
    if (keyexpr instanceof KeyExpr) {
      this._inner = keyexpr._inner;
      return
    } else if (keyexpr instanceof String) {
      ke = keyexpr.toString();
    } else {
      ke = keyexpr;
    }
    // `new_key_expr` calls the `key_expr::OwnedKeyExpr::new` in Rust
    // if this function fails, the keyexpr is invalid, and an exception is thrown in Wasm and propagated here
    // else the Key Expression is valid and we can store the string it represents in the class
    new_key_expr(ke);
    this._inner = ke;
  }

  toString(): string {
    return this._inner;
  }

  join(other: IntoKeyExpr): KeyExpr {
    const key_expr = this.call_wasm<string>(other, join)
    return new KeyExpr(key_expr)
  }

  concat(other: IntoKeyExpr): KeyExpr {
    const key_expr = this.call_wasm<string>(other, concat)
    return new KeyExpr(key_expr)
  }

  includes(other: IntoKeyExpr): boolean {
    return this.call_wasm<boolean>(other, includes)
  }

  intersects(other: IntoKeyExpr): boolean {
    return this.call_wasm<boolean>(other, intersects)
  }

  private call_wasm<T>(other: IntoKeyExpr, fn: (expr1: string, expr2: string) => T): T {
    let ke;
    if (other instanceof KeyExpr) {
      ke = other._inner;
    } else if (other instanceof String) {
      ke = other.toString();
    } else {
      ke = other;
    }
    return fn(this._inner, ke)
  }

}
