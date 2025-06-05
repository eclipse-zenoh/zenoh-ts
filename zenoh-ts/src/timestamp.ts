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
    getMsSinceUnixEpoch(): number {
        // Extract upper 32 bits (seconds since Unix epoch)
        const seconds = Number(this.ntp64 >> 32n);
        
        // Extract lower 32 bits (fractional part in 2^32 units)
        const fraction = Number(this.ntp64 & 0xffffffffn);
        
        // Convert fractional part to milliseconds
        // fraction / 2^32 * 1000 = fraction * 1000 / 2^32
        const millisecondFraction = (fraction * 1000) / 4294967296; // 2^32 = 4294967296
        
        return seconds * 1000 + millisecondFraction;
    }

    asDate(): Date {
        return new Date(this.getMsSinceUnixEpoch());
    }
}