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

import "./style.css";
import "./webpage.ts";
import {thr} from  "./z_sub_thr.ts";
import { get } from  "./z_get.ts";
import { ping } from "./z_ping.ts";
import { pong } from "./z_pong.ts";
import { sub as sub } from "./z_sub.ts";
import { pub } from "./z_pub.ts";
import { put } from "./z_put.ts";
import { queryable } from "./z_queryable.ts";
// import { _delete } from "./z_delete.ts";
import { liveliness } from "./z_liveliness.ts";
import { sub_liveliness } from "./z_sub_liveliness.ts";
import { get_liveliness } from "./z_get_liveliness.ts";

async function main() {
  // thr();
  // ping();
  // pong();
  // sub();
  // pub();
  // queryable();
  // get();
  // _delete();
  // put();
  // liveliness();
  // sub_liveliness();
  get_liveliness();

  let count = 0;
  while (true) {
    await sleep(1000 * 100);
    console.warn("Main Loop tick ", count);
    count = count + 1;
  }
}

main()
  .then(() => console.warn("Done"))
  .catch((e) => {
    console.warn(e);
    throw e;
  });


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


