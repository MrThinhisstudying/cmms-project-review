---
description: Enforce test-driven development workflow. Scaffold interfaces, generate tests FIRST, then implement minimal code to pass.
---

# TDD Workflow

This workflow enforces the Test-Driven Development (TDD) methodology.

## Steps

1.  **Scaffold Interfaces**: Define the types and interfaces for the new feature or function first.
2.  **Generate Tests (RED)**: Create a test file. Write tests that fail because the implementation does not exist yet.
    *   *Action*: Create a new test file (e.g., `feature.test.ts`).
    *   *Action*: Run the test command to confirm failure.
3.  **Implement Minimal Code (GREEN)**: Write just enough code to make the tests pass.
    *   *Action*: Create/Edit the implementation file.
    *   *Action*: Run the test command to confirm success.
4.  **Refactor (REFACTOR)**: Improve the code structure while keeping tests green.
5.  **Verify Coverage**: Check if test coverage is above 80%.

## Example Usage

> User: /tdd I need a function to calculate market liquidity score

**Agent Action:**
1.  Create `lib/liquidity.ts` with interface only.
2.  Create `lib/liquidity.test.ts` with failing tests.
3.  Run `npm test` (or equivalent) -> FAIL.
4.  Implement logic in `lib/liquidity.ts`.
5.  Run `npm test` -> PASS.
