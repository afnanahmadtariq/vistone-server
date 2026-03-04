4 Chapter 4: Implementation
This chapter discusses the implementation details of the project. You are not required to insert source code here; however, you must document the core module functionalities using pseudocode where applicable.

Note: You are required to follow proper coding standard to write your source code. For guidelines, General Coding Standards & Guidelines are provided in Appendix D.

In addition to pseudocode and UI/API documentation, if your implementation includes any techniques from Artificial Intelligence (AI), Machine Learning (ML), Deep Learning (DL), Data Science, or Cyber security, you must also include the following details wherever applicable:

• The specific technique/model/algorithm applied (e.g., Decision Trees, CNNs, Autoencoders, Encryption Algorithms).
• The dataset used (source, size, format, any preprocessing applied).
• Training procedure and evaluation methodology.
• Achieved metrics (accuracy, precision, recall, F1-score, confusion matrix, etc.).
• Explanation of how the implementation meets or supports the project’s objectives.

4.1 Project Methodology & Algorithms
This section explains the methodology (step-by-step approach) and the core algorithms that power the system. Students should avoid trivial operations (e.g., login, logout, simple CRUD) and instead focus on the methods and algorithms that:
• Enforce business rules
• Perform optimization or scheduling
• Implement intelligent features such as prediction, classification, or recommendation

4.1.1 Project Methodology (Step-by-Step Approach)
The methodology describes the overall approach taken to implement the system. Students must clearly describe each stage of their implementation pipeline, including what was done, how it was done, and why it was necessary.

Project Methodology for Vistone Server: AI Engine RAG Pipeline

The implementation of the AI-powered Knowledge Hub & Conversational Agent followed the steps below:

1. Data Synchronization
   o What: Project documents, task details, chat history, and workflow metadata are transferred to the AI engine.
   o How: Microservices trigger synchronization via authenticated `/api/sync/all` HTTP endpoints.
   o Why: Synchronizes business operational data with the AI model to keep information up-to-date.

2. Data Chunking & Preprocessing
   o Data Normalization: Data schemas are extracted in raw text format and tagged with contextual metadata (e.g., source boundaries, project IDs, permissions bounds).
   o Chunking: Larger texts are split into readable contextual segments dynamically via LangChain toolchains.
   o Why: Fits within base text token limits without corrupting intent representation.

3. Feature Extraction (Embeddings) & Vector Storage
   o What: Textual elements transformed into dense 1024-dimensional vectors.
   o How: Processing via `MistralAIEmbeddings` maps all data points into mathematical objects. These are loaded efficiently onto the PostgreSQL server into the `rag_embeddings` and `rag_documents` schemas running the `pgvector` k-NN extension.
   o Why: Enables rapid, mathematically accurate similarity searches representing project context.

4. Machine Learning Inference & Generative AI Output
   o Algorithm: Large Language Model (`ChatMistralAI`).
   o Inference: User intent calculates similarity threshold vectors comparing against existing vectors in `pgvector` (cosine distance mapping). Retrieved results act as system prompts informing the LLM model to return precise localized inferences dynamically without retraining weights.

5. Dynamic Tool Calling Execution
   o Tool Execution: During agent invocation, LangChain dynamically resolves all external operations requested by `ChatMistralAI` utilizing `DynamicStructuredTool`.
   o Security Filtering: The tool execution layer validates user session Role-Based Access Control logic ensuring sensitive operations are scrubbed out of the AI workflow prior to Mistral invocation.

4.1.2 Algorithm
This section documents the major algorithms that power the system. Students should avoid trivial operations such as login, logout, or simple CRUD actions. Instead, they should describe algorithms that:
• Enforce business rules
• Perform optimization or scheduling
• Implement intelligent features such as prediction, classification, or recommendation

Table 4.1: Examples of Algorithms

