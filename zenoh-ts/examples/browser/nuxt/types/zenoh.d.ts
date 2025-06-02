// Type definitions for Zenoh-TS
export interface ZenohConfig {
  new (url: string): any
}

export interface ZenohSession {
  open(config: any): Promise<ZenohSession>
  close(): Promise<void>
  put(keyExpr: ZenohKeyExpr, value: ZenohZBytes): Promise<void>
  get(selector: string): Promise<ZenohReceiver>
  declareSubscriber(keyExpr: ZenohKeyExpr): Promise<ZenohSubscriber>
}

export interface ZenohKeyExpr {
  new (expression: string): ZenohKeyExpr
  toString(): string
}

export interface ZenohZBytes {
  new (value: string | Uint8Array): ZenohZBytes
  toString(): string
}

export interface ZenohSample {
  keyexpr(): ZenohKeyExpr
  payload(): ZenohZBytes
  kind(): number
}

export interface ZenohSubscriber {
  receiver(): ZenohReceiver | null
  undeclare(): Promise<void>
}

export interface ZenohReceiver {
  receive(): Promise<ZenohSample | ZenohReply | null>
}

export interface ZenohReply {
  result(): ZenohSample | ZenohReplyError
}

export interface ZenohReplyError {
  payload(): ZenohZBytes
}

export interface ZenohPublisher {
  put(value: ZenohZBytes): Promise<void>
  undeclare(): Promise<void>
}

export interface ZenohModule {
  Config: ZenohConfig
  Session: ZenohSession
  KeyExpr: ZenohKeyExpr
  Publisher: ZenohPublisher
  Subscriber: ZenohSubscriber
  ZBytes: ZenohZBytes
  Sample: ZenohSample
}

declare module '@eclipse-zenoh/zenoh-ts' {
  export const Config: ZenohConfig
  export const Session: ZenohSession
  export const KeyExpr: ZenohKeyExpr
  export const Publisher: ZenohPublisher
  export const Subscriber: ZenohSubscriber
  export const ZBytes: ZenohZBytes
  export const Sample: ZenohSample
}
