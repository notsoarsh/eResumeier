// Feature Extraction Service — converts parsed JSON into 12D numerical vectors

const pool = require('../db/pool');
const redisClient = require('../db/redis');
const logger = require('../utils/logger');

const FEATURE_DIMENSIONS = [
  'python', 'javascript', 'sql', 'machine_learning', 'data_analysis',
  'cloud_computing', 'communication', 'leadership', 'problem_solving',
  'years_experience', 'education_level', 'project_management',
];

// Skill keyword mappings for each dimension
const SKILL_MAPPINGS = {
  python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'matplotlib', 'jupyter', 'pip', 'conda', 'celery'],
  javascript: ['javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'express', 'next', 'nextjs', 'nuxt', 'svelte', 'jquery', 'webpack', 'vite', 'npm', 'yarn', 'deno', 'bun'],
  sql: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle', 'mongodb', 'redis', 'database', 'nosql', 'dynamodb', 'cassandra', 'elasticsearch', 'data warehouse', 'etl', 'bigquery', 'snowflake'],
  machine_learning: ['machine learning', 'deep learning', 'neural network', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'nlp', 'computer vision', 'reinforcement learning', 'ai', 'artificial intelligence', 'llm', 'transformer', 'bert', 'gpt', 'model training', 'ml ops', 'mlops', 'sagemaker', 'hugging face', 'langchain'],
  data_analysis: ['data analysis', 'data science', 'statistics', 'analytics', 'tableau', 'power bi', 'excel', 'r programming', 'spss', 'stata', 'visualization', 'data mining', 'a/b testing', 'hypothesis testing', 'regression', 'forecasting', 'business intelligence', 'bi'],
  cloud_computing: ['aws', 'amazon web services', 'gcp', 'google cloud', 'azure', 'cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'ci/cd', 'cicd', 'devops', 'jenkins', 'github actions', 'cloudformation', 'lambda', 'serverless', 'microservices', 'ec2', 's3'],
  communication: ['communication', 'presentation', 'public speaking', 'writing', 'stakeholder', 'client facing', 'cross-functional', 'collaboration', 'teamwork', 'interpersonal', 'negotiation', 'mentoring'],
  leadership: ['leadership', 'management', 'team lead', 'tech lead', 'director', 'vp', 'head of', 'manager', 'supervisor', 'executive', 'cto', 'ceo', 'founder', 'co-founder', 'people management', 'direct reports'],
  problem_solving: ['problem solving', 'analytical', 'critical thinking', 'debugging', 'troubleshooting', 'architecture', 'system design', 'algorithms', 'data structures', 'optimization', 'research', 'innovation'],
  project_management: ['project management', 'pmp', 'scrum', 'agile', 'kanban', 'jira', 'sprint', 'roadmap', 'planning', 'estimation', 'delivery', 'stakeholder management', 'risk management', 'prince2', 'waterfall'],
};

// Education level ordinal encoding
const EDUCATION_SCORES = { 'high_school': 2, 'diploma': 4, 'bachelor': 5, 'master': 7, 'phd': 9 };

class FeatureService {
  // Convert parsed JSON to 12D vector
  extractVector(parsedJson) {
    const skills = (parsedJson.skills || []).map(s => s.toLowerCase());
    const allText = skills.join(' ');
    const vector = [];

    for (const dimension of FEATURE_DIMENSIONS) {
      if (dimension === 'years_experience') {
        const years = parsedJson.experience_years || 0;
        vector.push(Math.round((Math.min(20, Math.max(0, years)) / 20) * 10));
      } else if (dimension === 'education_level') {
        vector.push(EDUCATION_SCORES[parsedJson.education_level] || 5);
      } else {
        vector.push(this._computeSkillScore(skills, allText, SKILL_MAPPINGS[dimension] || []));
      }
    }

    return vector;
  }

  // Score a dimension based on keyword matches (1-10)
  _computeSkillScore(skillsList, allText, keywords) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (skillsList.some(skill => skill.includes(keyword)) || allText.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount === 0) return 1;
    if (matchCount === 1) return 3;
    if (matchCount === 2) return 5;
    if (matchCount === 3) return 6;
    if (matchCount === 4) return 7;
    if (matchCount === 5) return 8;
    return 9;
  }

  // Store vector in DB and cache in Redis
  async storeVector(entityId, entityType, vectorData) {
    const dimensionalMeta = { dimensions: FEATURE_DIMENSIONS, version: 1 };

    const result = await pool.query(
      `INSERT INTO feature_vectors (entity_id, entity_type, vector_data, dimensional_meta, computed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (entity_id, entity_type)
       DO UPDATE SET vector_data = $3, dimensional_meta = $4, computed_at = NOW()
       RETURNING vector_id`,
      [entityId, entityType, JSON.stringify(vectorData), JSON.stringify(dimensionalMeta)]
    );

    // Cache in Redis
    try {
      if (redisClient.isReady) {
        await redisClient.setEx(`vector:${entityType}:${entityId}`, 7200, JSON.stringify(vectorData));
      }
    } catch (err) {
      logger.warn(`Redis cache failed: ${err.message}`);
    }

    logger.info(`Vector stored for ${entityType} ${entityId}: [${vectorData.join(', ')}]`);
    return result.rows[0].vector_id;
  }

  // Full pipeline: parsed JSON -> vector -> store
  async computeAndStore(entityId, entityType, parsedJson) {
    const vector = this.extractVector(parsedJson);
    const vectorId = await this.storeVector(entityId, entityType, vector);
    return { vectorId, vector };
  }

  async getVector(entityId, entityType) {
    const result = await pool.query(
      'SELECT * FROM feature_vectors WHERE entity_id = $1 AND entity_type = $2',
      [entityId, entityType]
    );
    return result.rows[0] || null;
  }

  async getAllVectors(entityType) {
    const result = await pool.query('SELECT * FROM feature_vectors WHERE entity_type = $1', [entityType]);
    return result.rows;
  }

  getDimensions() { return FEATURE_DIMENSIONS; }
}

module.exports = new FeatureService();
