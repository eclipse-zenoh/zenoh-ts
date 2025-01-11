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
  congestion_control?: ConsolidationMode,
): number {
  switch (congestion_control) {
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
  prio_u8?: number,
): CongestionControl {
  switch (prio_u8) {
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
  congestion_control?: CongestionControl,
): number {
  switch (congestion_control) {
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
export function priority_from_int(prio_u8: number): Priority {
  switch (prio_u8) {
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
  private _keyexpr: KeyExpr;
  private _payload: ZBytes;
  private _kind: SampleKind;
  private _encoding: Encoding;
  private _priority: Priority;
  private _timestamp: string | undefined;
  private _congestion_control: CongestionControl;
  private _express: boolean;
  private _attachment: ZBytes | undefined;

  keyexpr(): KeyExpr {
    return this._keyexpr;
  }
  payload(): ZBytes {
    return this._payload;
  }
  kind(): SampleKind {
    return this._kind;
  }
  encoding(): Encoding {
    return this._encoding;
  }
  timestamp(): string | undefined {
    return this._timestamp;
  }
  congestion_control(): CongestionControl {
    return this._congestion_control;
  }
  priority(): Priority {
    return this._priority;
  }
  express(): boolean {
    return this._express;
  }
  attachment(): ZBytes | undefined {
    return this._attachment;
  }

  constructor(
    keyexpr: KeyExpr,
    payload: ZBytes,
    kind: SampleKind,
    encoding: Encoding,
    priority: Priority,
    timestamp: string | undefined,
    congestion_control: CongestionControl,
    express: boolean,
    attachment: ZBytes | undefined,
  ) {
    this._keyexpr = keyexpr;
    this._payload = payload;
    this._kind = kind;
    this._encoding = encoding;
    this._priority = priority;
    this._timestamp = timestamp;
    this._congestion_control = congestion_control;
    this._express = express;
    this._attachment = attachment;
  }

}


/**
 * Convenience function to convert between Sample and SampleWS
 */
export function Sample_from_SampleWS(sample_ws: SampleWS) {
  let sample_kind: SampleKind;
  if (sample_ws.kind == "Delete") {
    sample_kind = SampleKind.DELETE;
  } else {
    sample_kind = SampleKind.PUT;
  }

  let payload = new ZBytes(new Uint8Array(b64_bytes_from_str(sample_ws.value)));

  let key_exr = new KeyExpr(sample_ws.key_expr);

  let encoding = Encoding.from_str(sample_ws.encoding);

  let priority = priority_from_int(sample_ws.priority);

  let congestion_control = congestion_control_from_int(
    sample_ws.congestion_control,
  );

  let timestamp: string | undefined = sample_ws.timestamp as string | undefined;

  let express: boolean = sample_ws.express;

  let attachment = undefined;
  if (sample_ws.attachement != undefined) {
    attachment = new ZBytes(new Uint8Array(b64_bytes_from_str(sample_ws.attachement)));
  }

  return new Sample(
    key_exr,
    payload,
    sample_kind,
    encoding,
    priority,
    timestamp,
    congestion_control,
    express,
    attachment,
  );
}

/**
 * Convenience function to convert between SampleWS and Sample 
 */
export function SampleWS_from_Sample(
  sample: Sample,
  encoding: Encoding,
  priority: Priority,
  congestion_control: CongestionControl,
  express: boolean,
  attachement: ZBytes | undefined,
): SampleWS {
  let key_expr: OwnedKeyExprWrapper = sample.keyexpr().toString();
  let value: Array<number> = Array.from(sample.payload().to_bytes());

  let sample_kind: SampleKindWS;
  if (sample.kind() == SampleKind.DELETE) {
    sample_kind = "Delete";
  } else if (sample.kind() == SampleKind.PUT) {
    sample_kind = "Put";
  } else {
    console.warn(
      "Sample Kind not PUT | DELETE, defaulting to PUT: ",
      sample.kind(),
    );
    sample_kind = "Put";
  }

  let attach = null;
  if (attachement != null) {
    attach = b64_str_from_bytes(new Uint8Array(attachement.to_bytes()));
  }

  let sample_ws: SampleWS = {
    key_expr: key_expr,
    value: b64_str_from_bytes(new Uint8Array(value)),
    kind: sample_kind,
    encoding: encoding.toString(),
    timestamp: null,
    priority: priority_to_int(priority),
    congestion_control: congestion_control_to_int(congestion_control),
    express: express,
    attachement: attach,
  };

  return sample_ws;
}
