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
  Config, Subscriber, Session, KeyExpr, RingChannel, ChannelReceiver, Sample,
  SampleKind
} from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.warn('Opening session...');
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const keyExpr = new KeyExpr(args.key);

  console.warn(`Declaring Subscriber on '${args.key}'...`);
  const pollSubscriber: Subscriber = await session.declareSubscriber(keyExpr, { handler: new RingChannel(10) });
  console.warn("Press CTRL-C to quit...");
  
  for await (const sample of pollSubscriber.receiver() as ChannelReceiver<Sample>) {
    console.warn!(
      ">> [Subscriber] Received " +
      SampleKind[sample.kind()] + " ('" +
      sample.keyexpr() + "': '" +
      sample.payload().toString() + "')",
    );
  }

  await pollSubscriber.undeclare();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/**";

  constructor() {
    super();
    this.parse();
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      key: "Key expression for the subscriber"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}

main();
