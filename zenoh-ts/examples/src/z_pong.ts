import "./style.css";
import "./webpage.ts";

import { Encoding, CongestionControl, Sample, Config, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function pong() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));

  let pub = await session.declare_publisher(
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

