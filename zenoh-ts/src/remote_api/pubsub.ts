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
import { encode as b64_str_from_bytes } from "base64-arraybuffer";

// Import interface
import { SampleWS } from "./interface/SampleWS.js";
import { DataMsg } from "./interface/DataMsg.js";
import { ControlMsg } from "./interface/ControlMsg.js";

// Remote Api
import { RemoteSession, UUIDv4 } from "./session.js";

function executeAsync(func: any) {
  setTimeout(func, 0);
}

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

  put(
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

    let optional_attachment = null;
    if (attachment != null) {
      optional_attachment = b64_str_from_bytes(new Uint8Array(attachment));
    }

    let data_msg: DataMsg = {
      PublisherPut: {
        id: this.publisher_id.toString(),
        payload: b64_str_from_bytes(new Uint8Array(payload)),
        attachment: optional_attachment,
        encoding: encoding,
        timestamp: timestamp
      },
    };
    this.session_ref.send_data_message(data_msg);
  }

  // Delete 
  delete(
    attachment: Array<number> | null,
    timestamp: string | null,
  ) {

    let optional_attachment = null;
    if (attachment != null) {
      optional_attachment = b64_str_from_bytes(new Uint8Array(attachment));
    }

    let data_msg: DataMsg = {
      PublisherDelete: {
        id: this.publisher_id.toString(),
        attachment: optional_attachment,
        timestamp: timestamp,
      },
    };
    this.session_ref.send_data_message(data_msg);
  }

  undeclare() {
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
    let ctrl_message: ControlMsg = {
      UndeclarePublisher: this.publisher_id.toString(),
    };
    this.session_ref.send_ctrl_message(ctrl_message);
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
  private callback?: (sample: SampleWS) => void;
  private rx: SimpleChannel<SampleWS>;

  private undeclared: boolean;

  private constructor(
    key_expr: String,
    subscriber_id: UUIDv4,
    session_ref: RemoteSession,
    rx: SimpleChannel<SampleWS>,
    callback?: (sample: SampleWS) => void,
  ) {
    this.key_expr = key_expr;
    this.subscriber_id = subscriber_id;
    this.session_ref = session_ref;
    this.rx = rx;
    this.callback = callback;
    this.undeclared = false;
  }

  static new(
    key_expr: String,
    subscriber_id: UUIDv4,
    session_ref: RemoteSession,
    rx: SimpleChannel<SampleWS>,
    callback?: (sample: SampleWS) => void,
  ) {
    // Note this will run this callback listenning for messages indefinitely
    if (callback != undefined) {
      executeAsync(async () => {
        for await (const message of rx) {
          callback(message);
        }
      });
    }

    return new RemoteSubscriber(
      key_expr,
      subscriber_id,
      session_ref,
      rx,
      callback,
    );
  }

  async receive(): Promise<SampleWS | void> {
    if (this.undeclared == true) {
      console.warn("Subscriber undeclared keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.subscriber_id +
        "`");
      return;
    }

    if (this.callback != undefined) {
      console.warn("Cannot Call receive on Subscriber created with callback:`" +
        this.key_expr +
        "` id:`" +
        this.subscriber_id +
        "`");
      return;
    }

    return this.rx.receive();
  }

  undeclare() {
    if (this.undeclared == true) {
      console.warn("Subscriber keyexpr:`" +
        this.key_expr +
        "` id:`" +
        this.subscriber_id +
        "` already closed");
      return;
    }

    this.undeclared = true;
    let ctrl_message: ControlMsg = {
      UndeclareSubscriber: this.subscriber_id.toString(),
    };
    this.session_ref.send_ctrl_message(ctrl_message);
    this.rx.close();
  }
}
