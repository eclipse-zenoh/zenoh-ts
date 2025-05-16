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
import { assert_eq, run_test } from "./common/assertions";
import { RingChannel } from "../../dist";


async function testFifoChannel() {
    let channel = new FifoChannel<number>(3);
    let [sender, receiver] = channel.into_sender_receiver_pair();

    assert_eq(receiver.state(), ChannelState.empty, "Channel is not empty");

   let res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.notReceived, "Channel is not empty");


    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");
    assert_eq(await receiver.receive(), 1, "Received incorrect value");
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");
    assert_eq(await receiver.receive(), 2, "Received incorrect value");
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");

    res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.value, "Received incorrect value");
    if (res.kind == TryReceivedKind.value) {
        assert_eq(res.value, 3, "Received incorrect value");
    }

    res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.notReceived, "Channel is not empty");


    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    sender.close();

    let out: number[] = [];

    for await (const n of receiver) {
        out.push(n);
    }
    assert_eq(out, [1, 2, 3], "Received in correct data");
    assert_eq(receiver.state(), ChannelState.close, "Channel is not closed");
}


async function testRingChannel() {
    let channel = new RingChannel<number>(3);
    let [sender, receiver] = channel.into_sender_receiver_pair();

    assert_eq(receiver.state(), ChannelState.empty, "Channel is not empty");

    let res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.notReceived, "Channel is not empty");


    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");
    assert_eq(await receiver.receive(), 2, "Received incorrect value");
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");
    assert_eq(await receiver.receive(), 3, "Received incorrect value");
    assert_eq(receiver.state(), ChannelState.data, "Channel is empty");

    res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.value, "Received incorrect value");
    if (res.kind == TryReceivedKind.value) {
        assert_eq(res.value, 4, "Received incorrect value");
    }

    res = receiver.tryReceive();
    assert_eq(res.kind, TryReceivedKind.notReceived, "Channel is not empty");


    sender.send(1);
    sender.send(2);
    sender.send(3);
    sender.send(4);
    sender.close();

    let out: number[] = [];

    for await (const n of receiver) {
        out.push(n);
    }
    assert_eq(out, [2, 3, 4], "Received in correct data");
    assert_eq(receiver.state(), ChannelState.close, "Channel is not closed");
}


// Run all tests
await run_test(testFifoChannel);
await run_test(testRingChannel);