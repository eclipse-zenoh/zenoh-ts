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

import { FifoChannel } from "@eclipse-zenoh/zenoh-ts";
import { Encoding, CongestionControl, Config, Session } from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const sub = await session.declare_subscriber("test/pong", { handler: new FifoChannel(256) } );
  const pub = await session.declare_publisher(
    "test/ping",
    {
      encoding: Encoding.default(),
      congestion_control: CongestionControl.BLOCK
    },
  );

  // Warm up
  console.warn("Warming up for 5 seconds...");

  const startTime = new Date();
  const data = new Uint8Array([122, 101, 110, 111, 104]);

  while (elapsed(startTime) < 5) {
    await pub.put(data);
    await sub.receive();
  }

  const samples = 600;
  const samples_out = [];
  for (let i = 0; i < samples; i++) {
    const write_time = new Date();
    await pub.put(data);
    await sub.receive();
    samples_out.push(elapsed_ms(write_time));
  }

  for (let i = 0; i < samples_out.length; i++) {
    const rtt = samples_out[i];
    console.warn(
      data.length +
      "bytes: seq=" +
      i +
      " rtt=" +
      rtt +
      "ms lat=" +
      rtt / 2 +
      "ms",
    );
  }
}

function elapsed(startTime: Date) {
  const endTime = new Date();

  const timeDiff =
    (endTime.getMilliseconds() - startTime.getMilliseconds()) / 1000; //in s
  const seconds = Math.round(timeDiff);
  return seconds;
}

function elapsed_ms(startTime: Date) {
  const endTime = new Date();
  const timeDiff: number =
    endTime.getMilliseconds() - startTime.getMilliseconds(); //in ms
  return timeDiff;
}

main()