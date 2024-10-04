import { ReplyError } from "@ZettaScaleLabs/zenoh-ts";
import { deserialize_string } from "@ZettaScaleLabs/zenoh-ts";
import "./style.css";
import "./webpage.ts";

import { Config, Receiver, RecvErr, Reply, Sample, Session } from "@ZettaScaleLabs/zenoh-ts";

export async function get() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));

  // Callback get query
  const get_callback = async function (reply: Reply): Promise<void> {
    let resp = reply.result();
    if (resp instanceof Sample) {
      let sample: Sample = resp;
      console.log(">> Received ('", sample.keyexpr(), ":", sample.payload().deserialize(deserialize_string),"')");
    } else {
      let reply_error: ReplyError = resp;
      console.log(">> Received (ERROR: '", reply_error.payload().deserialize(deserialize_string), "')");
    }
  };

  console.log("Start z_get")
  await session.get("demo/example/**", get_callback);

  // Poll receiever
  let receiver: void | Receiver  = await session.get("demo/example/**");
  if (!(receiver instanceof Receiver)){
    return // Return in case of callback get query
  }

  let reply = await receiver.receive();
  while (reply != RecvErr.Disconnected) {
    if (reply == RecvErr.MalformedReply) {
      console.log("MalformedReply");
    } else {
      let resp = reply.result();
      if (resp instanceof Sample) {
        let sample: Sample = resp;
        console.log(">> Received ('", sample.keyexpr(), ":", sample.payload().deserialize(deserialize_string),"')");
      } else {
        let reply_error: ReplyError = resp;
        console.log(">> Received (ERROR: '{", reply_error.payload().deserialize(deserialize_string), "}')");
      }
    }
    reply = await receiver.receive();
  }
}
