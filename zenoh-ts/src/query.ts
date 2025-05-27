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

import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { Sample } from "./sample.js";
import { Encoding, IntoEncoding } from "./encoding.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver } from "./channels.js";
import { CongestionControl, Locality, Priority, Reliability, ReplyKeyExpr } from "./enums.js";
import { SessionInner } from "./session_inner.js";
import { Qos, ReplyDel, ReplyErr, ReplyOk } from "./message.js";




//  ██████  ██    ██ ███████ ██████  ██    ██  █████  ██████  ██      ███████
// ██    ██ ██    ██ ██      ██   ██  ██  ██  ██   ██ ██   ██ ██      ██
// ██    ██ ██    ██ █████   ██████    ████   ███████ ██████  ██      █████
// ██ ▄▄ ██ ██    ██ ██      ██   ██    ██    ██   ██ ██   ██ ██      ██
//  ██████   ██████  ███████ ██   ██    ██    ██   ██ ██████  ███████ ███████
//     ▀▀

/**
 * Queryable class used to receive Query's from the network and handle Reply's
 * created by Session.declare_queryable
 */
export class Queryable {
    /** 
     * @ignore
     */
    async [Symbol.asyncDispose]() {
        await this.undeclare();
    }
    /** 
     * @ignore
     * Returns a Queryable 
     * Note! : user must use declare_queryable on a session
     */
    constructor(
        private session: SessionInner,
        private id: number,
        private keyExpr_: KeyExpr,
        private receiver_?: ChannelReceiver<Query>
    ) { }

    /**
     * returns the key expression of an object
     * @returns KeyExpr
     */
    keyExpr(): KeyExpr {
        return this.keyExpr_
    }

    /**
     * returns a sample receiver for non-callback subscriber, undefined otherwise.
     *
     * @returns ChannelReceiver<Sample> | undefined
     */
    receiver(): ChannelReceiver<Query> | undefined {
        return this.receiver_;
    }

    /**
     * Undeclares Queryable
     * @returns void
     */
    async undeclare() {
        await this.session.undeclareQueryable(this.id);
    }
}

//  ██████  ██    ██ ███████ ██████  ██    ██
// ██    ██ ██    ██ ██      ██   ██  ██  ██
// ██    ██ ██    ██ █████   ██████    ████
// ██ ▄▄ ██ ██    ██ ██      ██   ██    ██
//  ██████   ██████  ███████ ██   ██    ██
//     ▀▀

/**
 * Options for a Query.Reply operation
 * @prop {IntoEncoding=} encoding - Encoding type of reply payload
 * @prop {CongestionControl=} congestionControl - congestionControl applied when routing the reply
 * @prop {Priority=} priority - priority of the reply
 * @prop {boolean=} express  - Express: if set to `true`, this reply will not be batched. This usually has a positive impact on latency but negative impact on throughput. 
 * @prop {Timestamp=} timestamp - Timestamp of the reply
 * @prop {IntoZBytes=} attachment - Additional Data sent with the reply
*/
export interface ReplyOptions {
    encoding?: IntoEncoding,
    congestionControl?: CongestionControl,
    priority?: Priority,
    express?: boolean,
    timestamp?: Timestamp;
    attachment?: IntoZBytes
}

/**
 * Options for a Query.replyErr operation
 * @prop {IntoEncoding=} encoding - Encoding type of reply payload
 */
export interface ReplyErrOptions {
    encoding?: Encoding,
}

/**
 * Options for a Query.ReplyDel operation
 * @prop {CongestionControl=} congestionControl - congestion control applied when routing the reply
 * @prop {Priority=} priority - priority of the reply
 * @prop {boolean=} express  - Express:  if set to `true`, this reply will not be batched. This usually has a positive impact on latency but negative impact on throughput.
 * @prop {Timestamp=} timestamp - Timestamp of the reply
 * @prop {IntoZBytes=} attachment - Additional Data sent with the reply
 */
export interface ReplyDelOptions {
    priority?: Priority,
    congestionControl?: CongestionControl,
    express?: boolean,
    timestamp?: Timestamp;
    attachment?: IntoZBytes
}

export class QueryInner {
    constructor(
        public readonly queryId: number,
        public readonly keyexpr_: KeyExpr,
        public readonly parameters_: Parameters,
        public readonly payload_: ZBytes | undefined,
        public readonly encoding_: Encoding | undefined,
        public readonly attachment_: ZBytes | undefined,
        public readonly replyKeyExpr_: ReplyKeyExpr,
    ) { }
}

