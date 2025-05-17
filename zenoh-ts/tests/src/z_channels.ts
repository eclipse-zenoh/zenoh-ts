//
// Copyright (c) 2025 ZettaScale Technology
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

import { FifoChannel, ChannelSender, ChannelReceiver, TryReceivedKind, ChannelState } from "@eclipse-zenoh/zenoh-ts";
import { RingChannel } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("Channels - FIFO", async () => {
    const channel = new FifoChannel<number>(3);
    const [sender, receiver] = channel.into_sender_receiver_pair();

    assertEquals(receiver.state(), ChannelState.empty, "Channel is not empty");

    const res = receiver.tryReceive();
    assertEquals(res.kind, TryReceivedKind.notReceived, "Channel is not empty");

    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");
    assertEquals(await receiver.receive(), 1, "Received incorrect value");
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");
    assertEquals(await receiver.receive(), 2, "Received incorrect value");
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");

    const res2 = receiver.tryReceive();
    assertEquals(res2.kind, TryReceivedKind.value, "Received incorrect value");
    if (res2.kind == TryReceivedKind.value) {
        assertEquals(res2.value, 3, "Received incorrect value");
    }

    assertEquals(receiver.state(), ChannelState.empty, "Channel is not empty");

    const res3 = receiver.tryReceive();
    assertEquals(res3.kind, TryReceivedKind.notReceived, "Channel is not empty");

    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    sender.close();

    const out: number[] = [];

    for await (const n of receiver) {
        out.push(n);
    }
    assertEquals(out, [1, 2, 3], "Received in correct data");
    assertEquals(receiver.state(), ChannelState.close, "Channel is not closed");
});

Deno.test("Channels - Ring", async () => {
    const channel = new RingChannel<number>(3);
    const [sender, receiver] = channel.into_sender_receiver_pair();

    assertEquals(receiver.state(), ChannelState.empty, "Channel is not empty");

    const res = receiver.tryReceive();
    assertEquals(res.kind, TryReceivedKind.notReceived, "Channel is not empty");

    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");
    assertEquals(await receiver.receive(), 2, "Received incorrect value");
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");
    assertEquals(await receiver.receive(), 3, "Received incorrect value");
    assertEquals(receiver.state(), ChannelState.data, "Channel is empty");

    const res2 = receiver.tryReceive();
    assertEquals(res2.kind, TryReceivedKind.value, "Received incorrect value");
    if (res2.kind == TryReceivedKind.value) {
        assertEquals(res2.value, 4, "Received incorrect value");
    }

    assertEquals(receiver.state(), ChannelState.empty, "Channel is not empty");

    const res3 = receiver.tryReceive();
    assertEquals(res3.kind, TryReceivedKind.notReceived, "Channel is not empty");

    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    sender.close();

    const out: number[] = [];

    for await (const n of receiver) {
        out.push(n);
    }
    assertEquals(out, [2, 3, 4], "Received in correct data");
    assertEquals(receiver.state(), ChannelState.close, "Channel is not closed");
});