# Ticket System Deployment Guide

This guide covers deploying the ticket system to your Kubernetes cluster using Helm and ArgoCD.

## Prerequisites

- Kubernetes cluster (k3s) running and accessible
- kubectl configured to access your cluster
- ArgoCD installed and configured
- GitHub repository with access to GitHub Container Registry (ghcr.io)
- DNS configured for ticket.vibeoholic.com
- cert-manager installed for TLS certificates
- auth-service deployed and accessible

## Architecture Overview

The ticket system consists of:
- **Backend**: Go REST API (Port 8080)
- **PostgreSQL**: Database for ticket data (Port 5432)
- **MinIO**: S3-compatible object storage for event images (Ports 9000/9001)
- **Auth Service**: External authentication service (separate deployment)

## Step 1: Prepare GitHub Container Registry

### 1.1 Create GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `write:packages` and `read:packages` permissions
3. Save the token securely

### 1.2 Create Image Pull Secret on Cluster

```bash
# SSH to your k3s master node
ssh root@37.27.40.86

# Create the ticket-system namespace first
kubectl create namespace ticket-system

# Create image pull secret
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=frallan97 \
  --docker-password=<YOUR_GITHUB_PAT> \
  --namespace=ticket-system
```

## Step 2: Configure Secrets

Create production secrets (DO NOT commit these to git):

```bash
# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MINIO_ACCESS_KEY=$(openssl rand -base64 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Create secrets
kubectl create secret generic ticket-system-secrets \
  --namespace=ticket-system \
  --from-literal=postgres-user=ticketuser \
  --from-literal=postgres-password="$POSTGRES_PASSWORD" \
  --from-literal=database-url="postgresql://ticketuser:$POSTGRES_PASSWORD@postgres:5432/ticketdb?sslmode=disable" \
  --from-literal=minio-access-key="$MINIO_ACCESS_KEY" \
  --from-literal=minio-secret-key="$MINIO_SECRET_KEY"

# Save credentials securely
echo "Postgres Password: $POSTGRES_PASSWORD" > ~/ticket-system-credentials.txt
echo "MinIO Access Key: $MINIO_ACCESS_KEY" >> ~/ticket-system-credentials.txt
echo "MinIO Secret Key: $MINIO_SECRET_KEY" >> ~/ticket-system-credentials.txt
chmod 600 ~/ticket-system-credentials.txt
```

## Step 3: Configure Helm Values

Edit `charts/ticket-system/values.yaml` for production:

```yaml
# Update these values for production
postgres:
  env:
    POSTGRES_PASSWORD: "WILL_BE_OVERRIDDEN_BY_SECRET"

minio:
  env:
    MINIO_ROOT_USER: "WILL_BE_OVERRIDDEN_BY_SECRET"
    MINIO_ROOT_PASSWORD: "WILL_BE_OVERRIDDEN_BY_SECRET"

backend:
  env:
    ALLOWED_ORIGINS: "https://ticket.vibeoholic.com"
    AUTH_SERVICE_URL: "http://auth-service.auth-service.svc.cluster.local:8081"
```

## Step 4: Add to ArgoCD

### 4.1 Update k3s-infra Repository

In your `k3s-infra` repository, add the ticket system to the ApplicationSet:

```yaml
# File: k3s-infra/clusters/main/apps/app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: app-of-apps
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      # ... existing apps ...
      - name: ticket-system
        repoURL: https://github.com/Frallan97/ticket-system.git
        targetRevision: main
        path: charts/ticket-system
        namespace: ticket-system
  template:
    metadata:
      name: '{{name}}'
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: '{{repoURL}}'
        targetRevision: '{{targetRevision}}'
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

### 4.2 Commit and Push

```bash
cd k3s-infra
git add clusters/main/apps/app-of-apps.yaml
git commit -m "Add ticket-system application"
git push origin main
```

## Step 5: Push Code and Trigger CI/CD

```bash
cd ticket-system

# Commit all changes
git add .
git commit -m "Add Kubernetes deployment configuration"
git push origin main
```

The GitHub Actions workflow will:
1. Run tests
2. Build the backend binary
3. Build Docker image
4. Push to ghcr.io/frallan97/ticket-system-backend:latest

## Step 6: Monitor Deployment

### 6.1 Watch ArgoCD

Access ArgoCD UI: https://argocd.vibeoholic.com

The ticket-system application should appear and begin syncing automatically.

### 6.2 Check Pods

```bash
# Watch pods starting
kubectl get pods -n ticket-system -w

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# backend-xxx                 1/1     Running   0          2m
# postgres-xxx                1/1     Running   0          2m
# minio-xxx                   1/1     Running   0          2m
```

### 6.3 Check Services

```bash
kubectl get svc -n ticket-system

