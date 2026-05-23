# Technical Specification: Local Gemma 4 AI Analytics Server

## Goal

Completely replace the empty mock functions inside `sync-server/src/app/ai/ai.service.ts` with a fully operational, zero-cost AI analytics engine using local Gemma 4 inference.

## 📦 1. Local Inference Client Configuration

- **Target File:** `sync-server/src/app/ai/ai.service.ts`
- **Implementation:** \* Connect the service to a local Ollama instance running on the server machine (`http://localhost:11434`) using the official open-source `ollama` npm package, or handle direct HTTP dispatches to the local server port.
  - Explicitly target the `gemma4` or `gemma2` local model signature.
  - Wrap all model dispatches inside the project's strict `guardAsync` utility wrapper to prevent raw connection failures from interrupting server threads.

## 📊 2. Local End-of-Day (EOD) Analytics Compiler

- **Target Function:** Update `compileEod(date: string)` inside `ai.service.ts`.
- **Database Aggregation:** Use Prisma to pull down all `InteractionLog` entries matching the targeted date parameter, including related shop information and usernames.
- **Prompt Engineering Protocol:** Concatenate all representative field comments into a single input text block. Send this data block to the local Gemma 4 model with strict system context guidelines instructing it to structure its response text into a valid JSON object matching this contract:

{
"topPerformingRep": {
"username": "string",
"justification": "string"
},
"marketSynthesis": "string", // Summary of pricing objections, material shortages, and demand trends
"complianceWarnings": [
{
"username": "string",
"issue": "string" // Highlight missing details, unexpected prices, or brief remarks
}
]
}

- **JSON Enforcement:** Since local models cannot use external schema enforcement natively, provide explicit formatting instructions in the prompt text demanding a raw, un-fenced JSON string, and use `JSON.parse()` within a try/catch guard block to clean the model's textual payload safely.

## 👁️ 3. Local Asynchronous Multimodal Screenshot Auditing

- **Target Function:** Update `processScreenshot(logId: string, filePath: string)` inside `ai.service.ts`.
- **Execution Loop:** When a file lands on the sync controller, trigger this task asynchronously.
- **Operational Logic:** \* Convert the local saved screenshot file binary into a Base64 string payload.
  - Load the corresponding logged items, quantity values, and custom negotiated prices from the database using the `logId`.
  - Dispatch a multimodal image-parsing request to your local Gemma vision model.
  - **Prompt:** "Analyze this Viber screenshot. Extract the quantities and product items ordered by the customer. Compare these values against our database logs. If they align perfectly, return 'VERIFIED'. If there are item or price mismatches, return 'MISMATCH' along with a specific explanation of the discrepancy."
  - **Database Save:** Commit the output directly into the database row fields: set `ai_verification_status` and append the text summary directly to `ai_verification_notes`.
