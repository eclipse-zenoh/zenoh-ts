//
// Copyright (c) 2025 ZettaScale Technology
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

/**
 * Browser-compatible type checking functions
 */
function isUint8Array(arr: any): arr is Uint8Array {
  return arr instanceof Uint8Array;
}

function isUint16Array(arr: any): arr is Uint16Array {
  return arr instanceof Uint16Array;
}

function isUint32Array(arr: any): arr is Uint32Array {
  return arr instanceof Uint32Array;
}

function isBigUint64Array(arr: any): arr is BigUint64Array {
  return arr instanceof BigUint64Array;
}

function isInt8Array(arr: any): arr is Int8Array {
  return arr instanceof Int8Array;
}

function isInt16Array(arr: any): arr is Int16Array {
  return arr instanceof Int16Array;
}

function isInt32Array(arr: any): arr is Int32Array {
  return arr instanceof Int32Array;
}

function isBigInt64Array(arr: any): arr is BigInt64Array {
  return arr instanceof BigInt64Array;
}

function isFloat32Array(arr: any): arr is Float32Array {
  return arr instanceof Float32Array;
}

function isFloat64Array(arr: any): arr is Float64Array {
  return arr instanceof Float64Array;
}

/**
 * Interface for adding support for custom types serialization.
 */ 
export interface ZSerializeable {
  serialize_with_zserializer(serializer: ZBytesSerializer): void;
}

const is_little_endian: boolean = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201)

/**
 * Interface for adding support for custom types deserialization.
 */ 
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
  : T extends number ? X
  : T extends bigint ? X
  : T extends string ? X
  : T extends boolean ? X
  : T extends Uint8Array<infer _> ? X
  : T extends Uint16Array<infer _> ? X
  : T extends Uint32Array<infer _> ? X
  : T extends BigUint64Array<infer _> ? X
  : T extends Int8Array<infer _> ? X
  : T extends Int16Array<infer _> ? X
  : T extends Int32Array<infer _> ? X
  : T extends BigInt64Array<infer _> ? X
  : T extends Float32Array<infer _> ? X
  : T extends Float64Array<infer _> ? X
  : T extends Array<infer U> ? EnsureSerializeable<U, X>
  : T extends Map<infer K, infer V> ? EnsureSerializeable<K, X> & EnsureSerializeable<V, X>
  : never;

export type EnsureSerializeable<T, X = T> = Select<IsSerializeableInner<T>, IsNotUnion<T>, X>

function is_serializeable(s: any): s is ZSerializeable {
  return (<ZSerializeable>s).serialize_with_zserializer !== undefined;
}

/**
 * A Zenoh serializer.
 * Provides functionality for tuple-like serialization.
 */
export class ZBytesSerializer {
    private _buffer: Uint8Array
    /**
     * new function to create a ZBytesSerializer.
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

    /**
     * Serializes length of the sequence. Can be used when defining serialization for custom containers.
     */
    public write_sequence_length(len: number) {
      this.append(leb.encodeULEB128(len))
    }

    /**
     * Serializes a utf-8 encoded string.
     */
    public serialize_string(val: string) {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(val);
      this.write_sequence_length(encoded.length)
      this.append(encoded)
    }

