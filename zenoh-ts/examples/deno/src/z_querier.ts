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

import { ReplyError, Config, Sample, Session, QueryTarget, Selector, ChannelReceiver, Reply, } from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
import { BaseParseArgs } from "./parse_args.ts";

const { milliseconds } = Duration

export async function main() {
  const args = new ParseArgs();
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const querier = await session.declareQuerier(args.getSelector().keyExpr(), {
    target: args.getQueryTarget(),
    timeout: args.getTimeout(),
  });

  for (let i = 0; i < 1000; i++) {
    await sleep(1000);
    const payload = `[${i}] ${args.payload}`;
    console.log!(`Querying '${args.getSelector().toString()}' with payload: '${payload}'...`);
    const receiver = await querier.get({ parameters: args.getSelector().parameters(), payload: payload }) as ChannelReceiver<Reply>;

    for await (const reply of receiver) {
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

  public getNamedArgsHelp(): Record<string, string> {
    return {
      selector: "Selector for the query",
      payload: "Payload for the query",
      target: "Target for the query",
      timeout: "Timeout for the query in milliseconds"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
   }

  public getSelector(): Selector {
    const [keyExpr, parameters] = this.selector.split("?");
    return new Selector(keyExpr, parameters);
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

  public getTimeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
