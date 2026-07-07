# MemoryOS (Syne)

An AI agent with a public, verifiable reasoning memory — written permanently to Filecoin in real time.

MemoryOS is a research agent that remembers everything—across browser sessions, devices, and time—completely serverless. Every conversational step and reasoning block is pinned to the Filecoin network, generating an immutable, cryptographic chain of thought.

## Key Features

1. **Tamper-Evident Memory Chain**: Each memory snapshot links back to its parent using a `prev_cid` pointer. This builds an append-only cryptographic linked list directly on Filecoin.
2. **Zero-Database Session Resume**: Reconstructs complete agent context, facts, and chat histories entirely by walking the CID chain backward to the genesis snapshot.
3. **Decentralized Verification**: Integrates a "Verify Chain" utility to audit the integrity of the chain against multiple public gateways.
4. **DeepSeek v4 Brain**: Powered by `deepseek-ai/deepseek-v4-flash` via NVIDIA NIM with intermediate reasoning and cognitive trace extraction.

---

## Filecoin Primitives & SDK Integration

- **Filecoin Storage**: Pinned via the `@lighthouse-web3/sdk` to IPFS and the Filecoin network.
- **Content Addressing**: CIDs are the primary identity of each memory snapshot, establishing cryptographic verify paths.
- **Multi-Gateway Fallbacks**: Resolves snapshot queries using a sequential fallback strategy across public IPFS gateways (Cloudflare, IPFS.io, dweb.link, Pinata) to ensure high availability and bypass gateway rate limits.

---

## Tech Stack

- **Framework**: Next.js 15 / Next.js 16 (App Router) + Tailwind CSS (v4)
- **Agent API**: DeepSeek-v4-flash (NVIDIA NIM via OpenAI SDK compatibility)
- **Storage Client**: Lighthouse.storage SDK (Filecoin pinning)
- **Icons**: Lucide React

---

## Setup

1. **Clone this repository**:
   ```bash
   git clone https://github.com/cridiv/Syne.git
   cd Syne/app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment keys**:
   Create a `.env.local` inside the `app/` folder with the following properties:
   ```env
   # API credentials
   MODEL_API_KEY="your_nvidia_nim_api_key"
   LIGHTHOUSE_API_KEY="your_lighthouse_api_key"
   
   # (Optional) Custom dedicated gateway subdomain to bypass public rate limits
   LIGHTHOUSE_GATEWAY="https://<your-subdomain>.lighthouse.storage/ipfs"
   ```

4. **Run the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with MemoryOS.

---

## Verification & Manual Testing Scripts

You can run isolated CLI tests inside the `app/` folder:

*   **Test Model Brain (DeepSeek-v4-flash + Reasoning extraction)**:
    ```bash
    npx tsx test_agent.ts
    ```
*   **Test Filecoin Snapshots Chaining and Walk**:
    ```bash
    npx tsx test_chain.ts
    ```
*   **Test general network fetch permissions**:
    ```bash
    npx tsx test_fetch.ts
    ```
