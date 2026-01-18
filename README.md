# HumanifyJS
> Deobfuscate Javascript code using LLMs ("AI")

This tool uses large language models (like Grok, ChatGPT & Llama) and other tools to
deobfuscate, unminify, transpile, decompile and unpack Javascript code. Note
that LLMs don't perform any structural changes – they only provide hints to
rename variables and functions. The heavy lifting is done by Babel on AST level
to ensure code stays 1-1 equivalent.

### Version 2 is out! 🎉

v2 highlights compared to v1:
* Python not required anymore!
* A lot of tests, the codebase is actually maintanable now
* Renewed CLI tool `humanify` installable via npm

### ➡️ Check out the [introduction blog post][blogpost] for in-depth explanation!

[blogpost]: https://thejunkland.com/blog/using-llms-to-reverse-javascript-minification

## Example

Given the following minified code:

```javascript
function a(e,t){var n=[];var r=e.length;var i=0;for(;i<r;i+=t){if(i+t<r){n.push(e.substring(i,i+t))}else{n.push(e.substring(i,r))}}return n}
```

The tool will output a human-readable version:

```javascript
function splitString(inputString, chunkSize) {
  var chunks = [];
  var stringLength = inputString.length;
  var startIndex = 0;
  for (; startIndex < stringLength; startIndex += chunkSize) {
    if (startIndex + chunkSize < stringLength) {
      chunks.push(inputString.substring(startIndex, startIndex + chunkSize));
    } else {
      chunks.push(inputString.substring(startIndex, stringLength));
    }
  }
  return chunks;
}
```

🚨 **NOTE:** 🚨

Large files may take some time to process and use a lot of tokens if you use
an online LLM provider. For a rough estimate, the tool takes about 2 tokens per character to
process a file:

```shell
echo "$((2 * $(wc -c < yourscript.min.js)))"
```

So for reference: a minified `bootstrap.min.js` would cost almost nothing to
un-minify using generic models on OpenRouter, but could cost around $0.50 using GPT-4.

Using `humanify local` is of course free, but may take more time and is
dependent on your local hardware.

## Getting started

### Installation

Prerequisites:
* Node.js >=20

### Usage

Humanify supports multiple LLM providers. OpenRouter is recommended for the best balance of speed, cost, and quality.

#### OpenRouter (Recommended)

The default and recommended way to use Humanify is with [OpenRouter](https://openrouter.ai/). It provides access to a wide range of models including the default `x-ai/grok-4.1-fast`.

1. Get your API key from [OpenRouter](https://openrouter.ai/).
2. Set the `OPENROUTER_API_KEY` environment variable.
3. Run the tool:

```shell
export OPENROUTER_API_KEY=your_key
npx humanify openrouter file.js
```

You can specify a different model using the `-m` flag:

```shell
npx humanify openrouter file.js -m anthropic/claude-3.5-sonnet
```

#### Local mode

The local mode uses a pre-trained language model to deobfuscate the code.

1. Download the model (only needed once):

```shell
npx humanify download 2b
```

2. Run the tool:

```shell
npx humanify local file.js
```

You can use the `-m` flag to specify a different model (e.g. `8b`):

```shell
npx humanify local file.js -m 8b
```

Humanify has native support for Apple's M-series chips.

#### OpenAI

To use OpenAI's models (like `gpt-4o-mini`):

1. Set the `OPENAI_API_KEY` environment variable.
2. Run the tool:

```shell
export OPENAI_API_KEY=your_key
npx humanify openai file.js
```

#### Google Gemini

To use Google's Gemini models (like `gemini-1.5-flash`):

1. Set the `GEMINI_API_KEY` environment variable.
2. Run the tool:

```shell
export GEMINI_API_KEY=your_key
npx humanify gemini file.js
```

## Features

The main features of the tool are:
* Uses ChatGPT functions/local models to get smart suggestions to rename
  variable and function names
* Uses custom and off-the-shelf Babel plugins to perform AST-level unmanging
* Uses Webcrack to unbundle Webpack bundles

## Contributing

If you'd like to contribute, please fork the repository and use a feature
branch. Pull requests are warmly welcome.

## Licensing

The code in this project is licensed under MIT license.
