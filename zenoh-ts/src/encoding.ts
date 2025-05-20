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

enum EncodingPredefined {
  ZENOH_BYTES = "zenoh/bytes",
  ZENOH_STRING = "zenoh/string",
  ZENOH_SERIALIZED = "zenoh/serialized",
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

  private constructor(strRep: string) {
    this._schema = strRep;
  }

  withSchema(input: string){
    this._schema = input;
  }

  static default(): Encoding {
    return new Encoding(EncodingPredefined.ZENOH_BYTES);
  }

  toString(): string {
    return this._schema;
  }
  static fromString(input: string): Encoding {
    return new Encoding(input);
  }

  // Enum Variants
  /**
   * Constant alias for string "zenoh/bytes"
   */
  static readonly ZENOH_BYTES = new Encoding(EncodingPredefined.ZENOH_BYTES);
  /**
   * Constant alias for string "zenoh/string"
   */
  static readonly ZENOH_STRING: Encoding = new Encoding(EncodingPredefined.ZENOH_STRING);
  /**
   * Constant alias for string "zenoh/serialized"
   */
  static readonly ZENOH_SERIALIZED: Encoding = new Encoding(
    EncodingPredefined.ZENOH_SERIALIZED
  );
  /**
   * Constant alias for string "application/octet-stream"
   */
  static readonly APPLICATION_OCTET_STREAM: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_OCTET_STREAM
  );
  /**
   * Constant alias for string "text/plain"
   */
  static readonly TEXT_PLAIN: Encoding = new Encoding(EncodingPredefined.TEXT_PLAIN);
  /**
   * Constant alias for string "application/json"
   */
  static readonly APPLICATION_JSON: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JSON
  );
  /**
   * Constant alias for string "text/json"
   */
  static readonly TEXT_JSON: Encoding = new Encoding(EncodingPredefined.TEXT_JSON);
  /**
   * Constant alias for string "application/cdr"
   */
  static readonly APPLICATION_CDR: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_CDR
  );
  /**
   * Constant alias for string "application/cbor"
   */
  static readonly APPLICATION_CBOR: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_CBOR
  );
  /**
   * Constant alias for string "application/yaml"
   */
  static readonly APPLICATION_YAML: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_YAML
  );
  /**
   * Constant alias for string "text/yaml"
   */
  static readonly TEXT_YAML: Encoding = new Encoding(EncodingPredefined.TEXT_YAML);
  /**
   * Constant alias for string "text/json5"
   */
  static readonly TEXT_JSON5: Encoding = new Encoding(EncodingPredefined.TEXT_JSON5);
  /**
   * Constant alias for string "application/protobuf"
   */
  static readonly APPLICATION_PROTOBUF: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_PROTOBUF
  );
  /**
   * Constant alias for string "application/python-serialized-object"
   */
  static readonly APPLICATION_PYTHON_SERIALIZED_OBJECT: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_PYTHON_SERIALIZED_OBJECT
  );
  /**
   * Constant alias for string "application/java-serialized-object"
   */
  static readonly APPLICATION_JAVA_SERIALIZED_OBJECT: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JAVA_SERIALIZED_OBJECT
  );
  /**
   * Constant alias for string "application/openmetrics-text"
   */
  static readonly APPLICATION_OPENMETRICS_TEXT: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_OPENMETRICS_TEXT
  );
  /**
   * Constant alias for string "image/png"
   */
  static readonly IMAGE_PNG: Encoding = new Encoding(EncodingPredefined.IMAGE_PNG);
  /**
   * Constant alias for string "image/jpeg"
   */
  static readonly IMAGE_JPEG: Encoding = new Encoding(EncodingPredefined.IMAGE_JPEG);
  /**
   * Constant alias for string "image/gif"
   */
  static readonly IMAGE_GIF: Encoding = new Encoding(EncodingPredefined.IMAGE_GIF);
  /**
   * Constant alias for string "image/bmp"
   */
  static readonly IMAGE_BMP: Encoding = new Encoding(EncodingPredefined.IMAGE_BMP);
  /**
   * Constant alias for string "image/webp"
   */
  static readonly IMAGE_WEBP: Encoding = new Encoding(EncodingPredefined.IMAGE_WEBP);
  /**
   * Constant alias for string "application/xml"
   */
  static readonly APPLICATION_XML: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_XML
  );
  /**
   * Constant alias for string "application/x-www-form-urlencoded"
   */
  static readonly APPLICATION_X_WWW_FORM_URLENCODED: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_X_WWW_FORM_URLENCODED
  );
  /**
   * Constant alias for string "text/html"
   */
  static readonly TEXT_HTML: Encoding = new Encoding(EncodingPredefined.TEXT_HTML);
  /**
   * Constant alias for string "text/xml"
   */
  static readonly TEXT_XML: Encoding = new Encoding(EncodingPredefined.TEXT_XML);
  /**
   * Constant alias for string "text/css"
   */
  static readonly TEXT_CSS: Encoding = new Encoding(EncodingPredefined.TEXT_CSS);
  /**
   * Constant alias for string "text/javascript"
   */
  static readonly TEXT_JAVASCRIPT: Encoding = new Encoding(
    EncodingPredefined.TEXT_JAVASCRIPT
  );
  /**
   * Constant alias for string "text/markdown"
   */
  static readonly TEXT_MARKDOWN: Encoding = new Encoding(
    EncodingPredefined.TEXT_MARKDOWN
  );
  /**
   * Constant alias for string "text/csv"
   */
  static readonly TEXT_CSV: Encoding = new Encoding(EncodingPredefined.TEXT_CSV);
  /**
   * Constant alias for string "application/sql"
   */
  static readonly APPLICATION_SQL: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_SQL
  );
  /**
   * Constant alias for string "application/coap-payload"
   */
  static readonly APPLICATION_COAP_PAYLOAD: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_COAP_PAYLOAD
  );
  /**
   * Constant alias for string "application/json-patch+json"
   */
  static readonly APPLICATION_JSON_PATCH_JSON: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JSON_PATCH_JSON
  );
  /**
   * Constant alias for string "application/json-seq"
   */
  static readonly APPLICATION_JSON_SEQ: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JSON_SEQ
  );
  /**
   * Constant alias for string "application/jsonpath"
   */
  static readonly APPLICATION_JSONPATH: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JSONPATH
  );
  /**
   * Constant alias for string "application/jwt"
   */
  static readonly APPLICATION_JWT: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_JWT
  );
  /**
   * Constant alias for string "application/mp4"
   */
  static readonly APPLICATION_MP4: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_MP4
  );
  /**
   * Constant alias for string "application/soap+xml"
   */
  static readonly APPLICATION_SOAP_XML: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_SOAP_XML
  );
  /**
   * Constant alias for string "application/yang"
   */
  static readonly APPLICATION_YANG: Encoding = new Encoding(
    EncodingPredefined.APPLICATION_YANG
  );
  /**
   * Constant alias for string "audio/aac"
   */
  static readonly AUDIO_AAC: Encoding = new Encoding(EncodingPredefined.AUDIO_AAC);
  /**
   * Constant alias for string "audio/flac"
   */
  static readonly AUDIO_FLAC: Encoding = new Encoding(EncodingPredefined.AUDIO_FLAC);
  /**
   * Constant alias for string "audio/mp4"
   */
  static readonly AUDIO_MP4: Encoding = new Encoding(EncodingPredefined.AUDIO_MP4);
  /**
   * Constant alias for string "audio/ogg"
   */
  static readonly AUDIO_OGG: Encoding = new Encoding(EncodingPredefined.AUDIO_OGG);
  /**
   * Constant alias for string "audio/vorbis"
   */
  static readonly AUDIO_VORBIS: Encoding = new Encoding(EncodingPredefined.AUDIO_VORBIS);
  /**
   * Constant alias for string "video/h261"
   */
  static readonly VIDEO_H261: Encoding = new Encoding(EncodingPredefined.VIDEO_H261);
  /**
   * Constant alias for string "video/h263"
   */
  static readonly VIDEO_H263: Encoding = new Encoding(EncodingPredefined.VIDEO_H263);
  /**
   * Constant alias for string "video/h264"
   */
  static readonly VIDEO_H264: Encoding = new Encoding(EncodingPredefined.VIDEO_H264);
  /**
   * Constant alias for string "video/h265"
   */
  static readonly VIDEO_H265: Encoding = new Encoding(EncodingPredefined.VIDEO_H265);
  /**
   * Constant alias for string "video/h266"
   */
  static readonly VIDEO_H266: Encoding = new Encoding(EncodingPredefined.VIDEO_H266);
  /**
   * Constant alias for string "video/mp4"
   */
  static readonly VIDEO_MP4: Encoding = new Encoding(EncodingPredefined.VIDEO_MP4);
  /**
   * Constant alias for string "video/ogg"
   */
  static readonly VIDEO_OGG: Encoding = new Encoding(EncodingPredefined.VIDEO_OGG);
  /**
   * Constant alias for string "video/raw"
   */
  static readonly VIDEO_RAW: Encoding = new Encoding(EncodingPredefined.VIDEO_RAW);
  /**
   * Constant alias for string "video/vp8"
   */
  static readonly VIDEO_VP8: Encoding = new Encoding(EncodingPredefined.VIDEO_VP8);
  /**
   * Constant alias for string "video/vp9"
   */
  static readonly VIDEO_VP9: Encoding = new Encoding(EncodingPredefined.VIDEO_VP9);
}
