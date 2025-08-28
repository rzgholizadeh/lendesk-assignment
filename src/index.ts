import express, { Request, Response } from 'express';

const app = express();
const port: number = 3000;

app.get('/', (req: Request, res: Response): void => {
  res.send('hello world');
});

app.listen(port, (): void => {
  console.log(`Server is running on http://localhost:${port}`);
});