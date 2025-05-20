//
// Copyright (c) 2024 ZettaScale Technology
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

// Internal
import { KeyExpr } from "./key_expr.js";
import { OwnedKeyExprWrapper } from "./remote_api/interface/OwnedKeyExprWrapper.js";
import { SampleKindWS } from "./remote_api/interface/SampleKindWS.js";
import { SampleWS } from "./remote_api/interface/SampleWS.js";
import { ZBytes } from "./z_bytes.js";
import { Encoding } from "./encoding.js";
// External
import { encode as b64_str_from_bytes, decode as b64_bytes_from_str, } from "base64-arraybuffer";

/**
 * Kinds of Samples that can be received from Zenoh
 * @enum
 * @default PUT
 */
export enum SampleKind {
  PUT = "PUT",
  DELETE = "DELETE",
}

/**
 * Congestion Control enum
 * @enum
 * @default CongestionControl.DROP
 */
export enum CongestionControl {
  DROP = "DROP",
  BLOCK = "BLOCK",
}

/**
 * The kind of consolidation to apply to a query.
 * @enum
 * @default ConsolidationMode.Auto
 */
export enum ConsolidationMode {
  Auto,
  /**
   * No consolidation applied: multiple samples may be received for the same key-timestamp.
   */
  None,

  Monotonic,
  Latest,
}

/**
 * Convenience function to convert between Congestion function and int
 * @internal
 */
export function consolidation_mode_to_int(
  congestionControl?: ConsolidationMode,
): number {
  switch (congestionControl) {
    case ConsolidationMode.Auto:
      return 0
    case ConsolidationMode.None:
      return 1
    case ConsolidationMode.Monotonic:
      return 2
    case ConsolidationMode.Latest:
      return 3
    default:
      return 0;
  }
}

/**
 * Convenience function to convert between Congestion function and int
 * @internal
 */
export function congestion_control_from_int(
  prioU8?: number,
): CongestionControl {
  switch (prioU8) {
    case 0:
      return CongestionControl.DROP;
    case 1:
      return CongestionControl.BLOCK;
    default:
      return CongestionControl.DROP;
  }
}

/**
 * Convenience function to convert between Congestion function and int
 * @internal
 */
export function congestion_control_to_int(
  congestionControl?: CongestionControl,
): number {
  switch (congestionControl) {
    case CongestionControl.DROP:
      return 0;
    case CongestionControl.BLOCK:
      return 1;
    // Default is Drop
    default:
      return 0;
  }
}

/**
 * Priority enum
 * @default Priority.Data
 */
export enum Priority {
  REAL_TIME = "REAL_TIME",
  INTERACTIVE_HIGH = "INTERACTIVE_HIGH",
  INTERACTIVE_LOW = "INTERACTIVE_LOW",
  DATA_HIGH = "DATA_HIGH",
  DATA = "DATA",
  DATA_LOW = "DATA_LOW",
  BACKGROUND = "BACKGROUND",
}

/**
 * Convenience function to convert between Priority function and int
 * @internal
 */
export function priority_from_int(prioU8: number): Priority {
  switch (prioU8) {
    case 1:
      return Priority.REAL_TIME;
    case 2:
      return Priority.INTERACTIVE_HIGH;
    case 3:
      return Priority.INTERACTIVE_LOW;
    case 4:
      return Priority.DATA_HIGH;
    case 5:
      return Priority.DATA;
    case 6:
      return Priority.DATA_LOW;
    case 7:
      return Priority.BACKGROUND;
    default:
      console.warn("Unknown Priority Variant, default to Data");
      return Priority.DATA;
  }
}

/**
 * Convenience function to convert between Priority function and int
 * @internal
 */
export function priority_to_int(prio?: Priority): number {
  switch (prio) {
    case Priority.REAL_TIME:
      return 1;
    case Priority.INTERACTIVE_HIGH:
      return 2;
    case Priority.INTERACTIVE_LOW:
      return 3;
    case Priority.DATA_HIGH:
      return 4;
    case Priority.DATA:
      return 5;
    case Priority.DATA_LOW:
      return 6;
    case Priority.BACKGROUND:
      return 7;
    default:
      // Default is Priority.DATA
      return 5;
  }
}

