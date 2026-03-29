SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK_ENV_FILE ?= .env
DEPLOY_ENV_FILE ?= .env.deploy
COMPOSE ?= docker compose
DEPLOY_COMPOSE_FILE ?= docker-compose.deploy.yml
BUILD_PLATFORMS ?= linux/amd64
LOCAL_COMPOSE_FILE ?= docker-compose.yml
BACKUP_DIR ?= backups/mysql
REMOTE_RELEASE_ENV_FILE ?= .release.env
REMOTE_PREVIOUS_RELEASE_ENV_FILE ?= .release.previous.env
NPM_REGISTRY ?= https://registry.npmmirror.com
NPM_FETCH_RETRIES ?= 5
NPM_FETCH_RETRY_FACTOR ?= 2
NPM_FETCH_RETRY_MINTIMEOUT ?= 20000
NPM_FETCH_RETRY_MAXTIMEOUT ?= 120000
BUILD_RETRY_COUNT ?= 3
BUILD_RETRY_DELAY ?= 5
PUSH_BUILD_CACHE ?= 0

LOCAL_COMPOSE := $(COMPOSE) --env-file $(STACK_ENV_FILE) -f $(LOCAL_COMPOSE_FILE)
REMOTE_COMPOSE := docker compose --env-file .env --env-file $(REMOTE_RELEASE_ENV_FILE) -f $(DEPLOY_COMPOSE_FILE)

ifneq (,$(wildcard $(STACK_ENV_FILE)))
include $(STACK_ENV_FILE)
export
endif

ifneq (,$(wildcard $(DEPLOY_ENV_FILE)))
include $(DEPLOY_ENV_FILE)
export
endif

IMAGE_NAMESPACE ?= $(ALIYUN_USERNAME)
BASE_NODE_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-node:22-alpine
BASE_NGINX_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-nginx:1.27-alpine
BASE_MYSQL_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-mysql:8.4.4
BACKEND_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-backend:$(VERSION)
NGINX_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-nginx:$(VERSION)
BACKEND_BUILD_CACHE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-backend:buildcache
NGINX_BUILD_CACHE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-nginx:buildcache

ifeq ($(PUSH_BUILD_CACHE),1)
BACKEND_CACHE_ARGS := --cache-from type=registry,ref=$(BACKEND_BUILD_CACHE) --cache-to type=registry,ref=$(BACKEND_BUILD_CACHE),mode=max
NGINX_CACHE_ARGS := --cache-from type=registry,ref=$(NGINX_BUILD_CACHE) --cache-to type=registry,ref=$(NGINX_BUILD_CACHE),mode=max
else
BACKEND_CACHE_ARGS :=
NGINX_CACHE_ARGS :=
endif

.PHONY: help guard-stack-env guard-deploy-env install build frontend-build type-check lint dev-backend migrate \
	compose-migrate up down restart logs ps acr-login seed-base-images ensure-base-images compose-build push remote-sync \
	remote-deploy remote-verify remote-rollback remote-logs db-backup db-restore remote-db-backup remote-db-restore

