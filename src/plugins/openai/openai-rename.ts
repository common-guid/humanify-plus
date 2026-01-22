import OpenAI from "openai";
import { visitAllIdentifiers } from "../local-llm-rename/visit-all-identifiers.js";
import { showPercentage } from "../../progress.js";
import { verbose } from "../../verbose.js";
import { PluginContext } from "../../unminify.js";

export function openaiRename({
  apiKey,
  baseURL,
  model,
  contextWindowSize
}: {
  apiKey: string;
  baseURL: string;
  model: string;
  contextWindowSize: number;
}) {
  const client = new OpenAI({ apiKey, baseURL });

  return async (code: string, context?: PluginContext): Promise<string> => {
    return await visitAllIdentifiers(
      code,
      async (name, surroundingCode) => {
        verbose.log(`Renaming ${name}`);
        verbose.log("Context: ", surroundingCode);

        const response = await client.chat.completions.create(
          toRenamePrompt(name, surroundingCode, model, context?.moduleGraph)
        );
        const result = response.choices[0].message?.content;
        if (!result) {
          throw new Error("Failed to rename", { cause: response });
        }
        const renamed = JSON.parse(result).newName;

        verbose.log(`Renamed to ${renamed}`);

        return renamed;
      },
      contextWindowSize,
      showPercentage
    );
  };
}

function toRenamePrompt(
  name: string,
  surroundingCode: string,
  model: string,
  moduleGraph?: string
): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
  let systemContent = `Rename Javascript variables/function \`${name}\` to have descriptive name based on their usage in the code.`;

  if (moduleGraph) {
    systemContent += `\n\nRefer to the following module graph to understand cross-file dependencies and maintain consistent naming:\n${moduleGraph}`;
  }

  return {
    model,
    messages: [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: surroundingCode
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        strict: true,
        name: "rename",
        schema: {
          type: "object",
          properties: {
            newName: {
              type: "string",
              description: `The new name for the variable/function called \`${name}\``
            }
          },
          required: ["newName"],
          additionalProperties: false
        }
      }
    }
  };
}
