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
  roundCount: number;
  roundSize: number;
  finishedRounds: number;
  roundStart: number;
  globalStart: number;

  constructor(roundSize: number) {
    this.roundCount = 0;
    this.roundSize = roundSize;
    this.finishedRounds = 0;
    this.roundStart = performance.now();
    this.globalStart = 0;
  }

  increment() {
    if (this.roundCount == 0) {
      this.roundStart = performance.now();
      if (this.globalStart == 0) {
        this.globalStart = this.roundStart;
      }
      this.roundCount += 1;
    } else if (this.roundCount < this.roundSize) {
      this.roundCount += 1;
    } else {
      this.printRound();
      this.finishedRounds += 1;
      this.roundCount = 0;
    }
  }

  printRound() {
    const elapsedMs = performance.now() - this.roundStart;
    const throughput = (this.roundSize) / (elapsedMs / 1000);
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

  while (stats.finishedRounds < args.samples) {
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
