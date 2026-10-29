
import express from "express";
import {
  createChat,
  listChats,
  getChat,
  deleteChat,
  addChatMessage,
} from "../controllers/chatController.js";
import  protect  from "../middleware/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.post("/", createChat);
router.get("/", listChats);
router.post("/:id/messages", addChatMessage);
router.get("/:id", getChat);
router.delete("/:id", deleteChat);

export default router;
