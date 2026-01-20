
import { Runtime } from "@observablehq/runtime";
import { Inspector } from "@observablehq/inspector";
import { Library } from "@observablehq/stdlib";
import * as Inputs from "@observablehq/inputs";

export { Runtime, Inspector, Library };

export function createLibrary() {
  const library = new Library();
  Object.assign(library, { Inputs: () => Inputs });
  return library;
}
export const runtime = new Runtime(createLibrary());
