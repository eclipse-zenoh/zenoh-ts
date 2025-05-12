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

// Import interface
import { ControlMsg } from "./interface/ControlMsg.js";

// Remote Api
import { RemoteSession, UUIDv4 } from "./session.js";

// ██████  ███████ ███    ███  ██████  ████████ ███████      ██████  ██    ██ ███████ ██████  ██    ██  █████  ██████  ██      ███████
// ██   ██ ██      ████  ████ ██    ██    ██    ██          ██    ██ ██    ██ ██      ██   ██  ██  ██  ██   ██ ██   ██ ██      ██
// ██████  █████   ██ ████ ██ ██    ██    ██    █████       ██    ██ ██    ██ █████   ██████    ████   ███████ ██████  ██      █████
// ██   ██ ██      ██  ██  ██ ██    ██    ██    ██          ██ ▄▄ ██ ██    ██ ██      ██   ██    ██    ██   ██ ██   ██ ██      ██
// ██   ██ ███████ ██      ██  ██████     ██    ███████      ██████   ██████  ███████ ██   ██    ██    ██   ██ ██████  ███████ ███████
//                                                              ▀▀

export class RemoteQueryable {
  private key_expr: String;
  private queryable_id: UUIDv4;
  private session_ref: RemoteSession;

  private undeclared: boolean;

  private constructor(
    key_expr: String,
    queryable_id: UUIDv4,
    session_ref: RemoteSession,
  ) {
    this.key_expr = key_expr;
    this.queryable_id = queryable_id;
    this.session_ref = session_ref;
    this.undeclared = false;
  }

  static new(
    key_expr: String,
    queryable_id: UUIDv4,
    session_ref: RemoteSession,
  ) {
    return new RemoteQueryable(
      key_expr,
      queryable_id,
      session_ref,
    );
  }

  async undeclare() {
    if (this.undeclared == true) {
      console.warn("Queryable keyexpr:`" +
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
    await this.session_ref.send_ctrl_message(ctrl_message);
  }
}