    /**
     * Serializes a Uint8Array.
     */
    public serialize_uint8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint8Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      this.append(val)
    }

    /**
     * Serializes a Uint16Array.
     */
    public serialize_uint16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint16Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_uint16(element));
      }
    }

    /**
     * Serializes a Uint32Array.
     */
    public serialize_uint32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint32Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_uint32(element));
      }
    }

    /**
     * Serializes a BigUint64Array.
     */
    public serialize_biguint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: BigUint64Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_bigint_uint64(element));
      }
    }

    /**
     * Serializes a Int8Array.
     */
    public serialize_int8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int8Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      this.append(new Uint8Array(val.buffer))
    }

    /**
     * Serializes a Int16Array.
     */
    public serialize_int16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int16Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_int16(element));
      }
    }

    /**
     * Serializes a Int32Array.
     */
    public serialize_int32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int32Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_int32(element));
      }
    }

    /**
     * Serializes a BigInt64Array.
     */
    public serialize_bigint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: BigInt64Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_bigint_int64(element));
      }
    }

    /**
     * Serializes a Float32Array.
     */
    public serialize_float32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Float32Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_float32(element));
      }
    }

    /**
     * Serializes a Float64Array.
     */
    public serialize_float64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Float64Array<TArrayBuffer>) {
      this.write_sequence_length(val.length)
      if (is_little_endian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serialize_number_float64(element));
      }
    }
  
    /**
     * Serializes bigint as 64 bit signed integer.
     */
    public serialize_bigint_int64(val: bigint) {
      let data = new Uint8Array(8);
      let view = new DataView(data.buffer);
      view.setBigInt64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes bigint as 64 bit unsigned integer.
     */
    public serialize_bigint_uint64(val: bigint) {
      let data = new Uint8Array(8);
      let view = new DataView(data.buffer);
      view.setBigUint64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 64 bit floating point number.
     */
    public serialize_number_float64(val: number) {
      let data = new Uint8Array(8);
      let view = new DataView(data.buffer);
      view.setFloat64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 32 bit floating point number.
     */
    public serialize_number_float32(val: number) {
      let data = new Uint8Array(4);
      let view = new DataView(data.buffer);
      view.setFloat32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 64 bit integer.
     */
    public serialize_number_int64(val: number) {
      let bigint_val = BigInt(val);
      this.serialize_bigint_int64(bigint_val)
    }

    /**
     * Serializes number as 64 bit unsigned integer.
     */
    public serialize_number_uint64(val: number) {
      let bigint_val = BigInt(val);
      this.serialize_bigint_uint64(bigint_val)
    }

    /**
     * Serializes number as 32 bit integer.
     */
    public serialize_number_int32(val: number) {
      let data = new Uint8Array(4);
      let view = new DataView(data.buffer);
      view.setInt32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 32 bit unsigned integer.
     */
    public serialize_number_uint32(val: number) {
      let data = new Uint8Array(4);
      let view = new DataView(data.buffer);
      view.setUint32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 16 bit integer.
     */
    public serialize_number_int16(val: number) {
      let data = new Uint8Array(2);
      let view = new DataView(data.buffer);
      view.setInt16(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 16 bit unsigned integer.
     */
    public serialize_number_uint16(val: number) {
      let data = new Uint8Array(2);
      let view = new DataView(data.buffer);
      view.setUint16(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 8 bit integer.
     */
    public serialize_number_int8(val: number) {
      let data = new Uint8Array(1);
      let view = new DataView(data.buffer);
      view.setInt8(0, val);
      this.append(data)
    }

    /**
     * Serializes number as 8 bit unsigned integer.
     */
    public serialize_number_uint8(val: number) {
      let data = new Uint8Array(1);
      let view = new DataView(data.buffer);
      view.setUint8(0, val);
      this.append(data)
    }

    /**
     * Serializes boolean.
     */
    public serialize_boolean(val: Boolean) {
      const b:Uint8Array = new Uint8Array(1)
      b[0] = val === true ? 1 : 0
      this.append(b)
    }

    /**
     * Serializes an array.
     */
    public serialize_array<T>(val: EnsureSerializeable<T>[], t?: ZSTypeInfo<EnsureSerializeable<T>>) {
      this.write_sequence_length(val.length)
      if (val.length > 0 && t === undefined) {
        t = this._get_default_serialization_tag(val[0] as any) as ZSTypeInfo<EnsureSerializeable<T>>
      }
      val.forEach( (element) => (t as ZSTypeInfo<EnsureSerializeable<T>>).serialize(this, element));
    }

    /**
     * Serializes a map.
     */
    public serialize_map<K, V>(m: Map<EnsureSerializeable<K>, EnsureSerializeable<V>>, t_key?:ZSTypeInfo<EnsureSerializeable<K>>, t_value?: ZSTypeInfo<EnsureSerializeable<V>>) {
      this.write_sequence_length(m.size)
      if (m.size > 0) {
        let val = m.entries().next()
        if (val !== undefined ) {
          let value = val.value
          if (value !== undefined) {
            t_key ??= this._get_default_serialization_tag(value[0] as any) as ZSTypeInfo<EnsureSerializeable<K>>
            t_value ??= this._get_default_serialization_tag(value[1] as any) as ZSTypeInfo<EnsureSerializeable<V>>
          }
        }
      }
      m.forEach( (v, k) => { 
        (t_key as ZSTypeInfo<EnsureSerializeable<K>>).serialize(this, k);
        (t_value as ZSTypeInfo<EnsureSerializeable<V>>).serialize(this, v);
      }
    );
    }
    
    private _get_default_serialization_tag<T>(data: EnsureSerializeable<T>): ZSTypeInfo<EnsureSerializeable<T>> {
      if (is_serializeable(data)) {
        type R = typeof data
        return ZS.object<R>() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (typeof data == "number") {
        return ZS.number() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (typeof data == "bigint") {
        return ZS.bigint() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (typeof data == "string") {
        return ZS.string() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (typeof data == "boolean") {
        return ZS.boolean() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isUint8Array(data)) {
        return ZS.uint8array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isUint16Array(data)) {
        return ZS.uint16array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isUint32Array(data)) {
        return ZS.uint32array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isBigUint64Array(data)) {
        return ZS.biguint64array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isInt8Array(data)) {
        return ZS.int8array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isInt16Array(data)) {
        return ZS.int16array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isInt32Array(data)) {
        return ZS.int32array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isBigInt64Array(data)) {
        return ZS.bigint64array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isFloat32Array(data)) {
        return ZS.float32array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (isFloat64Array(data)) {
        return ZS.float64array() as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (Array.isArray(data)) {
        let t = undefined
        if (data.length > 0) {
          t = this._get_default_serialization_tag(data[0])
        }
        return ZS.array(t) as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (data instanceof Map) {
        let t_key = undefined
        let t_value = undefined
        let val = data.entries().next()
        if (val !== undefined ) {
          let value = val.value
          if (value !== undefined) {
            t_key = this._get_default_serialization_tag(value[0] as any)
            t_value = this._get_default_serialization_tag(value[1] as any)
          }
        }
        return ZS.map(t_key, t_value) as ZSTypeInfo<EnsureSerializeable<T>>
      } else {   // should never happen
        throw new Error(`Non-ZSerializeable type`); 
      }
    }

    /**
     * Serializes any supported type and append it to existing serialized payload.
     * Supported types are:
     *   - built-in types: number, bigint, string, boolean,
     *   - TypedArrays, 
     *   - arrays and maps of supported types.
     * @param val Value to serialize.
     * @param t An optional serialization tag (if ommited, the default one will be used).
     */
    public serialize<T>(val: EnsureSerializeable<T>, t?: ZSTypeInfo<EnsureSerializeable<T>>) {
      if (t === undefined) {
        this._get_default_serialization_tag(val).serialize(this, val)
      } else {
        t.serialize(this, val)
      }
    }
  
    /**
     * Extracts ZBytes from ZBytesSerializer
     * 
     * @returns ZBytes
     */
    public finish(): ZBytes {
      let out = new ZBytes(this._buffer);
      this._buffer = new Uint8Array()
      return out
    }
}

/**
 * Format for `number` type serialization/deserialzation.
 */
export enum NumberFormat {
  Float64 = 1,
  Float32,
  Int64,
  Uint64,
  Int32,
  Uint32,
  Int16,
  Uint16,
  Int8,
  Uint8
}

/**
 * Format for `bigint` type serialization/deserialzation.
 */
export enum BigIntFormat {
  Int64 = 1,
  Uint64
}


class ZDTypeInfo<T> {
  private _deserialize: (deserializer: ZBytesDeserializer) => T

  constructor(deserialize: (deserializer: ZBytesDeserializer) => T ) {
    this._deserialize = deserialize
  }

  /** @internal */
  deserialize(deserializer: ZBytesDeserializer): T {
    return this._deserialize(deserializer)
  }
}

class ZSTypeInfo<T> {
  private _serialize: (serializer: ZBytesSerializer, val: T) => void

  constructor(serialize: (serializer: ZBytesSerializer, val: T) => void) {
    this._serialize = serialize
  }

  /** @internal */
  serialize(serializer: ZBytesSerializer, val: T): void {
    this._serialize(serializer, val)
  }
}

export namespace ZD{
  /**
   * Indicates that value should be deserialized as a number in specified format.
   * @returns Number deserialization tag.
   */
  export function number(format: NumberFormat = NumberFormat.Float64): ZDTypeInfo<number> {
    switch(format) {
      case NumberFormat.Float64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_float64() }
        );
      case NumberFormat.Float32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_float32() }
        );
      case NumberFormat.Int64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_int64() }
        );
      case NumberFormat.Uint64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_uint64() }
        );
       case NumberFormat.Int32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_int32() }
        );
      case NumberFormat.Uint32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_uint32() }
        );
      case NumberFormat.Int16:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_int16() }
        );
      case NumberFormat.Uint16:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_uint16() }
        );
      case NumberFormat.Int8:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_int8() }
        );
      case NumberFormat.Uint8:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_number_int16() }
        );
    }
  }

  /**
   * Indicates that data should be deserialized as a bigint in specified format.
   * @returns Bigint deserialization tag.
   */
  export function bigint(format:BigIntFormat = BigIntFormat.Int64): ZDTypeInfo<bigint> {
    switch (format) {
      case BigIntFormat.Int64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_bigint_int64() }
        );
      case BigIntFormat.Uint64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserialize_bigint_uint64() }
        );
    }
  }

  /**
   * Indicates that data should be deserialized as a string.
   * @returns String deserialization tag.
   */
  export function string(): ZDTypeInfo<string> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_string() }
    );
  }

  /**
   * Indicates that data should be deserialized as a boolean.
   * @returns Boolean deserialization tag.
   */
  export function boolean(): ZDTypeInfo<boolean> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_boolean() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint8Array.
   * @returns Uint8Array deserialization tag.
   */
  export function uint8array(): ZDTypeInfo<Uint8Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_uint8array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint16Array.
   * @returns Uint16Array deserialization tag.
   */
  export function uint16array(): ZDTypeInfo<Uint16Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_uint16array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint32Array.
   * @returns Uint32Array deserialization tag.
   */
  export function uint32array(): ZDTypeInfo<Uint32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_uint32array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a BigUint64Array.
   * @returns BigUint64Array deserialization tag.
   */
  export function biguint64array(): ZDTypeInfo<BigUint64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_biguint64array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int8Array.
   * @returns Int8Array deserialization tag.
   */
  export function int8array(): ZDTypeInfo<Int8Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_int8array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int16Array.
   * @returns Int16Array deserialization tag.
   */
  export function int16array(): ZDTypeInfo<Int16Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_int16array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int32Array.
   * @returns Int32Array deserialization tag.
   */
  export function int32array(): ZDTypeInfo<Int32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_int32array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a BigInt64Array.
   * @returns BigInt64Array deserialization tag.
   */
  export function bigint64array(): ZDTypeInfo<BigInt64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_bigint64array() }
    );
  }
  /**
   * Indicates that data should be deserialized as a Float32Array.
   * @returns Float32Array deserialization tag.
   */
  export function float32array(): ZDTypeInfo<Float32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_float32array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Float64Array.
   * @returns Float64Array deserialization tag.
   */
  export function float64array(): ZDTypeInfo<Float64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_float64array() }
    );
  }

  /**
   * Indicates that data should be deserialized as an object.
   * @param create A new function to create an object instance where data will be deserialized.
   * @returns Object deserialization tag.
   */
  export function object<T extends ZDeserializeable>(create: new() => T): ZDTypeInfo<T> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_object(create) }
    );
  }

  /**
   * Indicates that data should be deserialized as an array.
   * @param t An array element deserialization tag.
   * @returns Array deserialization tag.
   */
  export function array<T>(t: ZDTypeInfo<T>): ZDTypeInfo<T[]> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_array(t) }
    );
  }

  /**
   * Indicates that data should be deserialized as a map.
   * @param t_key A key type deserialization tag.
   * @param t_value A value type deserialization tag.
   * @returns Array deserialization tag.
   */
  export function map<K, V>(t_key: ZDTypeInfo<K>, t_value: ZDTypeInfo<V>): ZDTypeInfo<Map<K, V>> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserialize_map(t_key, t_value) }
    );
  }
}

