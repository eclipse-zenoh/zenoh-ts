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
import { _delete } from "./z_delete.ts";

async function main() {
  // thr();
  // ping();
  // pong();
  sub();
  // pub();
  // queryable();
  // get();
  // _delete();
  // put();

  let count = 0;
  while (true) {
    await sleep(1000 * 100);
    console.log("Main Loop tick ", count);
    count = count + 1;
  }
}

main()
  .then(() => console.log("Done"))
  .catch((e) => {
    console.log(e);
    throw e;
  });


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


