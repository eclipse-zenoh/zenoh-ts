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

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  console.log("Deleting resources matching '", args.key, "'...");
  session.delete(args.key);

  await session.close();
}

class ParseArgs extends BaseParseArgs {
  public key: string = "demo/example/zenoh-ts-put";

  constructor() {
    super();
    this.parse();
  }

  public get_help(): Record<string, string> {
    return {
      key: "Key expression for the deletion"
    };
  }
}

main();