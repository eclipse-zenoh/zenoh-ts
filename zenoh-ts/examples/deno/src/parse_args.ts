import { parseArgs } from "@std/cli/parse-args";

export class ParseArgs {
  static _types: Record<string, any> = {}; // Types of the arguments in format { type: [arg1, arg2, ...] }
  static _help: Record<string, string> = {}; // Help messages for the arguments in format { arg: help_message }
  [key: string]: any;

  public parse() {
    const args = parseArgs(Deno.args, (this.constructor as typeof ParseArgs)._types);
    if (args.help) {
        console.log("Usage:");
        console.log("--help : Print this help message");
        let types = (this.constructor as typeof ParseArgs)._types;
        for (const [arg, help] of Object.entries((this.constructor as typeof ParseArgs)._help)) {
            // find type of the argument
            let type = Object.keys(types).find(key => types[key].includes(arg));
            console.log(`--${arg} <${type}> : ${help}`);
        }
        Deno.exit(0);
    }
    // assign all the properties of args to instance
    for (const [key, value] of Object.entries(args)) {
      this[key] = value;
    }
  }
}
