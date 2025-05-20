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
  Config, Subscriber, Session, KeyExpr, RingChannel, ChannelReceiver, Sample
} from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.warn('Opening session...');
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(args.key);

  console.warn(`Declaring Subscriber on '${args.key}'...`);
  const poll_subscriber: Subscriber = await session.declareSubscriber(key_expr, { handler: new RingChannel(10) });
  console.warn("Press CTRL-C to quit...");
  
  for await (const sample of poll_subscriber.receiver() as ChannelReceiver<Sample>) {
    console.warn!(
      ">> [Subscriber] Received " +
      sample.kind() + " ('" +
      sample.keyexpr() + "': '" +
      sample.payload().toString() + "')",
    );
  }

  await poll_subscriber.undeclare();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/**";

  constructor() {
    super();
    this.parse();
  }

  public get_named_args_help(): Record<string, string> {
    return {
      key: "Key expression for the subscriber"
    };
  }

  get_positional_args_help(): [string, string][] {
    return [];
  }
}

main();
