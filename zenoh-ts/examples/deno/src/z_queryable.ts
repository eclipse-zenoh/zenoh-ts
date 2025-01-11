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

import { Config, KeyExpr, Query, Queryable, Session, ZBytes } from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";

interface Args {
  key: string,
  payload?: string,
  complete: boolean
}

export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const [key, _payload, complete] = get_args()

  const key_expr = new KeyExpr(key);
  console.warn("Declare Queryable on KeyExpr:", key_expr.toString());

  const response = "Queryable from Typescript!";

  // Declaring a queryable with a callback
  // function callback(query: Query) {
  //   let zbytes: ZBytes | undefined = query.payload();

  //   if (zbytes == null) {
  //     console.warn!(`>> [Queryable ] Received Query ${query.selector().toString()}`);
  //   } else {
  //     console.warn!(
  //       `>> [Queryable ] Received Query ${query.selector().toString()} with payload '${zbytes}'`,
  //     );
  //   }

  //   console.warn(
  //     `>> [Queryable ] Responding ${key_expr.toString()} with payload '${response}'`,
  //   );
  //   query.reply(key_expr, response);
  // }

  // let queryable_cb: Queryable = await session.declare_queryable(key_expr, {
  //   complete: true,
  //   callback: callback,
  // });
  // await sleep(1000 * 5);
  // queryable_cb.undeclare()


  // Declaring a Queryable with a handler
  const queryable: Queryable = session.declare_queryable(key_expr, {
    complete: complete,
  });

  let query = await queryable.receive();
  while (query instanceof Query) {

    const zbytes: ZBytes | undefined = query.payload();

    if (zbytes == null) {
      console.warn!(`>> [Queryable ] Received Query ${query.selector().toString()}`);
    } else {
      console.warn!(
        `>> [Queryable ] Received Query ${query.selector().toString()} with payload '${zbytes.to_bytes()}'`,
      );
    }

    console.warn(
      `>> [Queryable ] Responding ${key_expr.toString()} with payload '${response}'`,
    );
    query.reply(key_expr, response);

    query = await queryable.receive();
  }
}

// Convienence function to parse command line arguments
function get_args(): [string, string | undefined, boolean] {
  const args: Args = parseArgs(Deno.args);

  let key_expr = "demo/example/zenoh-ts-queryable";
  let payload = "Querier Get from Zenoh-ts!";
  let complete = true;

  if (args.key != undefined) {
    key_expr = args.key;
  }
  if (args.payload != undefined) {
    payload = args.payload
  }
  if (args.complete != undefined) {
    complete = args.complete
  }
  return [key_expr, payload, complete]
}

main()
