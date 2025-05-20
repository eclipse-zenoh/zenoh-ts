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

import { v4 as uuidv4 } from "uuid";
import { RemoteSession, UUIDv4 } from "./session.js";
import { ControlMsg } from "./interface/ControlMsg.js"
import { encode as b64_str_from_bytes } from "base64-arraybuffer";
import { ReplyCallback } from "./interface/ReplyWS.js";
import { Drop } from "./closure.js";

export class RemoteQuerier {
  constructor(
    private querierId: UUIDv4,
    private sessionRef: RemoteSession,
  ) {}

  async undeclare() {

    let controlMsg: ControlMsg = {
      UndeclareQuerier: this.querierId as string
    };

    await this.sessionRef.send_ctrl_message(controlMsg);
  }

  async get(
    callback: ReplyCallback,
    drop: Drop,
    encoding?: string,
    parameters?: string,
    _attachment?: Array<number>,
    _payload?: Array<number>,
  ) {
    let getId = uuidv4();
    this.sessionRef.getReceivers.set(getId, { callback, drop });

    let payload = undefined;
    if (_payload != undefined) {
      payload = b64_str_from_bytes(new Uint8Array(_payload))
    }
    let attachment = undefined;
    if (_attachment != undefined) {
      attachment = b64_str_from_bytes(new Uint8Array(_attachment))
    }

        let controlMsg: ControlMsg = {
            QuerierGet: {
                querier_id: this.querierId as string,
                get_id: getId,
                parameters: parameters,
                encoding: encoding,
                payload: payload,
                attachment: attachment,
            }
        };

    await this.sessionRef.send_ctrl_message(controlMsg);
  }

}


