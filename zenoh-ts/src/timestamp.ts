import { ZBytesDeserializer, ZBytesSerializer } from "./ext";
import { Zid } from "./zid";

export class Timestamp {
    private constructor(private readonly zid: Zid, private readonly ntp64: bigint) {}

    getId(): Zid {
        return this.zid;
    }

    getMsSinceUnixEpoch(): bigint {
        return this.ntp64;
    }

    asDate(): Date {
        // Note: Values produced by this Bigint should fit into a number as they are ms since Unix Epoch
        return new Date(this.ntp64 as unknown as number);
    }

    serializeWithZSerializer(serializer: ZBytesSerializer) {
        serializer.serializeBigintUint64(this.ntp64);
        this.zid.serializeWithZSerializer(serializer);
    }

    static deserialize(deserializer: ZBytesDeserializer): Timestamp {
        let ntp64 = deserializer.deserializeBigintUint64();
        let zid = Zid.deserialize(deserializer);
        return new Timestamp(zid, ntp64);
    }
}

export function deserializeOptTimestamp(deserializer: ZBytesDeserializer): Timestamp | undefined {
    if (deserializer.deserializeBoolean()) {
        return Timestamp.deserialize(deserializer);
    } else {
        return undefined;
    }
  }