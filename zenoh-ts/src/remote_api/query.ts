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
  constructor(
    private keyExpr: String,
    private queryableId: UUIDv4,
    private sessionRef: RemoteSession,
  ) {}

  async undeclare() {
    if (!this.sessionRef.undeclareQueryable(this.queryableId.toString())) {
      console.warn("Queryable keyexpr:`" +
        this.keyExpr +
        "` id:`" +
        this.queryableId +
        "` already closed");
      return;
    }

    let ctrlMessage: ControlMsg = {
      UndeclareQueryable: this.queryableId.toString(),
    };
    await this.sessionRef.sendCtrlMessage(ctrlMessage);
  }
}
