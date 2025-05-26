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

/**
 * Union Type to convert various primitives and containers into ZBytes
 */
export type IntoZBytes =
    | ZBytes
    | Uint8Array
    | String
    | string;

/**
 * Class to represent an Array of Bytes received from Zenoh
 */
export class ZBytes {
    private buffer_: Uint8Array;

    /**
     * new function to create a ZBytes 
     * 
     * @returns ZBytes
     */
    constructor(bytes: IntoZBytes) {
        if (bytes instanceof ZBytes) {
            this.buffer_ = bytes.buffer_;
        } else if (bytes instanceof String || typeof bytes === "string") {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(bytes.toString());
            this.buffer_ = encoded;
        } else {
            this.buffer_ = Uint8Array.from(bytes);
        }
    }

    /**
    * returns the length of the ZBytes buffer
    * 
    * @returns number
    */
    public len(): number {
        return this.buffer_.length;
    }

    /**
    * returns if the ZBytes Buffer is empty
    * 
    * @returns boolean
    */
    public isEmpty(): boolean {
        return this.buffer_.length == 0;
    }

    /**
     * returns an empty ZBytes buffer
     * 
     * @returns ZBytes
     */
    public empty(): ZBytes {
        return new ZBytes(new Uint8Array());
    }

    /**
     * returns the underlying Uint8Array buffer
     * 
     * @returns Uint8Array
     */
    public toBytes(): Uint8Array {
        return this.buffer_
    }

    /**
     * decodes the underlying Uint8Array buffer as UTF-8 string
     * 
     * @returns string
     */
    public toString(): string {
        let decoder = new TextDecoder();
        return decoder.decode(this.buffer_)
    }

}