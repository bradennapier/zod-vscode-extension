import * as util from "util";

export const printObject = (obj: any) =>
  util
    .inspect(obj, {
      showHidden: false,
      depth: 2,
      compact: false,
    })
    .replace(/'/g, ""); // TODO - 🤷‍♀️ I don't want to write a printer