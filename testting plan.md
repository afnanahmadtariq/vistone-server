Chapter 5: Testing and Evaluation

Once the system was successfully developed, comprehensive testing was performed to ensure that the application functions as intended. The primary goal of this phase was to verify that the developed system met all the functional and non-functional requirements specified at the beginning of the project. Furthermore, system testing facilitated the identification and resolution of underlying issues that may have otherwise impacted the end-user experience. All planned testing was completed prior to the system's final deployment.

This evaluation encompassed several distinct types of testing, including unit and component testing, functional testing, business rules testing, integration testing, and end-to-end (E2E) testing. Each of these methodologies was executed in depth to guarantee the overall quality and reliability of the platform.

Given the architecture of the platform, the testing procedures were divided between the Next.js Frontend and the Node.js Backend.

5.1 Unit and Component Testing

Unit testing was conducted to verify the smallest testable components of the software (e.g., individual functions, methods, or components) in isolation. The purpose was to ensure that each unit performed strictly according to its expected behavior, independently of the full system context.

- **Frontend (Next.js)**: **Jest** was utilized for testing individual UI components, React hooks, and utility functions in an isolated environment.
- **Backend (Node.js)**: **Jest** was employed to test isolated backend business logic, validation scripts, API gateway data formatting, and individual controllers.

**Unit Testing Scenario 1: Backend API Gateway AI Response Handler**
**Objective**: To ensure the API gateway formats AI engine responses correctly when processing valid, invalid, or out-of-scope inputs.

| No. | Test case/Test script        | Attribute and Value            | Expected Result                                                 | Actual Result                                         | Result |
| --- | ---------------------------- | ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 1   | Process valid AI response    | `success: true, data: "..."`   | Returns successfully formatted `{ success: true, data: "..." }` | `{ success: true, data: "..." }`                      | Pass   |
| 2   | Process error AI response    | `success: false, error: "..."` | Returns properly handled error format                           | `{ success: false, error: "..." }`                    | Pass   |
| 3   | Process out-of-scope message | `message: "unrelated"`         | Returns fallback message                                        | `{ success: true, data: "I cannot help with that." }` | Pass   |

**Unit Testing Scenario 2: Frontend Gantt Chart Component Rendering**
**Objective**: To verify that the Next.js Gantt chart component calculates and renders project milestones accurately within a specified timeframe.

| No. | Test case/Test script                 | Attribute and Value                          | Expected Result                               | Actual Result                  | Result |
| --- | ------------------------------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------ | ------ |
| 1   | Render milestone within view          | `start: Day 2, end: Day 5`, `view: Day 1-7`  | Milestone is fully rendered in view bounds    | Rendered fully                 | Pass   |
| 2   | Render milestone starting before view | `start: Day -2, end: Day 5`, `view: Day 1-7` | Rendered portion starts accurately from Day 1 | Partially rendered from Day 1  | Pass   |
| 3   | Render milestone ending after view    | `start: Day 5, end: Day 10`, `view: Day 1-7` | Rendered portion ends specifically at Day 7   | Partially rendered until Day 7 | Pass   |

5.2 Functional Testing

Functional testing validated that the system modules worked correctly as integrated units, ensuring that the developed capabilities satisfied their respective specifications. Unlike unit testing, functional testing evaluated user-facing features and API behaviors from a black-box perspective.

- **Frontend (Next.js)**: **Cypress** was used to test functional user flows and user interactions directly through the rendered UI.
- **Backend (Node.js)**: **Postman** was utilized to test the API endpoints, verifying payload processing, HTTP status codes, and structural correctness for various requests.

**Functional Testing Scenario 1: Frontend User Flow - Project Detail Role Permissions (Cypress)**
**Objective**: To ensure that the project details page applies Role-Based Access Control (RBAC) permissions correctly when navigating across different authorized user roles.

| No. | Test Case                     | Attribute and value | Expected Result                                      | Actual Result            | Result |
| --- | ----------------------------- | ------------------- | ---------------------------------------------------- | ------------------------ | ------ |
| 1   | Access project as Manager     | `role: Manager`     | Full editing permissions available and visible in UI | Editing controls visible | Pass   |
| 2   | Access project as Contributor | `role: Contributor` | View and limited interaction permissions enabled     | Limited UI enabled       | Pass   |
| 3   | Access project as Viewer      | `role: Viewer`      | Read-only view of project details presented          | Read-only UI             | Pass   |

