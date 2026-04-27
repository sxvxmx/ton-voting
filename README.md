# TON Student DAO Telegram Mini App (Testnet)

A production-structured monorepo for a student DAO voting system running as a Telegram Mini App with on-chain voting logic on TON testnet.

## Features

- Telegram Mini App frontend in React + Vite.
- TON Connect wallet integration for auth and transaction signing.
- On-chain DAO voting contract (Tact + Blueprint) with:
  - proposal creation,
  - one-wallet-one-vote,
  - explicit on-chain finalization,
  - on-chain tally and getters.
- Optional Go read-only indexer API with SQLite cache.
- Docker Compose deployment with Caddy HTTPS reverse proxy.

## Repository layout

- `contracts/` Tact smart contract, Blueprint scripts/tests, payload helpers.
- `frontend/` React Mini App UI, TON Connect integration, Telegram user context.
- `backend/` Go indexer and read-only proposal/results API.
- `deploy/` Caddy and VM helper scripts.

## Smart contract behavior

Governance defaults implemented:

- Any wallet can create proposals.
- Proposal creation requires at least `0.2 TON` (non-refundable, remains in contract treasury).
- Vote format is binary yes/no.
- One vote per wallet per proposal, first vote is final.
- Proposal finalization is explicit transaction (`finalize_proposal`).
- Pass rule: `yes_votes > no_votes && total_votes >= quorum`.

### Message opcodes

- `0x43524541` (`CREATE_PROPOSAL`)
- `0x564f5445` (`CAST_VOTE`)
- `0x46494e41` (`FINALIZE_PROPOSAL`)

### Message payload layout

`create_proposal` body:

1. opcode (`uint32`)
2. deadline timestamp (`uint64`)
3. quorum (`uint32`)
4. title (`ref cell`, string tail)
5. description (`ref cell`, string tail)

`cast_vote` body:

1. opcode (`uint32`)
2. proposal id (`uint32`)
3. support flag (`1 bit`, 1 = yes, 0 = no)

`finalize_proposal` body:

1. opcode (`uint32`)
2. proposal id (`uint32`)

## Environment setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill required values in `.env`:

- `DOMAIN`, `EMAIL`, `WEBAPP_URL`
- `BOT_TOKEN`, `BOT_USERNAME`
- `CONTRACT_ADDRESS`
- `TON_API_ENDPOINT`, `TON_API_KEY` (optional)
- frontend `VITE_*` variables

3. Update TON Connect manifest domain fields in `frontend/public/tonconnect-manifest.json`:

- `url`
- `termsOfUseUrl`
- `privacyPolicyUrl`

## Local development

### 1) Contract

```bash
cd contracts
npm install
npm run build
npm run test
npm run deploy:testnet
```

`npm run build` and `npm run deploy:testnet` include a small runtime Set-method polyfill so Tact compiler works on older Node runtimes.

Deployment prints the testnet contract address. Put it in root `.env` (`CONTRACT_ADDRESS` and `VITE_CONTRACT_ADDRESS`).

### 2) Backend

```bash
cd backend
go mod tidy
go test ./...
go run ./cmd/server
```

Default listen: `http://localhost:8080`.

### 3) Frontend

```bash
cd frontend
npm install
npm run test
npm run dev
```

Default UI: `http://localhost:5173`.

For local frontend-to-backend requests, set in root `.env` and frontend runtime:

- `VITE_API_BASE_URL=http://localhost:8080/api`

## Docker deployment on cloud.ru VM

### 1) Domain + DNS

Use DuckDNS/No-IP domain and point it to VM public IP.

Optional helper for DuckDNS updates:

```bash
export DUCKDNS_DOMAIN=your-subdomain
export DUCKDNS_TOKEN=your-token
./deploy/duckdns-update.sh
```

### 2) Install Docker on VM

```bash
./deploy/vm-bootstrap.sh
```

### 3) Configure env and launch

```bash
cp .env.example .env
# edit .env with real values

docker compose --env-file .env up -d --build
```

Caddy serves:

- frontend at `https://$DOMAIN`
- backend health at `https://$DOMAIN/health`
- backend API at `https://$DOMAIN/api/*`

## Telegram bot setup (BotFather)

1. Create bot:

- `/newbot`

2. Set Mini App menu button URL:

- `/setmenubutton`
- choose your bot
- button text, e.g. `Open DAO`
- URL: `https://<your-domain>`

3. Add `/start` fallback command description:

- `/setcommands`
- command list:
  - `start - Open the Student DAO Mini App`

The bot token goes into `.env` as `BOT_TOKEN`.

## API endpoints (read-only)

- `GET /health`
- `GET /api/proposals?status=active|finalized`
- `GET /api/proposals/:id`
- `GET /api/proposals/:id/results`

## Delivery checklist

Fill these after deployment:

- GitHub repository URL: `TODO`
- Telegram Mini App URL: `TODO`
- TON testnet contract address: `TODO`

## Notes

- Canonical state is always on-chain in the DAO contract.
- Backend cache improves read performance and list views.
- This implementation is testnet-only by design.
