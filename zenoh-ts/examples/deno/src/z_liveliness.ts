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
  Config, Session, KeyExpr, LivelinessToken
} from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";

interface Args {
  key: string,
}

export async function main() {
  const [key] = get_args();
  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(key);
  console.log("Declaring Liveliness token on ", key_expr.toString());

  const token: LivelinessToken = session.liveliness().declare_token(key_expr);
  // LivelinessTokens are NOT automatically closed when dropped
  // please call token.undeclare();

  while (true) {
    await sleep(10000);
    token;
    console.log("Tick")
  }
}

function get_args(): [string] {
  const args: Args = parseArgs(Deno.args);
  let key_expr_str = "group1/zenoh-ts";
  if (args.key != undefined) {
    key_expr_str = args.key
  }
  return [key_expr_str]
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()