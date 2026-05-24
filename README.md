# UI Morph

Configurable UI for B2B SaaS, without a release for every customer request.

## About

Every account wants the product arranged differently. Those asks pile up as layout tickets: hide a panel, reorder a dashboard, match how one team works.

UI Morph embeds in your product. Users describe changes to the layout agent in chat and see them applied on the page. They can also edit directly (visibility, copy, styles, section order). Layouts save per user and per view.

You define what is in scope. Shell, navigation, and admin stay on your side. Production deployment is handled with you; this repo is for local evaluation.

## Setup

Node 18+, pnpm 9+, Docker.

```bash
pnpm install
cp api/.env.example api/.env   # GEMINI_API_KEY for the layout agent
make all                       # or: pnpm dev:all
```
