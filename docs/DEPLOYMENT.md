# SyncBoard — Production Deployment Guide (AWS & Docker)

This guide documents the complete end-to-end steps to build, package, and deploy SyncBoard to production on **Amazon Web Services (AWS)** using **ECS Fargate**, **Application Load Balancer (ALB)**, **MongoDB Atlas**, **ElastiCache Redis**, and **CloudFront CDN**.

---

## 1. Cloud Architecture

```
[Browser Client]
       │
       ▼ (HTTPS / WSS)
[AWS CloudFront CDN / Route 53]
   ├──> /* (Static Assets) ────────> [Amazon S3 Web Bucket]
   └──> /api/* & /socket.io/* ────> [Application Load Balancer (ALB)]
                                             │ (Sticky Sessions: lb_cookie)
                                             ▼
                                [AWS ECS Fargate Cluster]
                                  ├── Task #1 (NestJS Container)
                                  └── Task #2 (NestJS Container)
                                             │
                                ┌────────────┴────────────┐
                                ▼                         ▼
                       [MongoDB Atlas Cluster]   [AWS ElastiCache Redis]
```

---

## 2. Prerequisites & Tools

- **AWS CLI v2** configured with production credentials (`aws configure`).
- **Docker Engine** (v24+) installed.
- **MongoDB Atlas** cluster provisioned with database `syncboard`.
- **AWS S3 Bucket** for file uploads (`my-unique-app-uploads-2026`).

---

## 3. Step-by-Step Deployment Runbook

### Step 3.1: Create Amazon ECR Repositories
```bash
# Create ECR repository for API
aws ecr create-repository \
  --repository-name syncboard-api \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Create ECR repository for Web Frontend
aws ecr create-repository \
  --repository-name syncboard-web \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

---

### Step 3.2: Build and Push Docker Images to ECR

```bash
# Authenticate Docker to Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 1. Build & Push API Image
docker build -t syncboard-api -f apps/api/Dockerfile .
docker tag syncboard-api:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/syncboard-api:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/syncboard-api:latest

# 2. Build & Push Web Image
docker build -t syncboard-web -f apps/web/Dockerfile .
docker tag syncboard-web:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/syncboard-web:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/syncboard-web:latest
```

---

### Step 3.3: Store Production Secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret --name syncboard/prod/MONGO_URI \
  --secret-string "mongodb+srv://user:password@cluster.mongodb.net/syncboard?retryWrites=true&w=majority"

aws secretsmanager create-secret --name syncboard/prod/REDIS_HOST \
  --secret-string "syncboard-redis.xxxx.cache.amazonaws.com"

aws secretsmanager create-secret --name syncboard/prod/JWT_SECRET \
  --secret-string "prod_jwt_super_secure_random_key_64_characters_minimum"

aws secretsmanager create-secret --name syncboard/prod/JWT_REFRESH_SECRET \
  --secret-string "prod_refresh_super_secure_random_key_64_characters_min"
```

---

### Step 3.4: Configure S3 Upload Bucket CORS

Apply the CORS rules from `infra/aws/s3-cors-policy.json`:

```bash
aws s3api put-bucket-cors \
  --bucket my-unique-app-uploads-2026 \
  --cors-configuration file://infra/aws/s3-cors-policy.json
```

---

### Step 3.5: Provision Application Load Balancer with Sticky Sessions

Socket.io requires **ALB session stickiness** (`lb_cookie`) so WebSocket handshakes and reconnects route to the same container instance:

```bash
# Create ALB Target Group
aws elbv2 create-target-group \
  --name syncboard-api-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-path /api/v1/health \
  --health-check-interval-seconds 15

# Enable 24-hour cookie stickiness
aws elbv2 modify-target-group-attributes \
  --target-group-arn <TARGET_GROUP_ARN> \
  --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

---

### Step 3.6: Register ECS Task Definition & Deploy Service

```bash
# Register Task Definition
aws ecs register-task-definition \
  --cli-input-json file://infra/aws/ecs-task-definition.json

# Create or Update ECS Fargate Service (2 minimum instances for HA)
aws ecs create-service \
  --cluster syncboard-cluster \
  --service-name syncboard-api-service \
  --task-definition syncboard-api-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TARGET_GROUP_ARN>,containerName=syncboard-api,containerPort=4000"
```

---

### Step 3.7: Deploy Frontend to CloudFront CDN & S3

```bash
# Build frontend static bundle
pnpm --filter @syncboard/web run build

# Upload to S3 Static Hosting Bucket
aws s3 sync apps/web/dist s3://syncboard-web-bucket --delete

# Invalidate CloudFront CDN Cache
aws cloudfront create-invalidation \
  --distribution-id <CLOUDFRONT_DIST_ID> \
  --paths "/*"
```

---

## 4. Health Checks & Verification

After deployment, verify that all probes respond:

```bash
# 1. API Health Check
curl -s -i https://app.yourdomain.com/api/v1/health
# Expected: HTTP/2 200, status: ok

# 2. Prometheus Telemetry Metrics
curl -s https://app.yourdomain.com/api/v1/metrics
# Expected: Prometheus text format

# 3. WebSocket Real-time Handshake
wscat -c "wss://app.yourdomain.com/socket.io/?EIO=4&transport=websocket"
```