help:
	@printf "\nAvailable targets:\n"
	@printf "  %-18s %s\n" "install" "Install all workspace dependencies"
	@printf "  %-18s %s\n" "build" "Build frontend and backend"
	@printf "  %-18s %s\n" "frontend-build" "Build frontend assets for nginx to serve"
	@printf "  %-18s %s\n" "type-check" "Run TypeScript checks for both apps"
	@printf "  %-18s %s\n" "lint" "Run ESLint for both apps"
	@printf "  %-18s %s\n" "dev-backend" "Start the Hono backend on BACKEND_PORT"
	@printf "  %-18s %s\n" "migrate" "Run backend SQL migrations locally"
	@printf "  %-18s %s\n" "compose-migrate" "Run SQL migrations in the backend container"
	@printf "  %-18s %s\n" "up" "Build images, migrate the database, and start the compose stack"
	@printf "  %-18s %s\n" "down" "Stop the docker compose stack"
	@printf "  %-18s %s\n" "restart" "Restart the whole local docker compose stack without rebuilding"
	@printf "  %-18s %s\n" "logs" "Tail compose logs"
	@printf "  %-18s %s\n" "ps" "Show compose service status"
	@printf "  %-18s %s\n" "db-backup" "Create a compressed MySQL backup under $(BACKUP_DIR)"
	@printf "  %-18s %s\n" "db-restore" "Restore MySQL from BACKUP_FILE=/path/to/dump.sql.gz"
	@printf "  %-18s %s\n" "acr-login" "Login to Aliyun ACR"
	@printf "  %-18s %s\n" "seed-base-images" "Force sync base images to ACR"
	@printf "  %-18s %s\n" "ensure-base-images" "Sync base images to ACR only when missing"
	@printf "  %-18s %s\n" "push" "Build and push deploy images for $(BUILD_PLATFORMS)"
	@printf "  %-18s %s\n" "remote-deploy" "Push images, migrate remotely, deploy, and verify"
	@printf "  %-18s %s\n" "remote-verify" "Check remote compose status and health endpoints"
	@printf "  %-18s %s\n" "remote-rollback" "Rollback to the previous remote VERSION metadata"
	@printf "  %-18s %s\n" "remote-db-backup" "Create a compressed MySQL backup on the remote host"
	@printf "  %-18s %s\n" "remote-db-restore" "Restore remote MySQL from BACKUP_FILE=backups/mysql/file.sql.gz"
	@printf "\n"

guard-stack-env:
	@test -f $(STACK_ENV_FILE) || (echo "Missing $(STACK_ENV_FILE). Copy .env.example to $(STACK_ENV_FILE) and fill it first." && exit 1)

guard-deploy-env:
	@test -f $(DEPLOY_ENV_FILE) || (echo "Missing $(DEPLOY_ENV_FILE). Copy .env.deploy.example to $(DEPLOY_ENV_FILE) and fill it first." && exit 1)

install:
	npm install

build:
	npm run build

frontend-build:
	npm run build:frontend

type-check:
	npm run type-check

lint:
	npm run lint

dev-backend:
	npm run dev:backend

migrate:
	npm run migrate

down: guard-stack-env
	$(LOCAL_COMPOSE) down

restart: guard-stack-env
	$(LOCAL_COMPOSE) down
	$(LOCAL_COMPOSE) up -d --remove-orphans

logs: guard-stack-env
	$(LOCAL_COMPOSE) logs -f --tail=200

ps: guard-stack-env
	$(LOCAL_COMPOSE) ps

db-backup: guard-stack-env
	@mkdir -p $(BACKUP_DIR)
	@ENV_FILE=$(STACK_ENV_FILE) \
	COMPOSE_FILE=$(LOCAL_COMPOSE_FILE) \
	BACKUP_DIR=$(BACKUP_DIR) \
	DATABASE_NAME=$(MYSQL_DATABASE) \
	bash scripts/mysql-backup.sh

db-restore: guard-stack-env
	@test -n "$(BACKUP_FILE)" || (echo "Missing BACKUP_FILE=/path/to/backup.sql[.gz]" && exit 1)
	@ENV_FILE=$(STACK_ENV_FILE) \
	COMPOSE_FILE=$(LOCAL_COMPOSE_FILE) \
	bash scripts/mysql-restore.sh "$(BACKUP_FILE)"

acr-login: guard-deploy-env
	@echo "$(ALIYUN_PASSWORD)" | docker login $(ALIYUN_REGISTRY) -u "$(ALIYUN_USERNAME)" --password-stdin

seed-base-images: guard-stack-env guard-deploy-env acr-login
	docker buildx imagetools create --platform linux/amd64 --tag $(BASE_NODE_IMAGE) docker.io/library/node:22-alpine
	docker buildx imagetools create --platform linux/amd64 --tag $(BASE_NGINX_IMAGE) docker.io/library/nginx:1.27-alpine
	docker buildx imagetools create --platform linux/amd64 --tag $(BASE_MYSQL_IMAGE) docker.io/library/mysql:8.4.4

