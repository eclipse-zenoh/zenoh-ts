import { ZenohId } from "./zid.js";

export class Timestamp {
    constructor(private readonly zid: ZenohId, private readonly ntp64: bigint) {}

    getId(): ZenohId {
        return this.zid;
    }

    /**
     * Gets the NTP64 timestamp value as received from Zenoh
     */
    getNtp64(): bigint {
        return this.ntp64;
    }

    /**
     * Converts NTP64 timestamp to milliseconds since Unix epoch
     * NTP64 format: upper 32 bits = seconds since Unix epoch, lower 32 bits = fractional seconds
     */
    getMsSinceUnixEpoch(): bigint {
        // Extract upper 32 bits (seconds since Unix epoch)
        const seconds = this.ntp64 >> 32n;
        
        // Extract lower 32 bits (fractional part in 2^32 units)
        const fraction = this.ntp64 & 0xFFFFFFFFn;
        
        // Convert fractional part to milliseconds
        // fraction / 2^32 * 1000 = fraction * 1000 / 2^32
        const millisecondFraction = (fraction * 1000n) >> 32n;
        
        return seconds * 1000n + millisecondFraction;
    }

    asDate(): Date {
        const msUnixEpoch = this.getMsSinceUnixEpoch();
        // Convert BigInt to number safely
        return new Date(Number(msUnixEpoch));
    }
}