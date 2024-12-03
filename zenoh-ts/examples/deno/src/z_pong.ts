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

import { Encoding, CongestionControl, Sample, Config, Session } from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  let pub = session.declare_publisher(
    "test/ping",
    {
      encoding: Encoding.default(),
      congestion_control: CongestionControl.BLOCK
    },
  );

  const subscriber_callback = async function (sample: Sample): Promise<void> {
    await pub.put(sample.payload());
  };

  await session.declare_subscriber("test/pong", subscriber_callback);

  let count = 0;
  while (true) {
    let seconds = 100;
    await sleep(1000 * seconds);
    count = count + 1;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()