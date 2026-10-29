
import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  askDocumentQuestion
} from "../controllers/documentController.js";

const router = express.Router();

router.use(protect);

router.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "PDF must be 10 MB or smaller."
            : error.message,
      });
    }

    next();
  });
}, uploadDocument);

router.get("/", getDocuments);
router.post("/:id/ask", askDocumentQuestion);
router.delete("/:id", deleteDocument);

export default router;
