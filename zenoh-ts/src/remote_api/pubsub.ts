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

import { encode as b64_str_from_bytes } from "base64-arraybuffer";

// Import interface
import { DataMsg } from "./interface/DataMsg.js";
import { ControlMsg } from "./interface/ControlMsg.js";

// Remote Api
import { RemoteSession, UUIDv4 } from "./session.js";

// ██████  ███████ ███    ███  ██████  ████████ ███████   ██████  ██    ██ ██████  ██      ██ ███████ ██   ██ ███████ ██████
// ██   ██ ██      ████  ████ ██    ██    ██    ██        ██   ██ ██    ██ ██   ██ ██      ██ ██      ██   ██ ██      ██   ██
// ██████  █████   ██ ████ ██ ██    ██    ██    █████     ██████  ██    ██ ██████  ██      ██ ███████ ███████ █████   ██████
// ██   ██ ██      ██  ██  ██ ██    ██    ██    ██        ██      ██    ██ ██   ██ ██      ██      ██ ██   ██ ██      ██   ██
// ██   ██ ███████ ██      ██  ██████     ██    ███████   ██       ██████  ██████  ███████ ██ ███████ ██   ██ ███████ ██   ██

export class RemotePublisher {
  private undeclared: boolean = false;
  constructor(
    private keyExpr: String,
    private publisherId: UUIDv4,
    private sessionRef: RemoteSession,
  ) {}

  async put(
    payload: Array<number>,
    attachment: Array<number> | null,
    encoding: string | null,
    timestamp: string | null,
  ) {
    if (this.undeclared == true) {
      let message =
        "Publisher keyexpr:`" +
        this.keyExpr +
        "` id:`" +
        this.publisherId +
        "` already undeclared";
      console.warn(message);
      return;
    }

    let optionalAttachment = null;
    if (attachment != null) {
      optionalAttachment = b64_str_from_bytes(new Uint8Array(attachment));
    }

    let dataMsg: DataMsg = {
      PublisherPut: {
        id: this.publisherId.toString(),
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        attachment: optionalAttachment,
        encoding: encoding,
        timestamp: timestamp
      },
    };
    await this.sessionRef.send_data_message(dataMsg);
  }

  // Delete 
  async delete(
    attachment: Array<number> | null,
    timestamp: string | null,
  ) {

    let optionalAttachment = null;
    if (attachment != null) {
      optionalAttachment = b64_str_from_bytes(new Uint8Array(attachment));
    }

    let dataMsg: DataMsg = {
      PublisherDelete: {
        id: this.publisherId.toString(),
        attachment: optionalAttachment,
        timestamp: timestamp,
      },
    };
    await this.sessionRef.send_data_message(dataMsg);
  }

  async undeclare() {
    if (this.undeclared == true) {
      let message =
        "Publisher keyexpr:`" +
        this.keyExpr +
        "` id:`" +
        this.publisherId +
        "` already undeclared";
      console.warn(message);
      return;
    }
    this.undeclared = true;
    let ctrlMessage: ControlMsg = {
      UndeclarePublisher: this.publisherId.toString(),
    };
    await this.sessionRef.send_ctrl_message(ctrlMessage);
  }
}

// ██████  ███████ ███    ███  ██████  ████████ ███████     ███████ ██    ██ ██████  ███████  ██████ ██████  ██ ██████  ███████ ██████
// ██   ██ ██      ████  ████ ██    ██    ██    ██          ██      ██    ██ ██   ██ ██      ██      ██   ██ ██ ██   ██ ██      ██   ██
// ██████  █████   ██ ████ ██ ██    ██    ██    █████       ███████ ██    ██ ██████  ███████ ██      ██████  ██ ██████  █████   ██████
// ██   ██ ██      ██  ██  ██ ██    ██    ██    ██               ██ ██    ██ ██   ██      ██ ██      ██   ██ ██ ██   ██ ██      ██   ██
// ██   ██ ███████ ██      ██  ██████     ██    ███████     ███████  ██████  ██████  ███████  ██████ ██   ██ ██ ██████  ███████ ██   ██

// If defined with a Callback, All samples passed to the Callback,
// else, must call receive on the 
export class RemoteSubscriber {
  constructor(
    private keyExpr: String,
    private subscriberId: UUIDv4,
    private sessionRef: RemoteSession,
  ) {}

  async undeclare() {
    if (!this.sessionRef.undeclare_subscriber(this.subscriberId)) {
      console.warn("Subscriber keyexpr:`" +
        this.keyExpr +
        "` id:`" +
        this.subscriberId +
        "` already closed");
      return;
    }

    let ctrlMessage: ControlMsg = {
      UndeclareSubscriber: this.subscriberId.toString(),
    };
    await this.sessionRef.send_ctrl_message(ctrlMessage);
  }
}
