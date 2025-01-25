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
import { BaseParseArgs } from "./parse_args.ts";

const { milliseconds } = Duration

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(args.key);
  console.log("Sending Liveliness Query '", key_expr.toString(), "'");

  const receiver: Receiver = session.liveliness().get(key_expr, { timeout: args.get_timeout() }) as Receiver;

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

class ParseArgs extends BaseParseArgs {
  public key: string = "group1/**";
  public timeout: number = 10000;

  constructor() {
    super();
    this.parse();
  }

  public get_timeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }

  public get_help(): Record<string, string> {
    return {
      key: "Key expression for the liveliness query",
      timeout: "Timeout for the liveliness query"
    };
  }
}

main();