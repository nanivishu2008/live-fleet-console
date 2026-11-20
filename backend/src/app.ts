import express from "express";
import cors from "cors";

const app = express();

// Allow requests from our frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Test route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fleet Console API is running"
  });
});

export default app;