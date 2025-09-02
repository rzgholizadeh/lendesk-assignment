# Architecture Decision Record

## Decision 1: Use Raw Redis Client Instead of Redis OM

**Date:** 2025-09-02

**Status:** Accepted

**Context:**
We initially explored using Redis OM (Object Mapping) for Node.js to abstract Redis operations and provide a more object-oriented approach to data storage. Redis OM offers features like automatic indexing, schema validation, and search capabilities through RediSearch and RedisJSON modules.

**Decision:**
We decided to continue using the raw Redis client instead of migrating to Redis OM.

**Reasons:**

### Production Deployment Limitations

- **AWS ElastiCache**: Does not support Redis modules (RediSearch, RedisJSON) required by Redis OM
- **GCP Cloud Memorystore**: Limited Redis Stack support, may not include required modules
- **Module Dependencies**: Redis OM requires Redis Stack with specific modules that are not universally available

### Maintenance and Support Concerns

- **Stale Development**: Redis OM for Node.js (v0.4.7) hasn't been updated in 10+ months
- **End of Life**: Redis Stack maintenance ends December 2025
- **Limited Ecosystem**: Smaller community and fewer resources compared to raw Redis

### Technical Benefits of Raw Redis

- **Universal Compatibility**: Works with all Redis providers and cloud services
- **Performance**: No ORM overhead, direct Redis commands
- **Simplicity**: Easier to debug and troubleshoot
- **Predictability**: Well-understood Redis behavior without abstraction layers
- **Flexibility**: Full control over Redis operations and data structures

### Current Implementation Quality

- The existing raw Redis implementation in `auth.repository.ts` is clean and maintainable
- Proper dependency injection pattern is already implemented
- Unit and integration tests are comprehensive
- TypeScript typing is strict and well-defined

**Consequences:**

- **Positive**: Better production deployment options, universal cloud provider support, predictable performance
- **Negative**: Manual schema management, no automatic indexing features, more Redis-specific code

**Alternatives Considered:**

- Redis OM with Redis Stack (implemented in `redis-om` branch but rejected due to deployment limitations)
- Other ORMs like Prisma with Redis (not investigated due to similar module dependency concerns)

**Implementation:**
The `redis-om` branch containing the Redis OM implementation has been preserved for reference but will not be merged. The main branch continues with the proven raw Redis client approach.
