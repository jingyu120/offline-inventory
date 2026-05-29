# Utility Scripts (`scripts`)

This directory contains shell scripts to manage the local development lifecycle, database operations, pre-commit checks, and development server startup.

---

## 📂 Available Scripts

### 1. [`setup.sh`](./setup.sh)

- **Purpose**: Unified script that initializes a new developer environment or performs a complete reset. Automatically detects and works with both **Docker** and **Podman** engines cleanly.
- **Modes**:
  - **Standard Setup (Default)**: Non-destructive, idempotent system initialization. Ensures node dependencies, starts containerized databases (PostgreSQL & Redis), waits for availability, applies schema, seeds master data, and performs initial build.
    ```bash
    ./scripts/setup.sh
    # or
    npm run setup
    ```
  - **Destructive Reset (`--reset` / `-r`)**: Wipes local databases, persistent container volumes, clears NPM cache, deletes `node_modules` and lock files, and performs a complete fresh installation and seed.
    ```bash
    ./scripts/setup.sh --reset
    # or
    npm run clean-setup
    ```

### 2. [`db.sh`](./db.sh)

- **Purpose**: Command-line wrapper managing local database operations (Postgres + Drizzle). Leverages container auto-detection (Docker or Podman) dynamically.
- **Commands**:
  - `ensure` - Start database containers if not running.
  - `wipe`   - Drop and recreate the `public` database schema.
  - `push`   - Push Drizzle schema migrations and seed master dataset.
  - `reset`  - Complete wipe + push + seed sequence.
  - `fresh`  - Ensure containers are active and execute a full reset.
- **Execution**:
  - ```bash
    ./scripts/db.sh [ensure|wipe|push|reset|fresh]
    ```

### 3. [`precommit.sh`](./precommit.sh)

- **Purpose**: Local code quality check that runs automatically prior to Git commits.
- **Checks Executed**:
  1. **Formatting**: Checks and stages clean code formatting using `nx format:write`.
  2. **Type Checking**: Verification of TypeScript structures across all monorepo packages.
  3. **Linting**: Runs ESLint compliance checks across the workspace.
  4. **Tests**: Verifies code via Jest unit and regression tests.
- **Execution**:
  ```bash
  ./scripts/precommit.sh
  ```

### 4. [`start-dev.sh`](./start-dev.sh)

- **Purpose**: Checks ports, ensures database services are running, runs Nodemon/NestJS for backend watch compilation, and boots the Expo Metro bundler for frontend hot reloading.
- **Execution**:
  ```bash
  ./scripts/start-dev.sh
  # or
  npm run dev
  ```
