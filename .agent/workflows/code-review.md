---
description: Comprehensive security and quality review of uncommitted changes.
---

# Code Review Workflow

This workflow performs a security and quality review of the current uncommitted changes.

## Steps

1.  **Identify Changed Files**: Use `git status` or `git diff --name-only` to see what has changed.
// turbo
2.  **Analyze Changes**: Read the content of changed files.
3.  **Check for Security Issues (CRITICAL)**:
    *   Hardcoded credentials/secrets.
    *   SQL Injection / XSS.
    *   Missing input validation.
4.  **Check for Code Quality (HIGH)**:
    *   Functions too long (> 50 lines).
    *   Deep nesting (> 4 levels).
    *   Missing error handling.
    *   Leftover `console.log`.
5.  **Report Findings**:
    *   List any issues found with Severity (CRITICAL, HIGH, MEDIUM).
    *   Suggest fixes.
    *   **If CRITICAL/HIGH issues exist**: Recommend blocking the commit until fixed.

## Example

> User: /code-review

**Agent Action**:
1.  Run `git diff`.
2.  Report:
    *   [CRITICAL] `api.ts`: API Key hardcoded on line 12.
    *   [HIGH] `utils.ts`: Function `processData` is 120 lines long.
3.  Recommendation: Fix the API key immediately.