/**
 * Reliability Enum 
 * @default Reliability.RELIABLE
 */
export enum Reliability {
  RELIABLE = "RELIABLE",
  BEST_EFFORT = "BEST_EFFORT",
}

/**
 * @internal
 */
export function reliability_to_int(reliability: Reliability) {
  switch (reliability) {
    case Reliability.RELIABLE:
      return 0
    case Reliability.BEST_EFFORT:
      return 1
    default:
      return 0;
  }
}

/**
 * Sample class receieved from Subscriber
 * 
 */
export class Sample {
  constructor(
    public readonly keyexpr_: KeyExpr,
    public readonly payload_: ZBytes,
    public readonly kind_: SampleKind,
    public readonly encoding_: Encoding,
    public readonly priority_: Priority,
    public readonly timestamp_: string | undefined,
    public readonly congestionControl_: CongestionControl,
    public readonly express_: boolean,
    public readonly attachment_: ZBytes | undefined,
  ) {}

  keyexpr(): KeyExpr {
    return this.keyexpr_;
  }
  payload(): ZBytes {
    return this.payload_;
  }
  kind(): SampleKind {
    return this.kind_;
  }
  encoding(): Encoding {
    return this.encoding_;
  }
  timestamp(): string | undefined {
    return this.timestamp_;
  }
  congestionControl(): CongestionControl {
    return this.congestionControl_;
  }
  priority(): Priority {
    return this.priority_;
  }
  express(): boolean {
    return this.express_;
  }
  attachment(): ZBytes | undefined {
    return this.attachment_;
  }
}

/**
 * Convenience function to convert between Sample and SampleWS
 */
export function SampleFromSampleWS(sampleWS: SampleWS) {
  let sampleKind: SampleKind;
  if (sampleWS.kind == "Delete") {
    sampleKind = SampleKind.DELETE;
  } else {
    sampleKind = SampleKind.PUT;
  }

  let payload = new ZBytes(new Uint8Array(b64_bytes_from_str(sampleWS.value)));

  let keyExr = new KeyExpr(sampleWS.key_expr);

  let encoding = Encoding.fromString(sampleWS.encoding);

  let priority = priority_from_int(sampleWS.priority);

  let congestionControl = congestion_control_from_int(
    sampleWS.congestion_control,
  );

  let timestamp: string | undefined = sampleWS.timestamp as string | undefined;

  let express: boolean = sampleWS.express;

  let attachment = undefined;
  if (sampleWS.attachement != undefined) {
    attachment = new ZBytes(new Uint8Array(b64_bytes_from_str(sampleWS.attachement)));
  }

  return new Sample(
    keyExr,
    payload,
    sampleKind,
    encoding,
    priority,
    timestamp,
    congestionControl,
    express,
    attachment,
  );
}

/**
 * Convenience function to convert between SampleWS and Sample 
 */
export function SampleWSFromSample(
  sample: Sample,
  encoding: Encoding,
  priority: Priority,
  congestionControl: CongestionControl,
  express: boolean,
  attachement: ZBytes | undefined,
): SampleWS {
  let keyExpr: OwnedKeyExprWrapper = sample.keyexpr().toString();
  let value: Array<number> = Array.from(sample.payload().toBytes());

  let sampleKind: SampleKindWS;
  if (sample.kind() == SampleKind.DELETE) {
    sampleKind = "Delete";
  } else if (sample.kind() == SampleKind.PUT) {
    sampleKind = "Put";
  } else {
    console.warn(
      "Sample Kind not PUT | DELETE, defaulting to PUT: ",
      sample.kind(),
    );
    sampleKind = "Put";
  }

  let attach = null;
  if (attachement != null) {
    attach = b64_str_from_bytes(new Uint8Array(attachement.toBytes()));
  }

  let sampleWS: SampleWS = {
    key_expr: keyExpr,
    value: b64_str_from_bytes(new Uint8Array(value)),
    kind: sampleKind,
    encoding: encoding.toString(),
    timestamp: null,
    priority: priority_to_int(priority),
    congestion_control: congestion_control_to_int(congestionControl),
    express: express,
    attachement: attach,
  };

  return sampleWS;
}
