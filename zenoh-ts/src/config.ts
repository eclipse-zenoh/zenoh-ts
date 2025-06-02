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

//  ██████  ██████  ███    ██ ███████ ██  ██████
// ██      ██    ██ ████   ██ ██      ██ ██
// ██      ██    ██ ██ ██  ██ █████   ██ ██   ███
// ██      ██    ██ ██  ██ ██ ██      ██ ██    ██
//  ██████  ██████  ██   ████ ██      ██  ██████

/**
  * The configuration for a Zenoh Session.
  */
export class Config {
  /**
   * Construct a new config, containing a locator
   * @param {string} locator - A string that respects the Locator to connect to. Currently this can be only the address of zenohd remote-api plugin websocket.
   * It accepts either 
   * - zenoh canon form: `<proto>/<address>[?<metadata>]` where <proto> can be `ws` and `wss` only, e.g. `ws/127.0.0.1:10000`
   * - common url form, e.g. `ws://127.0.0.1:10000`
   * @param {number} messageResponseTimeoutMs - timeout value in milliseconds for receiving a response from zenoh-plugin-remote-api.
   * Defaults to 500 ms.
   * @returns {Config} configuration instance
   */
  constructor(public locator: string, public messageResponseTimeoutMs: number = 500) {}
}
