import "./style.css";
import "./webpage.ts";

import { Config, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function _delete() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));
  session.delete("demo/example/zenoh-ts-delete");
  await session.close();
}