**Functional Testing Scenario 2: Backend API - Event Tracking Endpoint (Postman)**
**Objective**: To test the backend API's proper handling of analytics event data submissions from the client.

| No. | Test Case                               | Attribute and value                     | Expected Result           | Actual Result     | Result |
| --- | --------------------------------------- | --------------------------------------- | ------------------------- | ----------------- | ------ |
| 1   | Submit valid button click event         | `event: "click", component: "hero_btn"` | Returns `200 OK`          | `200 OK`          | Pass   |
| 2   | Submit event with missing required data | `event: ""`                             | Returns `400 Bad Request` | `400 Bad Request` | Pass   |

5.3 Business Rules Testing

A decision-table-based testing technique was employed to test the core business rules of the platform. The business rules were primarily derived from the documented functional requirements and use case models. This systematic approach mapped input conditions to output actions, providing a precise and compact methodology to validate complicated access or operational logic.

**Business Rules Testing Scenario 1: User Registration Validation**
**Objective**: To evaluate the backend decision logic for admitting new users into the platform based on email uniqueness and password strength rules.

| No. | Test Case / Condition                  | Attributes / Values                        | Expected Action / Output                 | Actual Result                | Result |
| --- | -------------------------------------- | ------------------------------------------ | ---------------------------------------- | ---------------------------- | ------ |
| 1   | Unique Email + Strong Password (valid) | `Email: new@site.com, Pass: P@ssw0rd1!`    | Account created successfully             | Account created successfully | Pass   |
| 2   | Existing Email + Strong Password       | `Email: in_use@site.com, Pass: P@ssw0rd1!` | Registration denied, error returned      | Registration denied          | Pass   |
| 3   | Unique Email + Weak Password (invalid) | `Email: test2@site.com, Pass: 1234`        | Registration denied, weak password error | Registration denied          | Pass   |

5.4 Integration Testing

Integration testing was performed to verify that discrete modules of the system function cohesively together. This testing layer specifically examined the interfaces, linkages, and data exchange occurring between modules and distinct system components.

- **Backend (Node.js)**: Automated integration tests were crafted using **Jest** to ensure correct data flow and integrity between internal bounded contexts (such as the API Gateway communicating with the AI Engine and the Database).

**Integration Testing Scenario 1: AI Chat Context Flow**
**Objective**: To ensure the AI chat flow effectively manages communication cascading from an initial frontend request, traversing the API gateway, consulting the AI engine, and effectively returning the formatted response.

| No. | Test case/Test script                  | Attribute and value           | Expected result                                                                     | Actual result                       | Result |
| --- | -------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| 1   | Send valid chat prompt to API          | `prompt: "Summarize project"` | Database queried for context, AI generates response, API gateway structures payload | Structured summary payload received | Pass   |
| 2   | Send chat prompt without authorization | `Headers: {}`                 | API Gateway intercepts and rejects request prior to AI Engine communication         | `401 Unauthorized`                  | Pass   |

5.5 End-to-End (E2E) Testing

End-to-end testing was implemented to scrutinize the entire application stack from a comprehensive, real-world perspective. This approach ensured that primary workflows behaved holistically as expected.

- **Frontend (Next.js)**: **Cypress** spearheaded E2E testing by simulating real users navigating the platform, authenticating, creating projects, and engaging with the AI features.
- **Backend (Node.js)**: **Jest** facilitated overarching backend tests that interacted dynamically with staging environments, modeling multi-step data transactions.

**End-to-End Testing Scenario 1: Complete User Journey - Create and Manage Project**
**Objective**: To verify a user can authenticate, seamlessly create a project space, append milestones, and terminate their session effectively across frontend and backend boundaries.

| No. | Test case/Test script               | Attribute and value       | Expected result                                                     | Actual result                                 | Result |
| --- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------- | --------------------------------------------- | ------ |
| 1   | User login and dashboard resolution | `Credentials: valid`      | User logged in and dashboard fully rendered                         | Dashboard rendered                            | Pass   |
| 2   | Initiate project creation           | `Project Name: "New App"` | Project persisted via API, state updated on client                  | Project dynamically visible in lists          | Pass   |
| 3   | Create milestone on Gantt           | `Milestone: "Phase 1"`    | Milestone synchronized, API responds `201`, rendered in UI timeline | Milestone visible in specific timeline bounds | Pass   |
