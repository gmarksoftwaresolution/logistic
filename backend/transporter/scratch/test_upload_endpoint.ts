import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Sending test upload request to http://localhost:3001/upload...');
  const formData = new FormData();
  
  const dummyFilePath = path.join(__dirname, 'dummy.jpg');
  fs.writeFileSync(dummyFilePath, 'dummy image content');

  formData.append('file', fs.createReadStream(dummyFilePath), {
    filename: 'dummy.jpg',
    contentType: 'image/jpeg',
  });

  try {
    const res = await axios.post('http://localhost:3001/upload', formData, {
      headers: formData.getHeaders(),
    });
    console.log('Upload Success!', res.status, res.data);
  } catch (err: any) {
    console.error('Upload Failed:', err.response?.status, err.response?.data || err.message);
  } finally {
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }
  }
}

main();
