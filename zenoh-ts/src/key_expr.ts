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

export type IntoKeyExpr = KeyExpr | String | string;

export class KeyExpr {
  /**
   * Class to represent a Key Expression in Zenoh
   */
  private _inner: string;


  private constructor(key_expr: string) {
    this._inner = key_expr;
  }

  toString(): string {
    return this._inner;
  }
  /**
   * Class to represent a Key Expression in Zenoh
   */
  static new(keyexpr: IntoKeyExpr): KeyExpr {
    if (keyexpr instanceof KeyExpr) {
      return keyexpr;
    } else if (keyexpr instanceof String) {
      return new KeyExpr(keyexpr.toString());
    } else {
      return new KeyExpr(keyexpr);
    }
  }
}
