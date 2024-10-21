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

import { SimpleChannel } from "channel-ts";

// Import interface
import { ControlMsg } from "./interface/ControlMsg";

// Remote Api
import { RemoteSession, UUIDv4 } from "./session";
import { QueryWS } from "./interface/QueryWS";
import { DataMsg } from "./interface/DataMsg";
import { QueryableMsg } from "./interface/QueryableMsg";
import { QueryReplyWS } from "./interface/QueryReplyWS";

function executeAsync(func: any) {
  setTimeout(func, 0);
}

// ██████  ███████ ███    ███  ██████  ████████ ███████      ██████  ██    ██ ███████ ██████  ██    ██  █████  ██████  ██      ███████
// ██   ██ ██      ████  ████ ██    ██    ██    ██          ██    ██ ██    ██ ██      ██   ██  ██  ██  ██   ██ ██   ██ ██      ██
// ██████  █████   ██ ████ ██ ██    ██    ██    █████       ██    ██ ██    ██ █████   ██████    ████   ███████ ██████  ██      █████
// ██   ██ ██      ██  ██  ██ ██    ██    ██    ██          ██ ▄▄ ██ ██    ██ ██      ██   ██    ██    ██   ██ ██   ██ ██      ██
// ██   ██ ███████ ██      ██  ██████     ██    ███████      ██████   ██████  ███████ ██   ██    ██    ██   ██ ██████  ███████ ███████
//                                                              ▀▀

// If defined with a Callback, All samples passed to the Callback,
// else, must call receive on the
export class RemoteQueryable {
  private key_expr: String;
  private queryable_id: UUIDv4;
  private session_ref: RemoteSession;
  private callback?: (sample: QueryWS) => void;

  // To receieve Queries on the Websocket Channel
  private query_rx: SimpleChannel<QueryWS>;

  // To Send Query Replies on Websocket Channel
  reply_tx: SimpleChannel<QueryReplyWS>;

  private undeclared: boolean;

  private constructor(
    key_expr: String,
    queryable_id: UUIDv4,
    session_ref: RemoteSession,
    rx: SimpleChannel<QueryWS>,
    reply_tx: SimpleChannel<QueryReplyWS>,
    callback?: (sample: QueryWS) => void,
  ) {
    this.key_expr = key_expr;
    this.queryable_id = queryable_id;
    this.session_ref = session_ref;
    this.query_rx = rx;
    this.callback = callback;
    this.undeclared = false;
    this.reply_tx = reply_tx;
  }

  static new(
    key_expr: String,
    queryable_id: UUIDv4,
    session_ref: RemoteSession,
    query_rx: SimpleChannel<QueryWS>,
    reply_tx: SimpleChannel<QueryReplyWS>,
    callback?: (sample: QueryWS) => void,
  ) {
    // Note this will run this callback listenning for messages indefinitely
    // Async Function to handle Incoming Query's from Server
    if (callback != undefined) {
      executeAsync(async () => {
        for await (const message of query_rx) {
          callback(message);
        }
      });
    }

    // Async Function to sending Reply's to Server
    executeAsync(async () => {
      for await (const message of reply_tx) {
        let queryable_msg: QueryableMsg = { Reply: { reply: message } };
        let data_msg: DataMsg = { Queryable: queryable_msg };
        session_ref.send_data_message(data_msg);
      }
    });

    return new RemoteQueryable(
      key_expr,
      queryable_id,
      session_ref,
      query_rx,
      reply_tx,
      callback,
    );
  }

  async receive(): Promise<[QueryWS, SimpleChannel<QueryReplyWS>] | void> {
    if (this.undeclared == true) {
      console.log("Queryable keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.queryable_id +
        "` already undeclared");
      return undefined;
    }

    if (this.callback != undefined) {
      console.log("Cannot Call receive on Queryable created with callback:`" +
        this.key_expr +
        "` id:`" +
        this.queryable_id +
        "`");
      return undefined;
    }

    return [await this.query_rx.receive(), this.reply_tx];
  }

  undeclare() {
    if (this.undeclared == true) {
      console.log("Queryable keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.queryable_id +
        "` already closed");
      return;
    }

    this.undeclared = true;
    let ctrl_message: ControlMsg = {
      UndeclareQueryable: this.queryable_id.toString(),
    };
    this.session_ref.send_ctrl_message(ctrl_message);
    this.query_rx.close();
  }
}
