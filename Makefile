.PHONY: contracts-install contracts-build contracts-test contracts-deploy frontend-install frontend-dev frontend-build frontend-test backend-run backend-test docker-up docker-down

contracts-install:
	cd contracts && npm install

contracts-build:
	cd contracts && npm run build

contracts-test:
	cd contracts && npm run test

contracts-deploy:
	cd contracts && npm run deploy:testnet

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && npm run test

backend-run:
	cd backend && go run ./cmd/server

backend-test:
	cd backend && go test ./...

docker-up:
	docker compose --env-file .env up -d --build

docker-down:
	docker compose --env-file .env down
