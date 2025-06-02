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

import { ChannelReceiver, Config, KeyExpr, Query, Queryable, Session, ZBytes } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.warn('Opening session...');
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const keyExpr = new KeyExpr(args.key);
  console.warn(`Declaring Queryable on: '${args.key}'...`);

  const response = args.payload;

  console.warn("Press CTRL-C to quit...");

  // Declaring a queryable with a callback
  // function callback(query: Query) {
  //   let zbytes: ZBytes | undefined = query.payload();

  //   if (zbytes == undefined) {
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
  //   query.finalize();
  // }

  // let queryable_cb: Queryable = await session.declare_queryable(key_expr, {
  //   complete: true,
  //   callback: callback,
  // });
  // while(true) {
  //  await sleep(1000 * 5);
  // }
  // await queryable_cb.undeclare();



  const queryable: Queryable = await session.declareQueryable(keyExpr, {
    complete: args.complete,
  });

  for await (const query of queryable.receiver() as ChannelReceiver<Query>) {
    await using scopedQuery = query;
    const zbytes: ZBytes | undefined = query.payload();

    if (zbytes == undefined) {
      console.warn!(`>> [Queryable ] Received Query ${scopedQuery.selector().toString()}`);
    } else {
      console.warn!(
        `>> [Queryable ] Received Query ${scopedQuery.selector().toString()} with payload '${zbytes.toString()}'`,
      );
    }

    console.warn(
      `>> [Queryable ] Responding ${keyExpr.toString()} with payload '${response}'`,
    );
    await scopedQuery.reply(keyExpr, response);
  }
}

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/zenoh-ts-queryable";
  public payload: string = "Queryable from Zenoh-ts!";
  public complete: boolean = true;

  constructor() {
    super();
    this.parse();
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      key: "Key expression for the queryable",
      payload: "Payload for the queryable",
      complete: "Complete flag for the queryable"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}


main();
