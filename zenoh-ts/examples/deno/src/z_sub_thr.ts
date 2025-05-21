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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  round_count: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  round_size: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  finished_rounds: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  round_start: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  global_start: number;

  constructor(roundSize: number) {
    this.round_count = 0;
    this.round_size = roundSize;
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
      this.printRound();
      this.finished_rounds += 1;
      this.round_count = 0;
    }
  }

  printRound() {
    const elapsedMs = Date.now() - this.round_start;
    const throughput = (this.round_size) / (elapsedMs / 1000);
    console.warn(throughput, " msg/s");
  }
}

export async function main() {
  const args = new ParseArgs();

  console.warn('Opening session...');
  const session: Session = await Session.open(new Config("ws/127.0.0.1:10000"));
  const stats = new Stats(args.number);
  const subscriberCallback = function (_sample: Sample): void {
    stats.increment();
  };

  await session.declareSubscriber(
    "test/thr",
    { handler: subscriberCallback }
  );

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

  public getKeyexpr(): KeyExpr {
    return KeyExpr.autocanonize(this.key);
  }

  public getNamedArgsHelp(): Record<string, string> {
    return {
      samples: "Number of throughput measurements",
      number: "Number of messages in each throughput measurements",
    };
  }

  public getPositionalArgsHelp(): [string, string][] {
    return [];
  };

}

main();
