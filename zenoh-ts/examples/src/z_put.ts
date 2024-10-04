import "./style.css";
import "./webpage.ts";
import { Config, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function put() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));
  session.put("demo/example/zenoh-ts-put", "Put from Typescript!");
}
