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

import { Config, Session, Sample, KeyExpr } from "@eclipse-zenoh/zenoh-ts";
import { BaseParseArgs } from "./parse_args.ts";
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
  const args = new ParseArgs();

  console.warn('Opening session...');
  const session: Session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const stats = new Stats(args.number);
  const subscriber_callback = async function (_sample: Sample): Promise<void> {
    stats.increment();
  };

  await session.declare_subscriber(
    "test/thr",
    { handler: subscriber_callback }
  );

  let count = 0;
  while (stats.finished_rounds < args.samples) {
    await sleep(500);
  }
  
  await session.close();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


class ParseArgs extends BaseParseArgs {
  public samples: number = 10;
  public number: number = 100000;

  constructor() {
    super();
    this.parse();
  }

  public get_keyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public get_named_args_help(): Record<string, string> {
    return {
      samples: "Number of throughput measurements",
      number: "Number of messages in each throughput measurements",
    };
  }

  public get_positional_args_help(): [string, string][] {
    return [];
  };

}

main()