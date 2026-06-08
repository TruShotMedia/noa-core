# NoA Alpha 0.8 - Persistence, Security & Dev Reliability

This is a patch update. Copy the contents of this folder into your existing NoA repo and replace matching files.

## Adds

- Version bump to 0.8.0-alpha.1
- `npm run dev` now uses localhost only
- `npm run dev:lan` exposes Vite on your local network for tablets/other computers
- OpenAI key remains saved between launches
- Key is never returned to the renderer in full - only masked status is exposed
- Diagnostics now includes settings path, writable status, masked key state and dev URL
- Memory lookup routing fix: "what do you remember" no longer gets treated as a remember command
- More human Noah system prompt
- Alpha 0.8 local fallback messages

## Install

```powershell
cd C:\Users\matth\Documents\noa-core\noa-core
```

Copy these files into the project, choose Replace, then:

```powershell
npm install
npm run dev
```

For tablet access:

```powershell
npm run dev:lan
```

Then visit:

```text
http://YOUR_WINDOWS_IP:5173
```

## Commit

```powershell
git add .
git commit -m "NoA Alpha 0.8 - Persistence and dev reliability"
git push
```
