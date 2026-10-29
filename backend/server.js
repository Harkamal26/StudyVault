
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import subjectRoutes from "./src/routes/subjectRoutes.js";
import documentRoutes from "./src/routes/documentRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const PYTHON_API_URL =  
  process.env.PYTHON_API_URL;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chats", chatRoutes);

// Check whether the Express server is running
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Node.js Express backend"
  });
});

// Send a question to the Python RAG API
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body ?? {};

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        error: "Please provide a valid question."
      });
    }

    const response = await fetch(
      `${PYTHON_API_URL}/ask`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: question.trim()
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || "RAG service request failed."
      });
    }

    return res.json(data);

  } catch (error) {
    console.error("RAG API connection error:", error.message);

    return res.status(502).json({
      error:
        "Could not connect to the Python RAG service. " +
        "Check that FastAPI is running on port 8000."
    });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `Express backend running at http://localhost:${PORT}`
    );
  });
});
