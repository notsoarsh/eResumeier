# eResumeier — High-Level Design (HLD)

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[React/Vue.js SPA]
        Mobile[Mobile App - Future]
    end

    subgraph "API Gateway"
        GW[API Gateway / Load Balancer]
    end

    subgraph "Business Logic Layer"
        AUTH[Auth Service]
        RP[Resume Parser Service]
        FE[Feature Extraction Service]
        ME[Matching Engine Service]
        NS[Notification Service]
    end

    subgraph "AI/ML Layer"
        LLM[LLM API - Gemini/GPT]
        VEC[Vectorization Engine]
        MD[Manhattan Distance Calculator]
        GS[Gale-Shapley Algorithm]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        REDIS[(Redis Cache)]
        S3[Object Storage - S3]
    end

    UI --> GW
    Mobile --> GW
    GW --> AUTH
    GW --> RP
    GW --> FE
    GW --> ME
    GW --> NS

    RP --> LLM
    FE --> VEC
    ME --> MD
    ME --> GS

    AUTH --> PG
    AUTH --> REDIS
    RP --> PG
    RP --> S3
    FE --> PG
    ME --> PG
    ME --> REDIS
```

## 2. Component Architecture

```mermaid
graph LR
    subgraph "Client"
        A[Browser / Mobile]
    end

    subgraph "Backend Services"
        B[FastAPI Server]
        C[Resume Parser]
        D[Feature Extractor]
        E[Scoring Engine]
        F[Matching Engine]
    end

    subgraph "External"
        G[Gemini / OpenAI API]
    end

    subgraph "Storage"
        H[(PostgreSQL)]
        I[(Redis)]
        J[File Storage]
    end

    A -->|HTTP/REST| B
    B --> C
    B --> D
    B --> E
    B --> F
    C -->|API Call| G
    C --> J
    D --> H
    E --> I
    F --> H
```

## 3. Data Flow — Complete Matching Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant API as FastAPI Backend
    participant LLM as LLM Service (Gemini)
    participant FE as Feature Extractor
    participant SC as Scoring Engine
    participant MA as Matching Algorithm
    participant DB as Database

    U->>API: Upload Resume / Job Description (raw text)
    API->>LLM: Send text + system prompt
    LLM-->>API: Structured JSON (12 dimensions, 1-10)
    API->>FE: Convert JSON → Feature Vector [float × 12]
    FE-->>DB: Store vector + metadata

    U->>API: Trigger Matching
    API->>DB: Fetch all candidate & job vectors
    API->>SC: Compute Manhattan Distance for all pairs
    Note over SC: S = 1 / (1 + Σ|Ri - Ji|)
    SC-->>API: Similarity Score Matrix (n × m)

    API->>MA: Build Preference Matrices
    API->>MA: Run Gale-Shapley Algorithm
    Note over MA: Candidate-proposing variant
    MA-->>API: Stable Matching Pairs

    API->>DB: Store match results
    API-->>U: Return matches + scores + justification
```

## 4. Resume Parsing Pipeline (Detailed)

```mermaid
flowchart TD
    A[Raw Resume Text / PDF / DOCX] --> B[Document Preprocessor]
    B --> C[Text Extraction & Cleaning]
    C --> D[LLM API Call]
    D --> E{Valid JSON Response?}
    E -->|Yes| F[Feature Validation & Clamping]
    E -->|No| G[Retry with Fallback Model]
    G --> D
    F --> H[Generate 12D Feature Vector]
    H --> I[Store in Database]
    I --> J[Ready for Matching]

    subgraph "12 Feature Dimensions"
        K[Python Proficiency]
        L[JavaScript Proficiency]
        M[SQL Skills]
        N[Machine Learning]
        O[Data Analysis]
        P[Cloud Computing]
        Q[Communication]
        R[Leadership]
        S[Problem Solving]
        T[Years Experience]
        U2[Education Level]
        V[Project Management]
    end

    H --> K
    H --> L
    H --> M
    H --> N
    H --> O
    H --> P
    H --> Q
    H --> R
    H --> S
    H --> T
    H --> U2
    H --> V
```

## 5. Matching Algorithm Flow

```mermaid
flowchart TD
    A[Candidate Vectors Pool] --> C[Manhattan Distance Calculator]
    B[Job Vectors Pool] --> C

    C --> D[Score Matrix n×m]
    D --> E[Build Candidate Preference Lists]
    D --> F[Build Job Preference Lists]

    E --> G[Gale-Shapley Algorithm]
    F --> G

    G --> H{All Candidates Matched?}
    H -->|No| I[Select Free Candidate]
    I --> J[Propose to Next Preferred Job]
    J --> K{Job Unmatched?}
    K -->|Yes| L[Accept Proposal]
    K -->|No| M{Prefers New Proposer?}
    M -->|Yes| N[Replace Current Match]
    M -->|No| O[Reject Proposal]
    N --> H
    O --> H
    L --> H
    H -->|Yes| P[Stable Matching Output]
    P --> Q[Verify No Blocking Pairs]
    Q --> R[Return Final Results]
```

