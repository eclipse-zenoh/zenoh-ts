import { UUIDv4 } from "./remote_api/session";

export class Timestamp {

    private timestamp_id: UUIDv4;

    private string_rep: string

    private ms_since_unix_epoch: bigint

    constructor(timestamp_id: UUIDv4, string_rep: string, ms_since_unix_epoch: bigint) {
        this.timestamp_id = timestamp_id
        this.string_rep = string_rep
        this.ms_since_unix_epoch = ms_since_unix_epoch
    }

    // Note: Developers Should not need to use this
    get_resource_uuid(): UUIDv4 {
        return this.timestamp_id;
    }

    get_id(): string {
        return this.string_rep.split("/")[1] as string;
    }

    get_time(): string {
        return this.string_rep.split("/")[0] as string;
    }

    get_ms_since_unix_epoch(): bigint {
        return this.ms_since_unix_epoch;
    }

    as_date(): Date {
        // Note: Values produced by this Bigint should fit into a number as they are ms since Unix Epoch
        return new Date(this.ms_since_unix_epoch as unknown as number);
    }
}