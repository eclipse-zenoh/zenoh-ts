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
  RingChannel, Config, Subscriber, Session, KeyExpr
} from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.log("Starting zenoh Subscriber!");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(args.key);

  const poll_subscriber: Subscriber = session.declare_subscriber(key_expr, { handler: new RingChannel(10) });

  let sample = await poll_subscriber.receive();

  while (sample != undefined) {
    console.warn!(
      ">> [Subscriber] Received " +
      sample.kind() + " ('" +
      sample.keyexpr() + "': '" +
      sample.payload().to_string() + "')",
    );
    sample = await poll_subscriber.receive();
  }

  poll_subscriber.undeclare();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/**";

  constructor() {
    super();
    this.parse();
  }

  public get_help(): Record<string, string> {
    return {
      key: "Key expression for the subscriber"
    };
  }
}

main();