/**
 * A Zenoh Query
 * @remarks Once all replies have been sent, it is necessary to call Query.finalize
 * to signal, that no more replies will be provided by the given queryable, otherwise this
 * will result in query timeout error on the querier side.
 */
export class Query {
    /**
      * @ignore
      * 
      */
    constructor(
        private session: SessionInner,
        private inner: QueryInner,
    ) { }

    /**
     * gets an selector of Query
     * @returns Selector
     */
    selector() {
        return new Selector(this.inner.keyexpr_, this.inner.parameters_)
    }
    /**
     * gets the KeyExpr of Query
     * @returns KeyExpr
     */
    keyExpr(): KeyExpr {
        return this.inner.keyexpr_;
    }
    /**
     * gets the Parameters of Query
     * @returns Parameters
     */
    parameters(): Parameters {
        return this.inner.parameters_;
    }
    /**
      * gets the Optioanl payload of Query
      * @returns ZBytes | undefined
      */
    payload(): ZBytes | undefined {
        return this.inner.payload_;
    }
    /**
      * gets the Optional Encoding of a Query
      * @returns Encoding | undefined
      */
    encoding(): Encoding | undefined {
        return this.inner.encoding_;
    }
    /**
      * gets the Optional Attachment of a Query
      * @returns ZBytes | undefined
      */
    attachment(): ZBytes | undefined {
        return this.inner.attachment_;
    }

    /**
      * Sends a Reply to for Query
      * @param {IntoKeyExpr} intoKeyExpr 
      * @param {IntoZBytes} payload
      * @param {ReplyOptions=} replyOpts
      * @returns void
      */
    async reply(intoKeyExpr: IntoKeyExpr, payload: IntoZBytes, replyOpts?: ReplyOptions) {
        await this.session.replyOk(
            new ReplyOk(
                this.inner.queryId,
                new KeyExpr(intoKeyExpr),
                new ZBytes(payload),
                replyOpts?.encoding ? Encoding.from(replyOpts.encoding) : Encoding.default(),
                replyOpts?.attachment ? new ZBytes(replyOpts.attachment) : undefined,
                replyOpts?.timestamp,
                new Qos(
                    replyOpts?.priority ?? Priority.DEFAULT,
                    replyOpts?.congestionControl ?? CongestionControl.DEFAULT_RESPONSE,
                    replyOpts?.express ?? false,
                    Reliability.DEFAULT,
                    Locality.DEFAULT
                )
            )
        );
    }
    /**
    * Sends an Error Reply for a query
    * @param {IntoZBytes} payload
    * @param {ReplyErrOptions=} replyErrOpts
    * @returns void
    */
    async replyErr(payload: IntoZBytes, replyErrOpts?: ReplyErrOptions) {
        await this.session.replyErr(
            new ReplyErr(
                this.inner.queryId,
                new ZBytes(payload),
                replyErrOpts?.encoding ? Encoding.from(replyErrOpts.encoding) : Encoding.default(),
            )
        );
    }

    /**
      * Sends an Error Reply for a query
      * @param intoKeyExpr IntoKeyExpr
      * @param {ReplyDelOptions=} replyDelOpts
      * @returns void
      */
    async replyDel(intoKeyExpr: IntoKeyExpr, replyDelOpts?: ReplyDelOptions) {
        await this.session.replyDel(
            new ReplyDel(
                this.inner.queryId,
                new KeyExpr(intoKeyExpr),
                replyDelOpts?.attachment ? new ZBytes(replyDelOpts.attachment) : undefined,
                replyDelOpts?.timestamp,
                new Qos(
                    replyDelOpts?.priority ?? Priority.DEFAULT,
                    replyDelOpts?.congestionControl ?? CongestionControl.DEFAULT_RESPONSE,
                    replyDelOpts?.express ?? false,
                    Reliability.DEFAULT,
                    Locality.DEFAULT
                )
            )
        );
    }

    /**
      * Finalizes query, signaling that all replies have been sent. 
      * @returns void
      */
    async finalize() {
        this.session.sendResponseFinal(this.inner.queryId);
    }

    toString(): string {
        return this.keyExpr.toString() + "?" + this.parameters.toString()
    }

    async [Symbol.asyncDispose]() {
        await this.finalize();
    }
}


export type IntoParameters = Parameters | string | String | Map<string, string>
/**
 * Parameters of a Query
 * Can be parsed from a String, using `;` or `<newline>` as separator between each parameters
 * and `=` as separator between a key and its value. Keys and values are trimmed.   
 * 
 * Example:  
 * `let a = "a=1;b=2;c=3|4|5;d=6"`  
 * `let p = Parameters.new(a)`
 */
