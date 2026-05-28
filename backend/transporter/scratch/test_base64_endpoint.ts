import axios from 'axios';

async function main() {
  console.log('Sending test Base64 upload request to http://localhost:3001/upload/base64...');
  
  const base64Data = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  try {
    const res = await axios.post('http://localhost:3001/upload/base64', {
      base64: base64Data,
      filename: 'pixel.gif',
      mimeType: 'image/gif'
    });
    console.log('Base64 Upload Success!', res.status, res.data);
  } catch (err: any) {
    console.error('Base64 Upload Failed:', err.response?.status, err.response?.data || err.message);
  }
}

main();
