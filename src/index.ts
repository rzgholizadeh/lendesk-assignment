import express, { Request, Response } from 'express';
import { createClient } from 'redis';

const app = express();
const port: number = 3000;

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

const connectToRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

app.get('/', (req: Request, res: Response): void => {
  res.send('hello world');
});

const startServer = async (): Promise<void> => {
  await connectToRedis();

  app.listen(port, (): void => {
    console.log(`Server is running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});