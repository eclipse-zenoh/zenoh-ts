import { parseArgs } from "@std/cli/parse-args";

export class ParseArgs {
  static _help: Record<string, string> = {}; // Help messages for the arguments in format { arg: help_message }
  [key: string]: any;

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
    const types = (this.constructor as typeof ParseArgs).fillTypesFromObject(this);
    const args = parseArgs(Deno.args, types);
    if (args.help) {
        console.log("Usage:");
        console.log("--help\n\tPrint this help message");
        for (const [arg, help] of Object.entries((this.constructor as typeof ParseArgs)._help)) {
            // find type of the argument
            let type = Object.keys(types).find(key => types[key].includes(arg));
            console.log(`--${arg} <${type}>`);
            let default_value = this[arg];
            if (default_value) {
                console.log(`\t[default: ${default_value}]`);
            }
            console.log(`\t${help}`);
        }
        Deno.exit(0);
    }
    // assign all the properties of args to instance
    for (const [key, value] of Object.entries(args)) {
      this[key] = value;
    }
  }
}
