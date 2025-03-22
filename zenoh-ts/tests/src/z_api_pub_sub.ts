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

import { Config, RingChannel, Session, Subscriber } from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  console.log("Starting zenoh Session");
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));
  console.log("Session opened");
  const subscriber: Subscriber = session.declare_subscriber("test/pub_sub", { handler: new RingChannel(10) });
  console.log("Subscriber declared");
}

main();
