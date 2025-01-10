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
  RingChannel, deserialize_string, Sample, Config, Subscriber, Session, KeyExpr
} from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  console.log("Starting zenoh Subscriber ! ")
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  let key_expr = new KeyExpr("demo/example/**");

  let poll_subscriber: Subscriber = session.declare_subscriber(key_expr, { handler: new RingChannel(10) });

  let sample = await poll_subscriber.receive();

  while (sample != undefined) {
    console.warn!(
      ">> [Subscriber] Received " +
      sample.kind() + " ('" +
      sample.keyexpr() + "': '" +
      sample.payload().deserialize(deserialize_string) + "')",
    );
    sample = await poll_subscriber.receive();
  }

  poll_subscriber.undeclare();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()