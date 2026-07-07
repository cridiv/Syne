import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function testFetch() {
  console.log('Testing general fetch in sandbox...');
  const urls = [
    'https://api.github.com/users/octocat',
    'https://httpbin.org/get',
    'https://cloudflare-ipfs.com/ipfs/bafkreifvzbeaeewg4j5kbozaoeqjtqqklp6ankbfdnhle33tmjvbvtcpju' // Our previously pinned text CID
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': 'Node-Fetch-Test' } });
      console.log(`  Response: status=${res.status}, ok=${res.ok}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`  Data snippet: ${text.slice(0, 100)}`);
      }
    } catch (err: any) {
      console.error(`  Fetch error:`, err.message || err);
    }
  }
}

testFetch();