## 6. Database Schema (ER Diagram)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        enum role "candidate|employer|admin"
        timestamp created_at
        boolean is_active
    }

    RESUMES {
        uuid id PK
        uuid user_id FK
        string file_path
        text raw_text
        json extracted_features
        float[] feature_vector
        timestamp uploaded_at
        enum status "pending|parsed|error"
    }

    JOB_POSTINGS {
        uuid id PK
        uuid employer_id FK
        string title
        string company
        text description
        json extracted_features
        float[] feature_vector
        timestamp posted_at
        enum status "active|closed|draft"
    }

    MATCH_RUNS {
        uuid id PK
        uuid initiated_by FK
        timestamp run_at
        string algorithm
        string distance_metric
        int candidate_count
        int job_count
        float avg_score
        boolean is_stable
    }

    MATCH_RESULTS {
        uuid id PK
        uuid match_run_id FK
        uuid resume_id FK
        uuid job_id FK
        float similarity_score
        int candidate_preference_rank
        int job_preference_rank
        json justification
    }

    USERS ||--o{ RESUMES : uploads
    USERS ||--o{ JOB_POSTINGS : posts
    USERS ||--o{ MATCH_RUNS : initiates
    MATCH_RUNS ||--o{ MATCH_RESULTS : contains
    RESUMES ||--o{ MATCH_RESULTS : matched_in
    JOB_POSTINGS ||--o{ MATCH_RESULTS : matched_in
```

## 7. Deployment Architecture

```mermaid
graph TB
    subgraph "CDN / Edge"
        CF[CloudFront / CDN]
    end

    subgraph "Load Balancing"
        ALB[Application Load Balancer]
    end

    subgraph "Compute - Auto Scaling Group"
        EC2A[App Server 1]
        EC2B[App Server 2]
        EC2C[App Server N]
    end

    subgraph "Caching"
        REDIS[Redis Cluster]
    end

    subgraph "Database"
        RDS_P[(PostgreSQL Primary)]
        RDS_R[(PostgreSQL Replica)]
    end

    subgraph "Storage"
        S3[S3 - Resume Files]
    end

    subgraph "External APIs"
        GEMINI[Google Gemini API]
    end

    subgraph "Monitoring"
        CW[CloudWatch]
        LOG[Log Aggregator]
    end

    CF --> ALB
    ALB --> EC2A
    ALB --> EC2B
    ALB --> EC2C

    EC2A --> REDIS
    EC2B --> REDIS
    EC2C --> REDIS

    EC2A --> RDS_P
    EC2B --> RDS_P
    EC2C --> RDS_P
    RDS_P --> RDS_R

    EC2A --> S3
    EC2A --> GEMINI

    EC2A --> CW
    EC2A --> LOG
```

## 8. Security Architecture

```mermaid
flowchart TD
    A[Client Request] --> B[HTTPS/TLS 1.3]
    B --> C[API Gateway]
    C --> D[Rate Limiter]
    D --> E[JWT Authentication]
    E --> F{Valid Token?}
    F -->|No| G[401 Unauthorized]
    F -->|Yes| H[RBAC Authorization]
    H --> I{Has Permission?}
    I -->|No| J[403 Forbidden]
    I -->|Yes| K[Input Validation & Sanitization]
    K --> L[Business Logic]
    L --> M[AES-256 Encrypted Storage]

    subgraph "Security Measures"
        N[Password Hashing - bcrypt]
        O[SQL Injection Prevention]
        P[XSS Protection]
        Q[CORS Policy]
        R[GDPR Compliance]
    end
```

## 9. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React / Vue.js | Single Page Application |
| Backend | FastAPI (Python) | REST API Server |
| AI/LLM | Google Gemini / OpenAI GPT | Text parsing & feature extraction |
| Algorithm | Custom Python | Manhattan Distance + Gale-Shapley |
| Database | PostgreSQL | Persistent storage |
| Cache | Redis | Session & score caching |
| File Storage | AWS S3 | Resume file storage |
| Auth | JWT + bcrypt | Authentication & authorization |
| Deployment | AWS EC2 / Docker | Container orchestration |
| Monitoring | CloudWatch + ELK | Logging & alerting |

## 10. API Endpoints Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login (returns JWT) |
| POST | `/api/resumes/upload` | Upload & parse resume |
| GET | `/api/resumes/{id}` | Get parsed resume details |
| POST | `/api/jobs` | Create job posting |
| GET | `/api/jobs` | List/search jobs |
| POST | `/api/match/run` | Trigger matching algorithm |
| GET | `/api/match/results/{run_id}` | Get match results |
| GET | `/api/match/history` | Get match history |
| GET | `/api/admin/users` | Admin: list users |
| GET | `/api/admin/health` | System health check |

## 11. Non-Functional Requirements Mapping

```mermaid
mindmap
    root((eResumeier NFRs))
        Performance
            Resume parsing < 5s
            Match generation < 10s
            API response < 200ms
        Scalability
            10,000+ concurrent users
            1M+ resumes in DB
            Horizontal auto-scaling
        Reliability
            99.9% uptime SLA
            Graceful degradation
            Auto failover
        Security
            AES-256 encryption
            GDPR/CCPA compliance
            JWT authentication
            Rate limiting
        Usability
            < 3 min onboarding
            WCAG 2.1 accessible
            Responsive design
```
