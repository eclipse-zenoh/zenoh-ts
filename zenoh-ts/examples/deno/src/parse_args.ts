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

import { parseArgs } from "@std/cli/parse-args";

export abstract class BaseParseArgs {
  [key: string]: any;

  abstract get_help(): Record<string, string>;

  static fillTypesFromObject(obj: Record<string, any>): Record<string, any> {
    const types: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const type = typeof value;
      if (!types[type]) {
        types[type] = [];
      }
      types[type].push(key);
    }
    return types;
  }

  public parse() {
    const types = (this.constructor as typeof BaseParseArgs).fillTypesFromObject(this);
    const args = parseArgs(Deno.args, types);
    if (args.help) {
        console.log("Usage:");
        console.log("--help\n\tPrint this help message");
        const help = this.get_help();
        for (const [arg, helpMessage] of Object.entries(help)) {
            // find type of the argument
            let type = Object.keys(types).find(key => types[key].includes(arg));
            console.log(`--${arg} <${type}>`);
            let default_value = this[arg];
            if (default_value) {
                console.log(`\t[default: ${default_value}]`);
            }
            console.log(`\t${helpMessage}`);
        }
        Deno.exit(0);
    }
    // assign all the properties of args to instance
    for (const [key, value] of Object.entries(args)) {
      this[key] = value;
    }
  }
}
