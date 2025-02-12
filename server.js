require("dotenv").config(); // Load environment variables

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000; // Use env variable or fallback to 5000

app.use(cors());

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Allowed file types
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// Middleware for file validation
const fileValidator = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res
      .status(400)
      .json({
        error: "Unsupported file format. Only PDF and DOCX are allowed.",
      });
  }

  next();
};

// Function to extract text from PDF
const extractTextFromPDF = async (fileBuffer) => {
  try {
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text || "No text found in the PDF.";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to process the PDF file.");
  }
};

// Function to extract text from DOCX/DOC
const extractTextFromDocx = async (fileBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || "No text found in the DOCX file.";
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to process the DOCX file.");
  }
};

app.get("/", (req, res) => {
  res.send("Hello From Server");
});
// File upload route
app.post(
  "/api/resumetext",
  upload.single("resume"),
  fileValidator,
  async (req, res) => {
    try {
      let extractedText;

      if (req.file.mimetype === "application/pdf") {
        extractedText = await extractTextFromPDF(req.file.buffer);
      } else if (
        req.file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.mimetype === "application/msword"
      ) {
        extractedText = await extractTextFromDocx(req.file.buffer);
      } else {
        return res.status(400).json({ error: "Unsupported file type." });
      }

      res.status(200).json({ text: extractedText });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Start server with environment variable port
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
