import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});

// Prevent process from exiting by keeping event loop active
setInterval(() => { }, 1000 * 60 * 60); // Keep alive indefinitely

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
  process.exit(0);
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
});
