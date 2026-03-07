Chapter 5: Testing and Evaluation

Once the system was successfully developed, comprehensive testing was performed to ensure that the application functions as intended. The primary goal of this phase was to verify that the developed system met all the functional and non-functional requirements specified at the beginning of the project. Furthermore, system testing facilitated the identification and resolution of underlying issues that may have otherwise impacted the end-user experience. All planned testing was completed prior to the system's final deployment.

This evaluation encompassed several distinct types of testing, including unit and component testing, functional testing, business rules testing, integration testing, and end-to-end (E2E) testing. Each of these methodologies was executed in depth to guarantee the overall quality and reliability of the platform.

Given the architecture of the platform, the testing procedures were divided between the Next.js Frontend and the Node.js Backend.

5.1 Unit and Component Testing

Unit testing was conducted to verify the smallest testable components of the software (e.g., individual functions, methods, or components) in isolation. The purpose was to ensure that each unit performed strictly according to its expected behavior, independently of the full system context.

- **Frontend (Next.js)**: **Jest** was utilized for testing individual UI components, React hooks, and utility functions in an isolated environment.
- **Backend (Node.js)**: **Jest** was employed to test isolated backend business logic, validation scripts, API gateway data formatting, and individual controllers.

**Unit Testing Scenario 1: Backend API Gateway AI Response Handler**
**Objective**: To verify the API gateway's payload formatting logic when receiving various responses from the AI engine.

| No. | Test case/Test script           | Attribute and Value                             | Expected Result                                                            | Actual Result                                         | Result |
| --- | ------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 1   | Process standard valid response | `success: true, data: "Here is the summary..."` | Returns successfully formatted `{ success: true, data: "Here is the..." }` | `{ success: true, data: "Here is the..." }`           | Pass   |
| 2   | Process error AI response       | `success: false, error: "Token limit exceeded"` | Returns properly handled external error                                    | `{ success: false, error: "Token limit..." }`         | Pass   |
| 3   | Process out-of-scope prompt     | `message: "Tell me a joke"`                     | Returns fallback rejection message                                         | `{ success: true, data: "I cannot help with that." }` | Pass   |
| 4   | Process malformed JSON response | `data: "{missing bracket"`                      | Catches parsing exception and returns generic error                        | `{ success: false, error: "Internal Server Error" }`  | Pass   |
| 5   | Timeout handling                | `timeout: > 10000ms`                            | Gateway aborts function and returns timeout error                          | `{ success: false, error: "AI Engine Timeout" }`      | Pass   |

**Unit Testing Scenario 2: Frontend Gantt Chart Component Rendering**
**Objective**: To verify that the Next.js Gantt chart component calculates and renders project milestones and handles internal state changes accurately.

| No. | Test case/Test script                      | Attribute and Value                          | Expected Result                                            | Actual Result                 | Result |
| --- | ------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------- | ----------------------------- | ------ |
| 1   | Render milestone within view bounds        | `start: Day 2, end: Day 5`, `view: Day 1-7`  | Milestone fully rendered entirely within timeline view     | Rendered fully                | Pass   |
| 2   | Render milestone partially outside view    | `start: Day -2, end: Day 5`, `view: Day 1-7` | Rendered visually starting exactly from Day 1              | Partially rendered from Day 1 | Pass   |
| 3   | Update milestone dates correctly           | `Update: start to Day 3`                     | Component recalculates width and translation properties    | Rendered from Day 3 to 5      | Pass   |
| 4   | Render simultaneous overlapping milestones | `m1: Day 2 to 4`, `m2: Day 2 to 6`           | Component offsets Y-axis positions to avoid visual overlap | Rendered on separate rows     | Pass   |
| 5   | Delete milestone                           | `Action: Remove m1`                          | Component removes DOM element without breaking layout      | Milestone removed completely  | Pass   |

5.2 Functional Testing

Functional testing validated that the system modules worked correctly as integrated units, ensuring that the developed capabilities satisfied their respective specifications. Unlike unit testing, functional testing evaluated user-facing features and API behaviors from a black-box perspective.

- **Frontend (Next.js)**: **Cypress** was used to test functional user flows and user interactions directly through the rendered UI.
- **Backend (Node.js)**: **Postman** was utilized to test the API endpoints, verifying payload processing, HTTP status codes, and structural correctness for various requests.

**Functional Testing Scenario 1: Frontend User Flow - Project RBAC (Cypress)**
**Objective**: To ensure that the platform enforces Role-Based Access Control (RBAC) permissions securely when navigating and interacting across authorized user roles.

| No. | Test Case                         | Attribute and value          | Expected Result                                      | Actual Result               | Result |
| --- | --------------------------------- | ---------------------------- | ---------------------------------------------------- | --------------------------- | ------ |
| 1   | Access project details as Manager | `role: Manager`              | Full reading, creating, editing elements are visible | All controls visible        | Pass   |
| 2   | Delete project as Manager         | `Action: Delete form`        | Deletion succeeds, returning to dashboard            | Redirected to dashboard     | Pass   |
| 3   | Edit milestone as Contributor     | `role: Contributor`          | Milestone editing enabled; project deletion hidden   | Editor opens; delete hidden | Pass   |
| 4   | Access project details as Viewer  | `role: Viewer`               | All interactive forms disabled, read-only view       | Forms disabled / hidden     | Pass   |
| 5   | Modify access roles as Viewer     | `Action: Attempt URL bypass` | Enforced redirect to unauthorized page               | Access Denied displayed     | Pass   |

**Functional Testing Scenario 2: Backend API - Analytics Event Tracking (Postman)**
**Objective**: To test the backend API's resilience and correct HTTP code handling for analytics event data submissions.

