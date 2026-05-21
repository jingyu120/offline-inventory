# PRD: Phase 2 - High-Friction Interaction Logging

## Goal

Replace fragmented Viber group chats with a structured, 30-second mobile logging workflow that captures high-quality market intelligence and proof of work.

## Scope

### 1. The Interaction Form (Mobile Optimized)

- **Searchable Shop Selector**: Fast lookup of shops.
- **Triage Buttons**: Large touch targets for [ Phone Call ] [ Viber ] [ Shop Visit ].
- **Commercial Status**: [ Followed Up ] [ Interested ] [ Order Placed ] [ Not Interested ].
- **Smart SKU Tagging**: Multi-select product interests from the master SKU ledger.
- **Conditional Logic**:
  - If "Order Placed": Show numerical "Volume" field.
  - If "Interested" / "Not Interested": Enforce 20-character minimum in "Market Intelligence" notes.

### 2. Viber Integration (Myanmar Market Context)

- **Viber Proof Upload**: Mandatory screenshot upload for Viber-type interactions.
- **Image Compression**: Auto-compress screenshots to <200KB before local save to preserve storage.
- **Viber Deep-Linking**: "Open in Viber" button that launches the chat thread for the specific shop owner's number.

### 3. Gemma 4 AI Copilot Integration (Zero-Friction Logging)

- **Voice/Unstructured Text Parser**: Reps can speak or type an unstructured note (supporting mixed Burmese, English, and local slang). Gemma 4 will parse it to auto-extract:
  - **Commercial Status**: Auto-triage to the matching status.
  - **SKU Interests**: Extract mentioned products from the master ledger.
  - **Volume & Quantities**: Extract any ordering values.
- **Multimodal Viber Screenshot OCR**: When a Viber screenshot is uploaded, Gemma 4 is used to cross-verify the image text against the logged order quantities, flag price anomalies, and extract handwritten/typed billing info.

### 4. Immutable Logging & Metadata

- **Local Timestamping**: Capture `created_at_local` at the exact moment of "Save".
- **Immutable Audit**: Once saved, core log details (status, volume, timestamp) cannot be edited by the rep.
- **Offline Flag**: Silently tag entries created while offline.

## Success Metrics

- **Adoption**: Average log completion time < 30 seconds.
- **Quality**: 100% of "Interested" logs contain descriptive market intelligence.
- **Compliance**: Viber screenshots present for all "Viber" interaction types.

## Technical Requirements

- **Camera/Gallery Access**: Expo ImagePicker integration.
- **Image Processing**: Client-side resizing/compression using `expo-image-manipulator`.
- **Deep Linking**: `expo-linking` using `viber://` schema.
- **Backend AI Processing (Zero Client Overhead)**: Gemma 4 runs completely on the NestJS backend to prevent memory/CPU starvation or battery drain on low-end mobile devices. The client pushes clean strings or compressed images, and the backend returns structured responses.

## User Story: The Field Rep

> "As a field rep, I just finished a call. I want to log the 'Order Placed' and the 3 products they bought in 3 taps, snap a quick screenshot of the order confirmation in Viber, and be done, so I can move to the next shop."

---

## Current Status & Progress - **100% Completed**

- **Interaction logging Screen UI**: Designed a mobile-optimized logging workflow (`InteractionLoggingScreen.tsx`) supporting searchable shop selectors, conditional status inputs, Viber screenshot uploads, and SKU tagging.
- **Client-Side Viber screenshot compression**: Leveraged `expo-image-manipulator` to automatically resize and compress screenshot uploads, keeping local database records light.
- **Viber deep-linking**: Implemented deep-linking utilizing the Viber application protocol scheme to jump directly into chat threads with shop contacts.
- **Gemma 4 unstructured parsing**: Engineered a server-side Gemma 4 processing service (`parse-note`) that processes mixed notes to auto-triage status, volumes, and SKUs.
- **Viber Vision OCR Verification**: Implemented a server-side Gemma 4 vision model endpoint (`verify-screenshot`) to verify screenshots and extract confirming texts.
