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

import { new_key_expr, join, concat, includes, intersects, autocanonize } from "./key_expr/zenoh_keyexpr_wrapper.js"

export type IntoKeyExpr = KeyExpr | String | string;

export class KeyExpr {
    /**
     * Class to represent a Key Expression in Zenoh
     */

    // not to be used directly 
    private inner_: string;

    constructor(keyexpr: IntoKeyExpr) {
        let ke;
        if (keyexpr instanceof KeyExpr) {
            this.inner_ = keyexpr.inner_;
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
        this.inner_ = ke;
    }

    toString(): string {
        return this.inner_;
    }

    /**
    * Joins both sides, inserting a / in between them.
    * This should be your preferred method when concatenating path segments.
    * @returns KeyExpr
    */
    join(other: IntoKeyExpr): KeyExpr {
        const keyExpr = join(this.inner_, KeyExpr.intoString(other));
        return new KeyExpr(keyExpr)
    }

    /**
    * Performs string concatenation and returns the result as a KeyExpr if possible.
    * @returns KeyExpr
    */
    concat(other: IntoKeyExpr): KeyExpr {
        const keyExpr = concat(this.inner_, KeyExpr.intoString(other));
        return new KeyExpr(keyExpr)
    }

    /**
    * Returns true if this includes other, i.e. the set defined by this contains every key belonging to the set defined by other.
    * @returns KeyExpr
    */
    includes(other: IntoKeyExpr): boolean {
        return includes(this.inner_, KeyExpr.intoString(other))
    }

    /**
    * Returns true if the keyexprs intersect, i.e. there exists at least one key which is contained in both of the sets defined by self and other.
    * @returns KeyExpr
    */
    intersects(other: IntoKeyExpr): boolean {
        return intersects(this.inner_, KeyExpr.intoString(other))
    }

    /**
    * Returns the canon form of a key_expr
    * @returns KeyExpr
    */
    static autocanonize(other: IntoKeyExpr): KeyExpr {
        const keyExpr = autocanonize(KeyExpr.intoString(other));
        return new KeyExpr(keyExpr)
    }

    private static intoString(other: IntoKeyExpr): string {
        if (other instanceof KeyExpr) {
            return other.inner_;
        } else if (other instanceof String) {
            return other.toString();
        } else {
            return other;
        }
    }
}
