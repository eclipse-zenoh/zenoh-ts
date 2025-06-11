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
  Subscriber,
  Session,
  KeyExpr,
  Publisher,
  ChannelReceiver,
  Sample,
  CongestionControl,
  Priority,
  Reliability,
  Encoding,
} from "@eclipse-zenoh/zenoh-ts";
import { FifoChannel } from "@eclipse-zenoh/zenoh-ts";
import { receiveWithTimeout } from "../commonTestUtils.ts";

/**
 * Configuration for the pub/sub performance tests
 */
const PACKET_SIZES = [
  8, 16, 32, 64, 128, 256, 512,          // Small packets: 8B - 512B
  1024, 2048, 4096, 8192, 16384,         // Medium packets: 1KB - 16KB
  32768, 65536, 131072, 262144,          // Large packets: 32KB - 256KB
];
const KEY_EXPR = "test/pubsub/perf";

// Fixed amount of data to transfer in each test (1MB)
const FIXED_DATA_SIZE = 1024 * 256;

// Global session setup - this happens once when the module loads
let globalSession: Session;
let globalSubscriber: Subscriber;
let globalPublisher: Publisher;

/**
 * Initialize global session and pub/sub infrastructure
 */
async function initializeGlobalSession(): Promise<void> {
  globalSession = await Session.open(new Config("ws/127.0.0.1:10000"));
  
  globalSubscriber = await globalSession.declareSubscriber(KEY_EXPR, { 
    handler: new FifoChannel(256) 
  });
  
  globalPublisher = await globalSession.declarePublisher(KEY_EXPR, {
    congestionControl: CongestionControl.BLOCK,
    priority: Priority.REAL_TIME,
    express: true,
    reliability: Reliability.RELIABLE,
  });
}

/**
 * Cleanup global session
 */
async function cleanupGlobalSession(): Promise<void> {
  if (globalSubscriber) await globalSubscriber.undeclare();
  if (globalPublisher) await globalPublisher.undeclare();
  if (globalSession) await globalSession.close();
}

/**
 * Create test payloads for each packet size
 */
function createTestPayloads(): Map<number, { payload: Uint8Array; iterations: number }> {
  const payloads = new Map<number, { payload: Uint8Array; iterations: number }>();
  
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

// Initialize session and payloads at module load time
await initializeGlobalSession();
const testPayloads = createTestPayloads();

// Add cleanup on process exit
globalThis.addEventListener("beforeunload", () => {
  cleanupGlobalSession();
});

// Run pub/sub benchmarks for each packet size
for (const packetSize of PACKET_SIZES) {
  const testData = testPayloads.get(packetSize)!;
  const totalDataMB = (testData.iterations * packetSize) / (1024 * 1024);
  
  Deno.bench({
    name: `PubSub Transfer - ${packetSize}B packets, ${testData.iterations} msgs`,
    fn: async () => {
      // Send fixed amount of data using multiple packets
      for (let i = 0; i < testData.iterations; i++) {
        await globalPublisher.put(testData.payload);
        await receiveWithTimeout(globalSubscriber.receiver() as ChannelReceiver<Sample>, 5000, "sample in benchmark");
      }
    },
  });
}