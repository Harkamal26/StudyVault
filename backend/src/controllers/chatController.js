
import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Document from "../models/Document.js";

// Create a new conversation for a document
export const createChat = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        message: "A valid documentId is required.",
      });
    }

    // Ensure the document belongs to the logged-in user
    const document = await Document.findOne({
      _id: documentId,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    const chat = await Chat.create({
      title: document.title,
      owner: req.user._id,
      document: document._id,
      messages: [],
    });

    return res.status(201).json({
      message: "Chat created successfully.",
      chat,
    });
  } catch (error) {
    console.error("Create chat error:", error);
    return res.status(500).json({
      message: "Unable to create chat.",
    });
  }
};

// List conversations belonging to the logged-in user
export const listChats = async (req, res) => {
  try {
    const filter = { owner: req.user._id };

    if (req.query.documentId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.documentId)) {
        return res.status(400).json({
          message: "Invalid documentId.",
        });
      }

      filter.document = req.query.documentId;
    }

    const chats = await Chat.find(filter)
      .populate("document", "title originalName")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ chats });
  } catch (error) {
    console.error("List chats error:", error);
    return res.status(500).json({
      message: "Unable to load chats.",
    });
  }
};

// Get one conversation, only if it belongs to the logged-in user
export const getChat = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid chat ID." });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
      .populate("document", "title originalName")
      .lean();

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    return res.status(200).json({ chat });
  } catch (error) {
    console.error("Get chat error:", error);
    return res.status(500).json({
      message: "Unable to load chat.",
    });
  }
};

// Delete one conversation belonging to the logged-in user
export const deleteChat = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid chat ID." });
    }

    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    return res.status(200).json({
      message: "Chat deleted successfully.",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    return res.status(500).json({
      message: "Unable to delete chat.",
    });
  }
};

export const addChatMessage = async (req, res) => {
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

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid chat ID.",
      });
    }

    // Find a chat owned by the logged-in user
    const chat = await Chat.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found.",
      });
    }

    // Verify that the associated document belongs to the same user
    const document = await Document.findOne({
      _id: chat.document,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        message: "Associated document not found.",
      });
    }

    const pythonApiUrl = process.env.PYTHON_API_URL;

    if (!pythonApiUrl) {
      return res.status(500).json({
        message: "RAG service is not configured.",
      });
    }

    // Ask the RAG service using the saved document path.
    // Never accept a file path supplied by the frontend.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    let ragResponse;

    try {
      ragResponse = await fetch(
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
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const ragData = await ragResponse.json().catch(() => ({}));

    if (!ragResponse.ok) {
      console.error("RAG service returned status:", ragResponse.status);

      return res.status(502).json({
        message: "The AI service could not answer right now. Please try again.",
      });
    }

    if (
      typeof ragData.answer !== "string" ||
      !ragData.answer.trim()
    ) {
      return res.status(502).json({
        message: "The AI service returned an invalid answer.",
      });
    }

    // Convert Python source keys to the Chat model's field names
    const sources = (Array.isArray(ragData.sources) ? ragData.sources : [])
      .map((source) => ({
        pageNumber: String(
          source.page_number ?? source.pageNumber ?? ""
        ),
        chunkIndex: Number(
          source.chunk_index ?? source.chunkIndex
        ),
        similarity:
          typeof (source.similarity ?? source.score) === "number"
            ? (source.similarity ?? source.score)
            : null,
      }))
      .filter(
        (source) =>
          source.pageNumber &&
          Number.isInteger(source.chunkIndex) &&
          source.chunkIndex >= 0
      );

    // Persist both sides of the conversation
    chat.messages.push(
      {
        role: "user",
        content: question.trim(),
        sources: [],
      },
      {
        role: "assistant",
        content: ragData.answer.trim(),
        sources,
      }
    );

    // Set a useful title for the first question
    if (chat.messages.length === 2) {
      chat.title =
        question.trim().slice(0, 80) ||
        document.title ||
        "New conversation";
    }

    await chat.save();

    return res.status(200).json({
      message: "Question answered and conversation saved.",
      chatId: chat._id,
      title: chat.title,
      messages: chat.messages.slice(-2),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        message: "The AI service took too long to respond. Please try again.",
      });
    }

    console.error("Add chat message error:", error);

    return res.status(500).json({
      message: "Unable to process your question.",
    });
  }
};
