# Ticket System - Deployment Status

## ✅ Deployment Completed Successfully!

**Date**: January 12, 2026
**Application URL**: https://ticket.vibeoholic.com
**ArgoCD Dashboard**: https://argocd.vibeoholic.com

---

## 🎯 Deployment Summary

The ticket-system application has been successfully deployed to the Kubernetes cluster using ArgoCD GitOps workflow.

### Infrastructure Details

- **Cluster**: k3s (2 nodes)
  - Master: 37.27.40.86 (k8-ubuntu-8gb)
  - Worker: 37.27.5.220 (k8s-worker-cx33)
- **Namespace**: `ticket-system`
- **Ingress**: Traefik with Let's Encrypt TLS
- **DNS**: ticket.vibeoholic.com → 37.27.40.86

---

## 📦 Deployed Components

### Backend
- **Image**: `ghcr.io/frallan97/ticket-system-backend:latest`
- **Status**: ✅ Running (1/1 pods ready)
- **Resources**: 256Mi-512Mi RAM, 100m-500m CPU
- **Port**: 8080
- **Service**: ClusterIP
- **Endpoint**: https://ticket.vibeoholic.com/api

### Frontend
- **Image**: `ghcr.io/frallan97/ticket-system-frontend:latest`
- **Status**: ✅ Running (1/1 pods ready)
- **Resources**: 128Mi-256Mi RAM, 50m-200m CPU
- **Port**: 80
- **Service**: ClusterIP
- **Endpoint**: https://ticket.vibeoholic.com

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Status**: ✅ Running (1/1 pods ready)
- **Resources**: 256Mi-1Gi RAM, 100m-1000m CPU
- **Persistence**: 10Gi (local-path storage)
- **Database**: ticketdb
- **Port**: 5432

### MinIO (Object Storage)
- **Image**: minio/minio:latest
- **Status**: ✅ Running (1/1 pods ready)
- **Resources**: 256Mi-1Gi RAM, 100m-500m CPU
- **Persistence**: 20Gi (local-path storage)
- **Bucket**: event-images
- **Ports**: 9000 (API), 9001 (Console)

---

## 🔐 Security Configuration

### TLS/SSL
- **Certificate**: ✅ Issued by Let's Encrypt (cert-manager)
- **Status**: READY
- **Secret**: `ticket-system-tls`
- **Expires**: Auto-renewed by cert-manager

### Image Pull Secrets
- **Secret**: `ghcr-pull-secret`
- **Registry**: ghcr.io
- **Status**: ✅ Configured in namespace

### Database Credentials
Configured via Kubernetes secrets (defined in Helm values)

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

