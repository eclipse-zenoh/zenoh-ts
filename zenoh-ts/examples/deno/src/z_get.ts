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
import { parseArgs } from "@std/cli/parse-args";
import { Duration, Milliseconds } from 'typed-duration'
const { milliseconds } = Duration

interface Args {
  selector: string,
  payload?: string,
  target: string,
  timeout: number,
}

export async function main() {
  const [selector, payload, timeout, query_target] = get_args()

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

  // await session.get("demo/example/**", get_callback);
  console.warn("Start z_get")

  // Poll receiever
  const receiver: void | Receiver = session.get(selector, { payload: payload, timeout: timeout, target: query_target });
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



// Convienence function to parse command line arguments
function get_args(): [string, string | undefined, Milliseconds, QueryTarget] {
  const args: Args = parseArgs(Deno.args);
  let selector = "demo/example/**";
  let payload = undefined;
  let target = "BEST_MATCHING";
  let timeout: Milliseconds = milliseconds.of(10000)
  if (args.selector != undefined) {
    selector = args.selector
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


main()