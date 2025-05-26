import { ZenohId } from "./zid.js";

export class Timestamp {
    constructor(private readonly zid: ZenohId, private readonly ntp64: bigint) {}

    getId(): ZenohId {
        return this.zid;
    }

    getMsSinceUnixEpoch(): bigint {
        return this.ntp64;
    }

    asDate(): Date {
        // Note: Values produced by this Bigint should fit into a number as they are ms since Unix Epoch
        return new Date(this.ntp64 as unknown as number);
    }
}