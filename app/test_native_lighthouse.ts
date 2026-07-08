import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

async function testNativeUpload() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY || '';
  if (!apiKey) {
    console.error('LIGHTHOUSE_API_KEY is not defined!');
    process.exit(1);
  }

  console.log('Testing native upload with API Key:', apiKey.slice(0, 8) + '...');

  const testData = {
    test: "hello from native fetch",
    timestamp: new Date().toISOString()
  };

  const json = JSON.stringify(testData, null, 2);

  try {
    const formData = new FormData();
    const blob = new Blob([json], { type: 'application/json' });
    formData.append('file', blob, 'snapshot.json');

    const res = await fetch('https://upload.lighthouse.storage/api/v0/add?cid-version=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP Error ${res.status}:`, text);
      return;
    }

    const data = await res.json();
    console.log('Upload Success! Response Data:', data);
    console.log('Generated CID:', data.Hash);
  } catch (err: any) {
    console.error('Upload Failed:', err.message || err);
  }
}

testNativeUpload();
