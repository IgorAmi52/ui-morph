.PHONY: all dev db-up db-down db-migrate db-drop db-reset

all:
	pnpm dev:all

dev:
	pnpm dev:all

db-up:
	pnpm db:up

db-down:
	pnpm db:down

db-migrate:
	pnpm db:migrate

db-drop:
	docker compose down -v

db-reset: db-drop db-up db-migrate
