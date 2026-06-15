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

import {
  SessionInfo, Config, Session, WhatAmI, SampleKind,
  TransportEvent, LinkEvent, ChannelReceiver
} from "@eclipse-zenoh/zenoh-ts";

export async function main() {
  console.log!("Opening session...");
  await using session = await Session.open(new Config("ws/127.0.0.1:10000"));

  console.log!("Get Info...");
  const info: SessionInfo = await session.info();

  console.log!("zid: ", info.zid().toString());
  console.log!(`routers zid: ${info.routersZid()}`);
  console.log!(`peers zid: ${info.peersZid()}`);

  console.log!("\nTransports:");
  const transports = await info.transports();
  for (const t of transports) {
    console.log!(`  zid: ${t.zid()}, whatami: ${WhatAmI[t.whatami()]}, qos: ${t.isQos()}, multicast: ${t.isMulticast()}`);
  }

  console.log!("\nLinks:");
  const links = await info.links();
  for (const l of links) {
    console.log!(`  src: ${l.src()}, dst: ${l.dst()}, mtu: ${l.mtu()}`);
  }

  console.log!("\nDeclaring transport events listener...");
  await using transportListener = await info.transportEventsListener({ history: false });
  const transportReceiver = transportListener.receiver() as ChannelReceiver<TransportEvent>;

  console.log!("Declaring link events listener...");
  await using linkListener = await info.linkEventsListener({ history: false });
  const linkReceiver = linkListener.receiver() as ChannelReceiver<LinkEvent>;

  console.log!("Connectivity events (Press CTRL-C to quit)...");

  await Promise.all([
    (async () => {
      for await (const event of transportReceiver) {
        const label = event.kind() === SampleKind.PUT ? "Opened" : "Closed";
        console.log!(`[Transport Event] ${label}: zid=${event.transport().zid()}, whatami=${WhatAmI[event.transport().whatami()]}`);
      }
    })(),
    (async () => {
      for await (const event of linkReceiver) {
        const label = event.kind() === SampleKind.PUT ? "Added" : "Removed";
        console.log!(`[Link Event] ${label}: src=${event.link().src()}, dst=${event.link().dst()}`);
      }
    })(),
  ]);
}

main();
