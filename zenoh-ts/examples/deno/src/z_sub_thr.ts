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

import { Config, Session, Sample } from "@eclipse-zenoh/zenoh-ts";
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
    const elapsed_ms = Date.now() - this.round_start;
    const throughput = (this.round_size) / (elapsed_ms / 1000);
    console.warn(throughput, " msg/s");
  }
}

export async function main() {
  console.warn("Open Session");
  const session: Session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const stats = new Stats(100000);
  const subscriber_callback = async function (_sample: Sample): Promise<void> {
    stats.increment();
  };

  console.warn("Declare subscriber");
  session.declare_subscriber(
    "test/thr",
    { handler: subscriber_callback }
  );

  let count = 0;
  while (true) {
    const seconds = 100;
    await sleep(1000 * seconds);
    console.warn("Main Loop ? ", count);
    count = count + 1;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()