| No. | Test Case                            | Attribute and value                     | Expected Result                                    | Actual Result           | Result |
| --- | ------------------------------------ | --------------------------------------- | -------------------------------------------------- | ----------------------- | ------ |
| 1   | Submit valid button click event      | `event: "click", component: "hero_btn"` | Returns `200 OK`, event saved in database          | `200 OK`                | Pass   |
| 2   | Submit event missing required field  | `event: ""`                             | Returns `400 Bad Request`, indicates missing field | `400 Bad Request`       | Pass   |
| 3   | Submit unrecognized event type       | `type: "DO_NOT_EXIST"`                  | Returns `400 Bad Request`, fails validation check  | `400 Bad Request`       | Pass   |
| 4   | Submit excessive payload size        | `payload: > 5MB`                        | Returns `413 Payload Too Large` to prevent abuse   | `413 Payload Too Large` | Pass   |
| 5   | Submit unauthenticated event request | `Auth Header: None`                     | Returns `401 Unauthorized`                         | `401 Unauthorized`      | Pass   |

5.3 Business Rules Testing

A decision-table-based testing technique was employed to test the core business rules of the platform. The business rules were primarily derived from the documented functional requirements and use case models. This systematic approach mapped input conditions to output actions, providing a precise and compact methodology to validate complicated access or operational logic.

**Business Rules Testing Scenario 1: User Registration Validation**
**Objective**: To evaluate the backend decision logic for admitting new users based on strict email formatting, uniqueness, and password strength constraints.

| No. | Test Case / Condition                     | Attributes / Values                          | Expected Action / Output                        | Actual Result                | Result |
| --- | ----------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ---------------------------- | ------ |
| 1   | Unique Email + Strong Password (valid)    | `Email: new@site.com, Pass: P@ssw0rd1!`      | Account created successfully, JWT generated     | Account created successfully | Pass   |
| 2   | Existing Email + Strong Password          | `Email: existing@site.com, Pass: P@ssw0rd1!` | Registration denied, email conflict error       | Registration denied          | Pass   |
| 3   | Unique Email + Weak Password (< 8 char)   | `Email: test2@site.com, Pass: short`         | Registration denied, length requirement error   | Registration denied          | Pass   |
| 4   | Unique Email + Weak Password (No special) | `Email: test3@site.com, Pass: password123`   | Registration denied, character complexity error | Registration denied          | Pass   |
| 5   | Invalid Email Format                      | `Email: not_an_email, Pass: P@ssw0rd1!`      | Registration denied, invalid format error       | Registration denied          | Pass   |

5.4 Integration Testing

Integration testing was performed to verify that discrete modules of the system function cohesively together. This testing layer specifically examined the interfaces, linkages, and data exchange occurring between modules and distinct system components.

- **Backend (Node.js)**: Automated integration tests were crafted using **Jest** to ensure correct data flow and integrity between internal bounded contexts (such as the API Gateway communicating with the AI Engine and the Database).

**Integration Testing Scenario 1: AI Chat Context and Persistence Flow**
**Objective**: To ensure the AI chat flow effectively manages database retrieval, AI engine communication, and state persistence end-to-end.

| No. | Test case/Test script                      | Attribute and value                | Expected result                                                       | Actual result               | Result |
| --- | ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------- | --------------------------- | ------ |
| 1   | Full standard chat interaction             | `prompt: "Summarize this project"` | Context fetched from DB, sent to AI Engine, response saved to DB      | Response received and saved | Pass   |
| 2   | AI Engine is unreachable (Network failure) | `Simulated: 503 Server Error`      | System recovers with localized error message, no DB corruption        | Handled gracefully          | Pass   |
| 3   | Querying a project without data            | `Project Context: Empty`           | AI Engine receives context flag, returns default 'no context' message | Default message returned    | Pass   |
| 4   | Database timeout during context fetch      | `Simulated: Slow DB Query`         | Request terminates gracefully, error returned to frontend             | `504 Gateway Timeout`       | Pass   |
| 5   | Save large response to history             | `AI Response: > 10,000 words`      | Database correctly truncates or handles large text bloc insertion     | Successfully inserted       | Pass   |

5.5 End-to-End (E2E) Testing

End-to-end testing was implemented to scrutinize the entire application stack from a comprehensive, real-world perspective. This approach ensured that primary workflows behaved holistically as expected.

- **Frontend (Next.js)**: **Cypress** spearheaded E2E testing by simulating real users navigating the platform, authenticating, creating projects, and engaging with the AI features.
- **Backend (Node.js)**: **Jest** facilitated overarching backend tests that interacted dynamically with staging environments, modeling multi-step data transactions.

**End-to-End Testing Scenario 1: Comprehensive Project Initialization and Management Flow**
**Objective**: To verify an authenticated user can seamlessly create and manage an entire project workspace without encountering unhandled state conflicts across the frontend and backend boundaries.

| No. | Test case/Test script                 | Attribute and value                  | Expected result                                                    | Actual result              | Result |
| --- | ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ | -------------------------- | ------ |
| 1   | Authenticate and load application     | `Credentials: Valid User`            | Dashboard renders all previous user projects                       | Dashboard loaded           | Pass   |
| 2   | Initialize new project space          | `Form payload: Base Project Details` | Project created via API, dynamic routing shifts client to new page | Rerouted to new project    | Pass   |
| 3   | Add milestone utilizing the interface | `Action: Drag block on timeline`     | Event fires via API, UI reflects instant optimistic update         | Milestone aligned on chart | Pass   |
| 4   | Invite secondary user via permissions | `Action: Send invite, role: Viewer`  | Email dispatched, database reflects pending RBAC status            | Invite sent                | Pass   |
| 5   | Terminate user session completely     | `Action: Click Logout`               | Session cookie terminated, redirected to login, state flushed      | Logged out securely        | Pass   |
