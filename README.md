# ollama-vertex-ai

[![Latest version](https://img.shields.io/npm/v/ollama-vertex-ai)
 ![Dependency status](https://img.shields.io/librariesio/release/npm/ollama-vertex-ai)
](https://www.npmjs.com/package/ollama-vertex-ai)

REST API proxy to [Vertex AI] with the interface of [ollama]. HTTP server for accessing Vertex AI via the REST API interface of ollama.

**WARNING**: This project is in a frozen state for the time being. The active project with the same functionality and more is [ovai].

## Synopsis

Get embeddings for a text:

```
❯ curl localhost:22434/api/embeddings -d '{
  "model": "textembedding-gecko@003",
  "prompt": "Half-orc is the best race for a barbarian."
}'

{ "embedding": [0.05424513295292854, -0.023687424138188362, ...] }
```

## Setup

Make sure that you have installed [Bun] 1.1.17 or newer.

1. Download a JSON file with your Google account key from Google Project Console and save it to the current directory under the name `google-account.json`.
2. Optionally create a file `model-defaults.json` in the current directory to change the [default model parameters].
3. Run the server:

```
❯ bunx ollama-vertex-ai

Listening on http://localhost:22434 ...
```

### Configuring

The following properties from `google-account.json` are used:

```json
{
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "scope": "https://www.googleapis.com/auth/cloud-platform", // optional, can be missing
  "auth_uri": "https://www.googleapis.com/oauth2/v4/token"   // optional, can be missing
}
```

Set the environment variable `PORT` to override the default port 22434.

Set the environment variable `DEBUG` to one or more strings separated by commas to customise logging on `stderr`. The default value is `ovai` when run on the command line and `ovai:srv` inside the Docker container.

| `DEBUG` value | What will be logged                                              |
|:--------------|:-----------------------------------------------------------------|
| `ovai`        | important information about the bodies of requests and responses |
| `ovai:srv`    | methods and URLs of requests and status codes of responses       |
| `ovai:net`    | requests forwarded to Vertex AI and received responses           |
| `ovai,ovai:*` | all information above                                            |

### Docker

For example, run a container for testing purposes with verbose logging, deleted on exit, exposing the port 22434:

    docker run --rm -it -p 22434:22434 -e DEBUG=ovai,ovai:* \
      -v ${PWD}/google-account.json:/usr/src/app/google-account.json \
      ghcr.io/prantlf/ollama-vertex-ai

For example, run a container named `ollama-vertex-ai` in the background with custom defaults, exposing the port 22434:

    docker run --rm -dt -p 22434:22434 --name ollama-vertex-ai \
      -v ${PWD}/google-account.json:/usr/src/app/google-account.json \
      -v ${PWD}/model-defaults.json:/usr/src/app/model-defaults.json \
      ghcr.io/prantlf/ollama-vertex-ai

And the same task as above, only using Docker Compose (place [docker-compose.yml] to the current directory) to make it easier:

    docker-compose up -d

### Building

Make sure that you have installed [Bun] 1.1.17 or newer.

    git clone https://github.com/prantlf/ollama-vertex-ai.git
    cd ollama-vertex-ai
    bun i -y
    bun run build
    bun run test
    bum start

Executing `bum start` will require the `google-account.json` file in the current directory.

## API

See the original [REST API documentation] for details about the interface.

### Embeddings

Creates a vector from the specified prompt. See the available [embedding models].

```
❯ curl localhost:22434/api/embeddings -d '{
  "model": "textembedding-gecko@003",
  "prompt": "Half-orc is the best race for a barbarian."
}'

{ "embedding": [0.05424513295292854, -0.023687424138188362, ...] }
```

The returned vector of floats has 768 dimensions.

### Text

Generates a text using the specified prompt. See the available [bison text models] and [gemini chat models].

```
❯ curl localhost:22434/api/generate -d '{
  "model": "gemini-1.5-pro-preview-0409",
  "prompt": "Describe guilds from Dungeons and Dragons.",
  "stream": false
}'

{
  "model": "gemini-1.5-pro-preview-0409",
  "created_at": "2024-05-10T14:10:54.885Z",
  "response": {
    "role": "assistant",
    "content": "Guilds serve as organizations that bring together individuals with ..."
  },
  "done": true,
  "total_duration": 13884049373,
  "load_duration": 0,
  "prompt_eval_count": 7,
  "prompt_eval_duration: 3471012343,
  "eval_count: 557,
  "eval_duration: 10413037030
}
```

The property `stream` has to be always set to `false`, because the streaming mode isn't supported. The property `options` is optional with the following defaults:

```
"options": {
  "num_predict": 8192,
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40
}
```

### Chat

Replies to a chat with the specified message history. See the available [bison chat models] and [gemini chat models].

```
❯ curl localhost:22434/api/chat -d '{
  "model": "gemini-1.0-pro",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert on Dungeons and Dragons."
    },
    {
      "role": "user",
      "content": "What race is the best for a barbarian?"
    }
  ],
  "stream": false
}'

{
  "model": "gemini-1.0-pro",
  "created_at": "2024-05-06T23:32:05.219Z",
  "message": {
    "role": "assistant",
    "content": "Half-Orcs are a strong and resilient race, making them ideal for barbarians. ..."
  },
  "done": true,
  "total_duration": 2325524053,
  "load_duration": 0,
  "prompt_eval_count": 9,
  "prompt_eval_duration: 581381013,
  "eval_count: 292,
  "eval_duration: 1744143040
}
```

The property `stream` has to be always set to `false`, because the streaming mode isn't supported. The property `options` is optional with the following defaults:

```
"options": {
  "num_predict": 8192,
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40
}
```

### Ping

Checks that the server is running.

```
❯ curl -f localhost:22434/api/ping -X HEAD
```

### Shutdown

Gracefully shuts down the HTTP server and exits the process.

```
❯ curl localhost:22434/api/shutdown -X POST
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Lint and test your code.

## License

Copyright (C) 2024 Ferdinand Prantl

Licensed under the [MIT License].

[MIT License]: http://en.wikipedia.org/wiki/MIT_License
[Vertex AI]: https://cloud.google.com/vertex-ai
[ollama]: https://ollama.com
[ovai]: https://github.com/prantlf/ovai
[Bun]: https://bun.sh
[default model parameters]: ./model-defaults.json
[docker-compose.yml]: ./docker-compose.yml
[REST API documentation]: https://github.com/ollama/ollama/blob/main/docs/api.md
[embedding models]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings#model_versions
[bison text models]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text#model_versions
[bison chat models]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-chat#model_versions
[gemini chat models]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini#model_versions
