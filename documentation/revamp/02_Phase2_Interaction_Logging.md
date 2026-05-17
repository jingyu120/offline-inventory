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

### 3. Immutable Logging & Metadata
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

## User Story: The Field Rep
> "As a field rep, I just finished a call. I want to log the 'Order Placed' and the 3 products they bought in 3 taps, snap a quick screenshot of the order confirmation in Viber, and be done, so I can move to the next shop."
