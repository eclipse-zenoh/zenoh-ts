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

import "./style.css";
import "./webpage.ts";

import {
  RingChannel, deserialize_string, Sample, Config, Subscriber, Session, KeyExpr
} from "@ZettaScaleLabs/zenoh-ts";

export async function sub() {
  const session = await Session.open(new Config ("ws/127.0.0.1:10000"));

  const callback = async function (sample: Sample): Promise<void> {
    console.warn!(
      ">> [Subscriber] Received " +
      sample.kind() + " ('" +
      sample.keyexpr() + "': '" +
      sample.payload().deserialize(deserialize_string) + "')",
    );
  };

  let key_expr = new KeyExpr("demo/example/zenoh-ts-sub");
  console.warn("Declare Subscriber ", key_expr.toString());
  // Callback Subscriber take a callback which will be called upon every sample received.
  let callback_subscriber: Subscriber = await session.declare_subscriber(
    key_expr,
    callback,
  );

  await sleep(1000 * 3);
  callback_subscriber.undeclare();
  console.warn("Undeclare callback_subscriber");

  // Poll Subscribers will only consume data on calls to receieve()
  // This means that interally the FIFO queue will fill up to the point that new values will be dropped
  // The dropping of these values occurs in the Remote-API Plugin
  let poll_subscriber: Subscriber = await session.declare_subscriber("demo/example/zenoh-ts-sub", new RingChannel(10));
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
