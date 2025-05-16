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

  const key_expr = args.get_keyexpr();
  const publisher: Publisher = await session.declare_publisher(
    key_expr,
    {
      encoding: Encoding.default(),
      congestion_control: CongestionControl.BLOCK,
      priority: Priority.DATA,
      express: true,
      reliability: Reliability.RELIABLE
    }
  );

  for (let idx = 0; idx < Number.MAX_VALUE; idx++) {
    const buf = `[${idx}] ${args.payload}`;

    console.warn("Block statement execution no : " + idx);
    console.warn(`Putting Data ('${key_expr}': '${buf}')...`);
    await publisher.put(buf, { encoding: Encoding.TEXT_PLAIN, attachment: args.attach });
    await sleep(1000);
  }
}

class ParseArgs extends BaseParseArgs {
  public payload: string = "Pub from Typescript!";
  public key: string = "demo/example/zenoh-ts-pub";
  public attach: string = "";

  constructor() {
    super();
    this.parse();
  }

  public get_keyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public get_named_args_help(): Record<string, string> {
    return {
      payload: "Payload for the publication",
      key: "Key expression for the publication",
      attach: "Attachment for the publication"
    };
  }

  get_positional_args_help(): [string, string][] {
    return [];
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