Algorithm Name Details
CheckPermissionBounds (Business Rule)
Input: RoleName, ProposedPermissions
Output: Boolean (True/False)
Pseudocode:
1: procedure arePermissionsWithinBounds(RoleName, ProposedPermissions)
2: if RoleName == "Organizer" then return True
3: if RoleName == "Manager" then return True
4:  
5: MaxPermissions ← GetDefaultRoleValues(RoleName)
6: for each Resource in ProposedPermissions do
7: if Resource == "\_meta" and ProposedPermissions[Resource] IS NOT EMPTY then
8: return False
9: end if
10:
11: for each Action in ProposedPermissions[Resource] do
12: if Action NOT IN MaxPermissions[Resource] then
13: return False
14: end if
15: end for
16: end for
17: return True
18: end procedure

RgAgentRunner (AI / Data Science)
Input: UserSession, Query, SystemPrompt
Output: FunctionResult
Pseudocode:
1: procedure runAgent(UserSession, Query, SystemPrompt)
2: AllTools ← GetToolDefinitions()
3: AllowedTools ← FilterToolsByPermission(UserSession, AllTools)
4: if AllowedTools IS EMPTY then return "No Access"
5:
6: LlmWithTools ← MistralAI.bindTools(AllowedTools)
7: MessageStack ← [SystemPrompt, Query]
8:  
9: while Iterations < MaxIterations do
10: Response ← LlmWithTools.invoke(MessageStack)
11: MessageStack.push(Response)
12:
13: if Response.ToolCalls IS EMPTY then
14: return Response.Content
15: end if
16:  
17: for each Call in Response.ToolCalls do
18: Result ← executeToolFunction(Call.Name, Call.Args)
19: MessageStack.push(ToolMessage(Result))
20: end for
21:  
22: Iterations ← Iterations + 1
23: end while
24:  
25: return "Completed with maximum iterations"
26: end procedure

4.1.3 Guideline for Students
• Document 1–3 algorithms depending on your project.
• Use pseudocode instead of actual programming code.
• Select algorithms that represent core rules, optimization, or intelligent logic in the system.

4.2 Training Results & Model Evaluation (Mandatory for AI/ML/Data Science Projects)
• Dataset used: The system leverages localized project documents sourced via microservice Sync routines (tasks, wiki, client details).
• Training setup: Utilizing foundation open-source inference weights via Mistral AI in conjunction with zero-shot LangChain RAG prompts.
• Performance metrics: Context matching employs Euclidean cosine vector distance comparisons measuring similarity bounds `1 - (e.embedding <=> TargetVector::vector)` with dynamic top-K filtration limits.
• Model Details: The Fastify application scales out inference workloads over standard compute environments requiring only external Mistral tokens without heavy localized GPU processing overheads.

4.3 Security Techniques (if applicable)
• Authentication: Secure validation leveraging JWT standard token flows linked to Apollo API middleware logic.
• Authorization Structure: Highly granular Role-Based Access Control (RBAC). The system contains Organizer, Manager, Contributor, and Client scopes enforcing strict bounds.
• Data Isolation: Operating via Nx workspaces dividing PostgreSQL logically into isolated schemas matching microservices boundaries (e.g., `ai_engine`, `project`, `auth`) limiting propagation risks.

4.4 External APIs/SDKs
Describe the third-party APIs/SDKs used in the project implementation in the following table.

Table 4.2 Details of APIs used in the project
Name of API and version Description of API Purpose of usage List down the API endpoint/function/class in which it is used
LangChain Toolchain framework for LLMs Agent iteration logic, embedding integration, dynamic chunking Agent Runner (`runAgent`), Rag Service.
Mistral AI API Large Language Model interface Providing context generation and conversational responses (`ChatMistralAI`) Agent tool binding and Fastify engine routes.
PostgreSQL pgvector Vector DB Extension Dense vector storage querying framework `ai_engine.rag_embeddings` schema vector querying.
Apollo GraphQL Server API Framework Middleware Data synchronization gateways mapping backend logic to frontend `apps/api-gateway/src/main.ts` GraphQL router.

4.5 User Interface
Details about user interface with descriptions. Provide the User Interface for each sub-system (such as Mobile App, Web App, Client App, Admin App). Provide description of each User Interface explaining the details.
When inserting User Interfaces, use appropriate size of the image, for example, for mobile app, 2-4 screens can be placed on a single page.

