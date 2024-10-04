import "./style.css";
import "./webpage.ts";

import { FifoChannel, Sample, Config, Subscriber, Session } from "@ZettaScaleLabs/zenoh-ts";

interface Deserialize<T> {
  deserialize(buffer: Uint8Array): T
}


export class ArrayTDeserilaizer<T extends Deserialize<T>> implements Deserialize<Array<T>> {
  static err = "Floating Point Deserialization Failed";
  d: T;

  constructor(d: T) {
    this.d = d;
  }

  deserialize(buffer: Uint8Array): Array<T> {

    if (buffer.length == 0) {
      return new Array()
    }

    function read_length(buffer: Uint8Array) {
      if (buffer.length == 0) {
        return 0;
      }
      let b = buffer[0];
      buffer = buffer.subarray(1, buffer.length)
      let v = 0;
      let i = 0;
      let VLE_LEN_MAX = 9;
      while ((b & 128) != 0 && i != 7 * (VLE_LEN_MAX - 1)) {
        v = v | (b & 127) << i;
        b = buffer[0];
        buffer = buffer.subarray(1, buffer.length)
        i += 7;
      }
      v |= (b) << i;
      return v
    }

    let r_length = read_length(buffer);

    console.log("length to read", r_length);

    // let empty = false;
    // while(empty){
    //   const data_view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);

    //   data_view.getUint8
    // }
    return new Array();
  }
}

function read_length(buffer: Uint8Array) {
  if (buffer.length == 0) {
    return 0;
  }
  let b = buffer[0];
  buffer = buffer.subarray(1, buffer.length)
  let v = 0;
  let i = 0;
  let VLE_LEN_MAX = 9;
  while ((b & 128) != 0 && i != 7 * (VLE_LEN_MAX - 1)) {
    v = v | (b & 127) << i;
    b = buffer[0];
    buffer = buffer.subarray(1, buffer.length)
    i += 7;
  }
  v |= (b) << i;
  return v
}

export async function sub_test() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));

  // Poll Subscribers will only consume data on calls to receieve()
  // This means that interally the FIFO queue will fill up to the point that new values will be dropped
  // The dropping of these values occurs in the Remote-API Plugin
  let poll_subscriber: Subscriber = await session.declare_subscriber("demo/example/zenoh-rs-pub", new FifoChannel(256));

  while (true) {
    // let value = await poll_subscriber.receive();
    // if (value instanceof Sample) {
    //   let res = value.payload().payload();
    //   console.log(res)
    // }

    let value2 = await poll_subscriber.receive();
    if (value2 instanceof Sample) {
      let bytes = value2.payload().payload();
      console.log(bytes)
      let r_length = read_length(bytes);
      console.log("length to read", r_length);
      console.log(bytes)

    }
    console.log("break")
  }

  poll_subscriber.undeclare();
}
