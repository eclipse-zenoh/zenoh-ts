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
  Config, Subscriber, Session, KeyExpr,
  SampleKind
} from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";

interface Args {
  key: string,
  history: boolean
}

export async function main() {
  const [key, history] = get_args();


  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const key_expr = new KeyExpr(key);
  console.log("Declaring Liveliness Subscriber on ", key_expr.toString());

  const liveliness_subscriber: Subscriber = session.liveliness().declare_subscriber(key_expr, { history: history });


  let sample = await liveliness_subscriber.receive();
  while (sample != undefined) {
    switch (sample.kind()) {
      case SampleKind.PUT: {
        console.log!(
          ">> [LivelinessSubscriber] New alive token ",
          sample.keyexpr().toString()
        )
        break;
      }
      case SampleKind.DELETE: {
        console.log!(
          ">> [LivelinessSubscriber] Dropped token ",
          sample.keyexpr().toString()
        )
        break;
      }
    }
    sample = await liveliness_subscriber.receive();
  }
  liveliness_subscriber.undeclare();
}

// Convienence function to parse command line arguments
function get_args(): [string, boolean] {
  const args: Args = parseArgs(Deno.args);

  let key_expr = "group1/**";
  let history = true;

  if (args.key != undefined) {
    key_expr = args.key;
  }

  if (args.history != undefined) {
    history = args.history
  }
  return [key_expr, history]
}



main();