export namespace ZS{
  /**
   * Indicates that value should be serialized as a number in specified format.
   * @returns Number serialization tag.
   */
  export function number(format: NumberFormat = NumberFormat.Float64): ZSTypeInfo<number> {
    switch(format) {
      case NumberFormat.Float64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_float64(val);}
        );
      case NumberFormat.Float32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_float32(val);}
        );
      case NumberFormat.Int64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_int64(val);}
        );
      case NumberFormat.Uint64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_uint64(val);}
        );
       case NumberFormat.Int32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_int32(val);}
        );
      case NumberFormat.Uint32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_uint32(val);}
        );
      case NumberFormat.Int16:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_int16(val);}
        );
      case NumberFormat.Uint16:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_uint16(val);}
        );
      case NumberFormat.Int8:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_int8(val);}
        );
      case NumberFormat.Uint8:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serialize_number_int16(val);}
        );
    }
  }

  /**
   * Indicates that data should be serialized as a bigint in specified format.
   * @returns Bigint serialization tag.
   */
  export function bigint(format:BigIntFormat = BigIntFormat.Int64): ZSTypeInfo<bigint> {
    switch (format) {
      case BigIntFormat.Int64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: bigint) => {z.serialize_bigint_int64(val);}
        );
      case BigIntFormat.Uint64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: bigint) => {z.serialize_bigint_uint64(val);}
        );
    }
  }

  /**
   * Indicates that data should be serialized as a string.
   * @returns String serialization tag.
   */
  export function string(): ZSTypeInfo<string> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: string) => {z.serialize_string(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a boolean.
   * @returns Boolean serialization tag.
   */
  export function boolean(): ZSTypeInfo<boolean> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: boolean) => {z.serialize_boolean(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint8Array.
   * @returns Uint8Array serialization tag.
   */
  export function uint8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint8Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint8Array) => {z.serialize_uint8array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint16Array.
   * @returns Uint16Array serialization tag.
   */
  export function uint16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint16Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint16Array) => {z.serialize_uint16array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint32Array.
   * @returns Uint32Array serialization tag.
   */
  export function uint32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint32Array) => {z.serialize_uint32array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a BigUint64Array.
   * @returns BigUint64Array serialization tag.
   */
  export function biguint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<BigUint64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: BigUint64Array) => {z.serialize_biguint64array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int8Array.
   * @returns Int8Array serialization tag.
   */
  export function int8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int8Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int8Array) => {z.serialize_int8array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int16Array.
   * @returns Int16Array serialization tag.
   */
  export function int16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int16Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int16Array) => {z.serialize_int16array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int32Array.
   * @returns Int32Array serialization tag.
   */
  export function int32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int32Array) => {z.serialize_int32array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a BigInt64Array.
   * @returns BigInt64Array serialization tag.
   */
  export function bigint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<BigInt64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: BigInt64Array) => {z.serialize_bigint64array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Float32Array.
   * @returns Float32Array serialization tag.
   */
  export function float32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Float32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Float32Array) => {z.serialize_float32array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as Float64Array.
   * @returns Float64Array serialization tag.
   */
  export function float64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Float64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Float64Array) => {z.serialize_float64array(val);}
    );
  }

  /**
   * Indicates that data should be deserialized as an object.
   * @returns Object serialization tag.
   */
  export function object<T extends ZSerializeable>(): ZSTypeInfo<T> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: T) => {val.serialize_with_zserializer(z)}
    );
  }

  /**
   * Indicates that data should be serialized as an array.
   * @param t An optional array element serialization tag (if omitted the default one will be used).
   * @returns Array serialization tag.
   */
  export function array<T>(t?: ZSTypeInfo<EnsureSerializeable<T>>): ZSTypeInfo<EnsureSerializeable<T>[]> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: EnsureSerializeable<T>[]) => {z.serialize_array(val, t)}
    );
  }

  /**
   * Indicates that data should be serialized as a map.
   * @param t_key An optional key type serialization tag (if omitted the default one will be used).
   * @param t_value An optional value type serialization tag (if omitted the default one will be used).
   * @returns Array serialization tag.
   */
  export function map<K, V>(t_key?: ZSTypeInfo<EnsureSerializeable<K>>, t_value?: ZSTypeInfo<EnsureSerializeable<V>>): ZSTypeInfo<Map<EnsureSerializeable<K>, EnsureSerializeable<V>>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Map<EnsureSerializeable<K>, EnsureSerializeable<V>>) => {z.serialize_map(val, t_key, t_value)},
    );
  }
}

