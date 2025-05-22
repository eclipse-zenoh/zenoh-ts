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
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const keyExpr = new KeyExpr(args.key);
  console.log(`Declaring Liveliness token on '${args.key}'...`);

  const token: LivelinessToken = await session.liveliness().declareToken(keyExpr);
  // LivelinessTokens are NOT automatically closed when dropped
  // please call token.undeclare();

  console.log("Press CTRL-C to undeclare LivelinessToken and quit...");
  while (true) {
    await sleep(10000);
  }
}

class ParseArgs extends BaseParseArgs {
  public key: string = "group1/zenoh-ts";

  constructor() {
    super();
    this.parse();
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      key: "Key expression for the liveliness token"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [];
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
