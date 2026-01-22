import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { verbose } from '../verbose.js';

const require = createRequire(import.meta.url);
const { unpack } = require('@wakaru/unpacker');
const { runDefaultTransformationRules, runTransformationRules } = require('@wakaru/unminify');

type File = {
  path: string;
};

export async function processWithWakaru(
  code: string,
  outputDir: string
): Promise<File[]> {
  verbose.log("Unpacking with Wakaru...");

  // 1. Unpack
  let unpackedModules;
  try {
    const result = await unpack(code);
    unpackedModules = result.modules;
  } catch (err) {
    verbose.log("Wakaru unpack failed or returned no modules, treating as single file.", err);
    // If unpack fails or returns nothing, we might be dealing with a single file (not a bundle)
    // In that case, we treat the input as the single module.
    unpackedModules = [{
      id: 0,
      code: code,
      isEntry: true
    }];
  }

  if (!unpackedModules || unpackedModules.length === 0) {
     unpackedModules = [{
      id: 0,
      code: code,
      isEntry: true
    }];
  }

  await fs.mkdir(outputDir, { recursive: true });

  const files: File[] = [];

  // 2. Unminify (Clean & Smart Rename)
  // We use runDefaultTransformationRules which includes smart-rename and other heuristics
  // See: https://github.com/pionxzh/wakaru/blob/main/packages/unminify/src/transformations/index.ts

  for (const mod of unpackedModules) {
    // Generate a filename.
    // Wakaru might give us hints, but usually it's by ID.
    // If we have tags or other info, use it.
    const filename = `module-${mod.id}.js`;
    const filepath = path.join(outputDir, filename);

    verbose.log(`Processing module ${mod.id} -> ${filepath}`);

    try {
      const unminifyResult = await runDefaultTransformationRules({
        source: mod.code,
        path: filepath // giving path might help some rules contextually
      });

      await fs.writeFile(filepath, unminifyResult.code);
      files.push({ path: filepath });
    } catch (e) {
      console.error(`Failed to unminify module ${mod.id}`, e);
      // Fallback to original code if unminify fails
      await fs.writeFile(filepath, mod.code);
      files.push({ path: filepath });
    }
  }

  return files;
}
