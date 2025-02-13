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

// External
import { SimpleChannel } from "channel-ts";
import { encode as b64_str_from_bytes, decode as b64_bytes_from_str, } from "base64-arraybuffer";
// Remote API
import { RemoteQueryable } from "./remote_api/query.js";
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";
import { QueryReplyVariant } from "./remote_api/interface/QueryReplyVariant.js";
import { ReplyErrorWS } from "./remote_api/interface/ReplyErrorWS.js";
import { UUIDv4 } from "./remote_api/session.js";
import { QueryWS } from "./remote_api/interface/QueryWS.js";
import { QueryReplyWS } from "./remote_api/interface/QueryReplyWS.js";
// API
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { congestion_control_to_int, CongestionControl, Priority, priority_to_int, Sample, Sample_from_SampleWS } from "./sample.js";
import { Encoding } from "./encoding.js";
import { Timestamp } from "./timestamp.js";
import { B64String } from "./remote_api/interface/B64String.js";




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
  private _remote_queryable: RemoteQueryable;
  private _callback_queryable;
  /** Finalization registry used for cleanup on drop
   * @ignore 
   */
  static registry: FinalizationRegistry<RemoteQueryable> = new FinalizationRegistry((r_queryable: RemoteQueryable) => r_queryable.undeclare());

  /** 
   * @ignore
   */
  dispose() {
    this.undeclare();
    Queryable.registry.unregister(this);
  }
  /** 
   * Returns a Queryable 
   * Note! : user must use declare_queryable on a session
   */
  constructor(remote_queryable: RemoteQueryable, callback_queryable: boolean) {
    this._remote_queryable = remote_queryable;
    this._callback_queryable = callback_queryable;
    Queryable.registry.register(this, remote_queryable, this)
  }

  /**
   * receive next Query of this Queryable
   * @returns Promise <Query | void>
   */
  async receive(): Promise<Query | void> {

    if (this._callback_queryable === true) {
      let message = "Cannot call `receive()` on Subscriber created with callback:";
      console.warn(message);
      return
    }

    // QueryWS -> Query
    let opt_query_ws = await this._remote_queryable.receive();
    if (opt_query_ws != undefined) {
      let query_ws = opt_query_ws[0];
      let reply_tx = opt_query_ws[1];
      return QueryWS_to_Query(query_ws, reply_tx);
    } else {
      console.warn("Receieve returned unexpected void from RemoteQueryable");
      return;
    }
  }

  /**
   * Undeclares Queryable
   * @returns void
   */
  async undeclare() {
    this._remote_queryable.undeclare();
    Queryable.registry.unregister(this);
  }

}

/**
 * Convenience function to convert between QueryWS and Query 
 * @ignore
 */
