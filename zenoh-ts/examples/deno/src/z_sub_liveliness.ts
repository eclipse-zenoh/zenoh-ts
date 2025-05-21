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
  Config, Subscriber, Session, KeyExpr,
  SampleKind,
  ChannelReceiver,
  Sample
} from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const keyExpr = new KeyExpr(args.key);
  console.log(`Declaring Liveliness Subscriber on '${args.key}'`);

  const livelinessSubscriber: Subscriber = await session.liveliness().declareSubscriber(keyExpr, { history: args.history });

  for await (const sample of livelinessSubscriber.receiver() as ChannelReceiver<Sample>) {
    switch (sample.kind()) {
      case SampleKind.PUT: {
        console.log!(
          ">> [LivelinessSubscriber] New alive token ",
          sample.keyexpr().toString()
        );
        break;
      }
      case SampleKind.DELETE: {
        console.log!(
          ">> [LivelinessSubscriber] Dropped token ",
          sample.keyexpr().toString()
        );
        break;
      }
    }
  }
  await livelinessSubscriber.undeclare();
  await session.close();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "group1/**";
  public history: boolean = true;

  constructor() {
    super();
    this.parse();
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      key: "Key expression for the liveliness subscriber",
      history: "History flag for the liveliness subscriber"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}

main();
