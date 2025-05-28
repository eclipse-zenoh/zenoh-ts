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
  serializeWithZSerializer(serializer: ZBytesSerializer): void;
}

const isLittleEndian: boolean = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201)

/**
 * Interface for adding support for custom types deserialization.
 */ 
export interface ZDeserializeable {
  deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void;
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

function isSerializeable(s: any): s is ZSerializeable {
  return (<ZSerializeable>s).serializeWithZSerializer !== undefined;
}

/**
 * A Zenoh serializer.
 * Provides functionality for tuple-like serialization.
 */
export class ZBytesSerializer {
    private static readonly DEFAULT_BUFFER_SIZE = 256;
    private static readonly MAX_SEQUENCE_LENGTH_TO_FIT_IN_SINGLE_BYTE = 127;
    private buffer: Uint8Array;
    private bufferLen: number;
    private data: Uint8Array[];
    private len: number;

    private resetBuffer(size: number) {
      if (size < ZBytesSerializer.DEFAULT_BUFFER_SIZE) {
        size = ZBytesSerializer.DEFAULT_BUFFER_SIZE;
      }
      this.buffer = new Uint8Array(size);
      this.bufferLen = 0;
    }

    private ensureBuffer(size: number) {
      if (this.bufferLen + size >= this.buffer.length) {
        this.resetBuffer(size);
      }
      this.bufferLen += size;
      return this.buffer.subarray(this.bufferLen - size, this.bufferLen);
    }
    /**
     * new function to create a ZBytesSerializer.
     * 
     * @returns ZBytesSerializer
     */
    constructor() {
      this.data = new Array<Uint8Array>;
      this.len = 0;
      this.buffer = new Uint8Array(ZBytesSerializer.DEFAULT_BUFFER_SIZE);
      this.bufferLen = 0;
    }

    private append(buf: Uint8Array) {
      this.data.push(buf);
      this.len += buf.length;
    }

    /**
     * Serializes length of the sequence. Can be used when defining serialization for custom containers.
     */
    public writeSequenceLength(len: number) {
      if (len <= ZBytesSerializer.MAX_SEQUENCE_LENGTH_TO_FIT_IN_SINGLE_BYTE) {
        this.serializeNumberUint8(len);
        return;
      }
      let a = this.ensureBuffer(10);
      let sz = leb.encodeULEB128Into(a, len);
      a = a.subarray(0, sz);
      this.bufferLen -= (10 - sz);
      this.append(a);
    }

    /**
     * Serializes a utf-8 encoded string.
     */
    public serializeString(val: string) {
      if (val.length == 0) {
        this.writeSequenceLength(0);
      } else {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(val);
        this.writeSequenceLength(encoded.length)
        this.append(encoded)
      }
    }

    /**
     * Serializes a Uint8Array.
     */
    public serializeUint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint8Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      this.append(val)
    }

