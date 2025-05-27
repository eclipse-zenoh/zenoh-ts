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

export enum EncodingPredefined {
    ZENOH_BYTES = 0,
    ZENOH_STRING,
    ZENOH_SERIALIZED,
    APPLICATION_OCTET_STREAM,
    TEXT_PLAIN,
    APPLICATION_JSON,
    TEXT_JSON,
    APPLICATION_CDR,
    APPLICATION_CBOR,
    APPLICATION_YAML,
    TEXT_YAML,
    TEXT_JSON5,
    APPLICATION_PROTOBUF,
    APPLICATION_PYTHON_SERIALIZED_OBJECT,
    APPLICATION_JAVA_SERIALIZED_OBJECT,
    APPLICATION_OPENMETRICS_TEXT,
    IMAGE_PNG,
    IMAGE_JPEG,
    IMAGE_GIF,
    IMAGE_BMP,
    IMAGE_WEBP,
    APPLICATION_XML,
    APPLICATION_X_WWW_FORM_URLENCODED,
    TEXT_HTML,
    TEXT_XML,
    TEXT_CSS,
    TEXT_JAVASCRIPT,
    TEXT_MARKDOWN,
    TEXT_CSV,
    APPLICATION_SQL,
    APPLICATION_COAP_PAYLOAD,
    APPLICATION_JSON_PATCH_JSON,
    APPLICATION_JSON_SEQ,
    APPLICATION_JSONPATH,
    APPLICATION_JWT,
    APPLICATION_MP4,
    APPLICATION_SOAP_XML,
    APPLICATION_YANG,
    AUDIO_AAC,
    AUDIO_FLAC,
    AUDIO_MP4,
    AUDIO_OGG,
    AUDIO_VORBIS,
    VIDEO_H261,
    VIDEO_H263,
    VIDEO_H264,
    VIDEO_H265,
    VIDEO_H266,
    VIDEO_MP4,
    VIDEO_OGG,
    VIDEO_RAW,
    VIDEO_VP8,
    VIDEO_VP9,
    CUSTOM = 0xFFFF,
}

function createIdToEncodingMap(): Map<EncodingPredefined, string> {
    let out = new Map<EncodingPredefined, string>();
    for (let e in EncodingPredefined) {
        let n = Number(e);
        if (!isNaN(n) && n != EncodingPredefined.CUSTOM) {
            out.set(n as EncodingPredefined, (EncodingPredefined[n] as string).toLocaleLowerCase().replaceAll('_', '/'));
        }
    }
    return out;
}

function createEncodingToIdMap(): Map<string, EncodingPredefined> {
    let out = new Map<string, EncodingPredefined>();
    for (let e in EncodingPredefined) {
        let n = Number(e);
        if (!isNaN(n) && n != EncodingPredefined.CUSTOM) {
            out.set((EncodingPredefined[n] as string).toLocaleLowerCase().replaceAll('_', '/'), n as EncodingPredefined);
        }
    }
    return out;
}

export type IntoEncoding = Encoding | String | string;

/**
 * Zenoh Encoding Class
 */
export class Encoding {
    private static readonly ID_TO_ENCODING = createIdToEncodingMap();
    private static readonly ENCODING_TO_ID = createEncodingToIdMap();
    private static readonly SEP = ";";


    constructor(private id: EncodingPredefined, private schema?: string) {}

    withSchema(input: string): Encoding {
        if (this.id != EncodingPredefined.CUSTOM || this.schema == undefined) {
            return new Encoding(this.id, input);
        } else {
            const idx = this.schema.indexOf(Encoding.SEP);
            if (idx == -1) {
                return new Encoding(this.id, this.schema + ";" + input);
            } else {
                return new Encoding(this.id, this.schema.substring(0, idx) + ";" + input);
            }
        }
    }

    static default(): Encoding {
        return new Encoding(EncodingPredefined.ZENOH_BYTES);
    }

    toString(): string {
        let out: string = "";
        if (this.id != EncodingPredefined.CUSTOM) {
            out += Encoding.ID_TO_ENCODING.get(this.id) as string;
        }
        if (this.schema != undefined) {
            if (this.id != EncodingPredefined.CUSTOM) {
                out += ";";
            }
            out += this.schema;
        }
        return out;
    }

    static fromString(input: string): Encoding {
        if (input.length == 0) {
            return new Encoding(EncodingPredefined.ZENOH_BYTES, undefined)
        }
        const idx = input.indexOf(Encoding.SEP);
        let key: string;
        let schema: string | undefined = undefined;
        if (idx == -1) {
            key = input;
        } else {
            key = input.substring(0, idx);
            schema = input.substring(idx + 1);
        }
        const id = Encoding.ENCODING_TO_ID.get(key) ?? EncodingPredefined.CUSTOM;
        if (id == EncodingPredefined.CUSTOM) {
            schema = schema ? key + ";" + schema : key;
        }
        return new Encoding(id, schema);
    }

    static from(input: IntoEncoding): Encoding {
        if (input instanceof Encoding) {
            return input;
        } else {
            return Encoding.fromString(input.toString());
        }
    }

    toIdSchema(): [EncodingPredefined, string?] {
        return [this.id, this.schema];
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
