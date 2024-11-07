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

export async function main() {

  console.log("Opening session...")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  let key_expr = new KeyExpr("group1/**");
  console.log("Declaring Liveliness Subscriber on ", key_expr.toString());

  let liveliness_subscriber: Subscriber = session.liveliness().declare_subscriber(key_expr, { history: true });
  console.log("liveliness_subscriber : ", liveliness_subscriber);

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

main();