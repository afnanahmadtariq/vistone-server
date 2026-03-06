Chapter 5: Testing and Evaluation

Once the system has been successfully developed, testing has to be performed to ensure that the system working as intended. This is also to check that the system meets the requirements stated earlier. Besides that, system testing will help in finding the errors that may be hidden from the user. The testing must be completed before it is deployed for use.

There are a few types of testing which include unit and component testing, functional testing, integration testing, and end-to-end (E2E) testing. You are required to perform each of these in-depth to ensure system quality.

Given the architecture of the system, testing is divided across the Next.js Frontend and the Node.js Backend.

5.1 Unit and Component Testing

Unit testing verifies the smallest testable components of the software (e.g., individual functions, methods, or components) in isolation. The purpose is to ensure that each unit performs as expected, independent of the full system.

- **Frontend (Next.js)**: Utilizes **Jest** for testing individual UI components, hooks, and utility functions in isolation.
- **Backend (Node.js)**: Utilizes **Jest** for testing isolated backend business logic, API gateways, validation scripts, and controllers.

Unit Testing 1: Backend API Gateway AI Response Handler
Testing Objective: To ensure the API gateway formats AI engine responses correctly with valid and invalid inputs.

| No. | Test case/Test script        | Attribute and Value            | Expected Result                                                 | Actual Result                                         |
| --- | ---------------------------- | ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Process valid AI response    | `success: true, data: "..."`   | Returns successfully formatted `{ success: true, data: "..." }` | `{ success: true, data: "..." }`                      |
| 2   | Process error AI response    | `success: false, error: "..."` | Returns properly handled error format                           | `{ success: false, error: "..." }`                    |
| 3   | Process out-of-scope message | `message: "unrelated"`         | Returns fallback message                                        | `{ success: true, data: "I cannot help with that." }` |

Unit Testing 2: Frontend Gantt Chart Component Rendering
Testing Objective: To verify that the Next.js Gantt chart component renders milestones correctly within a given timeframe.

| No. | Test case/Test script                 | Attribute and Value                          | Expected Result                     | Actual Result      |
| --- | ------------------------------------- | -------------------------------------------- | ----------------------------------- | ------------------ |
| 1   | Render milestone within view          | `start: Day 2, end: Day 5`, `view: Day 1-7`  | Milestone is fully rendered in view | Rendered fully     |
| 2   | Render milestone starting before view | `start: Day -2, end: Day 5`, `view: Day 1-7` | Rendered portion starts from Day 1  | Partially rendered |
| 3   | Render milestone ending after view    | `start: Day 5, end: Day 10`, `view: Day 1-7` | Rendered portion ends at Day 7      | Partially rendered |

5.2 Functional Testing

Functional testing validates that the system modules work correctly as a whole, ensuring that the developed system meets its specifications and requirements. Unlike unit testing, which focuses on internal functions, functional testing evaluates user-facing features and API behavior.

- **Frontend (Next.js)**: Utilizes **Cypress** to test functional user flows and user interactions through the UI.
- **Backend (Node.js)**: Utilizes **Postman** to test API endpoints, verifying payload processing, status codes, and structural correctness.

Functional Testing 1: Frontend User Flow - Project Detail Role Permissions (Cypress)
Objective: To ensure that the project details page applies RBAC permissions correctly across different user roles.

| No. | Test Case                     | Attribute and value | Expected Result                                | Actual Result            | Result |
| --- | ----------------------------- | ------------------- | ---------------------------------------------- | ------------------------ | ------ |
| 1   | Access project as Manager     | `role: Manager`     | Full editing permissions available and visible | Editing controls visible | Pass   |
| 2   | Access project as Contributor | `role: Contributor` | View and limited interaction permissions       | Limited UI enabled       | Pass   |
| 3   | Access project as Viewer      | `role: Viewer`      | Read-only view of project details              | Read-only UI             | Pass   |

Functional Testing 2: Backend API - Event Tracking Endpoint (Postman)
Objective: To test the backend API's handling of analytics event submissions.

| No. | Test Case                       | Attribute and value                     | Expected Result           | Actual Result     | Result |
| --- | ------------------------------- | --------------------------------------- | ------------------------- | ----------------- | ------ |
| 1   | Submit valid button click event | `event: "click", component: "hero_btn"` | Returns `200 OK`          | `200 OK`          | Pass   |
| 2   | Submit event with missing data  | `event: ""`                             | Returns `400 Bad Request` | `400 Bad Request` | Pass   |

5.3 Integration Testing

Integration testing verifies that different modules of the system work together correctly. Integration testing focuses on the interfaces, linkages, and data flow between modules.

- **Backend (Node.js)**: Utilizes **Jest** to automate integration tests to ensure data flows correctly between internal services (such as API Gateway, AI Engine, Database).

Integration Testing 1: AI Chat Context Flow
Testing Objective: To ensure the AI chat flow successfully communicates from the frontend request through the API gateway to the AI engine and back.

| No. | Test case/Test script         | Attribute and value           | Expected result                                                               | Actual result                       | Result |
| --- | ----------------------------- | ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- | ------ |
| 1   | Send chat prompt              | `prompt: "Summarize project"` | Database queried for context, AI generates response, API gateway formats data | Formatted summary response received | Pass   |
| 2   | Send chat prompt without auth | `Headers: {}`                 | API Gateway rejects request before reaching AI Engine                         | `401 Unauthorized`                  | Pass   |

5.4 End-to-End (E2E) Testing

End-to-end testing tests the whole application from start to finish to ensure the flow behaves as expected in real-world scenarios.

- **Frontend (Next.js)**: E2E testing is handled by **Cypress** to simulate real users navigating the platform, including logging in, managing items, and chatting with the AI.
- **Backend (Node.js)**: E2E testing spans the entire system setup using **Jest** to run overarching sequences against the staging environments.

End-to-End Testing 1: Complete User Journey - Create and Manage Project
Testing Objective: To verify a user can log in, create a project, add milestones, and log out successfully across both frontend and backend systems.

| No. | Test case/Test script           | Attribute and value       | Expected result                                  | Actual result             | Result |
| --- | ------------------------------- | ------------------------- | ------------------------------------------------ | ------------------------- | ------ |
| 1   | User login and dashboard access | `Credentials: valid`      | User logged in and dashboard loaded              | Dashboard loaded          | Pass   |
| 2   | Create new project              | `Project Name: "New App"` | Project created via API and saved to database    | Project visible in lists  | Pass   |
| 3   | Add milestone to Gantt          | `Milestone: "Phase 1"`    | Milestone added, verified by API, rendered in UI | Milestone displayed in UI | Pass   |