    /**
     * Serializes a Uint16Array.
     */
    public serializeUint16Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint16Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberUint16(element));
      }
    }

    /**
     * Serializes a Uint32Array.
     */
    public serializeUint32Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Uint32Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberUint32(element));
      }
    }

    /**
     * Serializes a BigUint64Array.
     */
    public serializeBiguint64Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: BigUint64Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeBigintUint64(element));
      }
    }

    /**
     * Serializes a Int8Array.
     */
    public serializeInt8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int8Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      this.append(new Uint8Array(val.buffer))
    }

    /**
     * Serializes a Int16Array.
     */
    public serializeInt16Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int16Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberInt16(element));
      }
    }

    /**
     * Serializes a Int32Array.
     */
    public serializeInt32Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Int32Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberInt32(element));
      }
    }

    /**
     * Serializes a BigInt64Array.
     */
    public serializeBigint64Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: BigInt64Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeBigintInt64(element));
      }
    }

    /**
     * Serializes a Float32Array.
     */
    public serializeFloat32Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Float32Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberFloat32(element));
      }
    }

    /**
     * Serializes a Float64Array.
     */
    public serializeFloat64Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(val: Float64Array<TArrayBuffer>) {
      this.writeSequenceLength(val.length)
      if (isLittleEndian) {
        this.append(new Uint8Array(val.buffer))
      } else {  
        val.forEach( (element) => this.serializeNumberFloat64(element));
      }
    }
  
    /**
     * Serializes bigint as 64 bit signed integer.
     */
    public serializeBigintInt64(val: bigint) {
      let data = this.ensureBuffer(8);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setBigInt64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes bigint as 64 bit unsigned integer.
     */
    public serializeBigintUint64(val: bigint) {
      let data = this.ensureBuffer(8);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setBigUint64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 64 bit floating point number.
     */
    public serializeNumberFloat64(val: number) {
      let data = this.ensureBuffer(8);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setFloat64(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 32 bit floating point number.
     */
    public serializeNumberFloat32(val: number) {
      let data = this.ensureBuffer(4);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setFloat32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 64 bit integer.
     */
    public serializeNumberInt64(val: number) {
      let bigintVal = BigInt(val);
      this.serializeBigintInt64(bigintVal)
    }

    /**
     * Serializes number as 64 bit unsigned integer.
     */
    public serializeNumberUint64(val: number) {
      let bigintVal = BigInt(val);
      this.serializeBigintUint64(bigintVal)
    }

    /**
     * Serializes number as 32 bit integer.
     */
    public serializeNumberInt32(val: number) {
      let data = this.ensureBuffer(4);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setInt32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 32 bit unsigned integer.
     */
    public serializeNumberUint32(val: number) {
      let data = this.ensureBuffer(4);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setUint32(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 16 bit integer.
     */
    public serializeNumberInt16(val: number) {
      let data = this.ensureBuffer(2);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setInt16(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 16 bit unsigned integer.
     */
    public serializeNumberUint16(val: number) {
      let data = this.ensureBuffer(2);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setUint16(0, val, true);
      this.append(data)
    }

    /**
     * Serializes number as 8 bit integer.
     */
    public serializeNumberInt8(val: number) {
      let data = this.ensureBuffer(1);
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      view.setInt8(0, val);
      this.append(data)
    }

    /**
     * Serializes number as 8 bit unsigned integer.
     */
    public serializeNumberUint8(val: number) {
      let data = this.ensureBuffer(1);
      data[0] = val;
      this.append(data);
    }

    /**
     * Serializes boolean.
     */
    public serializeBoolean(val: Boolean) {
      this.serializeNumberUint8(val === true ? 1 : 0);
    }

    /**
     * Serializes an array.
     */
    public serializeArray<T>(val: EnsureSerializeable<T>[], t?: ZSTypeInfo<EnsureSerializeable<T>>) {
      this.writeSequenceLength(val.length)
      if (val.length > 0 && t === undefined) {
        t = this.getDefaultSerializationTag(val[0] as any) as ZSTypeInfo<EnsureSerializeable<T>>
      }
      val.forEach( (element) => (t as ZSTypeInfo<EnsureSerializeable<T>>).serialize(this, element));
    }

    /**
     * Serializes a map.
     */
    public serializeMap<K, V>(m: Map<EnsureSerializeable<K>, EnsureSerializeable<V>>, tKey?:ZSTypeInfo<EnsureSerializeable<K>>, tValue?: ZSTypeInfo<EnsureSerializeable<V>>) {
      this.writeSequenceLength(m.size)
      if (m.size > 0) {
        let val = m.entries().next()
        if (val !== undefined ) {
          let value = val.value
          if (value !== undefined) {
            tKey ??= this.getDefaultSerializationTag(value[0] as any) as ZSTypeInfo<EnsureSerializeable<K>>
            tValue ??= this.getDefaultSerializationTag(value[1] as any) as ZSTypeInfo<EnsureSerializeable<V>>
          }
        }
      }
      m.forEach( (v, k) => { 
        (tKey as ZSTypeInfo<EnsureSerializeable<K>>).serialize(this, k);
        (tValue as ZSTypeInfo<EnsureSerializeable<V>>).serialize(this, v);
      }
    );
    }
    
    private getDefaultSerializationTag<T>(data: EnsureSerializeable<T>): ZSTypeInfo<EnsureSerializeable<T>> {
      if (isSerializeable(data)) {
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
          t = this.getDefaultSerializationTag(data[0])
        }
        return ZS.array(t) as ZSTypeInfo<EnsureSerializeable<T>>
      } else if (data instanceof Map) {
        let tKey = undefined
        let tValue = undefined
        let val = data.entries().next()
        if (val !== undefined ) {
          let value = val.value
          if (value !== undefined) {
            tKey = this.getDefaultSerializationTag(value[0] as any)
            tValue = this.getDefaultSerializationTag(value[1] as any)
          }
        }
        return ZS.map(tKey, tValue) as ZSTypeInfo<EnsureSerializeable<T>>
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
        this.getDefaultSerializationTag(val).serialize(this, val)
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
      const out = new ZBytes(this.toBytes());
      this.data = new Array();
      this.len = 0;
      this.bufferLen = 0;
      return out;
    }

     /**
     * Extracts currently serialized bytes.
     * 
     * @returns ZBytes
     */
     public toBytes(): Uint8Array {
      if (this.data.length == 0) {
        return  new Uint8Array(0);
      } else if (this.data.length == 1) {
        return this.data[0] as Uint8Array;
      } else {
        let b = new Uint8Array(this.len);
        let offset = 0;
        for (let a of this.data) {
          b.set(a, offset);
          offset += a.length;
        }
        return b;
      }
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
  constructor(private deserialize_: (deserializer: ZBytesDeserializer) => T ) {}

  /** @internal */
  deserialize(deserializer: ZBytesDeserializer): T {
    return this.deserialize_(deserializer)
  }
}

class ZSTypeInfo<T> {
  constructor(private serialize_: (serializer: ZBytesSerializer, val: T) => void) {}

  /** @internal */
  serialize(serializer: ZBytesSerializer, val: T): void {
    this.serialize_(serializer, val)
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
          (z: ZBytesDeserializer) => { return z.deserializeNumberFloat64() }
        );
      case NumberFormat.Float32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberFloat32() }
        );
      case NumberFormat.Int64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberInt64() }
        );
      case NumberFormat.Uint64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberUint64() }
        );
       case NumberFormat.Int32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberInt32() }
        );
      case NumberFormat.Uint32:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberUint32() }
        );
      case NumberFormat.Int16:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberInt16() }
        );
      case NumberFormat.Uint16:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberUint16() }
        );
      case NumberFormat.Int8:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberInt8() }
        );
      case NumberFormat.Uint8:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeNumberUint8() }
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
          (z: ZBytesDeserializer) => { return z.deserializeBigintInt64() }
        );
      case BigIntFormat.Uint64:
        return new ZDTypeInfo(
          (z: ZBytesDeserializer) => { return z.deserializeBigintUint64() }
        );
    }
  }

  /**
   * Indicates that data should be deserialized as a string.
   * @returns String deserialization tag.
   */
  export function string(): ZDTypeInfo<string> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeString() }
    );
  }

  /**
   * Indicates that data should be deserialized as a boolean.
   * @returns Boolean deserialization tag.
   */
  export function boolean(): ZDTypeInfo<boolean> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeBoolean() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint8Array.
   * @returns Uint8Array deserialization tag.
   */
  export function uint8array(): ZDTypeInfo<Uint8Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeUint8Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint16Array.
   * @returns Uint16Array deserialization tag.
   */
  export function uint16array(): ZDTypeInfo<Uint16Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeUint16Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Uint32Array.
   * @returns Uint32Array deserialization tag.
   */
  export function uint32array(): ZDTypeInfo<Uint32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeUint32Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a BigUint64Array.
   * @returns BigUint64Array deserialization tag.
   */
  export function biguint64array(): ZDTypeInfo<BigUint64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeBiguint64Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int8Array.
   * @returns Int8Array deserialization tag.
   */
  export function int8array(): ZDTypeInfo<Int8Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeInt8Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int16Array.
   * @returns Int16Array deserialization tag.
   */
  export function int16array(): ZDTypeInfo<Int16Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeInt16Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Int32Array.
   * @returns Int32Array deserialization tag.
   */
  export function int32array(): ZDTypeInfo<Int32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeInt32Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a BigInt64Array.
   * @returns BigInt64Array deserialization tag.
   */
  export function bigint64array(): ZDTypeInfo<BigInt64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeBigint64Array() }
    );
  }
  /**
   * Indicates that data should be deserialized as a Float32Array.
   * @returns Float32Array deserialization tag.
   */
  export function float32array(): ZDTypeInfo<Float32Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeFloat32Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as a Float64Array.
   * @returns Float64Array deserialization tag.
   */
  export function float64array(): ZDTypeInfo<Float64Array> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeFloat64Array() }
    );
  }

  /**
   * Indicates that data should be deserialized as an object.
   * @param create A new function to create an object instance where data will be deserialized.
   * @returns Object deserialization tag.
   */
  export function object<T extends ZDeserializeable>(create: new() => T): ZDTypeInfo<T> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeObject(create) }
    );
  }

  /**
   * Indicates that data should be deserialized as an object.
   * @param create A function to create an object instance from deserializer.
   * @returns Object deserialization tag.
   */
  export function objectStatic<T>(create: (deserializer: ZBytesDeserializer) => T): ZDTypeInfo<T> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return create(z); }
    );
  }

  /**
   * Indicates that data should be deserialized as an array.
   * @param t An array element deserialization tag.
   * @returns Array deserialization tag.
   */
  export function array<T>(t: ZDTypeInfo<T>): ZDTypeInfo<T[]> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeArray(t) }
    );
  }

  /**
   * Indicates that data should be deserialized as a map.
   * @param tKey A key type deserialization tag.
   * @param tValue A value type deserialization tag.
   * @returns Array deserialization tag.
   */
  export function map<K, V>(tKey: ZDTypeInfo<K>, tValue: ZDTypeInfo<V>): ZDTypeInfo<Map<K, V>> {
    return new ZDTypeInfo(
      (z: ZBytesDeserializer) => { return z.deserializeMap(tKey, tValue) }
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
          (z: ZBytesSerializer, val: number) => {z.serializeNumberFloat64(val);}
        );
      case NumberFormat.Float32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberFloat32(val);}
        );
      case NumberFormat.Int64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberInt64(val);}
        );
      case NumberFormat.Uint64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberUint64(val);}
        );
       case NumberFormat.Int32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberInt32(val);}
        );
      case NumberFormat.Uint32:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberUint32(val);}
        );
      case NumberFormat.Int16:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberInt16(val);}
        );
      case NumberFormat.Uint16:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberUint16(val);}
        );
      case NumberFormat.Int8:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberInt8(val);}
        );
      case NumberFormat.Uint8:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: number) => {z.serializeNumberUint8(val);}
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
          (z: ZBytesSerializer, val: bigint) => {z.serializeBigintInt64(val);}
        );
      case BigIntFormat.Uint64:
        return new ZSTypeInfo(
          (z: ZBytesSerializer, val: bigint) => {z.serializeBigintUint64(val);}
        );
    }
  }

  /**
   * Indicates that data should be serialized as a string.
   * @returns String serialization tag.
   */
  export function string(): ZSTypeInfo<string> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: string) => {z.serializeString(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a boolean.
   * @returns Boolean serialization tag.
   */
  export function boolean(): ZSTypeInfo<boolean> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: boolean) => {z.serializeBoolean(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint8Array.
   * @returns Uint8Array serialization tag.
   */
  export function uint8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint8Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint8Array) => {z.serializeUint8Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint16Array.
   * @returns Uint16Array serialization tag.
   */
  export function uint16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint16Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint16Array) => {z.serializeUint16Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Uint32Array.
   * @returns Uint32Array serialization tag.
   */
  export function uint32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Uint32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Uint32Array) => {z.serializeUint32Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a BigUint64Array.
   * @returns BigUint64Array serialization tag.
   */
  export function biguint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<BigUint64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: BigUint64Array) => {z.serializeBiguint64Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int8Array.
   * @returns Int8Array serialization tag.
   */
  export function int8array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int8Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int8Array) => {z.serializeInt8Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int16Array.
   * @returns Int16Array serialization tag.
   */
  export function int16array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int16Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int16Array) => {z.serializeInt16Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Int32Array.
   * @returns Int32Array serialization tag.
   */
  export function int32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Int32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Int32Array) => {z.serializeInt32Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a BigInt64Array.
   * @returns BigInt64Array serialization tag.
   */
  export function bigint64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<BigInt64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: BigInt64Array) => {z.serializeBigint64Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as a Float32Array.
   * @returns Float32Array serialization tag.
   */
  export function float32array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Float32Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Float32Array) => {z.serializeFloat32Array(val);}
    );
  }

  /**
   * Indicates that data should be serialized as Float64Array.
   * @returns Float64Array serialization tag.
   */
  export function float64array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(): ZSTypeInfo<Float64Array<TArrayBuffer>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Float64Array) => {z.serializeFloat64Array(val);}
    );
  }

  /**
   * Indicates that data should be deserialized as an object.
   * @returns Object serialization tag.
   */
  export function object<T extends ZSerializeable>(): ZSTypeInfo<T> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: T) => {val.serializeWithZSerializer(z)}
    );
  }

  /**
   * Indicates that data should be serialized as an array.
   * @param t An optional array element serialization tag (if omitted the default one will be used).
   * @returns Array serialization tag.
   */
  export function array<T>(t?: ZSTypeInfo<EnsureSerializeable<T>>): ZSTypeInfo<EnsureSerializeable<T>[]> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: EnsureSerializeable<T>[]) => {z.serializeArray(val, t)}
    );
  }

  /**
   * Indicates that data should be serialized as a map.
   * @param tKey An optional key type serialization tag (if omitted the default one will be used).
   * @param tValue An optional value type serialization tag (if omitted the default one will be used).
   * @returns Array serialization tag.
   */
  export function map<K, V>(tKey?: ZSTypeInfo<EnsureSerializeable<K>>, tValue?: ZSTypeInfo<EnsureSerializeable<V>>): ZSTypeInfo<Map<EnsureSerializeable<K>, EnsureSerializeable<V>>> {
    return new ZSTypeInfo(
      (z: ZBytesSerializer, val: Map<EnsureSerializeable<K>, EnsureSerializeable<V>>) => {z.serializeMap(val, tKey, tValue)},
    );
  }
}

