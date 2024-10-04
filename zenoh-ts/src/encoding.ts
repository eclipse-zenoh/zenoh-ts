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

enum encoding {
  ZENOH_BYTES = "zenoh/bytes",
  ZENOH_INT8 = "zenoh/int8",
  ZENOH_INT16 = "zenoh/int16",
  ZENOH_INT32 = "zenoh/int32",
  ZENOH_INT64 = "zenoh/int64",
  ZENOH_INT128 = "zenoh/int128",
  ZENOH_UINT8 = "zenoh/uint8",
  ZENOH_UINT16 = "zenoh/uint16",
  ZENOH_UINT32 = "zenoh/uint32",
  ZENOH_UINT64 = "zenoh/uint64",
  ZENOH_UINT128 = "zenoh/uint128",
  ZENOH_FLOAT32 = "zenoh/float32",
  ZENOH_FLOAT64 = "zenoh/float64",
  ZENOH_BOOL = "zenoh/bool",
  ZENOH_STRING = "zenoh/string",
  ZENOH_ERROR = "zenoh/error",
  APPLICATION_OCTET_STREAM = "application/octet-stream",
  TEXT_PLAIN = "text/plain",
  APPLICATION_JSON = "application/json",
  TEXT_JSON = "text/json",
  APPLICATION_CDR = "application/cdr",
  APPLICATION_CBOR = "application/cbor",
  APPLICATION_YAML = "application/yaml",
  TEXT_YAML = "text/yaml",
  TEXT_JSON5 = "text/json5",
  APPLICATION_PROTOBUF = "application/protobuf",
  APPLICATION_PYTHON_SERIALIZED_OBJECT = "application/python-serialized-object",
  APPLICATION_JAVA_SERIALIZED_OBJECT = "application/java-serialized-object",
  APPLICATION_OPENMETRICS_TEXT = "application/openmetrics-text",
  IMAGE_PNG = "image/png",
  IMAGE_JPEG = "image/jpeg",
  IMAGE_GIF = "image/gif",
  IMAGE_BMP = "image/bmp",
  IMAGE_WEBP = "image/webp",
  APPLICATION_XML = "application/xml",
  APPLICATION_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded",
  TEXT_HTML = "text/html",
  TEXT_XML = "text/xml",
  TEXT_CSS = "text/css",
  TEXT_JAVASCRIPT = "text/javascript",
  TEXT_MARKDOWN = "text/markdown",
  TEXT_CSV = "text/csv",
  APPLICATION_SQL = "application/sql",
  APPLICATION_COAP_PAYLOAD = "application/coap-payload",
  APPLICATION_JSON_PATCH_JSON = "application/json-patch+json",
  APPLICATION_JSON_SEQ = "application/json-seq",
  APPLICATION_JSONPATH = "application/jsonpath",
  APPLICATION_JWT = "application/jwt",
  APPLICATION_MP4 = "application/mp4",
  APPLICATION_SOAP_XML = "application/soap+xml",
  APPLICATION_YANG = "application/yang",
  AUDIO_AAC = "audio/aac",
  AUDIO_FLAC = "audio/flac",
  AUDIO_MP4 = "audio/mp4",
  AUDIO_OGG = "audio/ogg",
  AUDIO_VORBIS = "audio/vorbis",
  VIDEO_H261 = "video/h261",
  VIDEO_H263 = "video/h263",
  VIDEO_H264 = "video/h264",
  VIDEO_H265 = "video/h265",
  VIDEO_H266 = "video/h266",
  VIDEO_MP4 = "video/mp4",
  VIDEO_OGG = "video/ogg",
  VIDEO_RAW = "video/raw",
  VIDEO_VP8 = "video/vp8",
  VIDEO_VP9 = "video/vp9",
}

export type IntoEncoding = Encoding | String | string;

/** 
 * Zenoh Encoding Class
*/
export class Encoding {
  private _schema: string;

  private constructor(str_rep: string) {
    this._schema = str_rep;
  }

  static into_Encoding(input: IntoEncoding): Encoding {
    if (input instanceof Encoding) {
      return input;
    } else {
      return new Encoding(input.toString());
    }
  }

