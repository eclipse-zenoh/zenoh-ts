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

import { deserialize_string, ReplyError, Config, Receiver, RecvErr, Sample, Session, QueryTarget } from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
const { milliseconds } = Duration
import { ParseArgs } from "./parse_args.ts";

export async function main() {
  let args = new Args();

  console.warn("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Callback get query
  console.warn("Sending Query '" + args.selector + "'...");

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

  // await session.get("demo/example/**", get_callback);

  // Poll receiver
  const receiver: void | Receiver = session.get(args.selector, { 
    payload: args.payload, 
    timeout: args.get_timeout(), 
    target: args.get_query_target() 
  });
  if (!(receiver instanceof Receiver)) {
    return // Return in case of callback get query
  }

  let reply = await receiver.receive();
  while (reply != RecvErr.Disconnected) {
    if (reply == RecvErr.MalformedReply) {
      console.warn("MalformedReply");
    } else {
      const resp = reply.result();
      if (resp instanceof Sample) {
        const sample: Sample = resp;
        console.warn(">> Received ('", sample.keyexpr(), ":", sample.payload().deserialize(deserialize_string), "')");
      } else {
        const reply_error: ReplyError = resp;
        console.warn(">> Received (ERROR: '{", reply_error.payload().deserialize(deserialize_string), "}')");
      }
    }
    reply = await receiver.receive();
  }
  console.warn("Get Finished");
}

class Args extends ParseArgs {
  public selector: string = "demo/example/**";
  public payload: string = "";
  public target: string = "BEST_MATCHING";
  public timeout: number = 10000;

  constructor() {
    super();
    this.parse();
  }

  public get_timeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }

  public get_query_target(): QueryTarget {
    switch (this.target) {
      case "BEST_MATCHING":
        return QueryTarget.BestMatching;
      case "ALL":
        return QueryTarget.All;
      case "ALL_COMPLETE":
        return QueryTarget.AllComplete;
      default:
        return QueryTarget.BestMatching;
    }
  }

  static _help: Record<string, string> = { 
    selector: "Selector for the query", 
    payload: "Payload for the query", 
    target: "Query target. Possible values: BEST_MATCHING, ALL, ALL_COMPLETE", 
    timeout: "Timeout for the query" 
  };
}

main();