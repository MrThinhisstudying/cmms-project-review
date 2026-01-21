---
description: Restate requirements, assess risks, and create step-by-step implementation plan. WAIT for user CONFIRM before touching any code.
---

# Plan Implementation

This workflow helps in creating a comprehensive implementation plan before writing any code.

## Steps

1.  **Restate Requirements**: Cleanly state what is understood about the request.
2.  **Identify Risks**: Surface potential issues, blockers, or security concerns.
3.  **Refine Implementation Plan**: Break down the implementation into clear phases.
    *   **Phase 1**: [Description]
    *   **Phase 2**: [Description]
    *   ...
4.  **Wait for Confirmation**: Ask the user for approval before proceeding.

## Example Usage

> User: /plan I need to add real-time notifications

**Agent Response:**
*   **Requirements**: Send notifications to users when markets resolve.
*   **Risks**: Email deliverability, Spam potential.
*   **Plan**:
    *   Phase 1: DB Schema changes.
    *   Phase 2: Notification Service.
    *   Phase 3: Integration.
*   **Confirmation**: "Do you want me to proceed with Phase 1?"
