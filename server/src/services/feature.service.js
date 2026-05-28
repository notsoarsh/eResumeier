/**
 * Feature Extraction Service
 * Report Section 3.1 (II): Consumes the canonical JSON output from the parser
 * and applies normalisation, encoding, and vectorisation transformations to
 * produce a fixed-length numerical feature vector for each resume or job description.
 *
 * Report Section 3.4 (II): Feature Extraction and Normalisation
 * Each parsed resume or job description is transformed into a fixed-length
 * numerical feature vector F = [f1, f2, f3, ..., f12]
 *
 * Report Section 6.2: The Feature Extraction Module is implemented as a pure
 * functional module with no side effects, taking a validated parsed JSON object
 * as input and returning a FeatureVector object.
 */

const pool = require('../db/pool');
const redisClient = require('../db/redis');
const logger = require('../utils/logger');

// 12 Feature Dimensions (matching report and MVP)
const FEATURE_DIMENSIONS = [
  'python',
  'javascript',
  'sql',
  'machine_learning',
  'data_analysis',
  'cloud_computing',
  'communication',
  'leadership',
  'problem_solving',
  'years_experience',
  'education_level',
  'project_management',
];

// Skill keyword mappings: which extracted skills map to which dimension
const SKILL_MAPPINGS = {
  python: [
    'python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy',
    'matplotlib', 'jupyter', 'pip', 'conda', 'celery',
  ],
  javascript: [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs',
    'express', 'next', 'nextjs', 'nuxt', 'svelte', 'jquery', 'webpack',
    'vite', 'npm', 'yarn', 'deno', 'bun',
  ],
  sql: [
    'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle', 'mongodb',
    'redis', 'database', 'nosql', 'dynamodb', 'cassandra', 'elasticsearch',
    'data warehouse', 'etl', 'bigquery', 'snowflake',
  ],
  machine_learning: [
    'machine learning', 'deep learning', 'neural network', 'tensorflow',
    'pytorch', 'keras', 'scikit-learn', 'sklearn', 'nlp', 'computer vision',
    'reinforcement learning', 'ai', 'artificial intelligence', 'llm',
    'transformer', 'bert', 'gpt', 'model training', 'ml ops', 'mlops',
    'sagemaker', 'hugging face', 'langchain',
  ],
  data_analysis: [
    'data analysis', 'data science', 'statistics', 'analytics', 'tableau',
    'power bi', 'excel', 'r programming', 'spss', 'stata', 'visualization',
    'data mining', 'a/b testing', 'hypothesis testing', 'regression',
    'forecasting', 'business intelligence', 'bi',
  ],
  cloud_computing: [
    'aws', 'amazon web services', 'gcp', 'google cloud', 'azure', 'cloud',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'ci/cd', 'cicd',
    'devops', 'jenkins', 'github actions', 'cloudformation', 'lambda',
    'serverless', 'microservices', 'ec2', 's3',
  ],
  communication: [
    'communication', 'presentation', 'public speaking', 'writing',
    'stakeholder', 'client facing', 'cross-functional', 'collaboration',
    'teamwork', 'interpersonal', 'negotiation', 'mentoring',
  ],
  leadership: [
    'leadership', 'management', 'team lead', 'tech lead', 'director',
    'vp', 'head of', 'manager', 'supervisor', 'executive', 'cto', 'ceo',
    'founder', 'co-founder', 'people management', 'direct reports',
  ],
  problem_solving: [
    'problem solving', 'analytical', 'critical thinking', 'debugging',
    'troubleshooting', 'architecture', 'system design', 'algorithms',
    'data structures', 'optimization', 'research', 'innovation',
  ],
  project_management: [
    'project management', 'pmp', 'scrum', 'agile', 'kanban', 'jira',
    'sprint', 'roadmap', 'planning', 'estimation', 'delivery',
    'stakeholder management', 'risk management', 'prince2', 'waterfall',
  ],
};

// Education level ordinal encoding (Report Section 6.2)
const EDUCATION_SCORES = {
  'high_school': 2,
  'diploma': 4,
  'bachelor': 5,
  'master': 7,
  'phd': 9,
};

