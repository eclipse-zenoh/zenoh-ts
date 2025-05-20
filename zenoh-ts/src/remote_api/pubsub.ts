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
  private key_expr: String;
  private publisher_id: UUIDv4;
  private session_ref: RemoteSession;
  private undeclared: boolean;

  constructor(
    key_expr: String,
    publisher_id: UUIDv4,
    session_ref: RemoteSession,
  ) {
    this.key_expr = key_expr;
    this.publisher_id = publisher_id;
    this.session_ref = session_ref;
    this.undeclared = false;
  }

  async put(
    payload: Array<number>,
    attachment: Array<number> | null,
    encoding: string | null,
    timestamp: string | null,
  ) {
    if (this.undeclared == true) {
      let message =
        "Publisher keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.publisher_id +
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
        id: this.publisher_id.toString(),
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        attachment: optionalAttachment,
        encoding: encoding,
        timestamp: timestamp
      },
    };
    await this.session_ref.send_data_message(dataMsg);
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
        id: this.publisher_id.toString(),
        attachment: optionalAttachment,
        timestamp: timestamp,
      },
    };
    await this.session_ref.send_data_message(dataMsg);
  }

  async undeclare() {
    if (this.undeclared == true) {
      let message =
        "Publisher keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.publisher_id +
        "` already undeclared";
      console.warn(message);
      return;
    }
    this.undeclared = true;
    let ctrlMessage: ControlMsg = {
      UndeclarePublisher: this.publisher_id.toString(),
    };
    await this.session_ref.send_ctrl_message(ctrlMessage);
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
  private key_expr: String;
  private subscriber_id: UUIDv4;
  private session_ref: RemoteSession;

  private constructor(
    key_expr: String,
    subscriber_id: UUIDv4,
    session_ref: RemoteSession,
  ) {
    this.key_expr = key_expr;
    this.subscriber_id = subscriber_id;
    this.session_ref = session_ref;
  }

  static new(
    key_expr: String,
    subscriber_id: UUIDv4,
    session_ref: RemoteSession,
  ) {

    return new RemoteSubscriber(
      key_expr,
      subscriber_id,
      session_ref,
    );
  }

  async undeclare() {
    if (!this.session_ref.undeclare_subscriber(this.subscriber_id)) {
      console.warn("Subscriber keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.subscriber_id +
        "` already closed");
      return;
    }

    let ctrlMessage: ControlMsg = {
      UndeclareSubscriber: this.subscriber_id.toString(),
    };
    await this.session_ref.send_ctrl_message(ctrlMessage);
  }
}
