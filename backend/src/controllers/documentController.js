
import fs from "node:fs/promises";
import Subject from "../models/Subject.js";
import Document from "../models/Document.js";

export const uploadDocument = async (req, res) => {
  let savedDocument;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a PDF file.",
      });
    }

    const { subjectId, title } = req.body;

    if (!subjectId) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        message: "Please select a subject.",
      });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      owner: req.user._id,
    });

    if (!subject) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    savedDocument = await Document.create({
      title:
        typeof title === "string" && title.trim()
          ? title.trim().slice(0, 200)
          : req.file.originalname.slice(0, 200),

      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: "application/pdf",
      size: req.file.size,
      owner: req.user._id,
      subject: subject._id,
    });

    return res.status(201).json({
      message: "PDF uploaded successfully.",
      document: savedDocument,
    });
  } catch (error) {
    if (req.file?.path && !savedDocument) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    console.error("Document upload error:", error.message);

    return res.status(500).json({
      message: "Could not upload document.",
    });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const filter = { owner: req.user._id };

    if (req.query.subjectId) {
      filter.subject = req.query.subjectId;
    }

    const documents = await Document.find(filter)
      .populate("subject", "name semester")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Fetch documents error:", error.message);

    return res.status(500).json({
      message: "Could not fetch documents.",
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    await fs.unlink(document.filePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });

    await document.deleteOne();

    return res.status(200).json({
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete document error:", error.message);

    return res.status(500).json({
      message: "Could not delete document.",
    });
  }
};

export const askDocumentQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.trim().length > 2000
    ) {
      return res.status(400).json({
        message: "Question must contain 1–2000 characters.",
      });
    }

    // Find the document AND verify that the logged-in user owns it.
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const pythonApiUrl =
      process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

    const pythonResponse = await fetch(
      `${pythonApiUrl}/ask-document`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          file_path: document.filePath,
        }),
        signal: AbortSignal.timeout(180000),
      }
    );

    const data = await pythonResponse.json().catch(() => ({}));

    if (!pythonResponse.ok) {
      console.error("Python RAG service returned:", pythonResponse.status);

      return res.status(502).json({
        message: "The AI service could not answer this question.",
      });
    }

    return res.status(200).json({
      documentId: document._id,
      documentTitle: document.title,
      question: data.question,
      answer: data.answer,
      sources: data.sources,
    });
  } catch (error) {
    console.error("Document question failed:", error.message);

    if (error.name === "TimeoutError") {
      return res.status(504).json({
        message: "The AI request took too long. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to process your question.",
    });
  }
};