ensure-base-images: guard-stack-env guard-deploy-env acr-login
	@for image in \
		"$(BASE_NODE_IMAGE)|docker.io/library/node:22-alpine" \
		"$(BASE_NGINX_IMAGE)|docker.io/library/nginx:1.27-alpine" \
		"$(BASE_MYSQL_IMAGE)|docker.io/library/mysql:8.4.4"; do \
		target="$${image%%|*}"; \
		source_image="$${image##*|}"; \
		if docker buildx imagetools inspect "$$target" 2>/dev/null | grep -q "Platform:[[:space:]]*linux/amd64"; then \
			echo "Using existing amd64 $$target"; \
		else \
			echo "Seeding amd64 $$target from $$source_image"; \
			docker buildx imagetools create --platform linux/amd64 --tag "$$target" "$$source_image"; \
		fi; \
	done

compose-build: guard-stack-env guard-deploy-env ensure-base-images
	$(LOCAL_COMPOSE) build

compose-migrate: guard-stack-env
	$(LOCAL_COMPOSE) up -d mysql
	$(LOCAL_COMPOSE) run --rm --no-deps backend npm run migrate:prod --workspace @parrot/backend

up: frontend-build compose-build compose-migrate
	$(LOCAL_COMPOSE) up -d --remove-orphans backend nginx

push: guard-stack-env guard-deploy-env acr-login ensure-base-images
	@attempt=1; \
	while true; do \
		docker buildx build --platform $(BUILD_PLATFORMS) --push \
			$(BACKEND_CACHE_ARGS) \
			--build-arg BASE_NODE_IMAGE=$(BASE_NODE_IMAGE) \
			--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
			--build-arg NPM_FETCH_RETRIES=$(NPM_FETCH_RETRIES) \
			--build-arg NPM_FETCH_RETRY_FACTOR=$(NPM_FETCH_RETRY_FACTOR) \
			--build-arg NPM_FETCH_RETRY_MINTIMEOUT=$(NPM_FETCH_RETRY_MINTIMEOUT) \
			--build-arg NPM_FETCH_RETRY_MAXTIMEOUT=$(NPM_FETCH_RETRY_MAXTIMEOUT) \
			-t $(BACKEND_IMAGE) \
			-f apps/backend/Dockerfile . && break; \
		status=$$?; \
		if [ $$attempt -ge $(BUILD_RETRY_COUNT) ]; then exit $$status; fi; \
		echo "Backend image build failed (attempt $$attempt/$(BUILD_RETRY_COUNT)); retrying in $(BUILD_RETRY_DELAY)s"; \
		attempt=$$((attempt + 1)); \
		sleep $(BUILD_RETRY_DELAY); \
	done
	@attempt=1; \
	while true; do \
		docker buildx build --platform $(BUILD_PLATFORMS) --push \
			$(NGINX_CACHE_ARGS) \
			--build-arg BASE_NODE_IMAGE=$(BASE_NODE_IMAGE) \
			--build-arg BASE_NGINX_IMAGE=$(BASE_NGINX_IMAGE) \
			--build-arg NPM_REGISTRY=$(NPM_REGISTRY) \
			--build-arg NPM_FETCH_RETRIES=$(NPM_FETCH_RETRIES) \
			--build-arg NPM_FETCH_RETRY_FACTOR=$(NPM_FETCH_RETRY_FACTOR) \
			--build-arg NPM_FETCH_RETRY_MINTIMEOUT=$(NPM_FETCH_RETRY_MINTIMEOUT) \
			--build-arg NPM_FETCH_RETRY_MAXTIMEOUT=$(NPM_FETCH_RETRY_MAXTIMEOUT) \
			-t $(NGINX_IMAGE) \
			-f infra/nginx/Dockerfile . && break; \
		status=$$?; \
		if [ $$attempt -ge $(BUILD_RETRY_COUNT) ]; then exit $$status; fi; \
		echo "Nginx image build failed (attempt $$attempt/$(BUILD_RETRY_COUNT)); retrying in $(BUILD_RETRY_DELAY)s"; \
		attempt=$$((attempt + 1)); \
		sleep $(BUILD_RETRY_DELAY); \
	done