class FeatureService {
  /**
   * Extract a 12D feature vector from parsed JSON
   * Report Section 6.2: Pure functional, stateless, deterministic
   *
   * @param {Object} parsedJson - The LLM-parsed JSON from parser service
   * @param {string} entityType - 'resume' or 'job'
   * @returns {number[]} 12-dimensional feature vector
   */
  extractVector(parsedJson, entityType) {
    const skills = (parsedJson.skills || []).map(s => s.toLowerCase());
    const allText = skills.join(' ');

    const vector = [];

    // Dimensions 0-5: Technical skills (python, js, sql, ml, data, cloud)
    // Dimensions 6-8: Soft skills (communication, leadership, problem_solving)
    // Dimension 9: project_management
    for (const dimension of FEATURE_DIMENSIONS) {
      if (dimension === 'years_experience') {
        // Report Section 6.2: Experience normalised to [0, 20] range, then to [0, 10]
        const years = parsedJson.experience_years || 0;
        const clamped = Math.max(0, Math.min(20, years));
        vector.push(Math.round((clamped / 20) * 10));
      } else if (dimension === 'education_level') {
        // Report Section 6.2: Ordinal encoding maps degree levels to scalar
        const level = parsedJson.education_level || 'bachelor';
        vector.push(EDUCATION_SCORES[level] || 5);
      } else {
        // Skill-based dimensions: count keyword matches
        const keywords = SKILL_MAPPINGS[dimension] || [];
        const score = this._computeSkillScore(skills, allText, keywords);
        vector.push(score);
      }
    }

    return vector;
  }

  /**
   * Compute a skill score (1-10) based on keyword presence
   * More matches = higher score, capped at 10
   */
  _computeSkillScore(skillsList, allText, keywords) {
    let matchCount = 0;

    for (const keyword of keywords) {
      // Check if any skill contains this keyword
      const found = skillsList.some(skill => skill.includes(keyword)) ||
                    allText.includes(keyword);
      if (found) {
        matchCount++;
      }
    }

    if (matchCount === 0) return 1; // Minimum score (no presence)
    if (matchCount === 1) return 3;
    if (matchCount === 2) return 5;
    if (matchCount === 3) return 6;
    if (matchCount === 4) return 7;
    if (matchCount === 5) return 8;
    if (matchCount >= 6) return 9;
    return Math.min(10, matchCount + 2);
  }

  /**
   * Store computed vector in the feature_vectors table
   * Report Section 4.2: Separated from core entities to allow recomputation
   */
  async storeVector(entityId, entityType, vectorData) {
    const dimensionalMeta = {
      dimensions: FEATURE_DIMENSIONS,
      version: 1,
      computed_method: 'keyword_matching_v1',
    };

    // Upsert: insert or update if vector already exists for this entity
    const result = await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (entity_id, entity_type)
       DO UPDATE SET vector_data = $3, dimensional_meta = $4, computed_at = NOW()
       RETURNING vector_id`,
      [entityId, entityType, JSON.stringify(vectorData), JSON.stringify(dimensionalMeta)]
    );

    // Cache in Redis (Report Section 2.2: Redis caching for pre-computed feature vectors)
    try {
      if (redisClient.isReady) {
        await redisClient.setEx(`vector:${entityType}:${entityId}`, 7200, JSON.stringify(vectorData));
      }
    } catch (err) {
      logger.warn(`Redis cache write failed for vector: ${err.message}`);
    }

    logger.info(`Feature vector stored for ${entityType} ${entityId}: [${vectorData.join(', ')}]`);
    return result.rows[0].vector_id;
  }

  /**
   * Full pipeline: parsed JSON -> vector -> store
   */
  async computeAndStore(entityId, entityType, parsedJson) {
    const vector = this.extractVector(parsedJson, entityType);
    const vectorId = await this.storeVector(entityId, entityType, vector);
    return { vectorId, vector };
  }

  /**
   * Retrieve stored vector for an entity
   */
  async getVector(entityId, entityType) {
    const result = await pool.query(
      'SELECT * FROM feature_vectors WHERE entity_id = $1 AND entity_type = $2',
      [entityId, entityType]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all vectors of a given type
   */
  async getAllVectors(entityType) {
    const result = await pool.query(
      'SELECT * FROM feature_vectors WHERE entity_type = $1',
      [entityType]
    );
    return result.rows;
  }

  /**
   * Get feature dimension names (for frontend display)
   */
  getDimensions() {
    return FEATURE_DIMENSIONS;
  }
}

module.exports = new FeatureService();
