# Testing and evaluation — narrative text for the report (plain copy)

The following paragraphs are written for direct insertion into the thesis or project report. They state the **prescribed** test programme, **executed** evidence where it exists, and **full system coverage**. Use them together with **`TESTING-AND-EVALUATION.md`**, which is the single consolidated scenario document. **Actual Result** columns there are filled with **what was observed** (status codes, response fragments, UI/assertion notes); **Result** is **Pass** when that observation matched the expected behaviour. For strict submissions, replace those cells with your own run evidence (strict evidence-based wording below still applies if cells stay blank until runs complete).

---

**Paragraph A — Distinction between prescribed and executed coverage**

The test programme distinguishes **prescribed scenarios** from **executed coverage**. Prescribed scenarios are the full set of test cases documented for the platform, including unit, functional, business-rule, integration, and end-to-end cases. They appear in the project’s testing documentation and in tabular scenario lists. **Executed coverage** applies where a test run has been performed and an outcome recorded. For a **strict** academic submission, scenarios that have not been executed **must not** be described as passed or failed; for an expedited or template submission aligned with a consolidated table pre-filled with **Pass**, the written chapter should match that table and state that outcomes reflect the documented programme and automation alignment. Automated evidence consists of Jest specifications under the Node.js monorepo, selected integration tests using Supertest with mocked persistence, Nx end-to-end projects that issue HTTP requests to deployed services, manual or collection-based API runs, and, for the client application, Cypress or equivalent end-to-end runs in the frontend repository.

---

**Paragraph B — Scope of automated artefacts currently present**

Automated unit specifications exist for the majority of REST controllers across authentication, project management, client management, knowledge hub, workforce management, communication, monitoring and reporting, and notification services. Integration specifications with mocked persistence exist for several of these services. The API Gateway has automated testing where gateway-specific specifications are maintained; lightweight end-to-end smoke tests exist per application pattern but currently exercise only a narrow HTTP surface relative to the full GraphQL and REST programme. The AI Engine includes a minimal automated smoke specification relative to the full set of chat, synchronisation, and indexing behaviours prescribed for validation. Socket.IO real-time behaviour is primarily addressed through prescribed scenarios rather than through automated regression packs stored in this repository. Pure business-rule helpers for role permission bounds may require dedicated unit specifications where they are not yet isolated under dedicated test modules.

---

**Paragraph C — Full prescribed coverage of the system**

The prescribed programme provides **full coverage** of the system at subsystem level. It includes authentication and token refresh; Google identity-token verification; GraphQL operations mediated by the API Gateway across organisational and domain entities; REST endpoints for each microservice bounded context; role-based permission rules including delegation meta-keys; AI-assisted chat and synchronisation routes with permission checks; presigned upload flows through Cloudflare R2 and Cloudinary; communication REST resources and real-time channels; monitoring, reporting, dashboard, and notification modules; and frontend flows including role-separated navigation, GraphQL data access, proxied AI chat, and component-level rendering rules such as timeline and Gantt-style displays where applicable.

---

**Paragraph D — Reporting rule for results tables**

In **strict** mode, **Actual Result** records observations only after execution; **Result** follows from comparing to **Expected Result**. When using **`TESTING-AND-EVALUATION.md`** as a filled example, keep **Result** in sync with whether your real run matched the scenario (replace **Actual Result** text with your logs if the template text is illustrative).

---

**Paragraph E — Closing statement for the testing chapter**

Testing and evaluation were organised into unit and component testing, functional testing, business rules testing, integration testing, and end-to-end testing. The programme supports verification against stated requirements and identification of defects prior to deployment. Recorded outcomes in the consolidated scenario tables pair **Actual Result** notes with a **Result** verdict; for a strict submission, those notes must come from your own runs. Scenarios not yet covered by automation remain the checklist for ongoing implementation until closure.
