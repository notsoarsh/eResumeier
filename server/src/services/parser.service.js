/**
 * Resume Parser Service
 * Report Section 3.1 (II): Receives raw document uploads (PDF/DOCX),
 * performs pre-processing (text extraction, normalisation), and submits
 * structured prompts to the configured LLM API.
 *
 * Report Section 3.4 (I): LLM-Based Parsing Pipeline
 * 1. Document Ingestion: PDF/DOCX -> plain text
 * 2. Prompt Engineering: Structured prompt for entity extraction
 * 3. LLM Inference: Gemini API with JSON mode
 * 4. Schema Validation & Storage
 *
 * Report Section 6.1: Error handling implements a two-stage retry mechanism
 * with exponential backoff (initial delay 1s, maximum 3 retries).
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const pool = require('../db/pool');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are a resume/job description analyzer for a recruitment platform. Your task is to read the provided text and extract structured information as JSON.

You MUST output ONLY valid JSON with no additional text, explanation, or markdown formatting.

The JSON must have exactly these keys:

{
  "skills": ["array of identified technical and soft skills as strings"],
  "experience_years": <number: total years of relevant professional experience>,
  "education_level": "<one of: high_school, diploma, bachelor, master, phd>",
  "certifications": [{"name": "cert name", "issuer": "issuing body", "level": "level if applicable"}],
  "domain_expertise": ["array of domain/industry areas of expertise"],
  "preferred_roles": ["array of job titles this person is suited for"],
  "summary": "<2-3 sentence professional summary>"
}

Rules:
- Extract ALL skills mentioned, both technical (Python, React, SQL) and soft (leadership, communication)
- For experience_years, calculate total professional years. If unclear, estimate conservatively.
- For education_level, pick the highest completed degree.
- If certifications are not mentioned, use an empty array.
- domain_expertise should capture industry verticals (e.g., "fintech", "healthcare", "e-commerce")
- preferred_roles should list 2-4 job titles this person would be a good fit for
- Be precise and factual. Do not hallucinate information not present in the text.`;

class ParserService {
  /**
   * Extract plain text from a PDF buffer
   */
  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return this._cleanText(data.text);
    } catch (err) {
      logger.error(`PDF extraction failed: ${err.message}`);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract plain text from a DOCX buffer
   */
  async extractTextFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return this._cleanText(result.value);
    } catch (err) {
      logger.error(`DOCX extraction failed: ${err.message}`);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Clean extracted text: remove control chars, excess whitespace, boilerplate
   */
  _cleanText(text) {
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // collapse multiple newlines
      .replace(/[ \t]{2,}/g, ' ') // collapse multiple spaces
      .trim();
  }

  /**
   * Send text to Gemini LLM and extract structured JSON
   * Implements exponential backoff retry (Report Section 6.1)
   */
  async parseWithLLM(text, type = 'resume') {
    const userPrompt = `Analyze the following ${type} and extract the structured profile:\n\n${text}`;

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this._callGemini(userPrompt);
        const parsed = this._extractJSON(response);
        const validated = this.validateSchema(parsed);
        return validated;
      } catch (err) {
        lastError = err;
        logger.warn(`LLM parse attempt ${attempt}/${maxRetries} failed: ${err.message}`);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`LLM parsing failed after ${maxRetries} attempts: ${lastError.message}`);
    throw new Error(`LLM parsing failed: ${lastError.message}`);
  }

  /**
   * Call Google Gemini API using fetch (native in Node 18+)
   */
  async _callGemini(userPrompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + '\n\n' + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Empty response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text.trim();
  }

  /**
   * Extract JSON from LLM response (handles markdown code fences)
   */
  _extractJSON(rawOutput) {
    let cleaned = rawOutput;

    // Remove markdown code fences if present
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      const filtered = lines.filter(l => !l.trim().startsWith('```'));
      cleaned = filtered.join('\n').trim();
    }

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      // Try to find JSON object in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to parse JSON from LLM response');
    }
  }

  /**
   * Validate parsed JSON against expected schema
   * Report Section 3.4 (I) Step 4: Schema Validation
   */
  validateSchema(parsed) {
    const validated = {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience_years: typeof parsed.experience_years === 'number'
        ? Math.max(0, Math.min(50, parsed.experience_years))
        : 0,
      education_level: ['high_school', 'diploma', 'bachelor', 'master', 'phd'].includes(parsed.education_level)
        ? parsed.education_level
        : 'bachelor',
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      domain_expertise: Array.isArray(parsed.domain_expertise) ? parsed.domain_expertise : [],
      preferred_roles: Array.isArray(parsed.preferred_roles) ? parsed.preferred_roles : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };

    return validated;
  }

  /**
   * Full pipeline: upload -> extract text -> parse with LLM -> store in DB
   */
  async processResume(userId, filePath, originalFilename, buffer, mimeType) {
    // Step 1: Extract text based on file type
    let rawText;
    if (mimeType === 'application/pdf') {
      rawText = await this.extractTextFromPDF(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      rawText = await this.extractTextFromDOCX(buffer);
    } else if (mimeType === 'text/plain') {
      rawText = this._cleanText(buffer.toString('utf-8'));
    } else {
      throw new Error('Unsupported file type. Use PDF, DOCX, or TXT.');
    }

    if (!rawText || rawText.length < 50) {
      throw new Error('Extracted text is too short. Please upload a valid resume.');
    }

    // Step 2: Insert initial record with pending status
    const insertResult = await pool.query(
      `INSERT INTO resumes (user_id, raw_text, file_path, original_filename, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING resume_id`,
      [userId, rawText, filePath, originalFilename]
    );
    const resumeId = insertResult.rows[0].resume_id;

    // Step 3: Parse with LLM
    try {
      const parsedJson = await this.parseWithLLM(rawText, 'resume');

      // Step 4: Update record with parsed data
      await pool.query(
        `UPDATE resumes SET parsed_json = $1, status = 'parsed', updated_at = NOW()
         WHERE resume_id = $2`,
        [JSON.stringify(parsedJson), resumeId]
      );

      // Step 5: Compute and store feature vector
      const featureService = require('./feature.service');
      await featureService.computeAndStore(resumeId, 'resume', parsedJson);

      logger.info(`Resume parsed and vectorized successfully: ${resumeId}`);
      return { resumeId, status: 'parsed', parsedJson };
    } catch (err) {
      // Mark as error if parsing fails
      await pool.query(
        `UPDATE resumes SET status = 'error', updated_at = NOW() WHERE resume_id = $1`,
        [resumeId]
      );

      logger.error(`Resume parsing failed for ${resumeId}: ${err.message}`);
      return { resumeId, status: 'error', error: err.message };
    }
  }
}

module.exports = new ParserService();
