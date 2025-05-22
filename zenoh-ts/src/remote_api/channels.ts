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

import { SimpleChannel, TryReceived, TryReceivedKind, ChannelState } from "channel-ts";
import { Callback, Drop } from "./closure";

/**
 * A receiver interface for channel.
 */
export interface ChannelReceiver<T> {
  state: () => ChannelState;
  receive: () => Promise<T>;
  tryReceive(): TryReceived<T>;
  [Symbol.asyncIterator]: () => AsyncIterableIterator<T>;
}

/**
 * A sender interface for channel.
 */
export interface ChannelSender<T> {
  send: (data: T) => void;
  close: () => void;
}

export interface IntoSenderReceiverPair<T> {
  intoSenderReceiverPair: () => [ChannelSender<T>, ChannelReceiver<T>]
}


export function isIntoSenderReceiverPair<T>(object: any): object is IntoSenderReceiverPair<T> {
  return (<IntoSenderReceiverPair<T>>(object)).intoSenderReceiverPair != undefined;
}

export type Handler<T> = Callback<T> | [Callback<T>, Drop] | IntoSenderReceiverPair<T>;


export function intoCbDropReceiver<T>(handler: Handler<T>): [Callback<T>, Drop, ChannelReceiver<T>?] {
  if (isIntoSenderReceiverPair<T>(handler)) {
    let [sender, receiver] = handler.intoSenderReceiverPair();
    let cb = (data: T): void => {
      sender.send(data);
    };
    let drop = (): void => {
      sender.close();
    }
    return [cb, drop, receiver];
  } else if (Array.isArray(handler)) { // [callback, drop]
    return [handler[0], handler[1], undefined];
  } else {
    let drop = (): void => { };
    return [handler, drop, undefined];
  }
}

/**
 * A FIFO channel. When maximum capacity is reached all new values will be ignored.
 */
export class FifoChannel<T> {
  protected chan: SimpleChannel<T>;
  protected capacity: number;
  protected size: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.size = 0;
    this.chan = new SimpleChannel<T>();
  }

  /**
   * Send new data onto channel. When maximum capacity is reached all new values will be ignored.
   */
  send(data: T) {
    if (this.size != this.capacity) {
      this.chan.send(data);
      this.size++;
    }
  }

  /**
   * Get state of the channel.
   */
  state(): ChannelState {
    return this.chan.state;
  }

  /**
   * Attempt to receive the data in a non-blocking way. 
   */
  tryReceive(): TryReceived<T> {
    let res = this.chan.tryReceive();
    if (res.kind == TryReceivedKind.value) {
      this.size--;
    }
    return res;
  }

  /**
   * Receive data in a blocking way. If channel is empty, this call will block until new data arrives or the channel is closed.
   */
  async receive(): Promise<T> {
    let res = await this.chan.receive();
    this.size--;
    return res;
  }

  /**
   * Close the channel. This`will unblock all currently pending @see receive calls.
   */
  close(): void {
    this.chan.close();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    try {
      while (true) {
        yield await this.receive();
      }
    } catch {

    }
  }

  /**
   * Split Channel into @interface ChannelSender and @interface ChannelReceiver pair.
   */
  intoSenderReceiverPair(): [ChannelSender<T>, ChannelReceiver<T>] {
    return [this, this];
  }
}

/**
 * A circular buffer channel. When maximum capacity is reached the older values will be removed to provide space for new ones.
 */
export class RingChannel<T> extends FifoChannel<T> {
  constructor(capacity: number) {
    super(capacity)
  }

  /**
   * Send new data onto channel. When maximum capacity is reached the older values will be removed to provide space for new ones.
   */
  override send(data: T) {
    if (this.capacity == 0) return;
    if (this.size == this.capacity) {
      this.chan.tryReceive();
    }
    this.chan.send(data);
    this.size++;
  }
}

export {TryReceivedKind, ChannelState, TryReceived}

