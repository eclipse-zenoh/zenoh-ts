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

import { decode as b64_bytes_from_str, } from "base64-arraybuffer";
// Remote API
import { RemoteQueryable } from "./remote_api/query.js";
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";
import { ReplyErrorWS } from "./remote_api/interface/ReplyErrorWS.js";
import { RemoteSession, UUIDv4 } from "./remote_api/session.js";
import { QueryWS } from "./remote_api/interface/QueryWS.js";
// API
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { congestionControlToInt, CongestionControl, Priority, priorityToInt, Sample, sampleFromSampleWS } from "./sample.js";
import { Encoding } from "./encoding.js";
import { Timestamp } from "./timestamp.js";
import { ChannelReceiver } from "./remote_api/channels.js";
import { ReplyKeyExpr } from "./enums.js";




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
  constructor(private remoteQueryable: RemoteQueryable, private receiver_?: ChannelReceiver<Query>) {}

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
    this.remoteQueryable.undeclare();
  }

}

/**
 * Convenience function to convert between QueryWS and Query 
 * @ignore
 */
export function queryFromQueryWS(
  queryWS: QueryWS,
  sessionRef: RemoteSession
): Query {
  let keyExpr: KeyExpr = new KeyExpr(queryWS.key_expr);
  let payload: ZBytes | undefined = undefined;
  let attachment: ZBytes | undefined = undefined;
  let parameters: Parameters = new Parameters(queryWS.parameters);
  let encoding: Encoding | undefined = undefined;

  if (queryWS.payload != null) {
    payload = new ZBytes(new Uint8Array(b64_bytes_from_str(queryWS.payload)));
  }
  if (queryWS.attachment != null) {
    attachment = new ZBytes(new Uint8Array(b64_bytes_from_str(queryWS.attachment)));
  }
  if (queryWS.encoding != null) {
    encoding = Encoding.fromString(queryWS.encoding);
  }

  return new Query(
    queryWS.query_uuid,
    keyExpr,
    parameters,
    payload,
    attachment,
    encoding,
    sessionRef,
  );
}

//  ██████  ██    ██ ███████ ██████  ██    ██
// ██    ██ ██    ██ ██      ██   ██  ██  ██
// ██    ██ ██    ██ █████   ██████    ████
// ██ ▄▄ ██ ██    ██ ██      ██   ██    ██
//  ██████   ██████  ███████ ██   ██    ██
//     ▀▀

/**
 * Options for a Query::reply operation
 * @prop {Encoding=} encoding - Encoding type of payload 
 * @prop {Priority=} priority - priority of the written data
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {boolean=} express  - Express 
 * @prop {Timestamp=} timestamp - Timestamp of the message
 * @prop {ConsolidationMode=} consolidation - consolidation mode
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
*/
export interface ReplyOptions {
  encoding?: Encoding,
  priority?: Priority,
  congestionControl?: CongestionControl,
  express?: boolean,
  timestamp?: Timestamp;
  attachment?: IntoZBytes
}

/**
 * Options for a Query::reply_err operation
 * @prop {Encoding=} encoding - Encoding type of payload
 */
export interface ReplyErrOptions {
  encoding?: Encoding,
}

/**
 * Options for a Query::reply_del operation
 * @prop {Priority=} priority - priority of the written data
 * @prop {CongestionControl=} congestion_control - congestion_control applied when routing the data
 * @prop {boolean=} express  - Express
 * @prop {Timestamp=} timestamp - Timestamp of the message
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
 * @prop {ConsolidationMode=} consolidation - consolidation mode
 * @prop {IntoZBytes=} attachment - Additional Data sent with the request
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
    public readonly queryId_: number,
    public readonly keyexpr_: KeyExpr,
    public readonly parameters_: Parameters,
    public readonly payload_: ZBytes | undefined,
    public readonly encoding_: Encoding | undefined,
    public readonly attachment_: ZBytes | undefined,
    public readonly replyKeyExpr_: ReplyKeyExpr,
  ) {}
}

/**
 * Query Class to handle  
 */
export class Query {
  /**
    * @ignore  
    * New Function Used to Construct Query, 
    * Note: Users should not need to call this function
    * But will receieve 'Query's from Queryables 
    */
  constructor(
    private queryId: UUIDv4,
    private keyExpr_: KeyExpr,
    private parameters_: Parameters,
    private payload_: ZBytes | undefined,
    private attachment_: ZBytes | undefined,
    private encoding_: Encoding | undefined,
    private sessionRef: RemoteSession,
  ) {}

