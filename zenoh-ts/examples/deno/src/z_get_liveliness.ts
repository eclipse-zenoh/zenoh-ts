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
import { Duration, Milliseconds } from 'typed-duration'
import { parseArgs } from "@std/cli/parse-args";

const { milliseconds } = Duration

interface Args {
  key: string;
  timeout: number
}

export async function main() {
  const [key_expr_str, timeout] = get_args();

  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(key_expr_str);
  console.log("Sending Liveliness Query '", key_expr.toString(), "'");

  const receiver: Receiver = session.liveliness().get(key_expr, { timeout: timeout }) as Receiver;

  let reply = await receiver.receive();

  while (reply != RecvErr.Disconnected) {
    if (reply == RecvErr.MalformedReply) {
      console.warn("MalformedReply");
    } else {
      const resp = reply.result();
      if (resp instanceof Sample) {
        const sample: Sample = resp;
        console.warn(">> Alive token ('", sample.keyexpr(), ")");
      } else {
        const reply_error: ReplyError = resp;
        console.warn(">> Received (ERROR: '", reply_error.payload().deserialize(deserialize_string), "')");
      }
    }
    reply = await receiver.receive();
  }
  console.warn("End Liveliness query");
}


function get_args(): [string, Milliseconds] {
  const args: Args = parseArgs(Deno.args);
  let key_expr_str = "group1/**";
  let timeout: Milliseconds = milliseconds.of(10000)
  if (args.key != undefined) {
    key_expr_str = args.key
  }
  if (args.timeout != undefined) {
    timeout = milliseconds.of(args.timeout)
  }
  return [key_expr_str, timeout]
}

main()