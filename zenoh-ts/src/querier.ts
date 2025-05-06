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
// Remote API
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";
// API
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { CongestionControl, ConsolidationMode, Priority, } from "./sample.js";
import { TimeDuration } from "typed-duration";
import { RemoteQuerier } from "./remote_api/querier.js";
import { KeyExpr } from "./key_expr.js";
import { Encoding } from "crypto";
import { Receiver } from "./session.js";
import { Parameters, Reply } from "./query.js";
import { check_handler_or_callback, FifoChannel, Handler } from "./pubsub.js";

/**
 * Target For Get queries
 * @default BestMatching
 */
export enum QueryTarget {
  /// Let Zenoh find the BestMatching queryable capabale of serving the query.
  BestMatching,
  /// Deliver the query to all queryables matching the query's key expression.
  All,
  /// Deliver the query to all queryables matching the query's key expression that are declared as complete.
  AllComplete,
}

/**
 * Convenience function to convert between QueryTarget and int
 * @internal
 */
export function query_target_to_int(query_target?: QueryTarget): number {
  switch (query_target) {
    case QueryTarget.BestMatching:
      return 0;
    case QueryTarget.All:
      return 1;
    case QueryTarget.AllComplete:
      return 2;
    default:
      // Default is QueryTarget.BestMatching
      return 1;
  }
}

export enum Locality {
  SessionLocal,
  Remote,
  Any,
}

/**
 * Convenience function to convert between Locality and int
 * @internal
 */
export function locality_to_int(query_target?: Locality): number {
  switch (query_target) {
    case Locality.SessionLocal:
      return 0;
    case Locality.Remote:
      return 1;
    case Locality.Any:
      return 2;
    default:
      // Default is Locality.Any
      return 2;
  }
}

export enum ReplyKeyExpr {
  /// Accept replies whose key expressions may not match the query key expression.
  Any,
  /// Accept replies whose key expressions match the query key expression.
  MatchingQuery,
}

/**
 * Convenience function to convert between QueryTarget function and int
 * @internal
 */
export function reply_key_expr_to_int(query_target?: ReplyKeyExpr): number {
  switch (query_target) {
    case ReplyKeyExpr.Any:
      return 0;
    case ReplyKeyExpr.MatchingQuery:
      return 1;
    default:
      // Default is ReplyKeyExpr.MatchingQuery
      return 1;
  }
}

/**
 * QuerierOptions When initializing a Querier
 * 
 */
export interface QuerierOptions {
  congestion_control?: CongestionControl,
  consolidation?: ConsolidationMode,
  priority?: Priority,
  express?: boolean,
  target: QueryTarget
  timeout?: TimeDuration,
  allowed_destination?: Locality
  // 
  accept_replies?: ReplyKeyExpr
}

export interface QuerierGetOptions {
  encoding?: Encoding,
  payload?: IntoZBytes,
  attachment?: IntoZBytes,
  handler?: ((sample: Reply) => Promise<void>) | Handler
}

/**
 * Queryable class used to receive Query's from the network and handle Reply's
 * created by Session.declare_queryable
 */
export class Querier {
  private _remote_querier: RemoteQuerier;
  private _key_expr: KeyExpr;
  private _congestion_control: CongestionControl;
  private _priority: Priority;
  private _accept_replies: ReplyKeyExpr;
  private undeclared: boolean;
  /** 
   * @ignore
   */
  async asyncDispose() {
    await this.undeclare();
  }

  /** 
   * Returns a Queryable 
   * Note! : user must use declare_queryable on a session
   */
  constructor(
    remote_querier: RemoteQuerier,
    key_expr: KeyExpr,
    congestion_control: CongestionControl,
    priority: Priority,
    accept_replies: ReplyKeyExpr,
  ) {
    this._remote_querier = remote_querier;
    this._key_expr = key_expr;
    this._congestion_control = congestion_control;
    this._priority = priority;
    this._accept_replies = accept_replies;
    this.undeclared = false;
    // TODO: Look at finalization registry
    // Queryable.registry.register(this, remote_queryable, this)
  }

  /**
   * Undeclares Queryable
   * @returns void
   */
  async undeclare() {
    this.undeclared = true;
    // Finalization registry
    // Queryable.registry.unregister(this);
    await this._remote_querier.undeclare()
  }

  /**
   * returns key expression for this Querier
   * @returns KeyExpr
   */
  key_expr() {
    return this._key_expr;
  }

  /**
   * returns Congestion Control for this Querier
   * @returns CongestionControl
   */
  congestion_control() {
    return this._congestion_control;
  }

  /**
   * returns Priority for this Querier
   * @returns Priority
   */
  priority() {
    return this._priority;
  }

  /**
   * returns ReplyKeyExpr for this Querier
   * @returns ReplyKeyExpr
   */
  accept_replies() {
    return this._accept_replies;
  }

  /**
   * Issue a Get request on this querier
   * @returns Promise <Receiever | void>
   */
  async get(
    parameters?: Parameters,
    get_options?: QuerierGetOptions): Promise<Receiver | undefined> {
    if (this.undeclared == true) {
      return undefined;
    }
    let _payload;
    let _attachment;
    let _parameters;
    let _encoding = get_options?.encoding?.toString()

    if (get_options?.attachment != undefined) {
      _attachment = Array.from(new ZBytes(get_options?.attachment).to_bytes())
    }
    if (get_options?.payload != undefined) {
      _payload = Array.from(new ZBytes(get_options?.payload).to_bytes())
    }
    if (parameters != undefined) {
      _parameters = parameters.toString();
    }

    let handler;
    if (get_options?.handler !== undefined) {
      handler = get_options?.handler;
    } else {
      handler = new FifoChannel(256);
    }
    let [callback, handler_type] = check_handler_or_callback<Reply>(handler);

    let chan: SimpleChannel<ReplyWS> = await this._remote_querier.get(
      handler_type,
      _encoding,
      _parameters,
      _attachment,
      _payload,
    );


    if (callback != undefined) {
      executeAsync(async () => {
        for await (const message of chan) {
          // This horribleness comes from SimpleChannel sending a 0 when the channel is closed
          if (message != undefined && (message as unknown as number) != 0) {
            let reply = new Reply(message);
            if (callback != undefined) {
              callback(reply);
            }
          } else {
            break
          }
        }
      });
      return undefined;
    } else {
      let receiver = new Receiver(chan);
      return receiver;
    }

  }
}

function executeAsync(func: any) {
  setTimeout(func, 0);
}
