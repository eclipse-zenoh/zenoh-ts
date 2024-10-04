import "./style.css";
import "./webpage.ts";

import { Config, KeyExpr, Query, Queryable, Session, ZBytes } from "@ZettaScaleLabs/zenoh-ts";


export async function queryable() {
  const session = await Session.open(Config.new("ws/127.0.0.1:10000"));
  let key_expr = KeyExpr.new("demo/example/zenoh-ts-queryable");

  const payload = [122, 101, 110, 111, 104];

  // Declaring a queryable with a callback
  function callback(query: Query) {
    let zbytes: ZBytes | undefined = query.payload();

    if (zbytes == null) {
      console.log!(`>> [Queryable ] Received Query ${query.selector()}`);
    } else {
      console.log!(
        `>> [Queryable ] Received Query ${query.selector()} with payload '${zbytes}'`,
      );
    }

    console.log(
      `>> [Queryable ] Responding ${key_expr.toString()} with payload '${payload}'`,
    );
    query.reply(key_expr, payload);
  }

  let queryable_cb: Queryable = await session.declare_queryable(key_expr, {
    complete: true,
    callback: callback,
  });
  await sleep(1000 * 5);
  queryable_cb.undeclare()


  // Declaring a Queryable with a handler
  let queryable: Queryable = await session.declare_queryable(key_expr, {
    complete: true,
  });

  let query = await queryable.receive();
  while (query instanceof Query) {

    let zbytes: ZBytes | undefined = query.payload();

    if (zbytes == null) {
      console.log!(`>> [Queryable ] Received Query ${query.selector().toString()}`);
    } else {
      console.log!(
        `>> [Queryable ] Received Query ${query.selector()} with payload '${zbytes.payload()}'`,
      );
    }

    console.log(
      `>> [Queryable ] Responding ${key_expr.toString()} with payload '${payload}'`,
    );
    query.reply(key_expr, payload);

    query = await queryable.receive();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