remote-sync: guard-stack-env guard-deploy-env
	ssh $(REMOTE_HOST) "mkdir -p $(REMOTE_PATH) $(REMOTE_PATH)/scripts"
	scp $(DEPLOY_COMPOSE_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/$(DEPLOY_COMPOSE_FILE)
	scp $(STACK_ENV_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/.env
	scp scripts/mysql-backup.sh scripts/mysql-restore.sh $(REMOTE_HOST):$(REMOTE_PATH)/scripts/
	ssh $(REMOTE_HOST) "chmod +x $(REMOTE_PATH)/scripts/mysql-backup.sh $(REMOTE_PATH)/scripts/mysql-restore.sh"

remote-deploy: push remote-sync
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ -f $(REMOTE_RELEASE_ENV_FILE) ]; then cp $(REMOTE_RELEASE_ENV_FILE) $(REMOTE_PREVIOUS_RELEASE_ENV_FILE); fi \
		&& printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE) \
		&& echo '$(ALIYUN_PASSWORD)' | docker login $(ALIYUN_REGISTRY) -u '$(ALIYUN_USERNAME)' --password-stdin \
		&& $(REMOTE_COMPOSE) pull \
		&& $(REMOTE_COMPOSE) up -d mysql \
		&& $(REMOTE_COMPOSE) run --rm --no-deps backend npm run migrate:prod --workspace @parrot/backend \
		&& $(REMOTE_COMPOSE) up -d --remove-orphans --no-build \
		&& docker image prune -f"
	@$(MAKE) remote-verify || { echo "Remote verification failed; attempting rollback."; $(MAKE) remote-rollback; exit 1; }

remote-verify: guard-stack-env guard-deploy-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE); fi \
		&& $(REMOTE_COMPOSE) ps \
		&& curl -fsS http://127.0.0.1:$(BACKEND_PORT)/healthz >/dev/null \
		&& curl -fsS http://127.0.0.1:$(NGINX_PORT)/healthz >/dev/null \
		&& curl -fsS http://127.0.0.1:$(NGINX_PORT)/ >/dev/null \
		&& curl -fsS http://127.0.0.1:$(NGINX_PORT)/api/v1/system/summary >/dev/null"

remote-rollback: guard-stack-env guard-deploy-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& test -f $(REMOTE_PREVIOUS_RELEASE_ENV_FILE) \
		&& cp $(REMOTE_PREVIOUS_RELEASE_ENV_FILE) $(REMOTE_RELEASE_ENV_FILE) \
		&& echo '$(ALIYUN_PASSWORD)' | docker login $(ALIYUN_REGISTRY) -u '$(ALIYUN_USERNAME)' --password-stdin \
		&& $(REMOTE_COMPOSE) pull backend nginx \
		&& $(REMOTE_COMPOSE) up -d --remove-orphans --no-build \
		&& docker image prune -f"
	@$(MAKE) remote-verify

remote-db-backup: remote-sync
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE); fi \
		&& mkdir -p backups/mysql \
		&& ENV_FILE=.env EXTRA_ENV_FILE=$(REMOTE_RELEASE_ENV_FILE) COMPOSE_FILE=$(DEPLOY_COMPOSE_FILE) BACKUP_DIR=backups/mysql DATABASE_NAME=$(MYSQL_DATABASE) bash scripts/mysql-backup.sh"

remote-db-restore: remote-sync
	@test -n "$(BACKUP_FILE)" || (echo "Missing BACKUP_FILE=backups/mysql/file.sql[.gz]" && exit 1)
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE); fi \
		&& ENV_FILE=.env EXTRA_ENV_FILE=$(REMOTE_RELEASE_ENV_FILE) COMPOSE_FILE=$(DEPLOY_COMPOSE_FILE) bash scripts/mysql-restore.sh '$(BACKUP_FILE)'"

remote-logs: guard-stack-env guard-deploy-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE); fi \
		&& $(REMOTE_COMPOSE) logs -f --tail=200"
