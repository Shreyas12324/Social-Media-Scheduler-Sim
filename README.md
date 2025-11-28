# Social Media Scheduler (React + Node)

Single-page React frontend for crafting posts, paired with a lightweight Node/Express backend that queues scheduled uploads to AWS-backed storage. The next iteration of this project must demonstrate Microservices, CI/CD, Docker, and Kubernetes, so this README captures the target DevOps blueprint for the college submission.

## Architecture At A Glance
- **Frontend (clnp/frontend/)**: Vite + React UI (`src/`) served as a static SPA.
- **Backend (clnp/backend/)**: Node/Express API handling uploads, job scheduling, and AWS integration.
- **Data/Storage**: AWS S3 (media) + DynamoDB or RDS for metadata (planned enhancement).
- **Async Jobs**: Scheduler pushes jobs to a queue (SQS) processed by worker pods.

```
┌────────────┐      ┌────────────────┐      ┌────────────────┐
|  React UI  | ---> | API Gateway/ALB| ---> | Microservices   |
└────────────┘      └────────────────┘      └──────┬─────────┘
																									┌─┴────────┐
																									│ AWS SQS  │
																									└──────────┘
```

## Planned Microservices
1. **scheduler-service** (Express): accepts schedule requests, validates, stores metadata, enqueues jobs.
2. **media-service** (Express + AWS SDK): handles file uploads, image processing, signed URL management.
3. **notifier-service** (Node worker): consumes jobs, posts to social APIs, updates status, triggers SNS/email notifications.
Each service owns its own datastore tables and communicates through SQS/SNS events to keep the architecture microservice-friendly.

## Dockerization
- Docker assets live in `Dockerfile.frontend`, `backend/Dockerfile`, and `docker-compose.yml`.
- Frontend builds accept `VITE_API_BASE_URL` at image build time (defaults to `http://localhost:5000`).
- Local development uses `docker compose` to run only `frontend` (Nginx on `5173`) and `backend` (Express on `5000`).

Current compose summary:
```yaml
services:
	frontend:
		build:
			context: .
			dockerfile: Dockerfile.frontend
		ports:
			- "5173:80"
		depends_on: [backend]
	backend:
		build:
			context: ./backend
		ports:
			- "5000:5000"
```

### Run Locally With Docker
```bash
docker compose up --build
```
- Frontend available at [http://localhost:5173](http://localhost:5173)
- Backend API reachable at [http://localhost:5000](http://localhost:5000)
- Uploaded media persists inside `backend/uploads` via a bind mount

To develop without Docker:
```bash
cd frontend && npm install && npm run dev   # React UI on http://localhost:5173
cd backend && npm install && npm run start  # Express API on http://localhost:5000
```

To target Kubernetes/Ingress domains, rebuild the frontend image overriding the build arg:
```bash
docker build \
	-f Dockerfile.frontend \
	--build-arg VITE_API_BASE_URL=https://sms.local/api \
	-t ghcr.io/<owner>/social-media-scheduler-frontend:latest \
	.
```

## CI/CD Tooling (GitHub Actions)
Workflow location: `.github/workflows/ci-cd.yml`.

Jobs:
1. **frontend** – installs dependencies and runs `npm run build` inside `frontend/`.
2. **backend** – installs dependencies and runs `npm test` (currently a placeholder) inside `backend/`.
3. **docker** – builds/pushes both images to GHCR using the repo owner namespace and the `FRONTEND_API_URL` env (default `https://sms.local/api`).
4. **deploy** – applies manifests and updates deployments when running on `master` and when `KUBE_CONFIG_DATA` secret is supplied.

Required secrets:
- `KUBE_CONFIG_DATA`: base64-encoded kubeconfig for the target cluster.
Optional customizations:
- override `FRONTEND_API_URL` env at the workflow or repository level for different domains.

## Kubernetes Deployment
- **Cluster**: Amazon EKS (or KIND/minikube) with namespace `sms-dev`.
- **Workloads**: only `frontend` and `backend` Deployments/Services to keep the demo tight.
- **Networking**: `k8s/ingress.yaml` (AWS ALB compatible) routes `/` to the SPA and `/api/` to the backend service.

### Provided Manifests
- `k8s/namespace.yaml`: namespace definition.
- `k8s/frontend.yaml`: Deployment + Service for the compiled React app.
- `k8s/backend.yaml`: Deployment + Service for the Express API with readiness/liveness probes.
- `k8s/ingress.yaml`: routes HTTP traffic via ALB (adjust annotations for other ingress controllers).

### How To Deploy
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Update deployments with freshly pushed images
kubectl set image deployment/frontend frontend=<registry>/social-media-scheduler-frontend:<tag> -n sms-dev
kubectl set image deployment/backend backend=<registry>/social-media-scheduler-backend:<tag> -n sms-dev

kubectl get pods -n sms-dev
kubectl get ingress -n sms-dev
```

For ingress routing to work, build the frontend with `VITE_API_BASE_URL` pointing to the ingress domain (for example `https://sms.local/api`). The backend already accepts both `/schedule` and `/api/schedule` paths, so no rewrites are necessary.

## Demonstration Checklist
- [x] Microservice boundaries documented
- [x] Dockerfiles for each service (frontend + backend)
- [x] docker-compose file for local stack (frontend + backend)
- [x] GitHub Actions workflow implementing CI/CD
- [x] Kubernetes manifests + deployment docs

Use this README as the baseline deliverable for the DevOps requirements; update each checklist item as you implement the corresponding asset.
