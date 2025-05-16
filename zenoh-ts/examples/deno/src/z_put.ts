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
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  console.warn('Opening session...');

  await using session = await Session.open(new Config("ws/127.0.0.1:10000"));
  console.warn(`Putting Data ('${args.key}: '${args.payload}')...`);
  await session.put(args.key, args.payload);
}

class ParseArgs extends BaseParseArgs {
  public payload: string = "Put from Typescript!";
  public key: string = "demo/example/zenoh-ts-put";

  constructor() {
    super();
    this.parse();
  }

  public get_named_args_help(): Record<string, string> {
    return {
      payload: "Payload for the put operation",
      key: "Key expression for the put operation"
    };
  }

  get_positional_args_help(): [string, string][] {
    return [];
  }
}

main();
