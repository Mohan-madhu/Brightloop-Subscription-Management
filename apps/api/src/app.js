import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/env.js';

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use(config.apiPrefix, routes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Central Error Handler
app.use(errorHandler);

export default app;
