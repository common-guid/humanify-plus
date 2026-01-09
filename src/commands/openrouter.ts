import { cli } from "../cli.js";
import prettier from "../plugins/prettier.js";
import { unminify } from "../unminify.js";
import babel from "../plugins/babel/babel.js";
import { openrouterRename } from "../plugins/openrouter/openrouter-rename.js";
import { verbose } from "../verbose.js";
import { env } from "../env.js";
import { parseNumber } from "../number-utils.js";
import { DEFAULT_CONTEXT_WINDOW_SIZE } from "./default-args.js";

export const openrouter = cli()
  .name("openrouter")
  .description("Use OpenRouter's API to unminify code")
  .option("-m, --model <model>", "The model to use", "x-ai/grok-4.1-fast")
  .option("-o, --outputDir <output>", "The output directory", "output")
  .option(
    "-k, --apiKey <apiKey>",
    "The OpenRouter API key. Alternatively use OPENROUTER_API_KEY environment variable"
  )
  .option(
    "--baseURL <baseURL>",
    "The OpenRouter base server URL.",
    env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1"
  )
  .option("--verbose", "Show verbose output")
  .option(
    "--contextSize <contextSize>",
    "The context size to use for the LLM",
    `${DEFAULT_CONTEXT_WINDOW_SIZE}`
  )
  .argument("input", "The input minified Javascript file")
  .action(async (filename, opts) => {
    if (opts.verbose) {
      verbose.enabled = true;
    }

    const apiKey = opts.apiKey ?? env("OPENROUTER_API_KEY");
    const baseURL = opts.baseURL;
    const contextWindowSize = parseNumber(opts.contextSize);
    await unminify(filename, opts.outputDir, [
      babel,
      openrouterRename({
        apiKey,
        baseURL,
        model: opts.model,
        contextWindowSize
      }),
      prettier
    ]);
  });
