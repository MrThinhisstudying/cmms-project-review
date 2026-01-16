# Production Deployment & Maintenance Guide

## 1. Environment Setup

**WARNING**: Due to dependency conflicts between Material UI (legacy) and React 18 / Ant Design v5, strict peer dependency checks must be disabled during installation.

### Command
```bash
npm install --legacy-peer-deps
```

*   **Why?**: The project still contains some transitive dependencies from the removal of MUI that conflict with the clean React 18 installation required for Ant Design 5.
*   **Pipeline Config**: Ensure your CI/CD pipeline (Jenkins, GitHub Actions, Dockerfile) uses this flag.

---

## 2. Database Migration

Production migrations must run against the compiled JavaScript files in the `dist` directory, not the raw TypeScript files.

### Steps
1.  **Build the project**:
    ```bash
    npm run build
    ```
2.  **Run Migrations**:
    ```bash
    # Ensure environment variables (DB_HOST, DB_USER, etc.) are set
    npx typeorm migration:run -d dist/data-source.js
    ```

*   **Note**: The `data-source.ts` is configured to look for migrations in `dist/migrations/*.js` when not in a development environment.

---

## 3. Migration Compatibility Fix (Critical)

To resolve **ESM (ECMAScript Module) vs CJS (CommonJS)** runtime errors in the NestJS/TypeORM environment, a specific coding standard has been applied to all migration files.

### The Fix
1.  **Remove `implements MigrationInterface`**: TypeORM's migration loader relies on structure (duck typing) rather than strict class implementation at runtime, which avoids module resolution issues.
2.  **Use `import type`**: For Types that are not Values.

### Example Pattern
**DO NOT revert to the old style.**

```typescript
// ✅ CORRECT (Current Production Standard)
import type { MigrationInterface, QueryRunner } from "typeorm"; // Note "import type"

export class RefactorFinalSchema1764000000000 { // No "implements"
    public async up(queryRunner: QueryRunner): Promise<void> {
        // ...
    }
    // ...
}
```

```typescript
// ❌ INCORRECT (Will cause Runtime "SyntaxError")
import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorFinalSchema1764000000000 implements MigrationInterface {
   // ...
}
```

---

## 4. Cleanup & Architecture Standards

### Removed Components (MUI)
The entire Material UI (MUI) library has been removed. **Do not re-install `@mui/material` or `@mui/icons-material`.**

### Frontend Standards (Ant Design)
*   **Icons**: Use `@ant-design/icons`.
*   **Layout**: Use `Row`, `Col`, `Space`, or CSS Flexbox/Grid.
*   **Styling**: Use `styled-components` or CSS Modules. Avoid inline styles where possible.
*   **Forms**: Use `Form`, `Form.Item` (AntD) instead of `TextField` (MUI).

---

## 5. Monitoring & Validation

### Audit Logging
The refactor from MUI to AntD changed how form values are collected. While E2E tests passed, edge cases in user input might exist.

**Recommendation**:
Monitor the `AuditLog` table (or application logs) specifically for `400 Bad Request` errors on **POST/PUT** endpoints for:
1.  `DevicesManagement` (Create/Update)
2.  `RepairsManagement` (Workflow transitions)

If `400` errors spike, it indicates that the AntD Form `onFinish` payload structure might slightly differ from what the backend DTO expects (e.g., `Date` objects vs ISO Strings, or `null` vs `undefined`).
