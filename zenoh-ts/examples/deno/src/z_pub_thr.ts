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

import { Priority, Reliability, Encoding, CongestionControl, Config, KeyExpr, Publisher, Session } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs, priority_from_int } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const publisher: Publisher = await session.declare_publisher(
    "test/thr",
    { 
      express: args.express,
      priority: args.get_priority(),
    }
  );
  
  let payload_size = args.positional[0];
  let payload = new Uint8Array(payload_size);
  console.warn(`Will publish ${payload_size} B payload.`);
  for (let i = 0; i < payload_size; i++) {
    payload[i] = i;
  }

  while (true) {
    await publisher.put(payload);
  }
  await session.close();
}

class ParseArgs extends BaseParseArgs {
  public positional: [number] = [0];
  public express: boolean = false;
  public priority: number = 5;

  constructor() {
    super();
    this.parse();
  }

  public get_keyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public get_named_args_help(): Record<string, string> {
    return {
      express: "Express for sending data",
      priority: "Priority for sending data [1-7]",
      number: "Number of messages in each throughput measurement"
    };
  }

  public get_positional_args_help(): [string, string][] {
    return [["PAYLOAD_SIZE", "payload size"] ];
  };

  public get_priority(): Priority {
    return priority_from_int(this.priority);
  }
}

main();
