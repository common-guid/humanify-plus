import fs from "fs/promises";
import { ensureFileExists } from "./file-utils.js";
import { processWithWakaru } from "./plugins/wakaru.js";
import { verbose } from "./verbose.js";
import { generateModuleGraph } from "./module-graph.js";

// We modify the plugin signature to accept an optional context object
export type PluginContext = {
  moduleGraph?: string;
};

// We need to extend the plugin type to allow a second argument for context
type PluginFunction = (code: string, context?: PluginContext) => Promise<string>;

export async function unminify(
  filename: string,
  outputDir: string,
  plugins: PluginFunction[] = []
) {
  ensureFileExists(filename);
  const bundledCode = await fs.readFile(filename, "utf-8");

  // Replace webcrack with processWithWakaru
  const extractedFiles = await processWithWakaru(bundledCode, outputDir);

  // Generate Module Graph
  console.log("Generating module graph...");
  const moduleGraph = await generateModuleGraph(extractedFiles);
  verbose.log("Module Graph:", moduleGraph);

  const context: PluginContext = {
    moduleGraph
  };

  for (let i = 0; i < extractedFiles.length; i++) {
    console.log(`Processing file ${i + 1}/${extractedFiles.length}`);

    const file = extractedFiles[i];
    const code = await fs.readFile(file.path, "utf-8");

    if (code.trim().length === 0) {
      verbose.log(`Skipping empty file ${file.path}`);
      continue;
    }

    // Reduce now passes context
    const formattedCode = await plugins.reduce(
      (p, next) => p.then(code => next(code, context)),
      Promise.resolve(code)
    );

    verbose.log("Input: ", code);
    verbose.log("Output: ", formattedCode);

    await fs.writeFile(file.path, formattedCode);
  }

  console.log(`Done! You can find your unminified code in ${outputDir}`);
}