export class ZBytesDeserializer {
  private static readonly LEB128_CONTINUATION_MASK = 0b10000000;
  private buffer_: Uint8Array;
  private idx_: number
  /**
   * new function to create a ZBytesDeserializer
   * @param data payload to deserialize.
   * @returns ZBytesSerializer
   */
  constructor(data: ZBytes | Uint8Array) {
    if (data instanceof ZBytes) {
      this.buffer_ = data.toBytes()
    } else {
      this.buffer_ = data;
    }
    this.idx_ = 0
  }

  private readSlice(len: number): Uint8Array {
    const s = this.buffer_.subarray(this.idx_, this.idx_ + len)
    if (s.length < len) {
      throw new Error(`Array index is out of bounds: ${this.idx_ + len} / ${this.buffer_.length}`); 
    }
    this.idx_ += len
    return s
  }

  private readByte(): number {
    if (this.idx_ >= this.buffer_.length) {
      throw new Error(`Array index is out of bounds: ${this.idx_ + 1} / ${this.buffer_.length}`); 
    }
    const b = this.buffer_[this.idx_] as number;
    this.idx_ += 1;
    return b;
  }

  private peekByte(): number | undefined {
    return this.buffer_[this.idx_]
  }

  /**
   * Reads length of the sequence previously written by {@link ZBytesSerializer.writeSequenceLength} and advances the reading position.
   * @returns Number of sequence elements.
   */
  public readSequenceLength(): number {
    const b = this.peekByte();
    if (b != undefined && (b & ZBytesDeserializer.LEB128_CONTINUATION_MASK) == 0) {
      this.idx_ += 1;
      return b;
    }

    let [res, bytesRead] = leb.decodeULEB128(this.buffer_, this.idx_)
    this.idx_ += bytesRead
    if (res > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Array length overflow: ${res}`); 
    }
    return new Number(res).valueOf()
  }

  /**
   * Deserializes next portion of data as string and advances the reading position.
   */
  public deserializeString(): string {
      let len = this.readSequenceLength()
      if (len == 0) {
        return "";
      } else {
        const decoder = new TextDecoder()
        return decoder.decode(this.readSlice(len))
      }
  }

  /**
   * Deserializes next portion of data as Uint8Array and advances the reading position.
   */
  public deserializeUint8Array(): Uint8Array {
    let len = this.readSequenceLength();
    return this.readSlice(len)
  }

  /**
   * Deserializes next portion of data as Uint16Array and advances the reading position.
   */
  public deserializeUint16Array(): Uint16Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 2);
      if (s.byteOffset % 2 != 0) {
        s = s.slice();
      }
      return new Uint16Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new Uint16Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberUint16()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Uint32Array and advances the reading position.
   */
  public deserializeUint32Array(): Uint32Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 4);
      if (s.byteOffset % 4 != 0) {
        s = s.slice();
      }
      return new Uint32Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new Uint32Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberUint32()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as BigUint64Array and advances the reading position.
   */
  public deserializeBiguint64Array(): BigUint64Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 8);
      if (s.byteOffset % 8 != 0) {
        s = s.slice();
      }
      return new BigUint64Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new BigUint64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeBigintUint64()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Int8Array and advances the reading position.
   */
  public deserializeInt8Array(): Int8Array {
    let len = this.readSequenceLength();
    const s = this.readSlice(len);
    return  new Int8Array(s.buffer, s.byteOffset, len)
  }

  /**
   * Deserializes next portion of data as Int16Array and advances the reading position.
   */
  public deserializeInt16Array(): Int16Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 2);
      if (s.byteOffset % 2 != 0) {
        s = s.slice();
      }
      return new Int16Array(s.buffer, s.byteOffset, len)
    } else {
      let out = new Int16Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberInt16()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Int32Array and advances the reading position.
   */
  public deserializeInt32Array(): Int32Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 4);
      if (s.byteOffset % 4 != 0) {
        s = s.slice();
      }
      return new Int32Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new Int32Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberInt32();
      }
      return out;
    }
  }

  /**
   * Deserializes next portion of data as BigInt64Array and advances the reading position.
   */
  public deserializeBigint64Array(): BigInt64Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 8);
      if (s.byteOffset % 8 != 0) {
        s = s.slice();
      }
      return new BigInt64Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new BigInt64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeBigintInt64()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Float32Array and advances the reading position.
   */
  public deserializeFloat32Array(): Float32Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 4);
      if (s.byteOffset % 4 != 0) {
        s = s.slice();
      }
      return new Float32Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new Float32Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberFloat32()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data as Float64Array and advances the reading position.
   */
  public deserializeFloat64Array(): Float64Array {
    let len = this.readSequenceLength();
    if (isLittleEndian) {
      let s = this.readSlice(len * 8);
      if (s.byteOffset % 8 != 0) {
        s = s.slice();
      }
      return new Float64Array(s.buffer, s.byteOffset, len);
    } else {
      let out = new Float64Array(len)
      for (let i = 0; i < len; i++) {
        out[i] = this.deserializeNumberFloat64()
      }
      return out
    }
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit signed integer) as bigint and advances the reading position.
   */
  public deserializeBigintInt64(): bigint {
    let data = this.readSlice(8);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getBigInt64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit unsigned integer) as bigint and advances the reading position.
   */
  public deserializeBigintUint64(): bigint {
    let data = this.readSlice(8);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getBigUint64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit floating point number) as number and advances the reading position.
   */
  public deserializeNumberFloat64(): number {
    let data = this.readSlice(8);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getFloat64(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit floating point number) as number and advances the reading position.
   */
  public deserializeNumberFloat32(): number {
    let data = this.readSlice(4);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getFloat32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit signed integer) as number and advances the reading position.
   * Throws an error if the value exceeds the safe integer range (-2^53 to 2^53).
   */
  public deserializeNumberInt64(): number {
    let bigint = this.deserializeBigintInt64();
    if (bigint > Number.MAX_SAFE_INTEGER || bigint < Number.MIN_SAFE_INTEGER) {
      throw new Error(`Integer value ${bigint} exceeds the safe range for JavaScript numbers`);
    }
    return Number(bigint);
  }

  /**
   * Deserializes next portion of data (serialized as 64 bit unsigned integer) as number and advances the reading position.
   * Throws an error if the value exceeds the safe integer range (-2^53 to 2^53).
   */
  public deserializeNumberUint64(): number {
    let bigint = this.deserializeBigintUint64();
    if (bigint > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Integer value ${bigint} exceeds the safe range for JavaScript numbers`);
    }
    return Number(bigint);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit signed integer) as number and advances the reading position.
   */
  public deserializeNumberInt32(): number {
    let data = this.readSlice(4);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getInt32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 32 bit unsigned integer) as number and advances the reading position.
   */
  public deserializeNumberUint32(): number {
    let data = this.readSlice(4);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getUint32(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 16 bit signed integer) as number and advances the reading position.
   */
  public deserializeNumberInt16(): number {
    let data = this.readSlice(2);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getInt16(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 16 bit unsigned integer) as number and advances the reading position.
   */
  public deserializeNumberUint16(): number {
    let data = this.readSlice(2);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getUint16(0, true);
  }

  /**
   * Deserializes next portion of data (serialized as 8 bit signed integer) as number and advances the reading position.
   */
  public deserializeNumberInt8(): number {
    let data = this.readSlice(1);
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getInt8(0);
  }

  /**
   * Deserializes next portion of data (serialized as 8 bit unsigned integer) as number and advances the reading position.
   */
  public deserializeNumberUint8(): number {
    return this.readByte();
  }

  /**
   * Deserializes next portion of data as a boolean and advances the reading position.
   */
  public deserializeBoolean(): boolean {
    const res = this.readByte();
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
  public deserializeArray<T>(p: ZDTypeInfo<T>): T[] {
    const len = this.readSequenceLength()
    let out = new Array<T>(len)
    for (let i = 0; i < len; i++) {
      out[i] = p.deserialize(this)
    }
    return out
  }

  /**
   * Deserializes next portion of data as a map of specified key and value types and advances the reading position.
   * @param pKey Deserialization tag for map key.
   * @param pValue Deserialization tag for map value.
   */
  public deserializeMap<K, V>(pKey: ZDTypeInfo<K>, pValue: ZDTypeInfo<V>): Map<K, V> {
    const len = this.readSequenceLength()
    let out = new Map<K, V>()
    for (let i = 0; i < len; i++) {
      const key = pKey.deserialize(this)
      const value = pValue.deserialize(this)
      out.set(key, value)
    }
    return out
  }

  /**
   * Deserializes next portion of data as an object of specified type and advances the reading position.
   * @param create A new function to create an object instance where data will be deserialized.
   */
  public deserializeObject<T extends ZDeserializeable>(create: new () => T): T {
    let o = new create()
    o.deserializeWithZDeserializer(this)
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
  public isDone() : boolean {
    return this.buffer_.length == this.idx_
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
  if (!d.isDone()) {
    throw new Error(`Payload contains more bytes than required for deserialization`); 
  }
  return res
}