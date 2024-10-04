import "./style.css";
import "./webpage.ts";

import { Priority, Reliability, Encoding, CongestionControl, Config, KeyExpr, Publisher, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function pub() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));

  let key_expr = KeyExpr.new("demo/example/zenoh-ts-pub");
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

    console.log("Block statement execution no : " + idx);
    console.log(`Putting Data ('${key_expr}': '${buf}')...`);
    publisher.put(buf, Encoding.TEXT_PLAIN, "attachment");
    await sleep(1000);

  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
