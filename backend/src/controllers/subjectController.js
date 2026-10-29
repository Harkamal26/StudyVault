
import Subject from "../models/Subject.js";

// CREATE a subject
export const createSubject = async (req, res) => {
  try {
    const { name, description, semester } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 12
    ) {
      return res.status(400).json({
        message: "A subject name and valid semester (1-12) are required.",
      });
    }

    const subject = await Subject.create({
      name: name.trim(),
      description,
      semester,
      owner: req.user._id,
    });

    return res.status(201).json({
      message: "Subject created successfully.",
      subject,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Create subject error:", error.message);

    return res.status(500).json({
      message: "Could not create subject.",
    });
  }
};

// READ all subjects belonging to the logged-in user
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({
      owner: req.user._id,
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error("Get subjects error:", error.message);

    return res.status(500).json({
      message: "Could not fetch subjects.",
    });
  }
};

// READ one subject
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    return res.status(200).json({ subject });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    console.error("Get subject error:", error.message);

    return res.status(500).json({
      message: "Could not fetch subject.",
    });
  }
};

// UPDATE a subject
export const updateSubject = async (req, res) => {
  try {
    const allowedFields = ["name", "description", "semester"];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    if (
      Object.hasOwn(updates, "name") &&
      (typeof updates.name !== "string" || !updates.name.trim())
    ) {
      return res.status(400).json({
        message: "Subject name cannot be empty.",
      });
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
    }

    if (
      Object.hasOwn(updates, "description") &&
      typeof updates.description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }

    if (
      Object.hasOwn(updates, "semester") &&
      (!Number.isInteger(updates.semester) ||
        updates.semester < 1 ||
        updates.semester > 12)
    ) {
      return res.status(400).json({
        message: "Semester must be an integer from 1 to 12.",
      });
    }

    const subject = await Subject.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    return res.status(200).json({
      message: "Subject updated successfully.",
      subject,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Update subject error:", error.message);

    return res.status(500).json({
      message: "Could not update subject.",
    });
  }
};

// DELETE a subject
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    return res.status(200).json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid subject ID.",
      });
    }

    console.error("Delete subject error:", error.message);

    return res.status(500).json({
      message: "Could not delete subject.",
    });
  }
};
