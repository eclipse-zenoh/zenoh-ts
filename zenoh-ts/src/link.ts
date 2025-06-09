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

const MAX_WS_BUFFER_SIZE = 2 * 1024 * 1024; // 2 MB buffer size for websocket

const RETRY_TIMEOUT_MS = 2000;
const MAX_RETRIES: number = 10;


export class RemoteLink {
  private constructor(private ws: WebSocket) {
    this.ws = ws;
  }

  static async new(locator: string): Promise<RemoteLink> {
    let websocketEndpoint = this.parseZenohLocator(locator);

    let retries = 0;
    let retryTimeoutMs = RETRY_TIMEOUT_MS;

    while (retries < MAX_RETRIES) {
      let ws = new WebSocket(websocketEndpoint);
      ws.binaryType = "arraybuffer";

      ws.onerror = function (event: any) {
        console.warn("WebSocket error: ", event);
      };

      ws.onclose = function (event: any) {
        console.warn(`WebSocket has been disconnected from remote-api-plugin: ${event.code}`)
      };

      let wait = 0;
      while (ws.readyState != 1) {
        await sleep(100);
        wait += 100;
        if (wait > (retryTimeoutMs)) {
          ws.close();
          retryTimeoutMs *= 2;
          break;
        }
      }

      if (ws.readyState == 1) {
        console.warn("Connected to", websocketEndpoint);
        return new RemoteLink(ws);
      } else {
        ws = new WebSocket(websocketEndpoint);
        console.warn("Restart connection");
      }
    }

    throw new Error(`Failed to connect to locator endpoint: ${locator} after ${MAX_RETRIES}`);
  }

  onmessage(onmessage: (msg: Uint8Array) => void) {
    this.ws.onmessage = function (event: any) {
      onmessage(new Uint8Array(event.data));
    };
  }

  async send(msg: Uint8Array) {
    if (!this.isOk) {
      throw new Error("WebSocket is closed");
    }
    while (this.ws.bufferedAmount > MAX_WS_BUFFER_SIZE) {
      await sleep(10);
      if (!this.isOk) {
        throw new Error("WebSocket is closed");
      }
    }
    this.ws.send(msg);
  }

  isOk(): boolean {
    return this.ws.readyState == WebSocket.OPEN;
  }

  close() {
    this.ws.onmessage = null;
    this.ws.close();
  }


  private static parseZenohLocator(locator: string): string {
    let parts = locator.split("/", 2);
    if (parts.length != 2) {
      return locator;
    }
    let protocol = parts[0];
    let address = parts[1];
    if (protocol != "ws" && protocol != "wss") {
      return locator;
    }
    return `${protocol}://${address}`;
  }
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}