  /**
   * gets an selector of Query
   * @returns Selector
   */
  selector() {
    return new Selector(this.keyExpr_, this.parameters_)
  }
  /**
   * gets the KeyExpr of Query
   * @returns KeyExpr
   */
  keyExpr(): KeyExpr {
    return this.keyExpr_;
  }
  /**
   * gets the Parameters of Query
   * @returns Parameters
   */
  parameters(): Parameters {
    return this.parameters_;
  }
  /**
    * gets the Optioanl payload of Query
    * @returns ZBytes | undefined
    */
  payload(): ZBytes | undefined {
    return this.payload_;
  }
  /**
    * gets the Optional Encoding of a Query
    * @returns Encoding | undefined
    */
  encoding(): Encoding | undefined {
    return this.encoding_;
  }
  /**
    * gets the Optional Attachment of a Query
    * @returns ZBytes | undefined
    */
  attachment(): ZBytes | undefined {
    return this.attachment_;
  }

  /**
    * Sends a Reply to for Query
    * @param {IntoKeyExpr} intoKeyExpr 
    * @param {IntoZBytes} payload
    * @param {ReplyOptions=} options
    * @returns void
    */
  async reply(intoKeyExpr: IntoKeyExpr, payload: IntoZBytes, options?: ReplyOptions) {
    let keyExpr: KeyExpr = new KeyExpr(intoKeyExpr);

    let optAttachment: Uint8Array | null = null;
    if (options?.attachment != undefined) {
      optAttachment = new ZBytes(options?.attachment).toBytes();
    }

    await this.sessionRef.reply(
      this.queryId, 
      keyExpr.toString(),
      new ZBytes(payload).toBytes(),
      options?.encoding?.toString() ?? null,
      congestionControlToInt(options?.congestionControl),
      priorityToInt(options?.priority),
      options?.express ?? false,
      optAttachment,
      options?.timestamp?.toString() ?? null,
    );
  }
  /**
  * Sends an Error Reply to a query
  * @param {IntoZBytes} payload
  * @param {ReplyErrOptions=} options
  * @returns void
  */
  async replyErr(payload: IntoZBytes, options?: ReplyErrOptions) {
    await this.sessionRef.replyErr(
      this.queryId, 
      new ZBytes(payload).toBytes(),
      options?.encoding?.toString() ?? null,
    );
  }

  /**
    * Sends an Error Reply to a query
    * @param intoKeyExpr IntoKeyExpr
    * @param {ReplyDelOptions=} options
    * @returns void
    */
  async replyDel(intoKeyExpr: IntoKeyExpr, options?: ReplyDelOptions) {
    let keyExpr: KeyExpr = new KeyExpr(intoKeyExpr);

    let optAttachment: Uint8Array | null = null;
    if (options?.attachment != undefined) {
      optAttachment = new ZBytes(options?.attachment).toBytes();
    }

    await this.sessionRef.replyDel(
      this.queryId, 
      keyExpr.toString(),
      congestionControlToInt(options?.congestionControl),
      priorityToInt(options?.priority),
      options?.express ?? false,
      optAttachment,
      options?.timestamp?.toString() ?? null,
    );
  }

  toString(): string {
    return this.keyExpr.toString() + "?" + this.parameters.toString()
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
  constructor(private payload_: ZBytes, private encoding_: Encoding) {}
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
  constructor(private result_: Sample | ReplyError) {}
}

/**
 * Convenience function to convert between Reply and ReplyWS
 */
export function replyFromReplyWS(replyWS: ReplyWS) {
  if ("Ok" in replyWS.result) {
    let sampleWS = replyWS.result["Ok"];
    let sample = sampleFromSampleWS(sampleWS);
    return new Reply(sample);
  } else {
    let sampleWSEerr: ReplyErrorWS = replyWS.result["Err"];
    let replyError = new ReplyError(sampleWSEerr);
    return new Reply(replyError);
  }
}

// ███████ ███████ ██      ███████  ██████ ████████  ██████  ██████
// ██      ██      ██      ██      ██         ██    ██    ██ ██   ██
// ███████ █████   ██      █████   ██         ██    ██    ██ ██████
//      ██ ██      ██      ██      ██         ██    ██    ██ ██   ██
// ███████ ███████ ███████ ███████  ██████    ██     ██████  ██   ██



export type IntoSelector = Selector | IntoKeyExpr | String | string;
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
      return this.keyExpr_.toString() + "?" + this.parameters_?.toString()
    } else {
      return this.keyExpr_.toString()
    }
  }

  /**
   * New Function to create a selector from Selector / KeyExpr and Parameters
   * @returns Selector
   */
  constructor(selector: IntoSelector, parameters?: IntoParameters) {
    let keyExpr: KeyExpr;
    if (selector instanceof Selector) {
      this.keyExpr_ = selector.keyExpr_;
      this.parameters_ = selector.parameters_;
      return;
    } else if (selector instanceof KeyExpr) {
      keyExpr = selector;
    } else {
      keyExpr = new KeyExpr(selector);
    }
    this.keyExpr_ = keyExpr;

    if (parameters == undefined) {
      this.parameters_ = new Parameters("")
    } else {
      this.parameters_ = new Parameters(parameters);
    }
  }

}