const { loadEnvConfig } = require('@next/env');
// Load environment variables from .env.local and other env files
loadEnvConfig(process.cwd());

const lighthouse = require('@lighthouse-web3/sdk');

async function main() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  console.log('Checking LIGHTHOUSE_API_KEY in environment...');
  if (!apiKey) {
    console.error('Error: LIGHTHOUSE_API_KEY environment variable is not defined!');
    process.exit(1);
  }
  console.log(`LIGHTHOUSE_API_KEY is present (length: ${apiKey.length})`);


  const testBlob = JSON.stringify({
    test: true,
    message: 'MemoryOS verify Lighthouse connection',
    timestamp: new Date().toISOString()
  });

  console.log('Uploading test JSON blob to Lighthouse...');
  try {
    const response = await lighthouse.uploadText(testBlob, apiKey);
    console.log('Upload successful!');
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    if (response.data && response.data.Hash) {
      console.log(`CID (Hash): ${response.data.Hash}`);
      console.log(`Gateway URL: https://gateway.lighthouse.storage/ipfs/${response.data.Hash}`);
    } else {
      console.error('Warning: Response did not contain Hash.');
    }
  } catch (error) {
    console.error('Error uploading to Lighthouse:', error);
    process.exit(1);
  }
}

main();
