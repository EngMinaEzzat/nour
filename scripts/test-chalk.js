import { format } from "node:util";

const colors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
}

function info(msg, ...args) {
    console.log(colors.cyan("[INFO]"), format(msg, ...args));
}

function success(msg, ...args) {
    console.log(colors.green("[PASS]"), format(msg, ...args));
}

function error(msg, ...args) {
    console.error(colors.red("[FAIL]"), format(msg, ...args));
}

info("Starting test...");
success("Success %s ms", 12.33);
error("Failed %s", "Network error");
