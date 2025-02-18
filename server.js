import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.post('/decrypt', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const pythonProcess = spawn('python', ['decrypt.py'], {
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
  
  let result = '';
  let error = '';

  pythonProcess.stdin.write(JSON.stringify({ text }, null, 2), 'utf-8');
  pythonProcess.stdin.end();

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString('utf-8');
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString('utf-8');
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: error || 'Python script failed' });
    }
    try {
      const parsedResult = JSON.parse(result);
      res.json(parsedResult);
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse Python output' });
    }
  });

  pythonProcess.on('error', (err) => {
    res.status(500).json({ error: `Failed to start Python process: ${err.message}` });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});