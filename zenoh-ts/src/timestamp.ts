import { UUIDv4 } from "./remote_api/session";

export class Timestamp {
    constructor(private timestampId: UUIDv4, private stringRep: string, private msSinceUnixEpoch: bigint) {}

    // Note: Developers Should not need to use this
    getResourceUuid(): UUIDv4 {
        return this.timestampId;
    }

    getId(): string {
        return this.stringRep.split("/")[1] as string;
    }

    getTime(): string {
        return this.stringRep.split("/")[0] as string;
    }

    getMsSinceUnixEpoch(): bigint {
        return this.msSinceUnixEpoch;
    }

    asDate(): Date {
        // Note: Values produced by this Bigint should fit into a number as they are ms since Unix Epoch
        return new Date(this.msSinceUnixEpoch as unknown as number);
    }
}