# SYNE — Verifiable AI Memory Chain

An AI research agent with a persistent, sovereign, and verifiable memory chain — archived permanently to Filecoin in real time.

---

## 💡 The Core Mechanic & Concept

Modern AI agents suffer from memory editing, context loss, and centralized state modification. **Syne** solves this by establishing a public, append-only **cryptographic memory chain** directly on the Filecoin/IPFS network:
1. **Verifiable Agent Turns**: Every conversational turn, key fact, open question, and reasoning block is serialized into a JSON snapshot.
2. **Cryptographic Linking (Merkle-Chaining)**: Each new snapshot includes a `prev_cid` pointer that references the CID of the previous memory snapshot, creating an immutable linked list.
3. **Zero-Database State Resume**: The agent can fully reconstruct its chat history and memory context on any device without a centralized database, simply by walking the CID chain backward from the latest pointer.
4. **On-Chain Audit Trails**: Integrates a verification pipeline to check the pin status of each CID against Filecoin storage deals and IPFS nodes, ensuring the agent's memory is pinned, active, and tamper-proof.

---

## 🛠️ Tech Stack & Primitives

- **Frontend / Routing**: Next.js 16 (App Router) + Tailwind CSS (v4)
- **Agent Intelligence**: Llama 3.1 8B (`meta/llama-3.1-8b-instruct`) via NVIDIA NIM
- **Storage Protocol**: Filecoin (Lighthouse.storage)
- **Native Chaining Integration**: Custom `fetch` & `FormData` upload client for zero WebAssembly overhead on Serverless/Edge runtimes.

---

## 📁 Repository Structure

```text
Syne/
├── README.md             <- Root documentation (this file)
├── package.json          <- Root workspace packages
├── app/                  <- Next.js application directory
│   ├── app/              <- Page router (Landing page on /, Workspace on /dashboard)
│   ├── components/       <- UI Components (ChatPanel, SessionSidebar, MemoryFeed)
│   ├── lib/              <- Core logic (filecoin.ts client, Llama NIM model.ts)
│   ├── README.md         <- Next.js application specific README
│   └── package.json      <- Application dependencies
```

---

## 🚀 Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/cridiv/syne.git
cd syne/app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Keys
Create a `.env.local` file inside the `app/` folder:
```env
# NVIDIA NIM API key for Llama 3.1 8B Model
MODEL_API_KEY="your_nvidia_nim_api_key"

# Lighthouse.storage API key for Filecoin uploads & verification
LIGHTHOUSE_API_KEY="your_lighthouse_api_key"
```

### 4. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000` to interact with Syne.

---

## 🌐 Production Deployment (Vercel)

To deploy Syne on Vercel:
1. **Framework Preset**: Select **Next.js**.
2. **Root Directory**: Set as `app` (since the Next.js app sits in the `app` subdirectory).
3. **Environment Variables**: Add your `MODEL_API_KEY` and `LIGHTHOUSE_API_KEY` in your Vercel project settings.
4. **Trigger Deployment**: Run a clean deploy. The app will compile and deploy with native serverless API gateways.

---

## 🧪 Isolated CLI Test Scripts

You can execute standalone tests inside the `app/` folder to check model responses and storage integration:
*   **Test Model Connection**:
    ```bash
    npx tsx test_agent.ts
    ```
*   **Test Chaining & Pinned Snapshot walk**:
    ```bash
    npx tsx test_chain.ts
    ```
*   **Test IPFS Network Resolution**:
    ```bash
    npx tsx test_fetch.ts
    ```
