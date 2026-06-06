# NoA Core

NoA is the visual desktop interface for Noah, the spoken Noetic Advisor.

This is the Windows and Mac desktop foundation for the NoA ecosystem.

## Includes

- Electron desktop shell
- React + TypeScript + Vite app
- Premium NoA command centre UI
- Dashboard, Chat, Integrations, Network and Settings screens
- GitHub Releases update plumbing through `electron-updater`
- Windows NSIS and Mac DMG packaging config

## Development

```bash
npm install
npm run dev
```

## Build installers

```bash
npm run dist
```

## Notes

For early alpha, app icons are intentionally not configured yet so installer builds do not fail because of missing icon files.
