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
  Sample, Config, Session, KeyExpr,
  ReplyError,
  ChannelReceiver,
  Reply
} from "@eclipse-zenoh/zenoh-ts";
import { Duration, Milliseconds } from 'typed-duration'
import { BaseParseArgs } from "./parse_args.ts";

const { milliseconds } = Duration

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const keyExpr = new KeyExpr(args.key);
  console.log(`Sending Liveliness Query '${args.key}'...`);

  const receiver = await session.liveliness().get(keyExpr, { timeout: args.getTimeout() });

  for await (const reply of receiver as ChannelReceiver<Reply>) {
      const resp = reply.result();
      if (resp instanceof Sample) {
        const sample: Sample = resp;
        console.warn(">> Alive token ('", sample.keyexpr().toString(), ")");
      } else {
        const replyError: ReplyError = resp;
        console.warn(">> Received (ERROR: '", replyError.payload().toString(), "')");
      }
  }
  console.warn("Liveliness query finished");
  await session.close();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "group1/**";
  public timeout: number = 10000;

  constructor() {
    super();
    this.parse();
  }

  public getTimeout(): Milliseconds {
    return milliseconds.of(this.timeout);
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      key: "Key expression for the liveliness query",
      timeout: "Timeout for the liveliness query"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}

main();
