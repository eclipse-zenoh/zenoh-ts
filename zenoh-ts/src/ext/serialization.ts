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

import * as leb from "@thi.ng/leb128";

import { ZBytes } from '../z_bytes.js';
export interface ZSerializeable {
  serialize_with_zserializer(serializer: ZBytesSerializer): void;
}

export interface ZDeserializeable {
  deserialize_with_zdeserializer(deserializer: ZBytesDeserializer): void;
}

type IsSame<T, U> =
  (<G>() => G extends T ? 1 : 2) extends
  (<G>() => G extends U ? 1 : 2) ? T : never;

type UnionToIntersection<U> = 
  (U extends any ? (x: U)=>void : never) extends ((x: infer I)=>void) ? I : never

type IsNotUnion<T> = [T] extends [UnionToIntersection<T>] ? T : IsSame<T, boolean>

type Select<X, Y, Z> = (X & Y) extends never ? never : Z;

type IsSerializeableInner<T, X = T> =
  T extends ZSerializeable ? X
  : T extends number | boolean | string | bigint ? X
  //: T extends [infer U] ? IsSerializeable<U, X>
  //: T extends [infer Head, ...infer Tail] ? Select<IsSerializeable<Head, X>, IsSerializeable<Tail, X>, X>
  : T extends Array<infer U> ? IsSerializeable<U, X>
  : T extends Map<infer K, infer V> ? IsSerializeable<K, X> & IsSerializeable<V, X>
  : never;

type IsSerializeable<T, X = T> = Select<IsSerializeableInner<T>, IsNotUnion<T>, X>



function is_serializeable(s: any): s is ZSerializeable {
  return (<ZSerializeable>s).serialize_with_zserializer !== undefined;
}

export class ZBytesSerializer {
    private _buffer: Uint8Array
    /**
     * new function to create a ZBytesSerializer
     * 
     * @returns ZBytesSerializer
     */
    constructor() {
      this._buffer = new Uint8Array();
    }

    private append(buf: Uint8Array) {
      let b = new Uint8Array(this._buffer.length + buf.length)
      b.set(this._buffer)
      b.set(buf, this._buffer.length)
      this._buffer = b
    }

    public write_sequence_length(len: number) {
      this.append(leb.encodeULEB128(len))
    }

    public serialize_string(val: string) {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(val);
        this.write_sequence_length(encoded.length)
        this.append(encoded)
    }

    /// Serialize bigint as int64
    public serialize_bigint64(val: bigint) {
      let data = new Uint8Array(8);
      let view = new DataView(data.buffer);
      view.setBigInt64(0, val, true);
      this.append(data)
    }

    /// Serialize number as double
    public serialize_float64(val: number) {
      let data = new Uint8Array(8);
      let view = new DataView(data.buffer);
      view.setFloat64(0, val, true);
      this.append(data)
    }

    /// Serialize number as double
    public serialize_boolean(val: Boolean) {
      const b:Uint8Array = new Uint8Array(1)
      b[0] = val === true ? 1 : 0
      this.append(b)
    }

    public serialize_array<T>(val: T[]) {
      this.write_sequence_length(val.length)
      val.forEach( (element) => this._serialize_inner(element));
    }

    public serialize_map<K, V>(m: Map<K, V>) {
      this.write_sequence_length(m.size)
      m.forEach( (v, k) => { 
          this._serialize_inner(k);
          this._serialize_inner(v);
        }
      );
    }
    

    private _serialize_inner(data: any) {
      if (is_serializeable(data)) {
        data.serialize_with_zserializer(this);
      } else if (typeof data == "number") {
        this.serialize_float64(data)
      } else if (typeof data == "bigint") {
        this.serialize_bigint64(data)
      } else if (typeof data == "string") {
        this.serialize_string(data)
      } else if (typeof data == "boolean") {
        this.serialize_boolean(data)
      } else if (Array.isArray(data)) {
        this.serialize_array(data)
      } else if (data instanceof Map) {
        this.serialize_map(data)
      } else {
        // should never happen
        throw new Error(`Non-ZSerializeable type`); 
      }
    }

    public serialize<T>(val: T) {
        this._serialize_inner(val);
    }
  
    /**
     * extract ZBytes from ZBytesSerializer
     * 
     * @returns ZBytes
     */
    public finish(): ZBytes {
      let out = new ZBytes(this._buffer);
      this._buffer = new Uint8Array()
      return out
    }
}

class ZPartialDeserializer<T> {
  private _call: (deserializer: ZBytesDeserializer) => T

