SHELL := /bin/bash
.DEFAULT_GOAL := help

ENV_FILE ?= .env
COMPOSE ?= docker compose
DEPLOY_COMPOSE_FILE ?= docker-compose.deploy.yml
BUILD_PLATFORMS ?= linux/amd64

ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

IMAGE_NAMESPACE ?= $(ALIYUN_USERNAME)
BASE_NODE_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-node:22-alpine
BASE_NGINX_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-nginx:1.27-alpine
BASE_MYSQL_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-mysql:8.4.4
FRONTEND_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-frontend:$(VERSION)
BACKEND_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-backend:$(VERSION)
NGINX_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-nginx:$(VERSION)

.PHONY: help guard-env install build type-check lint dev-frontend dev-backend migrate \
	up down restart logs ps acr-login seed-base-images compose-build push remote-sync remote-deploy remote-logs

help:
	@printf "\nAvailable targets:\n"
	@printf "  %-18s %s\n" "install" "Install all workspace dependencies"
	@printf "  %-18s %s\n" "build" "Build frontend and backend"
	@printf "  %-18s %s\n" "type-check" "Run TypeScript checks for both apps"
	@printf "  %-18s %s\n" "lint" "Run ESLint for both apps"
	@printf "  %-18s %s\n" "dev-frontend" "Start the webpack frontend on FRONTEND_PORT"
	@printf "  %-18s %s\n" "dev-backend" "Start the Hono backend on BACKEND_PORT"
	@printf "  %-18s %s\n" "migrate" "Run backend SQL migrations locally"
	@printf "  %-18s %s\n" "up" "Build and start the docker compose stack"
	@printf "  %-18s %s\n" "down" "Stop the docker compose stack"
	@printf "  %-18s %s\n" "logs" "Tail compose logs"
	@printf "  %-18s %s\n" "ps" "Show compose service status"
	@printf "  %-18s %s\n" "acr-login" "Login to Aliyun ACR"
	@printf "  %-18s %s\n" "seed-base-images" "Sync base images to ACR (run once or when versions change)"
	@printf "  %-18s %s\n" "push" "Build and push deploy images for $(BUILD_PLATFORMS)"
	@printf "  %-18s %s\n" "remote-deploy" "Upload env + compose file, pull, and restart remotely"
	@printf "\n"

guard-env:
	@test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE). Copy .env.example to .env and fill it first." && exit 1)

install:
	npm install

build:
	npm run build

type-check:
	npm run type-check

lint:
	npm run lint

dev-frontend:
	npm run dev:frontend

dev-backend:
	npm run dev:backend

migrate:
	npm run migrate

down: guard-env
	$(COMPOSE) down

restart: guard-env
	$(COMPOSE) down
	$(COMPOSE) up -d --build

logs: guard-env
	$(COMPOSE) logs -f --tail=200

ps: guard-env
	$(COMPOSE) ps

acr-login: guard-env
	@echo "$(ALIYUN_PASSWORD)" | docker login $(ALIYUN_REGISTRY) -u "$(ALIYUN_USERNAME)" --password-stdin

seed-base-images: guard-env acr-login
	docker pull --platform linux/amd64 docker.io/library/node:22-alpine
	docker tag docker.io/library/node:22-alpine $(BASE_NODE_IMAGE)
	docker push $(BASE_NODE_IMAGE)
	docker pull --platform linux/amd64 docker.io/library/nginx:1.27-alpine
	docker tag docker.io/library/nginx:1.27-alpine $(BASE_NGINX_IMAGE)
	docker push $(BASE_NGINX_IMAGE)
	docker pull --platform linux/amd64 docker.io/library/mysql:8.4.4
	docker tag docker.io/library/mysql:8.4.4 $(BASE_MYSQL_IMAGE)
	docker push $(BASE_MYSQL_IMAGE)

compose-build: guard-env seed-base-images
	$(COMPOSE) build

up: guard-env
	$(COMPOSE) up -d --build

push: guard-env acr-login seed-base-images
	docker buildx build --platform $(BUILD_PLATFORMS) --push \
		--build-arg BASE_NODE_IMAGE=$(BASE_NODE_IMAGE) \
		--build-arg BASE_NGINX_IMAGE=$(BASE_NGINX_IMAGE) \
		-t $(FRONTEND_IMAGE) \
		-f apps/frontend/Dockerfile .
	docker buildx build --platform $(BUILD_PLATFORMS) --push \
		--build-arg BASE_NODE_IMAGE=$(BASE_NODE_IMAGE) \
		-t $(BACKEND_IMAGE) \
		-f apps/backend/Dockerfile .
	docker buildx build --platform $(BUILD_PLATFORMS) --push \
		--build-arg BASE_NGINX_IMAGE=$(BASE_NGINX_IMAGE) \
		-t $(NGINX_IMAGE) \
		-f infra/nginx/Dockerfile .

remote-sync: guard-env
	ssh $(REMOTE_HOST) "mkdir -p $(REMOTE_PATH)"
	scp $(DEPLOY_COMPOSE_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/$(DEPLOY_COMPOSE_FILE)
	scp $(ENV_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/.env

remote-deploy: push remote-sync
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) && echo '$(ALIYUN_PASSWORD)' | docker login $(ALIYUN_REGISTRY) -u '$(ALIYUN_USERNAME)' --password-stdin && docker compose -f $(DEPLOY_COMPOSE_FILE) --env-file .env pull && docker compose -f $(DEPLOY_COMPOSE_FILE) --env-file .env up -d --remove-orphans --no-build && docker image prune -f"

remote-logs: guard-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose -f $(DEPLOY_COMPOSE_FILE) --env-file .env logs -f --tail=200"
