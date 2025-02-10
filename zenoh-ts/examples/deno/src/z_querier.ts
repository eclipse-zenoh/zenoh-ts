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

import { ReplyError, Config, Receiver, RecvErr, Sample, Session, QueryTarget, Selector, } from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
import { BaseParseArgs } from "./parse_args.ts";

const { milliseconds } = Duration

export async function main() {
  const args = new ParseArgs();
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const querier = session.declare_querier(args.get_selector().key_expr(), {
    target: args.get_query_target(),
    timeout: args.get_timeout(),
  });

  for (let i = 0; i < 1000; i++) {
    await sleep(1000);
    const payload = `[${i}] ${args.payload}`;
    const receiver = querier.get(args.get_selector().parameters(), { payload: payload }) as Receiver;

    let reply = await receiver.receive();

    while (reply != RecvErr.Disconnected) {
      if (reply == RecvErr.MalformedReply) {
        console.warn("MalformedReply");
      } else {
        const resp = reply.result();
        if (resp instanceof Sample) {
          const sample: Sample = resp;
          console.warn(">> Received ('", sample.keyexpr(), ":", sample.payload().to_string(), "')");
        } else {
          const reply_error: ReplyError = resp;
          console.warn(">> Received (ERROR: '{", reply_error.payload().to_string(), "}')");
        }
      }
      reply = await receiver.receive();
    }
    console.warn("Get Finished");
  }
}

class ParseArgs extends BaseParseArgs {
  public selector: string = "demo/example/**";
  public payload: string = "Querier Get from Zenoh-ts!";
  public target: string = "BEST_MATCHING";
  public timeout: number = 10000;

  constructor() {
    super();
    this.parse();
  }

  public get_help(): Record<string, string> {
    return {
      selector: "Selector for the query",
      payload: "Payload for the query",
      target: "Target for the query",
      timeout: "Timeout for the query in milliseconds"
    };
  }

  public get_selector(): Selector {
    const [key_expr, parameters] = this.selector.split("?");
    return new Selector(key_expr, parameters);
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

  public get_timeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()