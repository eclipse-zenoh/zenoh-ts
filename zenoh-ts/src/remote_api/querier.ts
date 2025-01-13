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
import { SimpleChannel } from "channel-ts";
import { ReplyWS } from "./interface/ReplyWS.js";
import { encode as b64_str_from_bytes } from "base64-arraybuffer";

export class RemoteQuerier {
    private querier_id: UUIDv4;
    private session_ref: RemoteSession;

    constructor(
        querier_id: UUIDv4,
        session_ref: RemoteSession,
    ) {
        this.querier_id = querier_id;
        this.session_ref = session_ref;
    }

    undeclare() {

        let control_msg: ControlMsg = {
            UndeclareQuerier: this.querier_id as string
        };

        this.session_ref.send_ctrl_message(control_msg);
    }

    get(
        _encoding?: string,
        _parameters?: string,
        _attachment?: Array<number>,
        _payload?: Array<number>,
    ): SimpleChannel<ReplyWS> {
        let get_id = uuidv4();
        let channel: SimpleChannel<ReplyWS> = new SimpleChannel<ReplyWS>();
        this.session_ref.get_receiver.set(get_id, channel);

        let payload = undefined;
        if (_payload != undefined) {
            payload = b64_str_from_bytes(new Uint8Array(_payload))
        }
        let attachment = undefined;
        if (_attachment != undefined) {
            attachment = b64_str_from_bytes(new Uint8Array(_attachment))
        }

        let control_msg: ControlMsg = {
            QuerierGet: {
                querier_id: this.querier_id as string,
                get_id: get_id,
                encoding: _encoding,
                payload: payload,
                attachment: attachment,
            }
        };

        this.session_ref.send_ctrl_message(control_msg);
        return channel;
    }

}