  constructor(call: (deserializer: ZBytesDeserializer) => T ) {
    this._call = call
  }

  /** @internal */
  call(deserializer: ZBytesDeserializer): T {
    return this._call(deserializer)
  }
}

export namespace ZSerDe{
  export function number(): ZPartialDeserializer<number> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_float64() });
  }

  export function bigint(): ZPartialDeserializer<bigint> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_bigint64() });
  }

  export function string(): ZPartialDeserializer<string> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_string() });
  }

  export function boolean(): ZPartialDeserializer<boolean> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_boolean() });
  }

  export function object<T extends ZDeserializeable>(proto: T): ZPartialDeserializer<T> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_object(proto)})
  }

  export function array<T>(p: ZPartialDeserializer<T>): ZPartialDeserializer<T[]> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_array(p)})
  }

  export function map<K, V>(p_key: ZPartialDeserializer<K>, p_value: ZPartialDeserializer<V>): ZPartialDeserializer<Map<K, V>> {
    return new ZPartialDeserializer((z: ZBytesDeserializer) => { return z.deserialize_map(p_key, p_value)})
  }
}


export class ZBytesDeserializer {
  private _buffer: Uint8Array;
  private _idx: number
  /**
   * new function to create a ZBytesDeserializer
   * 
   * @returns ZBytesSerializer
   */
  constructor(zbytes: ZBytes) {
    this._buffer = zbytes.to_bytes()
    this._idx = 0
  }

  private _read_slice(len: number): Uint8Array {
    const s = this._buffer.slice(this._idx, this._idx + len)
    if (s.length < len) {
      throw new Error(`Array index is out of bounds: ${this._idx + len} / ${this._buffer.length}`); 
    }
    this._idx += len
    return s
  }

  public read_sequence_length(): number {
    let [res, bytes_read] = leb.decodeULEB128(this._buffer, this._idx)
    this._idx += bytes_read
    if (res > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array length overflow: ${res}`); 
    }
    return new Number(res).valueOf()
  }

  public deserialize_string(): string {
      let len = this.read_sequence_length()
      const decoder = new TextDecoder()
      return decoder.decode(this._read_slice(len))
  }

  /// Deserialize int64 as bigint
  public deserialize_bigint64(): bigint {
    let data = this._read_slice(8);
    let view = new DataView(data.buffer);
    return view.getBigInt64(0, true);
  }

  /// Deserialize double as number
  public deserialize_float64(): number {
    let data = this._read_slice(8);
    let view = new DataView(data.buffer);
    return view.getFloat64(0, true);
  }

  /// Deserialize boolean
  public deserialize_boolean(): boolean {
    if (this._idx  >= this._buffer.length) {
      throw new Error(`Array index is out of bounds: ${this._idx} / ${this._buffer.length}`); 
    }
    const res = this._buffer[this._idx]
    this._idx += 1
    if (res == 1) {
      return true;
    } else if (res == 0) {
      return false
    } else {
      throw new Error(`Unexpected boolean value: ${res}`);
    }
  }

  /// Deserialize an array
  public deserialize_array<T>(p: ZPartialDeserializer<T>): T[] {
    const len = this.read_sequence_length()
    let out = new Array<T>(len)
    for (let i = 0; i < len; i++) {
      out[i] = p.call(this)
    }
    return out
  }

  /// Deserialzie a map
  public deserialize_map<K, V>(p_key: ZPartialDeserializer<K>, p_value: ZPartialDeserializer<V>): Map<K, V> {
    const len = this.read_sequence_length()
    let out = new Map<K, V>()
    for (let i = 0; i < len; i++) {
      const key = p_key.call(this)
      const value = p_value.call(this)
      out.set(key, value)
    }
    return out
  }

  public deserialize_object<T extends ZDeserializeable>(o: T): T {
    o.deserialize_with_zdeserializer(this)
    return o
  }


  public deserialize<T>(p: ZPartialDeserializer<T>): T {
    return p.call(this)
  }

  /**
   * @returns True if all payload bytes were used, false otherwise.
   */
  public is_done() : boolean {
    return this._buffer.length == this._idx
  }
}

export function zserialize<T>(val: T): ZBytes {
  const s = new ZBytesSerializer()
  s.serialize(val)
  return s.finish()
}

export function zdeserialize<T>(p: ZPartialDeserializer<T>, data: ZBytes): T  {
  const d = new ZBytesDeserializer(data)
  const res = d.deserialize(p)
  if (!d.is_done()) {
    throw new Error(`Payload contains more bytes than required for deserialization`); 
  }
  return res
}