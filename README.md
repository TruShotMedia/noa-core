# NoA Core

NoA is the visual desktop interface for Noah, the spoken Noetic Advisor.

## Alpha 0.4

Adds the OpenAI Brain Layer on top of the local Tool Engine.

- Local tools still run first
- OpenAI can now explain/format tool outputs
- Settings screen can save and test the API key
- Electron main process handles OpenAI requests via IPC

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist
```
