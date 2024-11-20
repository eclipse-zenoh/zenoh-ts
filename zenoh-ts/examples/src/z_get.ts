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

import { deserialize_string, ReplyError, Config, Receiver, RecvErr, Reply, Sample, Session} from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Callback get query
  // const get_callback = async function (reply: Reply): Promise<void> {
  //   let resp = reply.result();
  //   if (resp instanceof Sample) {
  //     let sample: Sample = resp;
  //     console.warn(">> Received ('", sample.keyexpr(), ":", sample.payload().deserialize(deserialize_string), "')");
  //   } else {
  //     let reply_error: ReplyError = resp;
  //     console.warn(">> Received (ERROR: '", reply_error.payload().deserialize(deserialize_string), "')");
  //   }
  // };

  console.warn("Start z_get")
  // await session.get("demo/example/**", get_callback);

  // Poll receiever
  let receiver: void | Receiver = await session.get("demo/example/**");
  if (!(receiver instanceof Receiver)) {
    return // Return in case of callback get query
  }

  let reply = await receiver.receive();
  while (reply != RecvErr.Disconnected) {
    if (reply == RecvErr.MalformedReply) {
      console.warn("MalformedReply");
    } else {
      let resp = reply.result();
      if (resp instanceof Sample) {
        let sample: Sample = resp;
        console.warn(">> Received ('", sample.keyexpr(), ":", sample.payload().deserialize(deserialize_string), "')");
      } else {
        let reply_error: ReplyError = resp;
        console.warn(">> Received (ERROR: '{", reply_error.payload().deserialize(deserialize_string), "}')");
      }
    }
    reply = await receiver.receive();
  }
  console.warn("Get Finished");
}


main()