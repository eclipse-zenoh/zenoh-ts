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

import { Duration, deserialize_string, ReplyError, Config, Receiver, RecvErr, Reply, Sample, Session, QueryTarget } from "@eclipse-zenoh/zenoh-ts";


export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));


  let querier = session.declare_querier("demo/example/**",
    {
      target: QueryTarget.BestMatching,
      timeout: Duration.milliseconds.of(10000),
    }
  );

  for(let i =0; i<1000; i++) {
    await sleep(1000)
    let payload = "["+i+"] Querier Get from Zenoh-ts!";
    let receiver = querier.get({payload:payload}) as Receiver;
    
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

}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()