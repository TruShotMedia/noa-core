# NoA Core - Alpha 1.3

NoA is the visual desktop interface for Noah, the spoken Noetic Advisor.

## Alpha 1.3 adds

- Knowledge Graph foundation
- New Knowledge screen
- Entity extraction from live Notion tasks and jobs
- Relationship mapping between clients, jobs, tasks, statuses and time buckets
- Chat intent for knowledge graph questions
- Diagnostics for entity and relationship counts

## Run

```bash
npm install
npm run dev
```

For local network/tablet testing:

```bash
npm run dev:lan
```


## Alpha 1.3 - Voice Foundation

- Adds a Voice screen for manual speech capture.
- Adds text-to-speech playback for Noah responses.
- Adds optional auto-read aloud mode.
- Stores voice preferences locally.
- Adds voice status handling in the tool router.

Always-on wake-word detection is intentionally deferred to a later local audio service so NoA remains stable and privacy-conscious during alpha development.
