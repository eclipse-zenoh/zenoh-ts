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

import { ChannelReceiver, FifoChannel, Sample, Encoding, CongestionControl, Config, Session } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";

export async function main() {
  const args = new ParseArgs();
  const session = await Session.open(new Config("ws/127.0.0.1:10000"));

  const sub = await session.declareSubscriber("test/pong", { handler: new FifoChannel(256) } );
  const pub = await session.declarePublisher(
    "test/ping",
    {
      encoding: Encoding.default(),
      congestionControl: CongestionControl.BLOCK,
      express: !args.no_express
    },
  );

  const payloadSize = args.positional[0];
  let payload = new Uint8Array(payloadSize);
  console.warn(`Will publish ${payloadSize} B payload.`);
  for (let i = 0; i < payloadSize; i++) {
    payload[i] = i;
  }

  const startTime = performance.now();

  // Warm up
  console.warn(`Warming up for ${args.warmup} seconds...`);
  while (elapsedMs(startTime) < args.warmup * 1000) {
    await pub.put(payload);
    await (sub.receiver() as ChannelReceiver<Sample>).receive();
  }

  const samples = args.samples;
  const samplesOut = [];
  for (let i = 0; i < samples; i++) {
    const writeTime = performance.now();
    await pub.put(payload);
    await (sub.receiver() as ChannelReceiver<Sample>).receive();
    samplesOut.push(elapsedMs(writeTime));
  }

  for (let i = 0; i < samplesOut.length; i++) {
    const rtt = samplesOut[i];
    console.warn(
      payload.length +
      "bytes: seq=" +
      i +
      " rtt=" +
      rtt +
      "ms lat=" +
      rtt / 2 +
      "ms",
    );
  }
  await session.close();
}

function elapsedMs(startTime: number) {
  const endTime = performance.now();
  return endTime - startTime;
}


class ParseArgs extends BaseParseArgs {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public no_express: boolean = false;
  public warmup: number = 1;
  public samples: number = 100;
  public positional: [number] = [0];

  constructor() {
    super();
    this.parse();
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      no_express: "Express for sending data",
      warmup: "Number of seconds to warm up",
      samples: "Number of round-trips to measure"
    };
  }

  getPositionalArgsHelp(): [string, string][] {
    return [["PAYLOAD_SIZE", "Size of the payload to publish"]];
  }
}

main();
