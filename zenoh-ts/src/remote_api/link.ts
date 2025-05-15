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
  ws: WebSocket;

  private constructor(ws: WebSocket) {
    this.ws = ws;
  }

  static async new(url: string): Promise<RemoteLink> {
    let split = url.split("/");
    let websocket_endpoint = split[0] + "://" + split[1];

    let retries = 0;
    let retry_timeout_ms = RETRY_TIMEOUT_MS;

    while (retries < MAX_RETRIES) {
      let ws = new WebSocket(websocket_endpoint);

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
        if (wait > (retry_timeout_ms)) {
          ws.close();
          retry_timeout_ms *= 2;
          break;
        }
      }

      if (ws.readyState == 1) {
        console.warn("Connected to", websocket_endpoint);
        return new RemoteLink(ws);
      } else {
        ws = new WebSocket(websocket_endpoint);
        console.warn("Restart connection");
      }
    }

    throw new Error(`Failed to connect to locator endpoint: ${url} after ${MAX_RETRIES}`);
  }

  onmessage(onmessage: (msg: any) => void) {
    this.ws.onmessage = function (event: any) {
      onmessage(event.data);
    };
  }

  async send(msg: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this.is_ok) {
      throw new Error("WebSocket is closed");
    }
    while (this.ws.bufferedAmount > MAX_WS_BUFFER_SIZE) {
      await sleep(10);
    }
    this.ws.send(msg);
  }

  is_ok(): boolean {
    return this.ws.readyState == WebSocket.OPEN;
  }

  close() {
    this.ws.close();
  }
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}