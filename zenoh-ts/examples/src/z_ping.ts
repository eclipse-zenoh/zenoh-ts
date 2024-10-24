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

import { FifoChannel } from "@ZettaScaleLabs/zenoh-ts";
import "./style.css";
import "./webpage.ts";

import { Encoding, CongestionControl, Config, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function ping() {
  const session = await Session.open(new Config ("ws/127.0.0.1:10000"));

  let sub = await session.declare_subscriber("test/pong", new FifoChannel(256));
  let pub = session.declare_publisher(
    "test/ping",
    {
      encoding: Encoding.default(),
      congestion_control: CongestionControl.BLOCK
    },
  );

  // Warm up
  console.warn("Warming up for 5 seconds...");

  let startTime = new Date();
  let data = [122, 101, 110, 111, 104];

  while (elapsed(startTime) < 5) {
    pub.put(data);
    await sub.receive();
  }

  let samples = 600;
  let samples_out = [];
  for (let i = 0; i < samples; i++) {
    let write_time = new Date();
    pub.put(data);
    await sub.receive();
    samples_out.push(elapsed_ms(write_time));
  }

  for (let i = 0; i < samples_out.length; i++) {
    let rtt = samples_out[i];
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
  let endTime = new Date();

  let timeDiff =
    (endTime.getMilliseconds() - startTime.getMilliseconds()) / 1000; //in s
  let seconds = Math.round(timeDiff);
  return seconds;
}

function elapsed_ms(startTime: Date) {
  let endTime = new Date();
  let timeDiff: number =
    endTime.getMilliseconds() - startTime.getMilliseconds(); //in ms
  return timeDiff;
}

