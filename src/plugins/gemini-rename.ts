import { visitAllIdentifiers } from "./local-llm-rename/visit-all-identifiers.js";
import { verbose } from "../verbose.js";
import { showPercentage } from "../progress.js";
import { PluginContext } from "../unminify.js";
import {
  GoogleGenerativeAI,
  ModelParams,
  SchemaType
} from "@google/generative-ai";

export function geminiRename({
  apiKey,
  model: modelName,
  contextWindowSize
}: {
  apiKey: string;
  model: string;
  contextWindowSize: number;
}) {
  const client = new GoogleGenerativeAI(apiKey);

  return async (code: string, context?: PluginContext): Promise<string> => {
    return await visitAllIdentifiers(
      code,
      async (name, surroundingCode) => {
        verbose.log(`Renaming ${name}`);
        verbose.log("Context: ", surroundingCode);

        const model = client.getGenerativeModel(
          toRenameParams(name, modelName, context?.moduleGraph)
        );

        const result = await model.generateContent(surroundingCode);

        const renamed = JSON.parse(result.response.text()).newName;

        verbose.log(`Renamed to ${renamed}`);

        return renamed;
      },
      contextWindowSize,
      showPercentage
    );
  };
}

function toRenameParams(name: string, model: string, moduleGraph?: string): ModelParams {
  let systemInstruction = `Rename Javascript variables/function \`${name}\` to have descriptive name based on their usage in the code.`;

  if (moduleGraph) {
    systemInstruction += `\n\nRefer to the following module graph to understand cross-file dependencies and maintain consistent naming:\n${moduleGraph}`;
  }

  return {
    model,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        nullable: false,
        description: "The new name for the variable/function",
        type: SchemaType.OBJECT,
        properties: {
          newName: {
            type: SchemaType.STRING,
            nullable: false,
            description: `The new name for the variable/function called \`${name}\``
          }
        },
        required: ["newName"]
      }
    }
  };
}