export function QueryWS_to_Query(
  query_ws: QueryWS,
  reply_tx: SimpleChannel<QueryReplyWS>,
): Query {
  let key_expr: KeyExpr = new KeyExpr(query_ws.key_expr);
  let payload: ZBytes | undefined = undefined;
  let attachment: ZBytes | undefined = undefined;
  let parameters: Parameters = new Parameters(query_ws.parameters);
  let encoding: Encoding | undefined = undefined;

  if (query_ws.payload != null) {
    payload = new ZBytes(query_ws.payload);
  }
  if (query_ws.attachment != null) {
    attachment = new ZBytes(query_ws.attachment);
  }
  if (query_ws.encoding != null) {
    encoding = Encoding.from_string(query_ws.encoding);
  }

  return new Query(
    query_ws.query_uuid,
    key_expr,
    parameters,
    payload,
    attachment,
    encoding,
    reply_tx,
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
  congestion_control?: CongestionControl,
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
  congestion_control?: CongestionControl,
  express?: boolean,
  timestamp?: Timestamp;
  attachment?: IntoZBytes
}

/**
 * Query Class to handle  
 */
export class Query {
  private _query_id: UUIDv4;
  private _key_expr: KeyExpr;
  private _parameters: Parameters;
  private _payload: ZBytes | undefined;
  private _attachment: ZBytes | undefined;
  private _encoding: Encoding | undefined;
  private _reply_tx: SimpleChannel<QueryReplyWS>;

  /**
    * New Function Used to Construct Query, 
    * Note: Users should not need to call this function
    * But will receieve 'Query's from Queryables 
    */
  constructor(
    query_id: UUIDv4,
    key_expr: KeyExpr,
    parameters: Parameters,
    payload: ZBytes | undefined,
    attachment: ZBytes | undefined,
    encoding: Encoding | undefined,
    reply_tx: SimpleChannel<QueryReplyWS>,
  ) {
    this._query_id = query_id;
    this._key_expr = key_expr;
    this._parameters = parameters;
    this._payload = payload;
    this._attachment = attachment;
    this._encoding = encoding;
    this._reply_tx = reply_tx;
  }

  /**
   * gets an selector of Query
   * @returns Selector
   */
  selector() {
    return new Selector(this._key_expr, this._parameters)
  }
  /**
   * gets the KeyExpr of Query
   * @returns KeyExpr
   */
  key_expr(): KeyExpr {
    return this._key_expr;
  }
  /**
   * gets the Parameters of Query
   * @returns Parameters
   */
  parameters(): Parameters {
    return this._parameters;
  }
  /**
    * gets the Optioanl payload of Query
    * @returns ZBytes | undefined
    */
  payload(): ZBytes | undefined {
    return this._payload;
  }
  /**
    * gets the Optional Encoding of a Query
    * @returns Encoding | undefined
    */
  encoding(): Encoding | undefined {
    return this._encoding;
  }
  /**
    * gets the Optional Attachment of a Query
    * @returns ZBytes | undefined
    */
  attachment(): ZBytes | undefined {
    return this._attachment;
  }

  // Send Reply here.
  private reply_ws(variant: QueryReplyVariant): void {
    let reply: QueryReplyWS = {
      query_uuid: this._query_id as string,
      result: variant,
    };
    this._reply_tx.send(reply);
  }

  /**
    * Sends a Reply to for Query
    * @param {IntoKeyExpr} key_expr 
    * @param {IntoZBytes} payload
    * @param {ReplyOptions=} options
    * @returns void
    */
  reply(key_expr: IntoKeyExpr, payload: IntoZBytes, options?: ReplyOptions): void {
    let _key_expr: KeyExpr = new KeyExpr(key_expr);
    let z_bytes: ZBytes = new ZBytes(payload);
    let opt_attachment: B64String | null = null;
    if (options?.attachment != undefined) {
      opt_attachment = b64_str_from_bytes(new ZBytes(options?.attachment).to_bytes());
    }
    let qr_variant: QueryReplyVariant = {
      Reply: {
        key_expr: _key_expr.toString(),
        payload: b64_str_from_bytes(z_bytes.to_bytes()),
        encoding: options?.encoding?.toString() ?? null,
        priority: priority_to_int(options?.priority),
        congestion_control: congestion_control_to_int(options?.congestion_control),
        express: options?.express ?? false,
        timestamp: options?.timestamp?.toString() ?? null,
        attachment: opt_attachment
      },
    };
    this.reply_ws(qr_variant);
  }
  /**
  * Sends an Error Reply to a query
  * @param {IntoZBytes} payload
  * @param {ReplyErrOptions=} options
  * @returns void
  */
  reply_err(payload: IntoZBytes, options?: ReplyErrOptions): void {
    let z_bytes: ZBytes = new ZBytes(payload);
    let qr_variant: QueryReplyVariant = {
      ReplyErr: {
        payload: b64_str_from_bytes(z_bytes.to_bytes()),
        encoding: options?.encoding?.toString() ?? null,
      },
    };
    this.reply_ws(qr_variant);
  }

  /**
    * Sends an Error Reply to a query
    * @param key_expr IntoKeyExpr
    * @param {ReplyDelOptions=} options
    * @returns void
    */
  reply_del(key_expr: IntoKeyExpr, options?: ReplyDelOptions): void {
    let _key_expr: KeyExpr = new KeyExpr(key_expr);
    let opt_attachment: B64String | null = null;
    if (options?.attachment != undefined) {
      opt_attachment = b64_str_from_bytes(new ZBytes(options?.attachment).to_bytes());
    }
    let qr_variant: QueryReplyVariant = {
      ReplyDelete: {
        key_expr: _key_expr.toString(),
        priority: priority_to_int(options?.priority),
        congestion_control: congestion_control_to_int(options?.congestion_control),
        express: options?.express ?? false,
        timestamp: options?.timestamp?.toString() ?? null,
        attachment: opt_attachment
      },
    };
    this.reply_ws(qr_variant);
  }

  toString(): string {
    return this.key_expr.toString() + "?" + this.parameters.toString()
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

  private _params: Map<string, string>;

  // constructor(p: Map<string, string>) {
  //   this._params = p;
  // }

  constructor(p: IntoParameters) {
    if (p instanceof Parameters) {
      this._params = p._params
    } else if (p instanceof Map) {
      this._params = p;
    } else {
      const params = new Map<string, string>();
      if (p.length != 0) {
        for (const pair of p.split(";") || []) {
          const [key, value] = pair.split("=");
          if (key != undefined && value != undefined) {
            params.set(key, value);
          }
        }
      }
      this._params = params;
    }
  }

  /**
   * Creates empty Parameters Structs
   * @returns void
   */
  static empty() {
    return new Parameters("");
  }

  /**
   * Creates empty Parameters Structs
   * @returns void
   */
  static equals() {
    return new Parameters("");
  }

  /**
   * removes a key from the parameters
   * @returns void
   */
  remove(key: string) {
    return this._params.delete(key);
  }

  /**
   * gets an iterator over the keys of the Parameters
   * @returns Iterator<string>
   */
  keys(): Iterator<string> {
    return this._params.values()
  }

  /**
   * gets an iterator over the values of the Parameters
   * @returns Iterator<string>
   */
  values(): Iterator<string> {
    return this._params.values()
  }

  /**
  * Returns true if properties does not contain anything.
  * @returns void
  */
  is_empty(): boolean {
    return (this._params.size == 0);
  }

  /**
   * checks if parameters contains key
   * @returns boolean
   */
  contains_key(key: string): boolean {
    return this._params.has(key)
  }

  /**
   * gets value with associated key, returning undefined if key does not exist
   * @returns string | undefined
   */
  get(key: string): string | undefined {
    return this._params.get(key)
  }

  /**
   * Inserts new key,value pair into parameter
   * @returns void
   */
  insert(key: string, value: string) {
    return this._params.set(key, value);
  }

  /**
   * extends this Parameters with the value of other parameters, overwriting `this` if keys match.  
   * @returns void
   */
  extend(other: IntoParameters) {
    let other_params = new Parameters(other);
    for (let [key, value] of other_params._params) {
      this._params.set(key, value)
    }
  }

  /**
   * returns the string representation of the 
   * @returns void
   */
  toString(): string {
    let output_string = "";
    for (let [key, value] of this._params) {
      output_string += key + "=" + value + ";"
    }
    output_string = output_string.substring(0, output_string.length - 1);

    return output_string;
  }

}


/**
 * ReplyError returned from a `get` on a session
 * 
 */
export class ReplyError {
  private _payload: ZBytes;
  private _encoding: Encoding;

  /**
   * Payload of Error Reply
   * @returns ZBytes
   */
  payload(): ZBytes {
    return this._payload;
  }

  /**
   * Encoding of Error Reply
   * @returns ZBytes
   */
  encoding(): Encoding {
    return this._encoding;
  }

  /**
    * ReplyError gets created by the reply of a `get` on a session
    * 
    */
  constructor(reply_err_ws: ReplyErrorWS) {
    let payload = new ZBytes(new Uint8Array(b64_bytes_from_str(reply_err_ws.payload)));
    let encoding = Encoding.from_string(reply_err_ws.encoding);
    this._encoding = encoding;
    this._payload = payload;
  }

}

/**
 * Reply object from a zenoh `get`
 */
export class Reply {
  private _result: Sample | ReplyError;

  /**
   * Payload of Error Reply
   * @returns Sample or ReplyError 
   */
  result(): Sample | ReplyError {
    return this._result;
  }

  /**
   * @ignore
   */
  constructor(reply_ws: ReplyWS) {
    if ("Ok" in reply_ws.result) {
      let sample_ws = reply_ws.result["Ok"];
      let sample = Sample_from_SampleWS(sample_ws);
      this._result = sample;
    } else {
      let sample_ws_err: ReplyErrorWS = reply_ws.result["Err"];
      let reply_error = new ReplyError(sample_ws_err);
      this._result = reply_error;
    }
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
  private _key_expr: KeyExpr;

  // Optional : parameter field
  private _parameters?: Parameters;

  /**
   * gets Key Expression part of Selector 
   * @returns KeyExpr
   */
  key_expr(): KeyExpr {
    return this._key_expr;
  }

  /**
   * gets Parameters part of Selector 
   * @returns Parameters
   */
  parameters(): Parameters {
    if (this._parameters == undefined) {
      return new Parameters("");
    } else {
      return this._parameters;
    }
  }

  toString(): string {
    if (this._parameters != undefined) {
      return this._key_expr.toString() + "?" + this._parameters?.toString()
    } else {
      return this._key_expr.toString()
    }
  }

  /**
   * New Function to create a selector from Selector / KeyExpr and Parameters
   * @returns Selector
   */
  constructor(selector: IntoSelector, parameters?: IntoParameters) {
    let key_expr: KeyExpr;
    if (selector instanceof Selector) {
      this._key_expr = selector._key_expr;
      this._parameters = selector._parameters;
      return;
    } else if (selector instanceof KeyExpr) {
      key_expr = selector;
    } else {
      key_expr = new KeyExpr(selector);
    }
    this._key_expr = key_expr;

    if (parameters == undefined) {
      this._parameters = new Parameters("")
    } else {
      this._parameters = new Parameters(parameters);
    }
  }

}