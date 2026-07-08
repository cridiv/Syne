# Syne

An AI agent with a public, verifiable reasoning memory — written permanently to Filecoin in real time.

Syne is a research agent that remembers everything—across browser sessions, devices, and time—completely serverless. Every conversational step and reasoning block is pinned to the Filecoin network, generating an immutable, cryptographic chain of thought.

## Key Features

1. **Tamper-Evident Memory Chain**: Each memory snapshot links back to its parent using a `prev_cid` pointer. This builds an append-only cryptographic linked list directly on Filecoin.
2. **Zero-Database Session Resume**: Reconstructs complete agent context, facts, and chat histories by walking the local CID chain, caching snapshots for instant reload.
3. **Decentralized Verification**: Integrates a "Verify Chain" utility that checks the on-chain status of all memory blocks against the Filecoin/Lighthouse registry to verify that they are actively pinned and have not been tampered with.
4. **Llama-3.1-8b NIM Brain**: Powered by Meta's fast and instruction-aligned `meta/llama-3.1-8b-instruct` model via NVIDIA NIM for responsive reasoning.

---

## Filecoin Primitives & SDK Integration

- **Filecoin Storage**: Pinned via the `@lighthouse-web3/sdk` to IPFS and the Filecoin network.
- **Content Addressing**: CIDs are the primary identity of each memory snapshot, establishing cryptographic verify paths.
- **On-Chain Pin Verification**: Resolves the exact pin status of CIDs via the Lighthouse API key to prove storage deals are active on-chain, bypassing gateway paywalls and propagation latency.
- **Multi-Gateway Fallbacks**: For client environments missing a local cache, the server pulls memory blocks sequentially across fallback public IPFS gateways (w3s.link, crust, Pinata, ipfs.io) once propagation completes.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + Tailwind CSS (v4)
- **Agent API**: Llama-3.1-8b-instruct (NVIDIA NIM via OpenAI SDK compatibility)
- **Storage Client**: Lighthouse.storage SDK (Filecoin pinning)
- **Icons**: Lucide React / Lucide

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
   ```

4. **Run the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with Syne.

---

## Verification & Manual Testing Scripts

You can run isolated CLI tests inside the `app/` folder:

*   **Test Model Brain (Llama-3.1-8b + Timing metrics)**:
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