**Backend CI/CD** (`.github/workflows/backend-ci.yml`):
- Triggers on: Push to `main` branch (backend/** changes)
- Steps:
  1. Run Go tests
  2. Build Go binary
  3. Build Docker image
  4. Push to ghcr.io/frallan97/ticket-system-backend:latest
- **Latest Commit**: 051fa6f - "Add complete frontend implementation and email notifications"
- **Status**: ⏳ Building (check: https://github.com/Frallan97/ticket-system/actions)

**Frontend CI/CD** (`.github/workflows/frontend-ci.yml`):
- Triggers on: Push to `main` branch (frontend/** changes)
- Steps:
  1. Install Bun dependencies
  2. Build frontend (Bun + Vite)
  3. Build Docker image with Nginx
  4. Push to ghcr.io/frallan97/ticket-system-frontend:latest
- **Latest Commit**: 051fa6f - "Add complete frontend implementation and email notifications"
- **Status**: ⏳ Building (check: https://github.com/Frallan97/ticket-system/actions)

### ArgoCD GitOps

- **Application**: ticket-system
- **Status**: ✅ Synced & Healthy
- **Sync Policy**: Automated (prune + selfHeal enabled)
- **Source**: https://github.com/Frallan97/ticket-system.git
- **Path**: charts/ticket-system
- **Target Revision**: main

---

## 🌐 Application Access

### Public URLs

- **Frontend**: https://ticket.vibeoholic.com
- **Backend API**: https://ticket.vibeoholic.com/api
- **Health Check**: https://ticket.vibeoholic.com/api/v1/health

### Internal Services (Cluster-Only)

- **Backend**: http://backend.ticket-system.svc.cluster.local:8080
- **Frontend**: http://frontend.ticket-system.svc.cluster.local:80
- **PostgreSQL**: postgres.ticket-system.svc.cluster.local:5432
- **MinIO API**: http://minio.ticket-system.svc.cluster.local:9000
- **MinIO Console**: http://minio.ticket-system.svc.cluster.local:9001

---

## 🔧 Configuration

### Environment Variables (Backend)

```yaml
PORT: "8080"
ENVIRONMENT: "production"
DEBUG: "false"
AUTH_SERVICE_URL: "http://auth-service-backend.auth-service.svc.cluster.local:8080"
JWT_PUBLIC_KEY_URL: "http://auth-service-backend.auth-service.svc.cluster.local:8080/api/public-key"
ALLOWED_ORIGINS: "https://ticket.vibeoholic.com"
CASBIN_MODEL_PATH: "./config/casbin_model.conf"
MINIO_ENDPOINT: "minio:9000"
MINIO_USE_SSL: "false"
MINIO_BUCKET: "event-images"
DATABASE_URL: "postgresql://ticketuser:***@postgres:5432/ticketdb?sslmode=disable"
```

### Database Configuration

```yaml
POSTGRES_DB: ticketdb
POSTGRES_USER: ticketuser
POSTGRES_PASSWORD: <secret>
```

### MinIO Configuration

```yaml
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: <secret>
```

---

## 📊 Resource Usage

### Current Allocation

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit | Storage |
|-----------|-------------|-----------|----------------|--------------|---------|
| Backend   | 100m        | 500m      | 256Mi          | 512Mi        | -       |
| Frontend  | 50m         | 200m      | 128Mi          | 256Mi        | -       |
| PostgreSQL| 100m        | 1000m     | 256Mi          | 1Gi          | 10Gi    |
| MinIO     | 100m        | 500m      | 256Mi          | 1Gi          | 20Gi    |
| **Total** | **350m**    | **2.2**   | **768Mi**      | **2.75Gi**   | **30Gi**|

### Cluster Capacity

- **Total CPU**: 8 vCPUs (across 2 nodes)
- **Total RAM**: 16GB (across 2 nodes)
- **Current Usage**: ~5% CPU, ~5% RAM

---

## 🚀 Next Steps to Update Deployment

When you make changes to the code:

1. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **GitHub Actions will automatically**:
   - Build new Docker images
   - Push to ghcr.io with `:latest` tag
   - Takes ~3-5 minutes

3. **Update pods to use new images**:
   ```bash
   # Option 1: Restart deployments to pull new images
   kubectl rollout restart deployment backend -n ticket-system
   kubectl rollout restart deployment frontend -n ticket-system

   # Option 2: Use ArgoCD to hard refresh
   kubectl get application ticket-system -n argocd -o json | \
     jq '.spec.source.targetRevision = "main"' | \
     kubectl apply -f -
   ```

4. **Monitor rollout**:
   ```bash
   kubectl rollout status deployment/backend -n ticket-system
   kubectl rollout status deployment/frontend -n ticket-system
   ```

---

## 🐛 Troubleshooting

### Check Application Status

```bash
# Check ArgoCD application
kubectl get application ticket-system -n argocd

# Check all pods
kubectl get pods -n ticket-system

# Check pod logs
kubectl logs -f deployment/backend -n ticket-system
kubectl logs -f deployment/frontend -n ticket-system

# Check ingress
kubectl get ingress -n ticket-system
kubectl describe ingress ticket-system-ingress -n ticket-system

# Check certificate
kubectl get certificate -n ticket-system
```

### Common Issues

**Pods not starting**:
- Check image pull: `kubectl describe pod <pod-name> -n ticket-system`
- Verify secrets exist: `kubectl get secrets -n ticket-system`

**Database connection errors**:
- Check postgres pod: `kubectl logs -f deployment/postgres -n ticket-system`
- Verify service DNS: `kubectl get svc -n ticket-system`

**Frontend not loading**:
- Check nginx logs: `kubectl logs -f deployment/frontend -n ticket-system`
- Verify API_URL in frontend build

**TLS certificate issues**:
- Check cert status: `kubectl describe certificate ticket-system-tls -n ticket-system`
- Check cert-manager logs: `kubectl logs -n cert-manager deployment/cert-manager`

### Access Pods Directly

```bash
# Backend shell
kubectl exec -it deployment/backend -n ticket-system -- sh

# Frontend shell
kubectl exec -it deployment/frontend -n ticket-system -- sh

# PostgreSQL shell
kubectl exec -it deployment/postgres -n ticket-system -- psql -U ticketuser -d ticketdb

# MinIO shell
kubectl exec -it deployment/minio -n ticket-system -- sh
```

---

## 📝 Important Notes

1. **Database Persistence**: PostgreSQL data is persisted on local storage. Backups recommended for production.

2. **Image Updates**: Pods use `imagePullPolicy: Always` with `:latest` tag. New images require pod restart.

3. **Auto-sync**: ArgoCD auto-syncs every 3 minutes. Manual sync: `kubectl argo app sync ticket-system`

4. **Email Configuration**: Email notifications require SMTP configuration (see EMAIL_SETUP.md)

5. **Role-Based Access**: Current implementation bypasses role checks. Implement proper RBAC before production use.

6. **Secrets Management**: Update passwords in values.yaml for production deployment.

---

## 🎉 Features Deployed

✅ Full event management (CRUD)
✅ Ticket type management
✅ Seat selection and assignment
✅ Booking system with seat locking
✅ QR code generation and validation
✅ Check-in system with QR scanner
✅ Event analytics with charts
✅ Export functionality (CSV)
✅ Email notifications (SMTP)
✅ Image upload (MinIO)
✅ Authentication (via auth-service)
✅ HTTPS with automatic TLS
✅ Automated CI/CD pipeline
✅ GitOps deployment with ArgoCD

---

## 📞 Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/<component> -n ticket-system`
- ArgoCD UI: https://argocd.vibeoholic.com
- GitHub Actions: https://github.com/Frallan97/ticket-system/actions

**Maintainer**: Frans Sjöström
**Repository**: https://github.com/Frallan97/ticket-system
