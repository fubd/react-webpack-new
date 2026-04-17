SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK_ENV_FILE ?= .env
COMPOSE ?= docker compose
DEPLOY_COMPOSE_FILE ?= docker-compose.deploy.yml
BUILD_PLATFORMS ?= linux/amd64
LOCAL_COMPOSE_FILE ?= docker-compose.yml
BACKUP_DIR ?= backups/mysql
BACKUP_RETENTION_DAYS ?= 7
BACKUP_SCHEDULE ?= 0 3 * * *
REMOTE_RELEASE_ENV_FILE ?= .release.env
REMOTE_PREVIOUS_RELEASE_ENV_FILE ?= .release.previous.env
PKG_REGISTRY ?= https://registry.npmmirror.com
BUILD_RETRY_COUNT ?= 3
BUILD_RETRY_DELAY ?= 5
PUSH_BUILD_CACHE ?= 0

LOCAL_COMPOSE := $(COMPOSE) --env-file $(STACK_ENV_FILE) -f $(LOCAL_COMPOSE_FILE)
DEV_RUN = $(LOCAL_COMPOSE) run --rm dev
WATCH_CONTAINER := parrot-watch
REMOTE_COMPOSE := docker compose --env-file .env --env-file $(REMOTE_RELEASE_ENV_FILE) -f $(DEPLOY_COMPOSE_FILE)

ifneq (,$(wildcard $(STACK_ENV_FILE)))
include $(STACK_ENV_FILE)
export
endif

IMAGE_NAMESPACE ?= $(ALIYUN_USERNAME)
BASE_BUN_IMAGE ?= $(ALIYUN_REGISTRY)/$(IMAGE_NAMESPACE)/parrot-base-bun:1-alpine
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

.PHONY: help guard-stack-env install build frontend-build type-check lint format dev-backend migrate \
	create-migration compose-migrate up down restart logs ps watch start-watch stop-watch acr-login seed-base-images ensure-base-images compose-build push remote-sync \
	remote-deploy remote-verify remote-rollback remote-logs db-backup db-restore remote-db-backup remote-db-restore \
	setup-backup-cron remote-setup-backup-cron

help:
	@printf "\nAvailable targets:\n"
	@printf "  %-26s %s\n" "install" "Install all workspace dependencies"
	@printf "  %-26s %s\n" "build" "Build frontend and backend"
	@printf "  %-26s %s\n" "frontend-build" "Build frontend assets for nginx to serve"
	@printf "  %-26s %s\n" "type-check" "Run TypeScript checks for both apps"
	@printf "  %-26s %s\n" "lint" "Run oxlint for both apps"
	@printf "  %-26s %s\n" "format" "Run oxfmt across the repository"
	@printf "  %-26s %s\n" "dev-backend" "Start the backend in Docker (recreates container)"
	@printf "  %-26s %s\n" "migrate" "Run backend SQL migrations (via compose-migrate)"
	@printf "  %-26s %s\n" "create-migration" "Create a numbered migration file (NAME=required)"
	@printf "  %-26s %s\n" "up" "Build images, migrate DB, start stack + watcher"
	@printf "  %-26s %s\n" "down" "Stop watcher and docker compose stack"
	@printf "  %-26s %s\n" "restart" "Restart stack + watcher (no rebuild)"
	@printf "  %-26s %s\n" "logs" "Tail compose logs"
	@printf "  %-26s %s\n" "ps" "Show compose service status"
	@printf "  %-26s %s\n" "watch" "Start frontend watcher (foreground)"
	@printf "  %-26s %s\n" "start-watch" "Start frontend watcher (background Docker container)"
	@printf "  %-26s %s\n" "stop-watch" "Stop frontend watcher"
	@printf "  %-26s %s\n" "db-backup" "Create a compressed MySQL backup under $(BACKUP_DIR)"
	@printf "  %-26s %s\n" "db-restore" "Restore MySQL from BACKUP_FILE=/path/to/dump.sql.gz"
	@printf "  %-26s %s\n" "setup-backup-cron" "Install a daily backup cron job on this machine"
	@printf "  %-26s %s\n" "remote-setup-backup-cron" "Install a daily backup cron job on the remote host"
	@printf "  %-26s %s\n" "acr-login" "Login to Aliyun ACR"
	@printf "  %-26s %s\n" "seed-base-images" "Force sync base images to ACR"
	@printf "  %-26s %s\n" "ensure-base-images" "Sync base images to ACR only when missing"
	@printf "  %-26s %s\n" "push" "Build and push deploy images for $(BUILD_PLATFORMS)"
	@printf "  %-26s %s\n" "remote-deploy" "Push images, migrate remotely, deploy, and verify"
	@printf "  %-26s %s\n" "remote-verify" "Check remote compose status and health endpoints"
	@printf "  %-26s %s\n" "remote-rollback" "Rollback to the previous remote VERSION metadata"
	@printf "  %-26s %s\n" "remote-db-backup" "Create a compressed MySQL backup on the remote host"
	@printf "  %-26s %s\n" "remote-db-restore" "Restore remote MySQL from BACKUP_FILE=backups/mysql/file.sql.gz"
	@printf "\n"

