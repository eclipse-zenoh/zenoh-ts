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

import { Priority, Reliability, Encoding, CongestionControl, Config, KeyExpr, Publisher, Session } from "@eclipse-zenoh/zenoh-ts";

export async function pub() {
  const session = await Session.open(new Config ("ws/127.0.0.1:10000"));

  let key_expr = new KeyExpr("demo/example/zenoh-ts-pub");
  let publisher: Publisher = session.declare_publisher(
    key_expr,
    {
      encoding: Encoding.default(),
      congestion_control: CongestionControl.BLOCK,
      priority: Priority.DATA,
      express: true,
      reliability: Reliability.RELIABLE
    }
  );

  const payload = [122, 101, 110, 111, 104];

  for (let idx = 0; idx < Number.MAX_VALUE; idx++) {
    let buf = `[${idx}] ${payload}`;

    console.warn("Block statement execution no : " + idx);
    console.warn(`Putting Data ('${key_expr}': '${buf}')...`);
    publisher.put(buf, Encoding.TEXT_PLAIN, "attachment");
    await sleep(1000);

  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
