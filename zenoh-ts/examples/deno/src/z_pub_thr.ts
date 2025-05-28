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
import { BaseParseArgs, priorityFromInt } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const publisher: Publisher = await session.declarePublisher(
    "test/thr",
    { 
      express: args.express,
      priority: args.getPriority(),
    }
  );
  
  const payloadSize = args.positional[0];
  let payload = new Uint8Array(payloadSize);
  console.warn(`Will publish ${payloadSize} B payload.`);
  for (let i = 0; i < payloadSize; i++) {
    payload[i] = i;
  }

  let startTime = performance.now();
  let n = 0;
  while (true) {
    await publisher.put(payload);
    n++;

    if (n % 1000000 == 0) {
      const endTime = performance.now();
      console.log(1000000 / (endTime - startTime) * 1000, " msg/s")
      startTime = performance.now();
    }
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

  public getKeyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      express: "Express for sending data",
      priority: "Priority for sending data [1-7]",
      number: "Number of messages in each throughput measurement"
    };
  }

  public getPositionalArgsHelp(): [string, string][] {
    return [["PAYLOAD_SIZE", "payload size"] ];
  };

  public getPriority(): Priority {
    return priorityFromInt(this.priority);
  }
}

main();
