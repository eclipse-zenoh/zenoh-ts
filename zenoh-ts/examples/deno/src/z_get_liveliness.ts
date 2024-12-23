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

import {
  deserialize_string, Sample, Config, Session, KeyExpr,
  Receiver,
  RecvErr,
  ReplyError
} from "@eclipse-zenoh/zenoh-ts";
import { Duration } from 'typed-duration'
const { seconds } = Duration

export async function main() {

  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  let key_expr = new KeyExpr("group1/**");
  console.log("Sending Liveliness Query '", key_expr.toString(),"'");

  let receiver : Receiver= session.liveliness().get(key_expr, {timeout: seconds.of(20)}) as Receiver;
 
  let reply = await receiver.receive();
  
  while (reply != RecvErr.Disconnected) {
    if (reply == RecvErr.MalformedReply) {
      console.warn("MalformedReply");
    } else {
      let resp = reply.result();
      if (resp instanceof Sample) {
        let sample: Sample = resp;
        console.warn(">> Alive token ('", sample.keyexpr() ,")");
      } else {
        let reply_error: ReplyError = resp;
        console.warn(">> Received (ERROR: '", reply_error.payload().deserialize(deserialize_string), "')");
      }
    }
    reply = await receiver.receive();
  }

  console.warn("End Liveliness query");
}

main()