# Utility Scripts (`scripts`)

This directory contains key shell scripts to manage the local development lifecycle, database migrations, code validation gates, and environment cleanups.

---

## 📂 Available Scripts

### 1. [`clean-setup.sh`](./clean-setup.sh)

- **Purpose**: Destructively resets the project to a clean starting state.
- **Use Case**: Run this if you change branches with major database schema changes, encounter NPM dependency conflicts, or need a fresh seed of the local Postgres database.
- **Actions Performed**:
  1. Stops the PostgreSQL Docker container and **deletes its Docker volume** (wiping all local data).
  2. Wipes `node_modules/`, `dist/`, `.nx/`, and `tmp/` directories.
  3. Re-installs all project and workspace dependencies cleanly (`npm install`).
  4. Restarts the PostgreSQL database container.
  5. Applies the database schemas and generates Prisma client references.
  6. Rebuilds the packages.
- **Execution**:
  ```bash
  ./scripts/clean-setup.sh
  ```

### 2. [`db.sh`](./db.sh)

- **Purpose**: A command wrapper managing local Postgres and Prisma operations. Specifically designed to bypass direct schema push limits on Mac Docker setups.
- **Commands**:
  - `up`: Spin up the PostgreSQL Docker container in detached mode.
  - `down`: Stop the PostgreSQL Docker container.
  - `reset`: Drop the database, recreate it, apply migrations, and run the seed script.
  - `seed`: Seeds the database with default master data (users, regions, SKUs, shops).
  - `migrate <name>`: Create a new migration and apply it to the database.
- **Execution**:
  ```bash
  ./scripts/db.sh [up|down|reset|seed|migrate]
  ```

### 3. [`precommit.sh`](./precommit.sh)

- **Purpose**: Local code quality checker acting as the Git pre-commit verification gate.
- **Checks Executed**:
  1. **Formatting**: Checks code styling compliance using `nx format:check`.
  2. **Type Checking**: Runs TypeScript checks across packages to ensure type safety.
  3. **Linting**: Verifies code quality against project ESLint definitions using `nx lint`.
  4. **Tests**: Runs Jest unit and regression tests.
- **Execution**:
  ```bash
  ./scripts/precommit.sh
  ```

### 4. [`start-dev.sh`](./start-dev.sh)

- **Purpose**: A developer helper script that starts the database, sync server, and Expo client.
- **Execution**:
  ```bash
  ./scripts/start-dev.sh
  ```