# Expected output:
# NAME       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
# backend    ClusterIP   10.43.x.x       <none>        8080/TCP
# postgres   ClusterIP   10.43.x.x       <none>        5432/TCP
# minio      ClusterIP   10.43.x.x       <none>        9000/TCP,9001/TCP
```

### 6.4 Check Ingress

```bash
kubectl get ingress -n ticket-system

# Expected output:
# NAME                      CLASS     HOSTS                   ADDRESS
# ticket-system-ingress     traefik   ticket.vibeoholic.com   37.27.40.86
```

## Step 7: Configure DNS

Add DNS record in Cloudflare:

```
Type: A
Name: ticket
Content: 37.27.40.86
Proxy: Yes (orange cloud)
TTL: Auto
```

Or use the Cloudflare CLI:

```bash
# List zones
cloudflare-cli zones list

# Add A record
cloudflare-cli dns create vibeoholic.com \
  --type A \
  --name ticket \
  --content 37.27.40.86 \
  --proxied
```

## Step 8: Verify Deployment

### 8.1 Test Health Endpoint

```bash
curl https://ticket.vibeoholic.com/api/v1/health
# Expected: OK
```

### 8.2 Test Event Listing

```bash
curl https://ticket.vibeoholic.com/api/v1/events
# Expected: []
```

### 8.3 Check TLS Certificate

```bash
curl -vI https://ticket.vibeoholic.com
# Should show valid Let's Encrypt certificate
```

## Troubleshooting

### Backend Pod Not Starting

```bash
# Check logs
kubectl logs -n ticket-system deployment/backend

# Common issues:
# - Can't connect to postgres: Wait for postgres to be ready
# - Can't fetch JWT public key: Check auth-service is running
# - Migration errors: Check database credentials
```

### Database Connection Issues

```bash
# Test postgres connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -n ticket-system -- \
  psql postgresql://ticketuser:PASSWORD@postgres:5432/ticketdb

# Check postgres logs
kubectl logs -n ticket-system deployment/postgres
```

### MinIO Issues

```bash
# Check MinIO logs
kubectl logs -n ticket-system deployment/minio

# Access MinIO console (port-forward)
kubectl port-forward -n ticket-system svc/minio 9001:9001
# Open http://localhost:9001 in browser
```

### Image Pull Errors

```bash
# Verify secret exists
kubectl get secret ghcr-pull-secret -n ticket-system

# Recreate if needed
kubectl delete secret ghcr-pull-secret -n ticket-system
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=frallan97 \
  --docker-password=<YOUR_GITHUB_PAT> \
  --namespace=ticket-system

# Restart deployments
kubectl rollout restart deployment/backend -n ticket-system
```

### Ingress Not Working

```bash
# Check ingress
kubectl describe ingress ticket-system-ingress -n ticket-system

# Check Traefik logs
kubectl logs -n kube-system deployment/traefik

# Verify cert-manager certificate
kubectl get certificate -n ticket-system
kubectl describe certificate ticket-system-tls -n ticket-system
```

## Maintenance

### Update Backend Image

```bash
# Push changes to main branch
git push origin main

# Wait for GitHub Actions to build
# ArgoCD will auto-sync new image

# Or manually sync in ArgoCD UI
```

### Database Backup

```bash
# Create backup
kubectl exec -n ticket-system deployment/postgres -- \
  pg_dump -U ticketuser ticketdb > ticket-system-backup-$(date +%Y%m%d).sql

# Restore backup
kubectl exec -i -n ticket-system deployment/postgres -- \
  psql -U ticketuser ticketdb < ticket-system-backup-20260112.sql
```

### View Application Logs

```bash
# Backend logs
kubectl logs -n ticket-system deployment/backend -f

# Postgres logs
kubectl logs -n ticket-system deployment/postgres -f

# MinIO logs
kubectl logs -n ticket-system deployment/minio -f
```

### Scale Backend

```bash
# Scale to 2 replicas
kubectl scale deployment/backend --replicas=2 -n ticket-system

# Or update values.yaml:
# replicaCount: 2
# Then commit and push
```

## Security Checklist

- [ ] Secrets created with strong passwords
- [ ] Image pull secret configured
- [ ] TLS certificate provisioned by cert-manager
- [ ] ALLOWED_ORIGINS set to production domain only
- [ ] Database not exposed externally (ClusterIP only)
- [ ] MinIO not exposed externally (ClusterIP only)
- [ ] GitHub PAT has minimal required permissions
- [ ] Regular database backups scheduled

## URLs

- **Application**: https://ticket.vibeoholic.com
- **ArgoCD**: https://argocd.vibeoholic.com
- **Auth Service**: http://auth-service.auth-service.svc.cluster.local:8081 (internal)

## Support

For issues or questions:
1. Check logs: `kubectl logs -n ticket-system deployment/backend`
2. Check ArgoCD sync status
3. Review this deployment guide
4. Check GitHub Actions workflow runs
