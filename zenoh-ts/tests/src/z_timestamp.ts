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

import { Config, Session, Timestamp } from "@eclipse-zenoh/zenoh-ts";
import { assertEquals, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Timestamp - Basic functionality", async () => {
    let session: Session | undefined;

    try {
        // Open a session
        session = await Session.open(new Config("ws/127.0.0.1:10000"));

        // Get initial timestamp
        const timestamp1 = await session.newTimestamp();
        
        // Verify timestamp has required methods
        assert(timestamp1.getId() !== undefined, "Timestamp should have a ZenohId");
        assert(typeof timestamp1.getMsSinceUnixEpoch() === "number", "Timestamp should return number for ms since epoch");
        assert(timestamp1.asDate() instanceof Date, "Timestamp should convert to Date");

        // Wait for a small delay to ensure time difference
        await sleep(50);

        // Get second timestamp
        const timestamp2 = await session.newTimestamp();

        // Verify timestamps are monotonically increasing
        assert(
            timestamp2.getMsSinceUnixEpoch() >= timestamp1.getMsSinceUnixEpoch(),
            `Second timestamp (${timestamp2.getMsSinceUnixEpoch()}) should be >= first timestamp (${timestamp1.getMsSinceUnixEpoch()})`
        );

        console.log(`First timestamp: ${timestamp1.getMsSinceUnixEpoch()} (${timestamp1.asDate()})`);
        console.log(`Second timestamp: ${timestamp2.getMsSinceUnixEpoch()} (${timestamp2.asDate()})`);

    } finally {
        if (session) {
            await session.close();
            await sleep(100);
        }
    }
});

Deno.test("Timestamp - Multiple timestamps with delays", async () => {
    let session: Session | undefined;

    try {
        // Open a session
        session = await Session.open(new Config("ws/127.0.0.1:10000"));

        const timestamps: Timestamp[] = [];
        const delays = [100, 150, 200]; // ms delays

        // Get initial timestamp
        timestamps.push(await session.newTimestamp());

        // Get timestamps with fixed delays
        for (const delay of delays) {
            await sleep(delay);
            timestamps.push(await session.newTimestamp());
        }

        // Verify all timestamps are monotonically increasing
        for (let i = 1; i < timestamps.length; i++) {
            assert(
                timestamps[i].getMsSinceUnixEpoch() >= timestamps[i - 1].getMsSinceUnixEpoch(),
                `Timestamp ${i} (${timestamps[i].getMsSinceUnixEpoch()}) should be >= timestamp ${i - 1} (${timestamps[i - 1].getMsSinceUnixEpoch()})`
            );
        }

        // Verify time differences are reasonable (allowing for some tolerance)
        for (let i = 1; i < timestamps.length; i++) {
            const expectedDelay = delays[i - 1];
            const actualDelay = Number(timestamps[i].getMsSinceUnixEpoch() - timestamps[i - 1].getMsSinceUnixEpoch());
            
            // Allow some tolerance for timing variations (±50ms)
            assert(
                actualDelay >= expectedDelay - 50 && actualDelay <= expectedDelay + 200,
                `Time difference ${actualDelay}ms should be approximately ${expectedDelay}ms (±50ms tolerance, +200ms upper bound for system delays)`
            );
        }

        console.log("Timestamp progression:");
        timestamps.forEach((ts, i) => {
            console.log(`  ${i}: ${ts.getMsSinceUnixEpoch()} (${ts.asDate()})`);
        });

    } finally {
        if (session) {
            await session.close();
            await sleep(100);
        }
    }
});

Deno.test("Timestamp - System time accuracy", async () => {
    let session: Session | undefined;

    try {
        // Open a session
        session = await Session.open(new Config("ws/127.0.0.1:10000"));

        // Get system time just before requesting timestamp
        const systemTimeBefore = Date.now();
        
        // Get timestamp from session
        const timestamp = await session.newTimestamp();
        
        // Get system time just after receiving timestamp
        const systemTimeAfter = Date.now();

        const zenohTimeMs = Number(timestamp.getMsSinceUnixEpoch());

        // Verify timestamp is within reasonable range of system time
        // The timestamp should be between systemTimeBefore and systemTimeAfter + some tolerance
        const tolerance = 1000; // 1 second tolerance for network delays and clock differences

        assert(
            zenohTimeMs >= systemTimeBefore - tolerance && zenohTimeMs <= systemTimeAfter + tolerance,
            `Zenoh timestamp ${zenohTimeMs} should be within ${tolerance}ms of system time range [${systemTimeBefore}, ${systemTimeAfter}]`
        );

        // Convert to Date and verify it's reasonable
        const zenohDate = timestamp.asDate();
        const now = new Date();
        const timeDifference = Math.abs(now.getTime() - zenohDate.getTime());

        assert(
            timeDifference <= tolerance,
            `Zenoh timestamp date ${zenohDate} should be within ${tolerance}ms of current time ${now}`
        );

        console.log(`System time before: ${new Date(systemTimeBefore)}`);
        console.log(`Zenoh timestamp:    ${zenohDate} (${zenohTimeMs}ms)`);
        console.log(`System time after:  ${new Date(systemTimeAfter)}`);
        console.log(`Time difference:    ${timeDifference}ms`);

    } finally {
        if (session) {
            await session.close();
            await sleep(100);
        }
    }
});

Deno.test("Timestamp - ZenohId consistency", async () => {
    let session: Session | undefined;

    try {
        // Open a session
        session = await Session.open(new Config("ws/127.0.0.1:10000"));

        // Get multiple timestamps
        const timestamp1 = await session.newTimestamp();
        const timestamp2 = await session.newTimestamp();
        const timestamp3 = await session.newTimestamp();

        // All timestamps from the same session should have the same ZenohId
        const id1 = timestamp1.getId();
        const id2 = timestamp2.getId();
        const id3 = timestamp3.getId();

        // Convert to string for comparison (assuming ZenohId has proper toString or comparison)
        assertEquals(
            id1.toString(),
            id2.toString(),
            "All timestamps from the same session should have the same ZenohId"
        );
        
        assertEquals(
            id1.toString(),
            id3.toString(),
            "All timestamps from the same session should have the same ZenohId"
        );

        console.log(`Session ZenohId: ${id1.toString()}`);

    } finally {
        if (session) {
            await session.close();
            await sleep(100);
        }
    }
});
