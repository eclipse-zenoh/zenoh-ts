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

import { Encoding, CongestionControl, Sample, Config, Session } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const pub = await session.declarePublisher(
    "test/pong",
    {
      encoding: Encoding.default(),
      congestionControl: CongestionControl.BLOCK,
      express: !args.no_express,
    },
  );

  const subscriberCallback = function (sample: Sample) {
    pub.put(sample.payload());
  };

  await session.declareSubscriber("test/ping", { handler: subscriberCallback } );

  while (true) {
    const seconds = 100;
    await sleep(1000 * seconds);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ParseArgs extends BaseParseArgs {
  public no_express: boolean = false;

  constructor() {
    super();
    this.parse();
  }

  public get_named_args_help(): Record<string, string> {
    return {
      no_express: "Express for sending data",
    };
  }

  get_positional_args_help(): [string, string][] {
    return [];
  }
}

main();
