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
  SessionInfo, Config, Session
} from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  console.log!("Opening session...");
  await using session = await Session.open(new Config("ws/127.0.0.1:10000"));

  console.log!("Get Info...");
  const info: SessionInfo = await session.info();

  console.log!("zid: ", info.zid().toString());

  console.log!(`routers zid: ${info.routersZid()}`);

  console.log!(`peers zid: ${info.peersZid()}`);

}

main();
