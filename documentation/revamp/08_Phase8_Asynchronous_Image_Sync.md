# PRD: Phase 8 - Asynchronous Image Sync

## Goal

Ensure reliable offline-first image uploads (e.g. proof-of-work Viber screenshots) without blocking core text-based metadata synchronization. This protects reps from sync failures and limits cellular data costs by decoupling image binaries from JSON payloads.

---

## 1. Core Requirements

### A. Metadata-First Sync

- When a representative performs a database sync, text data (Shops, Contacts, SKUs, and Interaction logs) is compiled and pushed immediately.
- Large image binary data is excluded from the primary JSON payload. Instead, interaction logs reference a unique placeholder file name or image key (`imageKey`).

### B. Client-Side Background Queue

- Images are stored in the device's local filesystem (`FileSystem.documentDirectory` on mobile, or IndexedDB blobs on web).
- A local WatermelonDB queue (`pending_uploads`) records pending transfers.
- A background worker uploads files one-by-one to a dedicated endpoint (`POST /api/sync/upload-image`).
- Support automatic retry with exponential backoff if the cellular link drops.
- Option to toggle **"WiFi-Only Sync"** in settings to conserve expensive mobile data packages.

### C. Server-Side Asset Storage

- The sync server receives image files, validates their signatures, and writes them to local storage or an S3-compatible cloud bucket.
- The server associates the uploaded image filename with the matching `InteractionLog` record using the shared `imageKey`.

---

## 2. Relational Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Update `InteractionLog` to support an image key and create a mapping for uploaded files:

```prisma
model InteractionLog {
  id             String   @id @default(uuid())
  // ... other fields ...
  imageKey       String?  @map("image_key") // Unique filename or S3 key
  imageSynced    Boolean  @default(false) @map("image_synced")

  // Relations ...
}
```

### B. WatermelonDB Client Schema Extensions

Add the `pending_uploads` queue table:

```typescript
// Client-side schema update
tableSchema({
  name: 'pending_uploads',
  columns: [
    { name: 'file_path', type: 'string' },
    { name: 'target_table', type: 'string' },
    { name: 'target_record_id', type: 'string' },
    { name: 'retry_count', type: 'number' },
    { name: 'wifi_only', type: 'boolean' },
    { name: 'created_at', type: 'number' },
  ],
});
```

---

## 3. Implementation Steps

1. **Client Filesystem Bridge**: Save captured photos or screenshots directly to the persistent application document directory and register them in the `pending_uploads` table.
2. **Dedicated Upload API**: Implement a NestJS controller action `POST /api/sync/upload-image` that accepts `multipart/form-data` uploads containing the file binary and its `imageKey`.
3. **Decoupled Sync Loop**:
   - Step 1: Run normal sync (pull/push text JSON).
   - Step 2: Query the local `pending_uploads` table.
   - Step 3: Loop through and upload files using a background thread, updating `imageSynced` in the local DB on success and cleaning up the queue.
4. **Retry & Network Guard**: Wrap the image sync loop inside network state listener callbacks. Halt uploads immediately if the connection is lost or if the device is on metered mobile data and "WiFi-Only" is enabled.
