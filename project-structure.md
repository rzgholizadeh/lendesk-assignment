# Project Structure

```
lendesk-assignment/
├── .claude/
│   └── settings.local.json        # Claude Code settings
├── src/                           # Source code
│   ├── __tests__/                 # Application tests
│   │   └── server.test.ts         # Server integration tests
│   ├── api/                       # API layer
│   │   ├── index.ts               # API router factory
│   │   └── auth/                  # Authentication module
│   │       ├── __tests__/         # Auth module tests
│   │       │   ├── auth.controller.test.ts
│   │       │   ├── auth.repository.test.ts
│   │       │   └── auth.service.test.ts
│   │       ├── auth.controller.ts # HTTP request handlers
│   │       ├── auth.model.ts      # Data models/types
│   │       ├── auth.repository.ts # Data access layer
│   │       ├── auth.schema.ts     # Validation schemas
│   │       └── auth.service.ts    # Business logic layer
│   ├── config/                    # Configuration management
│   │   └── index.ts               # Environment config
│   ├── infra/                     # Infrastructure layer
│   │   └── redis/                 # Redis client
│   │       ├── __tests__/
│   │       │   └── client.test.ts
│   │       └── client.ts          # Redis connection
│   ├── middleware/                # Express middleware
│   │   └── health.ts              # Health check handler
│   ├── index.ts                   # Application entry point
│   └── server.ts                  # Express app factory
├── dist/                          # Compiled JavaScript (build output)
├── node_modules/                  # Dependencies
├── .env                           # Environment variables
├── .gitignore                     # Git ignore patterns
├── CLAUDE.md                      # Project documentation
├── Dockerfile                     # Container configuration
├── README.md                      # Project readme
├── docker-compose.yml             # Multi-container setup
├── file-review.md                 # File-by-file code review
├── jest.config.js                 # Testing configuration
├── package.json                   # Project dependencies & scripts
├── review.md                      # Overall code review
└── tsconfig.json                  # TypeScript configuration
```

## Key Architecture Features

### 🏗️ **Layered Architecture**

- **API Layer**: HTTP request handling (`src/api/`)
- **Service Layer**: Business logic (`src/api/auth/auth.service.ts`)
- **Repository Layer**: Data access (`src/api/auth/auth.repository.ts`)
- **Infrastructure Layer**: External services (`src/infra/`)

### 🔧 **Dependency Injection**

- Clean factory functions for controllers
- Dependencies passed through constructor injection
- No global state management

### 📁 **Module Organization**

- Feature-based modules (`src/api/auth/`)
- Consistent file naming conventions
- Co-located tests with source code

### ⚙️ **Configuration Management**

- Centralized config module (`src/config/`)
- Environment variable support
- Type-safe configuration objects

### 🧪 **Testing Structure**

- Unit tests for each layer
- Integration tests for API endpoints
- Jest configuration with TypeScript support

### 🐳 **Containerization**

- Docker setup for development
- Docker Compose with Redis dependency
- Health checks and proper service dependencies
