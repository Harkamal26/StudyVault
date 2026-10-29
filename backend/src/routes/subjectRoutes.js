
import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController.js";

const router = express.Router();

// Every route in this file requires login
router.use(protect);

router.route("/")
  .post(createSubject)
  .get(getSubjects);

router.route("/:id")
  .get(getSubjectById)
  .patch(updateSubject)
  .delete(deleteSubject);

export default router;
