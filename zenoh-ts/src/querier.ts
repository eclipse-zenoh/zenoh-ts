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

// Remote API
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";
// API
import { IntoZBytes, ZBytes } from "./z_bytes.js";
import { CongestionControl, ConsolidationMode, Priority, } from "./sample.js";
import { TimeDuration } from "typed-duration";
import { RemoteQuerier } from "./remote_api/querier.js";
import { KeyExpr } from "./key_expr.js";
import { Parameters, Reply, ReplyFromReplyWS } from "./query.js";
import { ChannelReceiver, FifoChannel, Handler, into_cb_drop_receiver } from "./remote_api/channels.js";
import { Encoding } from "./encoding.js";

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
export function query_target_to_int(queryTarget?: QueryTarget): number {
  switch (queryTarget) {
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
export function locality_to_int(queryTarget?: Locality): number {
  switch (queryTarget) {
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
export function reply_key_expr_to_int(queryTarget?: ReplyKeyExpr): number {
  switch (queryTarget) {
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
  congestionControl?: CongestionControl,
  consolidation?: ConsolidationMode,
  priority?: Priority,
  express?: boolean,
  target: QueryTarget
  timeout?: TimeDuration,
  allowedDestination?: Locality
  acceptReplies?: ReplyKeyExpr
}

export interface QuerierGetOptions {
  encoding?: Encoding,
  payload?: IntoZBytes,
  attachment?: IntoZBytes,
  handler?: Handler<Reply>
}

/**
 * Queryable class used to receive Query's from the network and handle Reply's
 * created by Session.declare_queryable
 */
export class Querier {
  private undeclared: boolean = false;
  /** 
   * @ignore
   */
  async [Symbol.asyncDispose]() {
    await this.undeclare();
  }

  /** 
   * @ignore
   * Returns a Querier 
   * Note! : user must use declare_querier on a session
   */
  constructor(
    private remoteQuerier: RemoteQuerier,
    private keyExpr_: KeyExpr,
    private congestionControl_: CongestionControl,
    private priority_: Priority,
    private acceptReplies_: ReplyKeyExpr,
  ) {}

  /**
   * Undeclares Queryable
   * @returns void
   */
  async undeclare() {
    this.undeclared = true;
    await this.remoteQuerier.undeclare()
  }

  /**
   * returns key expression for this Querier
   * @returns KeyExpr
   */
  keyExpr() {
    return this.keyExpr_;
  }

  /**
   * returns Congestion Control for this Querier
   * @returns CongestionControl
   */
  congestionControl() {
    return this.congestionControl_;
  }

  /**
   * returns Priority for this Querier
   * @returns Priority
   */
  priority() {
    return this.priority_;
  }

  /**
   * returns ReplyKeyExpr for this Querier
   * @returns ReplyKeyExpr
   */
  acceptReplies() {
    return this.acceptReplies_;
  }

  /**
   * Issue a Get request on this querier
   * @returns Promise <Receiever | void>
   */
  async get(
    parameters?: Parameters,
    getOptions?: QuerierGetOptions): Promise<ChannelReceiver<Reply> | undefined> {
    if (this.undeclared == true) {
      return undefined;
    }
    let payload;
    let attachment;
    let parametersStr;
    let encoding = getOptions?.encoding?.toString()

    if (getOptions?.attachment != undefined) {
      attachment = Array.from(new ZBytes(getOptions?.attachment).toBytes())
    }
    if (getOptions?.payload != undefined) {
      payload = Array.from(new ZBytes(getOptions?.payload).toBytes())
    }
    if (parameters != undefined) {
      parametersStr = parameters.toString();
    }

    let handler = getOptions?.handler ?? new FifoChannel<Reply>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);
    
    let callbackWS = (replyWS: ReplyWS): void => {
      let reply: Reply = ReplyFromReplyWS(replyWS);
      callback(reply);
    }

    await this.remoteQuerier.get(
      callbackWS,
      drop,
      encoding,
      parametersStr,
      attachment,
      payload,
    );

    return receiver;
  }
}
