import { UUIDv4 } from "./remote_api/session";

export class Timestamp {
    constructor(private timestampId: UUIDv4, private stringRep: string, private msSinceUnixEpoch: bigint) {}

    // Note: Developers Should not need to use this
    get_resource_uuid(): UUIDv4 {
        return this.timestampId;
    }

    get_id(): string {
        return this.stringRep.split("/")[1] as string;
    }

    get_time(): string {
        return this.stringRep.split("/")[0] as string;
    }

    get_ms_since_unix_epoch(): bigint {
        return this.msSinceUnixEpoch;
    }

    as_date(): Date {
        // Note: Values produced by this Bigint should fit into a number as they are ms since Unix Epoch
        return new Date(this.msSinceUnixEpoch as unknown as number);
    }
}