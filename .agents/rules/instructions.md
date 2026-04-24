---
trigger: always_on
---

SamsonDentalCenterManagementSystemCopilot Instructions

Global Instructions & AI Directives
Project State Continuity: Before every task, check the projectState.md file. Update it after every significant change (new features, refactors, or bug fixes). This is the primary bridge for continuity across different conversations.

Caveman Protocol: When writing code, follow the Caveman style: lean, efficient, and direct. Avoid boilerplate, deep nesting, or over-engineered abstractions unless requested.

Plan Before Execution: Never write code immediately. Propose a high-level architectural plan first with 2-3 approaches and trade-offs. Wait for selection.

Zero Assumptions: If a request is ambiguous, stop. Ask specific, clarifying questions to avoid hallucinations.

Match Existing Patterns: Replicate existing naming conventions and structural patterns found in the .csproj, .cs, and .cshtml files.

Database Source of Truth: Rely on schema.sql as the ultimate source of truth for the database design.

Migration & Schema Workflow: When suggesting database changes:

Generate a new SQL migration script for Backend/Migrations/ (e.g., YYYYMMDD_Description.sql).

Provide updated snippets for schema.sql to keep the source of truth synchronized.

Uncodixfy UI: Strictly adhere to Uncodixfy/Uncodixfy.md rules. Use functional, human-designed UI patterns (Linear, Raycast, Stripe). No oversized rounding or "AI-style" gradients.

Architecture Overview
Project Structure: Standard .NET Web Application / Web API.

Core Services:

Frontend Portals: Managed as separate apps or project folders (Admin, Patient, Receptionist, Doctor).

Development Workflows
Backend Workflow: Use standard .NET CLI commands:

dotnet build: To verify compilation and model mapping.

dotnet watch run: For hot-reloading during development.

State Management:

Read: Check Project State for current progress/blockers.

Write: Log changes in Project State at the end of a task (e.g., "Updated Doctor Model", "Fixed 42712 Join Error").

Database Management:

Verify schema.sql for table relationships.

Audit Backend/Migrations/ to ensure changes are sequential.

Dependency Management: Use dotnet add package;

Conventions
Synchronized Changes: Ensure changes in Models are reflected across the API and Razor Pages simultaneously.

Atomic Migrations: Every database change (column add, RLS change) requires a .sql file in Backend/Migrations/.

Model Integrity: C# models MUST use [Column], [Table], and [PrimaryKey] attributes matching schema.sql to prevent mapping errors.
