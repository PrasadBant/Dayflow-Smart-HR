# Multi-Stage Dockerfile for Dayflow HRMS

# ==========================================
# Stage 1: Build Shared Types & Dependencies
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app

# ==========================================
# Stage 2: Backend Service
# ==========================================
FROM node:20-alpine AS backend
WORKDIR /app

# Copy root shared types and backend files
COPY dayflow-hrms/shared /app/dayflow-hrms/shared
COPY dayflow-hrms/backend /app/dayflow-hrms/backend

WORKDIR /app/dayflow-hrms/backend
RUN npm ci --ignore-scripts || npm install
RUN npm run build || npx tsc

EXPOSE 5000
CMD ["node", "dist/index.js"]

# ==========================================
# Stage 3: Frontend Web Build & Nginx Host
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY dayflow-hrms/shared /app/dayflow-hrms/shared
COPY dayflow-hrms/frontend /app/dayflow-hrms/frontend

WORKDIR /app/dayflow-hrms/frontend
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm ci --ignore-scripts || npm install
RUN npm run build || npx vite build

FROM nginx:alpine AS frontend
COPY --from=frontend-builder /app/dayflow-hrms/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
