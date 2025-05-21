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

import { Priority } from "@eclipse-zenoh/zenoh-ts";
import { parseArgs } from "@std/cli/parse-args";

export abstract class BaseParseArgs {
  [key: string]: any;

  abstract get_named_args_help(): Record<string, string>;
  abstract get_positional_args_help(): [string, string][];

  static fillTypesFromObject(obj: Record<string, any>): Record<string, any> {
    const types: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key == "positional") continue;
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
    const positionalArgs = this.get_positional_args_help();
    if (args.help) {
        let s = "Usage: [OPTIONS]";
        for (const p of positionalArgs) {
          s += " <" + p[0] + ">";
        }
        if (positionalArgs.length != 0) {
          console.log("Arguments:");
          for (let i = 0; i < positionalArgs.length; i++) {
            console.log(`<${positionalArgs[i][0]}> <${typeof this.positional[i]}>`);
            console.log(`\t${positionalArgs[i][1]}`);
          }
        }

        const named_help = this.get_named_args_help();
        console.log("Options:")
        console.log("--help\n\tPrint this help message");
        for (const [arg, helpMessage] of Object.entries(named_help)) {
            // find type of the argument
            let type = Object.keys(types).find(key => types[key].includes(arg));
            console.log(`--${arg} <${type}>`);
            const defaultValue = this[arg];
            if (defaultValue) {
                console.log(`\t[default: ${defaultValue}]`);
            }
            console.log(`\t${helpMessage}`);
        }
        Deno.exit(0);
    } else {
      if (positionalArgs.length != args._.length) {
        throw new Error("Incorrect number of positional arguments");
      }
      for (let i = 0; i < positionalArgs.length; i++) {
        if (typeof this.positional[i] === 'number') {
          this.positional[i] = Number(args._[i]).valueOf();
        } else if (typeof this.positional[i] === 'string') {
          this.positional[i] = String(args._[i]).valueOf();
        } else {
          throw new Error("Unsupported argument type");
        }
      }
    }
    // assign all the properties of args to instance
    for (const [key, value] of Object.entries(args)) {
      this[key] = value;
    }
  }
}

export function priority_from_int(prio_u8: number): Priority {
  switch (prio_u8) {
    case 1:
      return Priority.REAL_TIME;
    case 2:
      return Priority.INTERACTIVE_HIGH;
    case 3:
      return Priority.INTERACTIVE_LOW;
    case 4:
      return Priority.DATA_HIGH;
    case 5:
      return Priority.DATA;
    case 6:
      return Priority.DATA_LOW;
    case 7:
      return Priority.BACKGROUND;
    default:
      console.warn("Unknown Priority Variant, default to Data");
      return Priority.DATA;
  }
}