guard-stack-env:
	@test -f $(STACK_ENV_FILE) || (echo "Missing $(STACK_ENV_FILE). Copy .env.example to $(STACK_ENV_FILE) and fill it first." && exit 1)

install:
	$(DEV_RUN) bun install

build:
	$(DEV_RUN) bun run build

frontend-build:
	$(DEV_RUN) bun run build:frontend

type-check:
	$(DEV_RUN) bun run type-check

lint:
	$(DEV_RUN) bun run lint

format:
	$(DEV_RUN) bun run format

dev-backend:
	@$(LOCAL_COMPOSE) up -d --force-recreate backend

migrate: compose-migrate

create-migration:
ifndef NAME
	$(error NAME is required. Usage: make create-migration NAME=add_users_table)
endif
	@last=$$(ls apps/backend/migrations/*.sql 2>/dev/null | sed 's|.*/||;s/_.*//' | sort -n | tail -1); \
	next=$$((10#$${last:-0} + 1)); \
	file="apps/backend/migrations/$$(printf '%04d' $$next)_$(NAME).sql"; \
	basename=$$(basename "$$file" .sql); \
	printf '%s\n%s\n' "-- $$basename" "" > "$$file"; \
	echo "Created: $$file"

# ── frontend watcher ────────────────────────────────────────────
# Runs inside the Docker dev container with polling-based file
# watching (DOCKER_DEV=1 enables rspack watchOptions.poll).

watch:
	$(DEV_RUN) bun run --filter @parrot/frontend watch

start-watch:
	@if docker ps -q --filter "name=$(WATCH_CONTAINER)" | grep -q .; then \
		echo "Watcher already running"; \
	else \
		$(LOCAL_COMPOSE) run -d --name $(WATCH_CONTAINER) --no-deps dev bun run --filter @parrot/frontend watch; \
		echo "Watcher started in container '$(WATCH_CONTAINER)'"; \
	fi

stop-watch:
	@docker stop $(WATCH_CONTAINER) 2>/dev/null && docker rm $(WATCH_CONTAINER) 2>/dev/null && echo "Watcher stopped" || echo "Watcher not running"

# ── compose lifecycle ───────────────────────────────────────────

down: guard-stack-env stop-watch
	$(LOCAL_COMPOSE) down

restart: guard-stack-env stop-watch
	$(LOCAL_COMPOSE) up -d --force-recreate backend nginx
	@$(MAKE) start-watch

logs: guard-stack-env
	$(LOCAL_COMPOSE) logs -f --tail=200

ps: guard-stack-env
	$(LOCAL_COMPOSE) ps

# ── database ────────────────────────────────────────────────────

db-backup: guard-stack-env
	@mkdir -p $(BACKUP_DIR)
	@ENV_FILE=$(STACK_ENV_FILE) \
	COMPOSE_FILE=$(LOCAL_COMPOSE_FILE) \
	BACKUP_DIR=$(BACKUP_DIR) \
	DATABASE_NAME=$(MYSQL_DATABASE) \
	BACKUP_RETENTION_DAYS=$(BACKUP_RETENTION_DAYS) \
	bash scripts/mysql-backup.sh

db-restore: guard-stack-env
	@test -n "$(BACKUP_FILE)" || (echo "Missing BACKUP_FILE=/path/to/backup.sql[.gz]" && exit 1)
	@ENV_FILE=$(STACK_ENV_FILE) \
	COMPOSE_FILE=$(LOCAL_COMPOSE_FILE) \
	bash scripts/mysql-restore.sh "$(BACKUP_FILE)"

setup-backup-cron: guard-stack-env
	@PROJECT_DIR=$(CURDIR) \
	BACKUP_SCHEDULE="$(BACKUP_SCHEDULE)" \
	BACKUP_RETENTION_DAYS=$(BACKUP_RETENTION_DAYS) \
	COMPOSE_FILE=$(LOCAL_COMPOSE_FILE) \
	ENV_FILE=$(STACK_ENV_FILE) \
	bash scripts/setup-backup-cron.sh

remote-setup-backup-cron: remote-sync
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& PROJECT_DIR=$(REMOTE_PATH) \
		BACKUP_SCHEDULE='$(BACKUP_SCHEDULE)' \
		BACKUP_RETENTION_DAYS=$(BACKUP_RETENTION_DAYS) \
		COMPOSE_FILE=$(DEPLOY_COMPOSE_FILE) \
		ENV_FILE=.env \
		EXTRA_ENV_FILE=$(REMOTE_RELEASE_ENV_FILE) \
		bash scripts/setup-backup-cron.sh"

# ── images ──────────────────────────────────────────────────────

acr-login:
	@echo "$(ALIYUN_PASSWORD)" | docker login $(ALIYUN_REGISTRY) -u "$(ALIYUN_USERNAME)" --password-stdin

seed-base-images: guard-stack-env acr-login
	docker buildx imagetools create --platform linux/amd64,linux/arm64 --tag $(BASE_BUN_IMAGE) docker.io/oven/bun:1-alpine
	docker buildx imagetools create --platform linux/amd64,linux/arm64 --tag $(BASE_NGINX_IMAGE) docker.io/library/nginx:1.27-alpine
	docker buildx imagetools create --platform linux/amd64,linux/arm64 --tag $(BASE_MYSQL_IMAGE) docker.io/library/mysql:8.4.4

ensure-base-images: guard-stack-env acr-login
	@for image in \
		"$(BASE_BUN_IMAGE)|docker.io/oven/bun:1-alpine" \
		"$(BASE_NGINX_IMAGE)|docker.io/library/nginx:1.27-alpine" \
		"$(BASE_MYSQL_IMAGE)|docker.io/library/mysql:8.4.4"; do \
		target="$${image%%|*}"; \
		source_image="$${image##*|}"; \
		if docker buildx imagetools inspect "$$target" 2>/dev/null | grep -q "Platform:[[:space:]]*linux/arm64"; then \
			echo "Using existing multi-arch $$target"; \
		else \
			echo "Seeding multi-arch $$target from $$source_image"; \
			docker buildx imagetools create --platform linux/amd64,linux/arm64 --tag "$$target" "$$source_image"; \
		fi; \
	done

compose-build: guard-stack-env ensure-base-images
	$(LOCAL_COMPOSE) build --build-arg BUN_CONFIG_REGISTRY=$(PKG_REGISTRY)

compose-migrate: guard-stack-env
	@$(LOCAL_COMPOSE) stop backend 2>/dev/null || true
	$(LOCAL_COMPOSE) up -d --wait mysql
	$(LOCAL_COMPOSE) run --rm --no-deps backend bun run migrate

up: install frontend-build compose-build compose-migrate
	$(LOCAL_COMPOSE) up -d --remove-orphans backend nginx
	@$(MAKE) start-watch

push: guard-stack-env acr-login ensure-base-images frontend-build
	@attempt=1; \
	while true; do \
		docker buildx build --platform $(BUILD_PLATFORMS) --push \
			$(BACKEND_CACHE_ARGS) \
			--build-arg BASE_BUN_IMAGE=$(BASE_BUN_IMAGE) \
			--build-arg BUN_CONFIG_REGISTRY=$(PKG_REGISTRY) \
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
			--build-arg BASE_NGINX_IMAGE=$(BASE_NGINX_IMAGE) \
			-t $(NGINX_IMAGE) \
			-f infra/nginx/Dockerfile . && break; \
		status=$$?; \
		if [ $$attempt -ge $(BUILD_RETRY_COUNT) ]; then exit $$status; fi; \
		echo "Nginx image build failed (attempt $$attempt/$(BUILD_RETRY_COUNT)); retrying in $(BUILD_RETRY_DELAY)s"; \
		attempt=$$((attempt + 1)); \
		sleep $(BUILD_RETRY_DELAY); \
	done

# ── remote ──────────────────────────────────────────────────────

remote-sync: guard-stack-env
	ssh $(REMOTE_HOST) "mkdir -p $(REMOTE_PATH) $(REMOTE_PATH)/scripts"
	scp $(DEPLOY_COMPOSE_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/$(DEPLOY_COMPOSE_FILE)
	scp $(STACK_ENV_FILE) $(REMOTE_HOST):$(REMOTE_PATH)/.env
	scp scripts/mysql-backup.sh scripts/mysql-restore.sh scripts/setup-backup-cron.sh $(REMOTE_HOST):$(REMOTE_PATH)/scripts/
	ssh $(REMOTE_HOST) "chmod +x $(REMOTE_PATH)/scripts/mysql-backup.sh $(REMOTE_PATH)/scripts/mysql-restore.sh $(REMOTE_PATH)/scripts/setup-backup-cron.sh"

remote-deploy: push remote-sync
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ -f $(REMOTE_RELEASE_ENV_FILE) ]; then cp $(REMOTE_RELEASE_ENV_FILE) $(REMOTE_PREVIOUS_RELEASE_ENV_FILE); fi \
		&& printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE) \
		&& echo '$(ALIYUN_PASSWORD)' | docker login $(ALIYUN_REGISTRY) -u '$(ALIYUN_USERNAME)' --password-stdin \
		&& $(REMOTE_COMPOSE) pull \
		&& $(REMOTE_COMPOSE) stop backend 2>/dev/null || true \
		&& $(REMOTE_COMPOSE) up -d --wait mysql \
		&& $(REMOTE_COMPOSE) run --rm --no-deps backend bun run migrate \
		&& $(REMOTE_COMPOSE) up -d --remove-orphans --no-build \
		&& docker image prune -f"
	@$(MAKE) remote-verify || { echo "Remote verification failed; attempting rollback."; $(MAKE) remote-rollback; exit 1; }

remote-verify: guard-stack-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then \
			echo 'No .release.env found. Run remote-deploy first.' >&2; \
			exit 1; \
		fi \
		&& $(REMOTE_COMPOSE) ps \
		&& curl -fsS http://127.0.0.1:$(BACKEND_PORT)/healthz >/dev/null \
		&& curl -fsS http://127.0.0.1:$(NGINX_PORT)/healthz >/dev/null \
		&& curl -fsS http://127.0.0.1:$(NGINX_PORT)/ >/dev/null \
		&& curl -fsS -X POST http://127.0.0.1:$(NGINX_PORT)/api/v1/system/summary >/dev/null"

remote-rollback: guard-stack-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_PREVIOUS_RELEASE_ENV_FILE) ]; then \
			echo 'No previous version to rollback to. Run remote-deploy first.' >&2; \
			exit 1; \
		fi \
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

remote-logs: guard-stack-env
	ssh $(REMOTE_HOST) "cd $(REMOTE_PATH) \
		&& if [ ! -f $(REMOTE_RELEASE_ENV_FILE) ]; then printf 'VERSION=%s\n' '$(VERSION)' > $(REMOTE_RELEASE_ENV_FILE); fi \
		&& $(REMOTE_COMPOSE) logs -f --tail=200"