export class ZBytesDeserializer {
  private _buffer: Uint8Array;
  private _idx: number
  /**
   * new function to create a ZBytesDeserializer
   * @param p payload to deserialize.
   * @returns ZBytesSerializer
   */
  constructor(zbytes: ZBytes) {
    this._buffer = zbytes.to_bytes()
    this._idx = 0
  }

  private _read_slice(len: number): Uint8Array {
    const s = this._buffer.subarray(this._idx, this._idx + len)
    if (s.length < len) {
      throw new Error(`Array index is out of bounds: ${this._idx + len} / ${this._buffer.length}`); 
    }
    this._idx += len
    return s
  }

  /**
   * Reads length of the sequence previously written by {@link ZBytesSerializer.write_sequence_length} and advances the reading position.
   * @returns Number of sequence elements.
   */
  public read_sequence_length(): number {
    let [res, bytes_read] = leb.decodeULEB128(this._buffer, this._idx)
    this._idx += bytes_read
    if (res > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array length overflow: ${res}`); 
    }
    return new Number(res).valueOf()
  }

  /**
   * Deserializes next portion of data as string and advances the reading position.
   */
  public deserialize_string(): string {
      let len = this.read_sequence_length()
      const decoder = new TextDecoder()
      return decoder.decode(this._read_slice(len))
  }

  /**
   * Deserializes next portion of data as Uint8Array and advances the reading position.
   */
  public deserialize_uint8array(): Uint8Array {
    let len = this.read_sequence_length();
    return this._read_slice(len).slice()
  }

  /**
   * Deserializes next portion of data as Uint16Array and advances the reading position.
   */
  public deserialize_uint16array(): Uint16Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Uint16Array(this._read_slice(len * 2).slice().buffer)
    } else {
      let out = new Uint16Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_uint16()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Uint32Array and advances the reading position.
   */
  public deserialize_uint32array(): Uint32Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Uint32Array(this._read_slice(len * 4).slice().buffer)
    } else {
      let out = new Uint32Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_uint32()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as BigUint64Array and advances the reading position.
   */
  public deserialize_biguint64array(): BigUint64Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new BigUint64Array(this._read_slice(len * 8).slice().buffer)
    } else {
      let out = new BigUint64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_bigint_uint64()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Int8Array and advances the reading position.
   */
  public deserialize_int8array(): Int8Array {
    let len = this.read_sequence_length();
    return  new Int8Array(this._read_slice(len).slice().buffer)
  }

  /**
   * Deserializes next portion of data as Int16Array and advances the reading position.
   */
  public deserialize_int16array(): Int16Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Int16Array(this._read_slice(len * 2).slice().buffer)
    } else {
      let out = new Int16Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_int16()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Int32Array and advances the reading position.
   */
  public deserialize_int32array(): Int32Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Int32Array(this._read_slice(len * 4).slice().buffer)
    } else {
      let out = new Int32Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_int32()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as BigInt64Array and advances the reading position.
   */
  public deserialize_bigint64array(): BigInt64Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new BigInt64Array(this._read_slice(len * 8).slice().buffer)
    } else {
      let out = new BigInt64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_bigint_int64()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Float32Array and advances the reading position.
   */
  public deserialize_float32array(): Float32Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Float32Array(this._read_slice(len * 4).slice().buffer)
    } else {
      let out = new Float32Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_float32()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Float64Array and advances the reading position.
   */
  public deserialize_float64array(): Float64Array {
    let len = this.read_sequence_length();
    if (is_little_endian) {
      return new Float64Array(this._read_slice(len * 8).slice().buffer)
    } else {
      let out = new Float64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserialize_number_float64()
      }
      return out
    }
  }



  /**
   * Deserializes next portion of data (serialized as 64 bit signed integer) as bigint and advances the reading position.
   */
  public deserialize_bigint_int64(): bigint {
    let data = this._read_slice(8).slice();
    let view = new DataView(data.buffer);
    return view.getBigInt64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit unsigned integer) as bigint and advances the reading position.
   */
  public deserialize_bigint_uint64(): bigint {
    let data = this._read_slice(8).slice();
    let view = new DataView(data.buffer);
    return view.getBigUint64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit floating point number) as number and advances the reading position.
   */
  public deserialize_number_float64(): number {
    let data = this._read_slice(8).slice();
    let view = new DataView(data.buffer);
    return view.getFloat64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit floating point number) as number and advances the reading position.
   */
  public deserialize_number_float32(): number {
    let data = this._read_slice(4).slice();
    let view = new DataView(data.buffer);
    return view.getFloat32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit signed integer) as number and advances the reading position.
   * Throws an error if the value exceeds the safe integer range (-2^53 to 2^53).
   */
  public deserialize_number_int64(): number {
    let bigint = this.deserialize_bigint_int64();
    if (bigint > Number.MAX_SAFE_INTEGER || bigint < Number.MIN_SAFE_INTEGER) {
      throw new Error(`Integer value ${bigint} exceeds the safe range for JavaScript numbers`);
    }
    return Number(bigint);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit unsigned integer) as number and advances the reading position.
   * Throws an error if the value exceeds the safe integer range (-2^53 to 2^53).
   */
  public deserialize_number_uint64(): number {
    let bigint = this.deserialize_bigint_uint64();
    if (bigint > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Integer value ${bigint} exceeds the safe range for JavaScript numbers`);
    }
    return Number(bigint);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit signed integer) as number and advances the reading position.
   */
  public deserialize_number_int32(): number {
    let data = this._read_slice(4).slice();
    let view = new DataView(data.buffer);
    return view.getInt32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit unsigned integer) as number and advances the reading position.
   */
  public deserialize_number_uint32(): number {
    let data = this._read_slice(4).slice();
    let view = new DataView(data.buffer);
    return view.getUint32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 16 bit signed integer) as number and advances the reading position.
   */
  public deserialize_number_int16(): number {
    let data = this._read_slice(2).slice();
    let view = new DataView(data.buffer);
    return view.getInt16(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 16 bit unsigned integer) as number and advances the reading position.
   */
  public deserialize_number_uint16(): number {
    let data = this._read_slice(2).slice();
    let view = new DataView(data.buffer);
    return view.getUint16(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 8 bit signed integer) as number and advances the reading position.
   */
  public deserialize_number_int8(): number {
    let data = this._read_slice(1).slice();
    let view = new DataView(data.buffer);
    return view.getInt8(0);
  }

  /**
   * Deserializes next portion of data (serialized as 8 bit unsigned integer) as number and advances the reading position.
   */
  public deserialize_number_uint8(): number {
    let data = this._read_slice(1).slice();
    let view = new DataView(data.buffer);
    return view.getInt8(0);
  }

  /**
   * Deserializes next portion of data as a boolean and advances the reading position.
   */
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

  /**
   * Deserializes next portion of data as an array of specified type and advances the reading position.
   * @param p Deserialization tag for array element.
   */
  public deserialize_array<T>(p: ZDTypeInfo<T>): T[] {
    const len = this.read_sequence_length()
    let out = new Array<T>(len)
    for (let i = 0; i < len; i++) {
      out[i] = p.deserialize(this)
    }
    return out
  }

  /**
   * Deserializes next portion of data as a map of specified key and value types and advances the reading position.
   * @param p_key Deserialization tag for map key.
   * @param p_value Deserialization tag for map value.
   */
  public deserialize_map<K, V>(p_key: ZDTypeInfo<K>, p_value: ZDTypeInfo<V>): Map<K, V> {
    const len = this.read_sequence_length()
    let out = new Map<K, V>()
    for (let i = 0; i < len; i++) {
      const key = p_key.deserialize(this)
      const value = p_value.deserialize(this)
      out.set(key, value)
    }
    return out
  }

  /**
   * Deserializes next portion of data as an object of specified type and advances the reading position.
   * @param create A new function to create an object instance where data will be deserialized.
   */
  public deserialize_object<T extends ZDeserializeable>(create: new () => T): T {
    let o = new create()
    o.deserialize_with_zdeserializer(this)
    return o
  }

  /**
   * Deserializes next portion of data into any supported type and advances the reading position.
   * Supported types are:
   *   - built-in types: number, bigint, string, boolean,
   *   - types that implement ZDeserializeable interface,
   *   - TypedArrays, 
   *   - arrays and maps of supported types.
   * @param p Deserialization tag.
   * @returns Deserialized value.
   */
  public deserialize<T>(p: ZDTypeInfo<T>): T {
    return p.deserialize(this)
  }

  /**
   * @returns True if all payload bytes were used, false otherwise.
   */
  public is_done() : boolean {
    return this._buffer.length == this._idx
  }
}

/**
 * Serializes any supported type.
 * Supported types are:
 *   - built-in types: number, bigint, string, boolean,
 *   - TypedArrays, 
 *   - arrays and maps of supported types.
 * @param val Value to serialize.
 * @param t An optional serialization tag (if ommited, the default one will be used).
 * @returns Payload.
 */
export function zserialize<T>(val: EnsureSerializeable<T>, t?: ZSTypeInfo<EnsureSerializeable<T>>): ZBytes {
  const s = new ZBytesSerializer()
  s.serialize(val, t)
  return s.finish()
}

/**
 * Deserializes payload into any supported type and advances the reading position.
 * Supported types are:
 *   - built-in types: number, bigint, string, boolean,
 *   - types that implement ZDeserializeable interface,
 *   - TypedArrays, 
 *   - arrays and maps of supported types.
 * @param t Deserialization tag.
 * @param data Payload to deserialize.
 * @returns Deserialized value.
 */
export function zdeserialize<T>(t: ZDTypeInfo<T>, data: ZBytes): T  {
  const d = new ZBytesDeserializer(data)
  const res = d.deserialize(t)
  if (!d.is_done()) {
    throw new Error(`Payload contains more bytes than required for deserialization`); 
  }
  return res
}