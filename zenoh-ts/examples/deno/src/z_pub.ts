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
import { parseArgs } from "@std/cli/parse-args";

interface Args {
  payload: string,
  key: string
  attach: string
}

export async function main() {

  const [key, payload, attach] = get_args();

  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const key_expr = new KeyExpr(key);
  const publisher: Publisher = session.declare_publisher(
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
    const buf = `[${idx}] ${payload}`;

    console.warn("Block statement execution no : " + idx);
    console.warn(`Putting Data ('${key_expr}': '${buf}')...`);
    publisher.put(buf, { encoding: Encoding.TEXT_PLAIN, attachment: attach });
    await sleep(1000);
  }
}

function get_args(): [string, string, string | undefined] {
  const args: Args = parseArgs(Deno.args);
  let key_expr_str = "demo/example/zenoh-ts-pub";
  let payload = "Pub from Typescript!";
  let attach = undefined;

  if (args.key != undefined) {
    key_expr_str = args.key
  }
  if (args.payload != undefined) {
    payload = args.payload
  }
  if (args.attach != undefined) {
    attach = args.attach
  }

  return [key_expr_str, payload, attach]
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()