export class Parameters {
    private source: string;

    constructor(intoParameters: IntoParameters) {
        if (intoParameters instanceof Parameters) {
            this.source = intoParameters.source;
        } else if (intoParameters instanceof Map) {
            // Convert Map to string format, handling empty values
            this.source = Array.from(intoParameters.entries())
                .map(([k, v]) => v ? `${k}=${v}` : k)
                .join(';');
        } else {
            this.source = intoParameters.toString();
        }
    }

    private *iterByKeyValuePos(): Generator<[number, number, number, number]> {
        if (this.source.length === 0) return;

        let pos = 0;
        while (pos < this.source.length) {
            // Skip leading semicolons
            while (pos < this.source.length && this.source[pos] === ';') pos++;
            if (pos >= this.source.length) break;

            const keyStart = pos;
            // Find end of key (semicolon or equals sign)
            while (pos < this.source.length && this.source[pos] !== ';' && this.source[pos] !== '=') pos++;
            const keyLen = pos - keyStart;
            if (keyLen === 0) continue; // Skip empty keys

            let valueStart = -1;
            let valueLen = 0;

            // If we found an equals sign, look for the value
            if (pos < this.source.length && this.source[pos] === '=') {
                pos++; // Skip equals sign
                valueStart = pos;
                // Find end of value (semicolon or end of string)
                while (pos < this.source.length && this.source[pos] !== ';') pos++;
                valueLen = pos - valueStart;
            }

            yield [keyStart, keyLen, valueStart, valueLen];
            pos++; // Skip past semicolon or increment if at end
        }
    }

    /**
     * Creates empty Parameters Structs
     * @returns Parameters
     */
    static empty(): Parameters {
        return new Parameters("");
    }

    /**
     * removes a key from the parameters
     * @returns boolean
     */
    remove(key: string): boolean {
        let found = false;
        let newSource = '';
        let lastPos = 0;

        for (const [keyStart, keyLen, valueStart, valueLen] of this.iterByKeyValuePos()) {
            const currentKey = this.source.slice(keyStart, keyStart + keyLen);
            if (currentKey == key) {
                // Add the part between last position and current key
                newSource += this.source.slice(lastPos, keyStart);
                // Calculate where the next parameter starts
                lastPos = valueStart >= 0 ?
                    valueStart + valueLen + 1 : // +1 for semicolon
                    keyStart + keyLen + 1;
                found = true;
            }
        }

        if (found) {
            // Add remaining part of string
            newSource += this.source.slice(lastPos);
            // Clean up consecutive semicolons and trailing/leading semicolons
            this.source = newSource.replace(/;+/g, ';').replace(/^;|;$/g, '');
        }

        return found;
    }
    /**
     * gets an generator over the pairs (key,value) of the Parameters
     * @returns Generator<string>
     */
    *iter(): Generator<[string, string]> {
        for (const [keyStart, keyLen, valueStart, valueLen] of this.iterByKeyValuePos()) {
            let key = this.source.slice(keyStart, keyStart + keyLen);
            let value = valueStart >= 0 ? this.source.slice(valueStart, valueStart + valueLen) : '';
            yield [key, value];
        }
    }

    /**
     * gets an generator over the values separated by `|`  in multivalue parameters
     * @returns Generator<string>
     */
    *values(key: string): Generator<string> {
        let value = this.get(key);
        if (value != undefined) {
            let values = value.split('|');
            for (const v of values) {
                yield v;
            }
        }
    }

    /**
     * Returns true if properties does not contain anything.
     * @returns boolean
     */
    isEmpty(): boolean {
        // Quick check for empty string
        if (!this.source) return true;
        // Otherwise check if there are any valid entries
        for (const _ of this.iterByKeyValuePos()) {
            return false;
        }
        return true;
    }

    /**
     * checks if parameters contains key
     * @returns boolean
     */
    containsKey(key: string): boolean {
        for (const [keyStart, keyLen] of this.iterByKeyValuePos()) {
            if (this.source.slice(keyStart, keyStart + keyLen) === key) {
                return true;
            }
        }
        return false;
    }

    /**
     * gets first found value with associated key, returning undefined if key does not exist
     * @returns string | undefined
     */
    get(key: string): string | undefined {
        for (const [keyStart, keyLen, valueStart, valueLen] of this.iterByKeyValuePos()) {
            if (this.source.slice(keyStart, keyStart + keyLen) === key) {
                return valueStart >= 0 ? this.source.slice(valueStart, valueStart + valueLen) : '';
            }
        }
        return undefined;
    }

