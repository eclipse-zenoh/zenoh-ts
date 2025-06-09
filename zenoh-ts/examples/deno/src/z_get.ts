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

import { ReplyError, Config, Sample, Session, QueryTarget, ChannelReceiver, Reply } from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
const { milliseconds } = Duration
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  let args = new ParseArgs();

  console.warn("Opening session...");
  await using session = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Callback get query
  console.warn("Sending Query '" + args.selector + "'...");

  // const get_callback = function (reply: Reply) {
  //   let resp = reply.result();
  //   if (resp instanceof Sample) {
  //     let sample: Sample = resp;
  //     console.warn(">> Received ('", sample.keyexpr(), ":", sample.payload().toString()), "')");
  //   } else {
  //     let reply_error: ReplyError = resp;
  //     console.warn(">> Received (ERROR: '", reply_error.payload().toString(), "')");
  //   }
  // };

  // await session.get("demo/example/**", get_callback);

  // Poll receiver
  const receiver = await session.get(args.selector, { 
    payload: args.payload, 
    timeout: args.getTimeout(), 
    target: args.getQueryTarget() 
  });

  for await (const reply of receiver as ChannelReceiver<Reply>) {
    const resp = reply.result();
    if (resp instanceof Sample) {
      const sample: Sample = resp;
      console.warn(">> Received ('", sample.keyexpr().toString(), ":", sample.payload().toString(), "')");
    } else {
      const replyError: ReplyError = resp;
      console.warn(">> Received (ERROR: '{", replyError.payload().toString(), "}')");
    }
  }
  console.warn("Get Finished");
}

class ParseArgs extends BaseParseArgs {
  public selector: string = "demo/example/**";
  public payload: string = "";
  public target: string = "BEST_MATCHING";
  public timeout: number = 10000;

  constructor() {
    super();
    this.parse();
  }

  public getTimeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }

  public getQueryTarget(): QueryTarget {
    switch (this.target) {
      case "BEST_MATCHING":
        return QueryTarget.BEST_MATCHING;
      case "ALL":
        return QueryTarget.ALL;
      case "ALL_COMPLETE":
        return QueryTarget.ALL_COMPLETE;
      default:
        return QueryTarget.BEST_MATCHING;
    }
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      selector: "Selector for the query",
      payload: "Payload for the query",
      target: "Query target. Possible values: BEST_MATCHING, ALL, ALL_COMPLETE",
      timeout: "Timeout for the query"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}

main();
