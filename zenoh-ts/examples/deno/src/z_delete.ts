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

import { Config, Session } from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";

interface Args {
  key: string;
}

export async function main() {
  const [key_expr] = get_args()

  console.log!("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  console.log!("Deleting resources matching '", key_expr, "'...");
  session.delete(key_expr);

  await session.close();
}

// Convienence function for Getting Arguments
function get_args(): [string] {
  const args: Args = parseArgs(Deno.args);
  let key_expr_str = "demo/example/zenoh-ts-put";
  if (args.key != undefined) {
    key_expr_str = args.key
  }
  return [key_expr_str]
}


main()