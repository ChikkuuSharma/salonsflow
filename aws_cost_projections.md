# AWS Cloud Architecture Design & Cost Projections
**Author**: Amit, AWS Solutions Architect  
**Project**: SalonFlow Scale Topology

---

## 1. Cloud Architecture Topology (Scale-Optimized)

To support scaling from 100 to 10,000 salons securely and cost-effectively, the following architecture is deployed:

```mermaid
graph TD
    subgraph Public Subnets (AZ1 & AZ2)
        ALB[Application Load Balancer]
        NAT[NAT Gateway]
    end
    subgraph Private App Subnets (AZ1 & AZ2)
        ECS[ECS Fargate Tasks]
    end
    subgraph Private Data Subnets (AZ1 & AZ2)
        RDS[(Aurora Serverless v2 PostgreSQL)]
        Redis[(ElastiCache Redis Serverless)]
    end
    
    Internet[Customer Web / WhatsApp Webhook] --> ALB
    ALB --> ECS
    ECS --> RDS
    ECS --> Redis
    ECS --> NAT
    NAT --> OpenAI[OpenAI API / Clerk / Meta WhatsApp APIs]
```

### Key Cost & Security Choices
* **Private Network Routing**: ECS app containers and PostgreSQL instances reside entirely in Private Subnets. Direct inbound access is blocked.
* **NAT Gateway Cost Mitigation**: By default, NAT Gateways charge high hourly rates and data processing fees. We implement **AWS VPC Endpoints** for S3, Secrets Manager, and ECS, routing internal AWS traffic locally to bypass NAT data processing charges completely.
* **Connection Pooling**: PgBouncer runs adjacent to ECS to prevent connection overhead on Aurora, keeping DB CPU utilization low.

---

## 2. Monthly AWS Cost Projections

### Tier A: 100 Salons (Pilot Stage)
* *Compute*: 2 Fargate Tasks (0.25 vCPU, 512MB RAM) running continuously in 2 AZs.
* *Database*: Aurora Serverless v2 (0.5 to 1.5 ACUs) with 50GB storage.
* *Cache*: Shared Redis ElastiCache (minimum serverless instance).
* *Network*: 1 Application Load Balancer, 1 NAT Gateway.

| Service | Calculation / Details | Monthly Cost (USD) |
| :--- | :--- | :--- |
| **ECS Fargate** | 2 tasks × $8.00/task | $16.00 |
| **RDS Aurora Serverless v2** | Average 0.75 ACU × $0.12/hr × 730 hrs + Storage | $80.00 |
| **ElastiCache Redis** | Serverless base capacity | $15.00 |
| **ALB & Route 53** | 1 ALB base charge + LCU usage | $22.50 |
| **NAT Gateway & Bandwidth** | 1 NAT Gateway base hourly charge ($32) + 20GB Data | $35.00 |
| **Secrets Manager & KMS** | Ingesting credentials & encryption | $5.00 |
| **Total Estimated Cost** | **~100 Salons** | **$173.50 / mo** |
| **Cost Per Salon** | **$1.73 / salon / month** | |

---

### Tier B: 1,000 Salons (Growth Stage)
* *Compute*: 4 to 12 Fargate Tasks (0.5 vCPU, 1GB RAM) with active CPU auto-scaling.
* *Database*: Aurora Serverless v2 (1.0 to 4.0 ACUs) with 500GB storage.
* *Cache*: Dedicated ElastiCache Redis cluster (cache-t4g.micro in Multi-AZ).
* *Network*: 1 ALB, 2 NAT Gateways (Multi-AZ resilience).

| Service | Calculation / Details | Monthly Cost (USD) |
| :--- | :--- | :--- |
| **ECS Fargate** | Average 6 active tasks × $16.00/task | $96.00 |
| **RDS Aurora Serverless v2** | Average 2.0 ACUs × $0.12/hr × 730 hrs + 500GB storage | $210.00 |
| **ElastiCache Redis** | cache.t4g.micro Multi-AZ | $32.00 |
| **ALB & CloudFront** | ALB usage + CDN caching for static assets | $45.00 |
| **NAT Gateway & Bandwidth** | 2 NAT Gateways base + 200GB data transfer | $98.00 |
| **Secrets Manager & CloudWatch** | Enhanced logging and alarm metrics | $25.00 |
| **Total Estimated Cost** | **~1,000 Salons** | **$506.00 / mo** |
| **Cost Per Salon** | **$0.51 / salon / month** | |

---

### Tier C: 10,000 Salons (Enterprise Scale)
* *Compute*: 10 to 40 Fargate Tasks (1.0 vCPU, 2GB RAM) auto-scaling based on request volumes.
* *Database*: Aurora Serverless v2 (2.0 to 12.0 ACUs) + 1 Read Replica (2.0 ACUs) + 5TB storage.
* *Cache*: ElastiCache Redis Cluster (cache.m6g.large Multi-AZ).
* *Network*: 1 ALB, 2 NAT Gateways, high-volume CDN.

| Service | Calculation / Details | Monthly Cost (USD) |
| :--- | :--- | :--- |
| **ECS Fargate** | Average 20 active tasks × $32.00/task | $640.00 |
| **RDS Aurora Serverless v2** | Primary (Avg 4 ACUs) + Replica (Avg 2 ACUs) + 5TB | $1,210.00 |
| **ElastiCache Redis** | cache.m6g.large Multi-AZ | $210.00 |
| **ALB, CDN & WAF** | ALB + CloudFront + AWS WAF security shield | $350.00 |
| **NAT Gateway & Bandwidth** | 2 NAT Gateways + 2TB data transfer | $280.00 |
| **Secrets Manager, CloudWatch, KMS**| Log storage, KMS encryption, audit pipelines | $180.00 |
| **Total Estimated Cost** | **~10,000 Salons** | **$2,870.00 / mo** |
| **Cost Per Salon** | **$0.29 / salon / month** | |

---

## 3. Key Cost Control Strategies

1. **Auto-Scaling Sleeping Schedules**: Configure ECS scaling actions to reduce minimum container counts to **1 active task** during low-traffic Indian timezone hours (11 PM to 7 AM IST).
2. **Aurora Serverless Scaling Floor**: Cap database minimum capacity strictly at **0.5 ACUs** to prevent excessive base billing during idle nights.
3. **Database Indexing**: Priya and Arjun (Architects) enforce strict relational indexing on `salonId` and `createdAt` keys. Optimized queries execute faster, reducing RDS CPU usage and keeping DB ACU scales at minimum.
