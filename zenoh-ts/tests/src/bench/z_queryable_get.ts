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

import {
  Config,
  Session,
  Queryable,
  Querier,
  ChannelReceiver,
  Query,
  Reply,
  QueryTarget,
  ReplyError,
} from "@eclipse-zenoh/zenoh-ts";
import { FifoChannel } from "@eclipse-zenoh/zenoh-ts";
import { receiveWithTimeout } from "../commonTestUtils.ts";

/**
 * Configuration for the queryable/get performance tests
 */
const PACKET_SIZES = [
  8,
  16,
  32,
  64,
  128,
  256,
  512, // Small packets: 8B - 512B
  1024,
  2048,
  4096,
  8192,
  16384, // Medium packets: 1KB - 16KB
  32768,
  65536,
  131072,
  262144, // Large packets: 32KB - 256KB
];
const KEY_EXPR = "test/queryable/perf";

// Fixed amount of data to transfer in each test (256KB)
const FIXED_DATA_SIZE = 1024 * 256;

// Global session setup - this happens once when the module loads
let globalQueryableSession: Session;
let globalQuerierSession: Session;
let globalQueryable: Queryable;
let globalQuerier: Querier;

/**
 * Initialize global sessions and queryable/querier infrastructure
 */
async function initializeGlobalSessions(): Promise<void> {
  // Create separate sessions for queryable and querier
  globalQueryableSession = await Session.open(new Config("ws/127.0.0.1:10000"));
  globalQuerierSession = await Session.open(new Config("ws/127.0.0.1:10000"));

  // Declare queryable with channel handler
  globalQueryable = await globalQueryableSession.declareQueryable(KEY_EXPR, {
    handler: new FifoChannel(256),
    complete: true,
  });

  // Declare querier
  globalQuerier = await globalQuerierSession.declareQuerier(KEY_EXPR, {
    target: QueryTarget.BEST_MATCHING,
  });

  // Small delay to ensure setup is complete
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Cleanup global sessions
 */
async function cleanupGlobalSessions(): Promise<void> {
  if (globalQueryable) await globalQueryable.undeclare();
  if (globalQuerier) await globalQuerier.undeclare();
  if (globalQuerierSession) await globalQuerierSession.close();
  if (globalQueryableSession) await globalQueryableSession.close();
}

/**
 * Create test payloads for each packet size
 */
function createTestPayloads(): Map<
  number,
  { payload: Uint8Array; iterations: number }
> {
  const payloads = new Map<
    number,
    { payload: Uint8Array; iterations: number }
  >();

  for (const size of PACKET_SIZES) {
    const payload = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      payload[i] = i % 256;
    }

    // Calculate how many packets needed to transfer FIXED_DATA_SIZE
    const iterations = Math.max(1, Math.floor(FIXED_DATA_SIZE / size));

    payloads.set(size, { payload, iterations });
  }

  return payloads;
}

// Initialize sessions and payloads at module load time
await initializeGlobalSessions();
const _testPayloads = createTestPayloads();

// Add cleanup on process exit
globalThis.addEventListener("beforeunload", () => {
  cleanupGlobalSessions();
});

// Background query handler function
async function startQueryHandler() {
  while (true) {
    try {
      const queryReceiver =
        globalQueryable.receiver() as ChannelReceiver<Query>;
      const query = await receiveWithTimeout(queryReceiver, 5000, "query in handler");

      if (query) {
        // Echo back the received payload
        const payload = query.payload();
        if (payload) {
          query.reply(query.keyExpr(), payload);
        } else {
          query.reply(query.keyExpr(), new Uint8Array(0));
        }
      }
    } catch (_error) {
      // If receiver is closed or session is terminated, break the loop
      break;
    }
  }
}

// Start the background query handler after initialization
startQueryHandler();

// Run queryable/get benchmarks for each packet size
for (const packetSize of PACKET_SIZES) {
  const testData = _testPayloads.get(packetSize)!;

  Deno.bench({
    name: `Queryable/Get Transfer - ${packetSize}B packets, ${testData.iterations} msgs`,
    fn: async () => {
      // Send fixed amount of data using multiple query/reply cycles
      for (let i = 0; i < testData.iterations; i++) {
        const replyReceiver = (await globalQuerier.get({
          parameters: `iter=${i}`,
          payload: testData.payload,
        })) as ChannelReceiver<Reply>;

        const reply = await receiveWithTimeout(replyReceiver, 5000, "reply in benchmark");

        // Verify we got a successful reply
        const result = reply.result();
        if (result instanceof ReplyError) {
          throw new Error(`Query failed: ${result.payload()}`);
        }
      }
    },
  });
}
