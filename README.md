# NOA Guardian

**"The exemplary citizen"** — a personal safety and civic intelligence assistant for Meta smart glasses.

Built for the **Meta Global AI Developer Hackathon 2026** (Oct 26 – Nov 4, 2026) · Indie track · *Build for Your World* theme · Application approved by Cerebral Valley on 2026-10-21.

## What it is

NOA Guardian turns a pair of smart glasses into a calm, trustworthy companion that watches over you in three ways. This prototype simulates the glasses with a phone: first-person camera plus voice in and out, running as a dependency-free PWA with a home gateway (the **Guardian Dock**). The architecture is **hybrid, and it says so**: alerts and the legal corpus are served from the user's own network; when a question or an image needs the cloud brain (Meta Model API), exactly that question or image is sent to Meta — nothing else, and never silently.

- **Guardian** — Safety alerts from official sources only (National Weather Service, USGS, NASA EONET) plus environment risk reading. Dispatch incidents with optional audio (CrimeRadar-style feeds) are an **integration under evaluation**, not a current capability — and unconfirmed dispatch reports are always distinguished from official alerts. Danger is defined by **zone and behavior, never by identity**. Zero facial recognition.
- **Citizen** — Voice legal intelligence with **citations and jurisdiction**, answered from a verified corpus of official sources (Pennsylvania statutes and the U.S. Code). Its rule is verifiable: **it answers only from retrieved fragments and cites them — and abstains when the corpus does not back an answer**. A citation shows where a claim comes from; answers stay close to the fragment's own text. Informational guidance, not legal advice.
- **Awareness** — Multimodal understanding of your surroundings (objects, signage, risks), hands-free, powered by Muse Spark vision and SAM 3.1 segmentation via the Meta Model API.

Scenario it is built for: a traffic stop at night, a contractor dispute at your door, an unfamiliar street in a new city — moments where a calm voice with real, cited information changes the outcome.

## Privacy by design (the differentiator)

- **Ephemeral by default**: frames, audio and location live in the session and are discarded; no personal content is kept by default, and the app has no user accounts or tracking. The only records are technical and minimized — the API budget log (model, date, usage, cost; no content) and, once pairing ships, pairing data — each documented in `docs/SECURITY-HARDENING.md`. Provider-side retention (Meta, the browser vendor) is outside the app's control and is not promised away.
- **What leaves the device, stated plainly**: official alert feeds receive only the area needed to fetch alerts; a question or photo sent to the cloud brain goes to the Meta Model API; the browser's speech recognition may process voice with the browser provider until the Dock's local speech lands — the UI says which path is active.
- **No facial identification, ever**: faces of bystanders may only be detected to be blurred in recorded or shared material.
- **Untrusted environment**: anything the camera sees or a document says is data, never instructions — it can be described, not obeyed. It cannot change permissions, reveal secrets or trigger tools.
- **Honesty labels**: anything mocked is labeled as mocked in the UI. No fabricated data, metrics or testimonials.
- **Keys live only on the server**, never in the client or the repo; API spend is logged today (`docs/BUDGET-LOG.md`); an enforced spend cap ships with the Day-2 Dock hardening, because a log alone does not stop spending.

## Status

- ✅ **Pre-sprint (declared prior work, see below)**: verified legal corpus (federal U.S. Code, PL 119-121 release point, and Pennsylvania: Attorney General tenant guide, consumer protection law UTPCPL, Wiretap Act, HICPA, traffic code), a 15-situation test bank, v1 prompts for the three modes, PWA scaffold, and **Guardian Dock v1** (alerts gateway + extractive, cited Citizen answers) with the listed test suites passing (15/15 structural cases, 10/10 Dock checks, 8/8 Guardian checks — functional QA, not a security certification).
- ✅ **Day 1 (Oct 26)**: Meta Model API verified with real calls from the owner's account — model list (Muse Spark 1.3, Muse Wonder 1.0, Muse Image 1.0, Muse Voice Transcribe, **SAM 3.1**), text chat and image understanding working, ~2–3.5 s latency, ≈ $0.002 per call at published rates (`docs/REPORTE-DIA-1.md`).
- ⏭️ **Sprint (Oct 27 – Nov 4)**: real SAM 3.1 segmentation for Awareness, Dock API hardening (pairing/auth, rate and size limits, enforced spend cap) with an adversarial test suite, hands-free voice loop, Citizen drafting with Muse Spark over the corpus fragments, field tests on the owner's phone, 3-minute demo video, submission before noon ET on Nov 4. Full board: `docs/TASKS.md`.

## How to run it

No dependencies, no build step:

```bash
cd noa-guardian
python3 -m http.server 8000
```

- **On the same computer**: open `http://localhost:8000` — camera and microphone work on localhost.
- **On a phone**: `localhost` is the phone itself, not your computer. Open the computer's LAN address (e.g. `http://192.168.1.x:8000`) — but browsers only enable camera and microphone in secure contexts, so real phone use needs an HTTPS endpoint (a local HTTPS tunnel or the Dock served over HTTPS); on plain LAN HTTP the app runs text-only and says so.

The Dock (alerts + cited Citizen answers) runs with Docker Compose from `dock/`; the PWA works standalone with clearly labeled fallbacks when the Dock is unreachable.

## Architecture

- **Client**: PWA — getUserMedia, Web Speech API, browser geolocation, service worker that never caches user data.
- **Brain**: Meta Model API — Muse Spark for multimodal reasoning *(verified Day 1: real text and image calls)*, SAM 3.1 for segmentation *(listed in the account; first call on Day 2)*, Muse Voice for transcription *(planned)*.
- **Guardian Dock**: a small dependency-free gateway on the user's own network — official alert feeds normalized and cached, Citizen answers extracted from the verified corpus with citations, and the bridge to the Meta Model API.
- **Access**: the phone reaches the Dock over the owner's private network (Tailscale); no public ports are opened. Private transport does not replace application authentication, which ships with the Day-2 hardening.
- **Citizen (RAG)**: official sources only, each with verified currency metadata (`docs/CONTRACTS.md` §3). No coverage means an honest "not covered", never a guess.

## Prior work declaration

Per the hackathon rules: the legal corpus, test bank, prompts, PWA scaffold and Dock v1 were built by the author **before** the Oct 26 kickoff, as pre-work, and are declared here as prior work. Everything from Oct 26 onward (Meta Model API integration, real SAM 3.1 awareness, voice loop, field tests, demo) is new work created during the event, tracked day by day in `docs/TASKS.md`.

## Who builds this

NOA Guardian is directed by its owner, **WD**, and built by **Noa**, his AI orchestrator — a single directing agent that plans, implements, tests and documents under his verdict. The development follows written interface contracts (`docs/CONTRACTS.md`), a decision log (`docs/DECISIONS.md`) and the hardening plan in `docs/SECURITY-HARDENING.md`; nothing ships without the owner's review, and every change is traceable in this repository.

The builder is not part of the product. When a person uses NOA Guardian, a single assistant — NOA — interprets requests and selects among the authorized tools (fetch official alerts, retrieve cited fragments, analyze one image), while the Dock enforces permissions and executes the bounded operations. NOA cannot grant itself permissions, execute commands or administer anything. Permissions are enforced by code, not by prompts.

## Ownership and license

A project by **WD** (Seal of Trust Services LLC). Released under the MIT License (see `LICENSE`) for the hackathon; the NOA Guardian name and branding remain the author's.
