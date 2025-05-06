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
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const publisher: Publisher = await session.declare_publisher(
    "test/thr",
    {
    }
  );
  
  let payload_size = args.sz;
  let payload = new Uint8Array(args.sz);
  console.warn(`Will publish ${payload_size} B payload.`);
  for (let i = 0; i < args.sz; i++) {
    payload[i] = i;
  }

  while (true) {
    await publisher.put(payload);
  }
}

class ParseArgs extends BaseParseArgs {
  public sz: number = 8;

  constructor() {
    super();
    this.parse();
  }

  public get_keyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public get_help(): Record<string, string> {
    return {
      sz: "Payload size for the publication",
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();