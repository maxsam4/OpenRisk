import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadDataset, checkDataLayout } from "./load.js";
import { validateDataset } from "./validate.js";

const dataRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../data");
const layoutErrors = checkDataLayout(dataRoot);
const result = validateDataset(loadDataset(dataRoot));
const errors = [...layoutErrors, ...result.errors];
if (errors.length) { console.error("Dataset INVALID:\n" + errors.join("\n")); process.exit(1); }
console.log("Dataset valid.");