    /**
     * Inserts new key,value pair into parameter
     * @returns void
     */
    insert(key: string, value: string): void {
        // Remove any existing instances of the key
        this.remove(key);

        // Add new key-value pair
        if (this.source && !this.source.endsWith(';') && this.source.length > 0) {
            this.source += ';';
        }
        this.source += `${key}=${value}`;
    }

    /**
     * extends this Parameters with the value of other parameters, overwriting `this` if keys match.  
     * @returns void
     */
    extend(other: IntoParameters): void {
        const otherParams = new Parameters(other);
        for (const [keyStart, keyLen, valueStart, valueLen] of otherParams.iterByKeyValuePos()) {
            const key = otherParams.source.slice(keyStart, keyStart + keyLen);
            const value = valueStart >= 0 ?
                otherParams.source.slice(valueStart, valueStart + valueLen) :
                '';
            this.insert(key, value);
        }
    }

    /**
     * returns the string representation of the parameters
     * @returns string
     */
    toString(): string {
        return this.source;
    }
}


/**
 * ReplyError returned from a `get` on a session
 * 
 */
export class ReplyError {
    /**
     * Payload of Error Reply
     * @returns ZBytes
     */
    payload(): ZBytes {
        return this.payload_;
    }

    /**
     * Encoding of Error Reply
     * @returns Encoding
     */
    encoding(): Encoding {
        return this.encoding_;
    }

    /**
      * @internal
      */
    constructor(private payload_: ZBytes, private encoding_: Encoding) { }
}

/**
 * Reply object from a zenoh `get`
 */
export class Reply {
    /**
     * Payload of Error Reply
     * @returns Sample or ReplyError 
     */
    result(): Sample | ReplyError {
        return this.result_;
    }

    /**
     * @internal
     */
    constructor(private result_: Sample | ReplyError) { }
}

// ███████ ███████ ██      ███████  ██████ ████████  ██████  ██████
// ██      ██      ██      ██      ██         ██    ██    ██ ██   ██
// ███████ █████   ██      █████   ██         ██    ██    ██ ██████
//      ██ ██      ██      ██      ██         ██    ██    ██ ██   ██
// ███████ ███████ ███████ ███████  ██████    ██     ██████  ██   ██



export type IntoSelector = Selector | KeyExpr | [KeyExpr, Parameters] | String | string;
/**
 * Selector class, holding a key expression and optional Parameters
 * in the following format `<KeyExpr>?<Params>`    
 * example: `demo/key/expr?arg1=lol;arg2=hi`  
 */
export class Selector {
    // KeyExpr object
    private keyExpr_: KeyExpr;

    // Optional : parameter field
    private parameters_?: Parameters;

    /**
     * gets Key Expression part of Selector 
     * @returns KeyExpr
     */
    keyExpr(): KeyExpr {
        return this.keyExpr_;
    }

    /**
     * gets Parameters part of Selector 
     * @returns Parameters
     */
    parameters(): Parameters {
        if (this.parameters_ == undefined) {
            return new Parameters("");
        } else {
            return this.parameters_;
        }
    }

    toString(): string {
        if (this.parameters_ != undefined) {
            return this.keyExpr_.toString() + "?" + this.parameters_.toString()
        } else {
            return this.keyExpr_.toString()
        }
    }



    /**
     * New Function to create a selector from Selector / KeyExpr and Parameters
     * @returns Selector
     */
    static from(selector: IntoSelector): Selector {
        if (selector instanceof Selector) {
            return selector;
        } else if (selector instanceof KeyExpr) {
            return new Selector(selector, undefined);
        } else if (Array.isArray(selector)) {
            return new Selector(selector[0], selector[1]);
        } else {
            let splitString = selector.split("?")
            if (splitString.length == 1) {
                return new Selector(new KeyExpr(selector));
            } else if (splitString.length == 2 && splitString[0] != undefined && splitString[1] != undefined) {
                return new Selector(new KeyExpr(splitString[0]), new Parameters(splitString[1]));
            } else {
                throw "Error: Invalid Selector, expected format <KeyExpr>?<Parameters>";
            }
        }
    }

    /**
     * New Function to create a selector from Selector / KeyExpr and Parameters
     * @returns Selector
     */
    constructor(keyexpr: IntoKeyExpr, parameters?: IntoParameters) {
        this.keyExpr_ = new KeyExpr(keyexpr);
        if (parameters == undefined) {
            this.parameters_ = new Parameters("")
        } else {
            this.parameters_ = new Parameters(parameters);
        }
    }

}