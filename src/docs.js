import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));

export default function docsRouter() {
  const spec = YAML.parse(fs.readFileSync(path.join(here, "../openapi.yaml"), "utf8"));
  return [swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "BlitzRank API" })];
}