Following are primary core components:
4.5.1 Organizer Overview Dashboard
The dashboard displays aggregated project tracking matrices alongside permission configurations allowing Organizers to elevate Team management bounds.
4.5.2 AI Agent Chat Interface
The main conversational view allowing managers to query project data directly. Resolves background RAG indexing calls retrieving relevant metrics.
4.5.3 Task Planning Screen
Component providing standard CRUD interfaces mapping into `project-management` controllers enforcing workflow task dependency constraints securely.

4.6 Deployment
The Vistone backend architecture uses an Nx Workspace monorepo managing loosely coupled Node.js/TypeScript microservices.
The API Gateway operates an Apollo GraphQL Express server (Port :4000). AI workloads are hosted over Fastify (Port :3009) enabling faster asynchronous operations. Database storage integrates Prisma ORM mapping to isolated PostgreSQL schemas.

5 Chapter 5: Testing and Evaluation
Once the system has been successfully developed, testing has to be performed to ensure that the system working as intended. This is also to check that the system meets the requirements stated earlier. Besides that, system testing will help in finding the errors that may be hidden from the user. The testing must be completed before it is deployed for use.

There are few types of testing which includes the unit testing, functional testing and integration testing.
You are required to perform each of these in-depth to ensure system quality.

5.1 Unit Testing
Unit testing verifies the smallest testable components of the software (e.g., individual functions, methods, or classes) in isolation. The purpose is to ensure that each unit performs as expected, independent of the full system.
At the FYP level:
• Software Engineering students may demonstrate automated unit tests using Jest, PyTest, or similar frameworks.

Unit Testing 1: arePermissionsWithinBounds() function with valid bounds
Testing Objective: To ensure the permission bound validation functions block Contributor escalation hacks.
No. Test case/Test script Attribute and Value Expected Result Actual Result
1 Call arePermissionsWithinBounds() applying Contributor limits Role: "Contributor", meta: ['manage'] Rejects input returning False False
2 Call arePermissionsWithinBounds() applying default bounds Role: "Contributor", wiki: ['read'] Accepts input returning True True
3 Call arePermissionsWithinBounds() applying elevated level Role: "Manager", tasks: ['create'] Accepts unconditionally True

5.2 Functional Testing
Functional testing validates that the system modules work correctly as a whole, ensuring that the developed system meets its specifications and requirements. Unlike unit testing, which focuses on internal functions, functional testing evaluates user-facing features through the UI or APIs.

Functional Testing 1: Agent Role Tool Binding
Objective: To ensure that the dynamic tool binding process within `runAgent` only maps tools available to the current user token role.

No. Test Case Attribute and value Expected Result Actual Result Result
1 Invoke Agent as ‘Client’ Role: CLIENT Tool context bound without mutation editing schemas Agent generated securely without data mutations. Pass
2 Invoke Agent as ‘Organizer’ Role: ORGANIZER All synchronization tools actively mapped via LangChain bounds Agent correctly synced database updates dynamically. Pass

5.3 Business Rules Testing
Decision table based testing technique is used to test business rules. The business rules were defined in FRs and Use Cases
Decision based testing uses a systematic approach where input and outputs are provided in tabular form. It is a precise and compact way to model complicated logic.

For Vistone, Business Rule Testing validates boundary cases like:

- Only users with `settings:update` meta tags can hit `/api/sync/all`.
- External 'Clients' attempting to mutate system rules will explicitly trigger rejection thresholds via the auth-service token verifier.

  5.4 Integration Testing
  Integration testing verifies that different modules of the system work together correctly. Unlike unit testing (which checks isolated functions) and functional testing (which checks features from a user’s perspective), integration testing focuses on the interfaces, linkages, and data flow between modules developed by different team members.

Integration Testing 1: Apollo Gateway mapping to Task Schema
Testing Objective: To ensure correct structural mutation translation from initial GraphQL resolvers to independent Postgres schema persistence pipelines.

No. Test case/Test script Attribute and value Expected result Actual result Result

1 Valid task dependencies (Gateway ↔ Controller ↔ Prisma) Create task mapping parent IDs safely. Task executes via Prisma to project tasks table Task saved to Postgres cleanly Pass
2 Invalid query structure Submit unrecognized task variables Resolver terminates query at protocol boundaries protecting backend Apollo validation dropped payload correctly Pass
