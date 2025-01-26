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
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const key_expr = new KeyExpr(args.key);
  console.warn("Declare Queryable on KeyExpr:", key_expr.toString());

  const response = args.payload;

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



  const queryable: Queryable = session.declare_queryable(key_expr, {
    complete: args.complete,
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

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/zenoh-ts-queryable";
  public payload: string = "Querier Get from Zenoh-ts!";
  public complete: boolean = true;

  constructor() {
    super();
    this.parse();
  }

  public get_help(): Record<string, string> {
    return {
      key: "Key expression for the queryable",
      payload: "Payload for the queryable",
      complete: "Complete flag for the queryable"
    };
  }
}


main()
