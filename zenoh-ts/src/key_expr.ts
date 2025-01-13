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

// import { UUIDv4 } from "./remote_api/session";

export type IntoKeyExpr = KeyExpr | String | string;

export class KeyExpr {
  /**
   * Class to represent a Key Expression in Zenoh
   */
  private _inner: string;
  // private key_expr_uuid: UUIDv4;

  constructor(keyexpr: IntoKeyExpr) {
    if (keyexpr instanceof KeyExpr) {
      this._inner = keyexpr._inner;
    } else if (keyexpr instanceof String) {
      this._inner = keyexpr.toString();
    } else {
      this._inner = keyexpr;
    }
  }

  toString(): string {
    return this._inner;
  }
}
