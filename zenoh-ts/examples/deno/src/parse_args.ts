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


function camelCaseToKebabCase(s: string): string {
  return s[0].toLowerCase() + s.slice(1, s.length).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function kebabCaseToCamelCase(s: string): string {
  return s.replace(/(-[a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
  });
}

export abstract class BaseParseArgs {
  [key: string]: any;

  abstract getNamedArgsHelp(): Record<string, string>;
  abstract getPositionalArgsHelp(): [string, string][];

  static fillTypesFromObject(obj: Record<string, any>): Record<string, any> {
    const types: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key == "positional") continue;
      const type = typeof value;
      if (!types[type]) {
        types[type] = [];
      }
      types[type].push(camelCaseToKebabCase(key));
    }
    return types;
  }

  getHelp(types: Record<string, any>, positionalArgs: [string, string][]): string {
    let s = "Usage: [OPTIONS]";
    for (const p of positionalArgs) {
      s += " <" + p[0] + ">";
    }
    if (positionalArgs.length != 0) {
      s += "\nArguments:";
      for (let i = 0; i < positionalArgs.length; i++) {
        s += `\n<${positionalArgs[i][0]}> <${typeof this.positional[i]}>`;
        s += `\n\t${positionalArgs[i][1]}`;
      }
    }

    const namedHelp = this.getNamedArgsHelp();
    s += "\nOptions:";
    s += "\n--help\n\tPrint this help message";
    for (const [arg, helpMessage] of Object.entries(namedHelp)) {
        const kebabCaseArg = camelCaseToKebabCase(arg);
        // find type of the argument
        let type = Object.keys(types).find(key => types[key].includes(kebabCaseArg));
        s += `\n--${kebabCaseArg} <${type}>`;
        const defaultValue = this[arg];
        if (defaultValue != undefined) {
            s += `\n\t[default: ${defaultValue}]`;
        }
        s += `\n\t${helpMessage}`;
    }
    return s;
  }
  

  public parse() {
    const types = (this.constructor as typeof BaseParseArgs).fillTypesFromObject(this);
    const args = parseArgs(Deno.args, types);
    const positionalArgs = this.getPositionalArgsHelp();
    const help = this.getHelp(types, positionalArgs);
    if (args.help) {
        console.log(help);
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
      if (key == '_') continue;
      const k = kebabCaseToCamelCase(key);
      if (!(k in this)) {
        console.error(`Unknown argument: ${key}`);
        console.log(help);
        Deno.exit(0);
      }
      this[kebabCaseToCamelCase(key)] = value;
    }
  }
}

export function priorityFromInt(prioU8: number): Priority {
  switch (prioU8) {
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
