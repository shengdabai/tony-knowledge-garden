# tony-knowledge-garden

🌱 Tony's public digital garden — bilingual notes on AI, Chinese teaching & learning science. Built with Quartz.

## Business Context

- **Category:** education product
- **Audience:** learners, teachers, parents, and education operators who need a clearer learning or exam-prep workflow.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** ai, chinese-teaching, digital-garden, knowledge-base, learning, notes, obsidian, quartz

## What This Project Is For

- 🌱 Tony's public digital garden — bilingual notes on AI, Chinese teaching & learning science. Built with Quartz.
- Give users a concrete learning workflow instead of a loose collection of content.
- Make practice, feedback, review, or recommendation steps easier to repeat.

## Where It Fits

This repository supports productized learning workflows: diagnostic input, guided practice, review loops, and clearer handoff between learner, teacher, and software.

## Technical Overview

- **Primary language:** TypeScript
- **Detected stack:** TypeScript, Node.js, Docker
- **Default branch:** `v4`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `docs`
- `content`
- `.node-version`
- `.prettierignore`
- `.prettierrc`
- `CODE_OF_CONDUCT.md`
- `Dockerfile`
- `LICENSE.txt`
- `README.md`
- `SECURITY.md`
- `globals.d.ts`
- `index.d.ts`

## Quick Start

Use the commands that match the current project state:

```bash
npm install
npm run check
npm run test
```

| Command | Purpose |
|---|---|
| `npm install` | Install project dependencies. |
| `npm run check` | tsc --noEmit && npx prettier . --check |
| `npm run test` | tsx --test |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current and do not rely on private machine state.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.
