import "./style.css";
import "./webpage.ts";

import { Config, Session, Sample } from "@ZettaScaleLabs/zenoh-ts";

// Throughput test
class Stats {
  round_count: number;
  round_size: number;
  finished_rounds: number;
  round_start: number;
  global_start: number;

  constructor(round_size: number) {
    this.round_count = 0;
    this.round_size = round_size;
    this.finished_rounds = 0;
    this.round_start = Date.now();
    this.global_start = 0;
  }

  increment() {
    if (this.round_count == 0) {
      this.round_start = Date.now();
      if (this.global_start == 0) {
        this.global_start = this.round_start;
      }
      this.round_count += 1;
    } else if (this.round_count < this.round_size) {
      this.round_count += 1;
    } else {
      this.print_round();
      this.finished_rounds += 1;
      this.round_count = 0;
    }
  }

  print_round() {
    let elapsed_ms = Date.now() - this.round_start;
    let throughput = (this.round_size) / (elapsed_ms / 1000);
    console.log(throughput, " msg/s");
  }
}

export async function thr() {
  console.log("Open Session");
  const session : Session = await Session.open(Config.new("ws/127.0.0.1:10000"));
  let stats = new Stats(100000);
  const subscriber_callback = async function (_sample: Sample): Promise<void> {
    stats.increment();
  };

  console.log("Declare subscriber");
  await session.declare_subscriber(
    "test/thr",
    subscriber_callback,
  );

  var count = 0;
  while (true) {
    var seconds = 100;
    await sleep(1000 * seconds);
    console.log("Main Loop ? ", count);
    count = count + 1;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}