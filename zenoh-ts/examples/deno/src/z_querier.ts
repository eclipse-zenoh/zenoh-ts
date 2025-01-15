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

import { deserialize_string, ReplyError, Config, Receiver, RecvErr, Sample, Session, QueryTarget, Selector, } from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
import { parseArgs } from "@std/cli/parse-args";

const { milliseconds } = Duration

interface Args {
  selector: string,
  payload?: string,
  target: string,
  timeout: number,
}

export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const [selector, _payload, timeout, query_target] = get_args()

  const querier = session.declare_querier(selector.key_expr(),
    {
      target: query_target,
      timeout: timeout,
    }
  );

  for (let i = 0; i < 1000; i++) {
    await sleep(1000)
    const payload = "[" + i + "]" + _payload;
    const receiver = querier.get(selector.parameters(), { payload: payload }) as Receiver;

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
}

// Convienence function to parse command line arguments
function get_args(): [Selector, string | undefined, Milliseconds, QueryTarget] {
  const args: Args = parseArgs(Deno.args);
  let selector = new Selector("demo/example/**");
  let payload = "Querier Get from Zenoh-ts!";
  let target = "BEST_MATCHING";
  let timeout: Milliseconds = milliseconds.of(10000)
  if (args.selector != undefined) {
    const [key_expr, parameters] = args.selector.split("?")
    selector = new Selector(key_expr, parameters);
  }
  if (args.payload != undefined) {
    payload = args.payload
  }
  if (args.timeout != undefined) {
    timeout = milliseconds.of(args.timeout)
  }
  if (args.target != undefined) {
    target = args.target
  }
  let query_target;
  switch (target) {
    case "BEST_MATCHING":
      query_target = QueryTarget.BestMatching
      break;
    case "ALL":
      query_target = QueryTarget.All
      break;
    case "ALL_COMPLETE":
      query_target = QueryTarget.AllComplete
      break;
    default:
      query_target = QueryTarget.BestMatching
  }
  return [selector, payload, timeout, query_target]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()