  static default(): Encoding {
    return new Encoding(encoding.ZENOH_BYTES);
  }

  toString(): string {
    return this._schema;
  }
  static from_str(input: string): Encoding {
    return new Encoding(input);
  }

  // Enum Variants
  /** 
   * Constant alias for string "zenoh/bytes" 
  */
  static readonly ZENOH_BYTES = new Encoding(encoding.ZENOH_BYTES);
  /** 
   * Constant alias for string "zenoh/int8" 
  */
  static readonly ZENOH_INT8 = new Encoding(encoding.ZENOH_INT8);
  /** 
   * Constant alias for string "zenoh/int16" 
  */
  static readonly ZENOH_INT16: Encoding = new Encoding(encoding.ZENOH_INT16);
  /** 
   * Constant alias for string "zenoh/int32" 
  */
  static readonly ZENOH_INT32: Encoding = new Encoding(encoding.ZENOH_INT32);
  /** 
   * Constant alias for string "zenoh/int64" 
  */
  static readonly ZENOH_INT64: Encoding = new Encoding(encoding.ZENOH_INT64);
  /** 
   * Constant alias for string "zenoh/int128" 
  */
  static readonly ZENOH_INT128: Encoding = new Encoding(encoding.ZENOH_INT128);
  /** 
   * Constant alias for string "zenoh/uint8" 
  */
  static readonly ZENOH_UINT8: Encoding = new Encoding(encoding.ZENOH_UINT8);
  /** 
   * Constant alias for string "zenoh/uint16" 
  */
  static readonly ZENOH_UINT16: Encoding = new Encoding(encoding.ZENOH_UINT16);
  /** 
   * Constant alias for string "zenoh/uint32" 
  */
  static readonly ZENOH_UINT32: Encoding = new Encoding(encoding.ZENOH_UINT32);
  /** 
   * Constant alias for string "zenoh/uint64" 
  */
  static readonly ZENOH_UINT64: Encoding = new Encoding(encoding.ZENOH_UINT64);
  /** 
   * Constant alias for string "zenoh/uint128" 
  */
  static readonly ZENOH_UINT128: Encoding = new Encoding(encoding.ZENOH_UINT128);
  /** 
   * Constant alias for string "zenoh/float32" 
  */
  static readonly ZENOH_FLOAT32: Encoding = new Encoding(encoding.ZENOH_FLOAT32);
  /** 
   * Constant alias for string "zenoh/float64" 
  */
  static readonly ZENOH_FLOAT64: Encoding = new Encoding(encoding.ZENOH_FLOAT64);
  /** 
   * Constant alias for string "zenoh/bool" 
  */
  static readonly ZENOH_BOOL: Encoding = new Encoding(encoding.ZENOH_BOOL);
  /** 
   * Constant alias for string "zenoh/string" 
  */
  static readonly ZENOH_STRING: Encoding = new Encoding(encoding.ZENOH_STRING);
  /** 
   * Constant alias for string "zenoh/error" 
  */
  static readonly ZENOH_ERROR: Encoding = new Encoding(encoding.ZENOH_ERROR);
  /** 
   * Constant alias for string "application/octet-stream" 
  */
  static readonly APPLICATION_OCTET_STREAM: Encoding = new Encoding(encoding.APPLICATION_OCTET_STREAM);
  /** 
   * Constant alias for string "text/plain" 
  */
  static readonly TEXT_PLAIN: Encoding = new Encoding(encoding.TEXT_PLAIN);
  /** 
   * Constant alias for string "application/json" 
  */
  static readonly APPLICATION_JSON: Encoding = new Encoding(encoding.APPLICATION_JSON);
  /** 
   * Constant alias for string "text/json" 
  */
  static readonly TEXT_JSON: Encoding = new Encoding(encoding.TEXT_JSON);
  /** 
   * Constant alias for string "application/cdr" 
  */
  static readonly APPLICATION_CDR: Encoding = new Encoding(encoding.APPLICATION_CDR);
  /** 
   * Constant alias for string "application/cbor" 
  */
  static readonly APPLICATION_CBOR: Encoding = new Encoding(encoding.APPLICATION_CBOR);
  /** 
   * Constant alias for string "application/yaml" 
  */
  static readonly APPLICATION_YAML: Encoding = new Encoding(encoding.APPLICATION_YAML);
  /** 
   * Constant alias for string "text/yaml" 
  */
  static readonly TEXT_YAML: Encoding = new Encoding(encoding.TEXT_YAML);
  /** 
   * Constant alias for string "text/json5" 
  */
  static readonly TEXT_JSON5: Encoding = new Encoding(encoding.TEXT_JSON5);
  /** 
   * Constant alias for string "application/protobuf" 
  */
  static readonly APPLICATION_PROTOBUF: Encoding = new Encoding(encoding.APPLICATION_PROTOBUF);
  /** 
   * Constant alias for string "application/python-serialized-object" 
  */
  static readonly APPLICATION_PYTHON_SERIALIZED_OBJECT: Encoding = new Encoding(encoding.APPLICATION_PYTHON_SERIALIZED_OBJECT);
  /** 
   * Constant alias for string "application/java-serialized-object" 
  */
  static readonly APPLICATION_JAVA_SERIALIZED_OBJECT: Encoding = new Encoding(encoding.APPLICATION_JAVA_SERIALIZED_OBJECT);
  /** 
   * Constant alias for string "application/openmetrics-text" 
  */
  static readonly APPLICATION_OPENMETRICS_TEXT: Encoding = new Encoding(encoding.APPLICATION_OPENMETRICS_TEXT);
  /** 
   * Constant alias for string "image/png" 
  */
  static readonly IMAGE_PNG: Encoding = new Encoding(encoding.IMAGE_PNG);
  /** 
   * Constant alias for string "image/jpeg" 
  */
  static readonly IMAGE_JPEG: Encoding = new Encoding(encoding.IMAGE_JPEG);
  /** 
   * Constant alias for string "image/gif" 
  */
  static readonly IMAGE_GIF: Encoding = new Encoding(encoding.IMAGE_GIF);
  /** 
   * Constant alias for string "image/bmp" 
  */
  static readonly IMAGE_BMP: Encoding = new Encoding(encoding.IMAGE_BMP);
  /** 
   * Constant alias for string "image/webp" 
  */
  static readonly IMAGE_WEBP: Encoding = new Encoding(encoding.IMAGE_WEBP);
  /** 
   * Constant alias for string "application/xml" 
  */
  static readonly APPLICATION_XML: Encoding = new Encoding(encoding.APPLICATION_XML);
  /** 
   * Constant alias for string "application/x-www-form-urlencoded" 
  */
  static readonly APPLICATION_X_WWW_FORM_URLENCODED: Encoding = new Encoding(encoding.APPLICATION_X_WWW_FORM_URLENCODED);
  /** 
   * Constant alias for string "text/html" 
  */
  static readonly TEXT_HTML: Encoding = new Encoding(encoding.TEXT_HTML);
  /** 
   * Constant alias for string "text/xml" 
  */
  static readonly TEXT_XML: Encoding = new Encoding(encoding.TEXT_XML);
  /** 
   * Constant alias for string "text/css" 
  */
  static readonly TEXT_CSS: Encoding = new Encoding(encoding.TEXT_CSS);
  /** 
   * Constant alias for string "text/javascript" 
  */
  static readonly TEXT_JAVASCRIPT: Encoding = new Encoding(encoding.TEXT_JAVASCRIPT);
  /** 
   * Constant alias for string "text/markdown" 
  */
  static readonly TEXT_MARKDOWN: Encoding = new Encoding(encoding.TEXT_MARKDOWN);
  /** 
   * Constant alias for string "text/csv" 
  */
  static readonly TEXT_CSV: Encoding = new Encoding(encoding.TEXT_CSV);
  /** 
   * Constant alias for string "application/sql" 
  */
  static readonly APPLICATION_SQL: Encoding = new Encoding(encoding.APPLICATION_SQL);
  /** 
   * Constant alias for string "application/coap-payload" 
  */
  static readonly APPLICATION_COAP_PAYLOAD: Encoding = new Encoding(encoding.APPLICATION_COAP_PAYLOAD);
  /** 
   * Constant alias for string "application/json-patch+json" 
  */
  static readonly APPLICATION_JSON_PATCH_JSON: Encoding = new Encoding(encoding.APPLICATION_JSON_PATCH_JSON);
  /** 
   * Constant alias for string "application/json-seq" 
  */
  static readonly APPLICATION_JSON_SEQ: Encoding = new Encoding(encoding.APPLICATION_JSON_SEQ);
  /** 
   * Constant alias for string "application/jsonpath" 
  */
  static readonly APPLICATION_JSONPATH: Encoding = new Encoding(encoding.APPLICATION_JSONPATH);
  /** 
   * Constant alias for string "application/jwt" 
  */
  static readonly APPLICATION_JWT: Encoding = new Encoding(encoding.APPLICATION_JWT);
  /** 
   * Constant alias for string "application/mp4" 
  */
  static readonly APPLICATION_MP4: Encoding = new Encoding(encoding.APPLICATION_MP4);
  /** 
   * Constant alias for string "application/soap+xml" 
  */
  static readonly APPLICATION_SOAP_XML: Encoding = new Encoding(encoding.APPLICATION_SOAP_XML);
  /** 
   * Constant alias for string "application/yang" 
  */
  static readonly APPLICATION_YANG: Encoding = new Encoding(encoding.APPLICATION_YANG);
  /** 
   * Constant alias for string "audio/aac" 
  */
  static readonly AUDIO_AAC: Encoding = new Encoding(encoding.AUDIO_AAC);
  /** 
   * Constant alias for string "audio/flac" 
  */
  static readonly AUDIO_FLAC: Encoding = new Encoding(encoding.AUDIO_FLAC);
  /** 
   * Constant alias for string "audio/mp4" 
  */
  static readonly AUDIO_MP4: Encoding = new Encoding(encoding.AUDIO_MP4);
  /** 
   * Constant alias for string "audio/ogg" 
  */
  static readonly AUDIO_OGG: Encoding = new Encoding(encoding.AUDIO_OGG);
  /** 
   * Constant alias for string "audio/vorbis" 
  */
  static readonly AUDIO_VORBIS: Encoding = new Encoding(encoding.AUDIO_VORBIS);
  /** 
   * Constant alias for string "video/h261" 
  */
  static readonly VIDEO_H261: Encoding = new Encoding(encoding.VIDEO_H261);
  /** 
   * Constant alias for string "video/h263" 
  */
  static readonly VIDEO_H263: Encoding = new Encoding(encoding.VIDEO_H263);
  /** 
   * Constant alias for string "video/h264" 
  */
  static readonly VIDEO_H264: Encoding = new Encoding(encoding.VIDEO_H264);
  /** 
   * Constant alias for string "video/h265" 
  */
  static readonly VIDEO_H265: Encoding = new Encoding(encoding.VIDEO_H265);
  /** 
   * Constant alias for string "video/h266" 
  */
  static readonly VIDEO_H266: Encoding = new Encoding(encoding.VIDEO_H266);
  /** 
   * Constant alias for string "video/mp4" 
  */
  static readonly VIDEO_MP4: Encoding = new Encoding(encoding.VIDEO_MP4);
  /** 
   * Constant alias for string "video/ogg" 
  */
  static readonly VIDEO_OGG: Encoding = new Encoding(encoding.VIDEO_OGG);
  /** 
   * Constant alias for string "video/raw" 
  */
  static readonly VIDEO_RAW: Encoding = new Encoding(encoding.VIDEO_RAW);
  /** 
   * Constant alias for string "video/vp8" 
  */
  static readonly VIDEO_VP8: Encoding = new Encoding(encoding.VIDEO_VP8);
  /** 
   * Constant alias for string "video/vp9" 
  */
  static readonly VIDEO_VP9: Encoding = new Encoding(encoding.VIDEO_VP9);
}