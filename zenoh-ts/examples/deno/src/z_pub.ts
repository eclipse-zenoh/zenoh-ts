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

import { Priority, Reliability, Encoding, CongestionControl, Config, KeyExpr, Publisher, Session, MatchingStatus, MatchingListener } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();

  console.log("Opening session...");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const keyExpr = args.getKeyexpr();
  const publisher: Publisher = await session.declarePublisher(
    keyExpr,
    {
      encoding: Encoding.default(),
      congestionControl: CongestionControl.BLOCK,
      priority: Priority.DATA,
      express: true
    }
  );

  let matchingListener: MatchingListener | undefined = undefined;

  if (args.addMatchingListener) {
      const listenerCallback = function (status: MatchingStatus) {
        if (status.matching()) {
          console.warn("Publisher has matching subscribers.")
        } else {
          console.warn("Publisher has NO MORE matching subscribers")
        }
      };
      matchingListener = await publisher.matchingListener({handler: listenerCallback });
  }

  for (let idx = 0; idx < Number.MAX_VALUE; idx++) {
    const buf = `[${idx}] ${args.payload}`;
    console.warn(`Putting Data ('${keyExpr}': '${buf}')...`);
    let attachment = args.attach.length == 0 ? undefined : args.attach
    await publisher.put(buf, { encoding: Encoding.TEXT_PLAIN, attachment });
    await sleep(1000);
  }

  await matchingListener?.undeclare();
}

class ParseArgs extends BaseParseArgs {
  public payload: string = "Pub from Typescript!";
  public key: string = "demo/example/zenoh-ts-pub";
  public attach: string = "";
  public addMatchingListener: boolean = false;

  constructor() {
    super();
    this.parse();
  }

  public getKeyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      payload: "Payload for the publication",
      key: "Key expression for the publication",
      attach: "Attachment for the publication",
      addMatchingListener: "Add matching listener",
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
