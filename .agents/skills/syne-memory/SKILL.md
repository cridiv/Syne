---
name: syne-memory
description: Sovereign memory-chain skill integrating Filecoin Warm Storage (FWSS) and Proof of Data Possession (PDP) verification via Synapse SDK.
---

# Syne Memory Skill

This skill extends the agent with sovereign, verifiable memory chaining primitives on the Filecoin Onchain Cloud (FOC) using Synapse SDK and PDP.

## Primitives Implemented

1. **FWSS (Filecoin Warm Storage Service) Archival**:
   - Compiles current session history and extracted fact/question entities into an agent state schema.
   - Computes state hashes and pins the JSON payload to the Filecoin warm storage tier.
2. **Merkle-Chained Linking**:
   - Appends the parent state's Content Identifier (`prev_cid`) to the header of the newly spawned snapshot.
3. **PDP (Proof of Data Possession) Audit**:
   - Queries the on-chain registry metadata endpoint to cryptographically verify if the active CIDs in the chain are physically pinned and intact on storage provider nodes.

## Usage Guide & Code References

- **State Chaining Logic**: Implemented in [lib/filecoin.ts](file:///Users/Cridiv/Documents/Syne/app/lib/filecoin.ts#L23-L60).
- **On-Chain Audit API**: Endpoint handler located in [app/api/session/verify/route.ts](file:///Users/Cridiv/Documents/Syne/app/app/api/session/verify/route.ts).
- **Client Integrity Audit**: Rendered on the client via the [ChainIntegrityBadge](file:///Users/Cridiv/Documents/Syne/app/components/ChainIntegrityBadge.tsx) component.
