import { format } from "node:util";

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(colors.cyan("[INFO]"), format(msg, ...args));
  },
  success: (msg: string, ...args: any[]) => {
    console.log(colors.green("[PASS]"), format(msg, ...args));
  },
  error: (msg: string, ...args: any[]) => {
    console.error(colors.red("[FAIL]"), format(msg, ...args));
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(colors.yellow("[WARN]"), format(msg, ...args));
  },
  skip: (msg: string, ...args: any[]) => {
    console.log(colors.gray("[SKIP]"), format(msg, ...args));
  },
};
