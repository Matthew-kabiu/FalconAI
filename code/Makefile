SHELL := /bin/bash
# Falcon AI — one command per environment. Run from code/.
# development → docker-compose.dev.yml     + .env.development
# staging     → docker-compose.staging.yml + .env.staging     (verbatim mirror of production)
# production  → docker-compose.prod.yml    + .env.production

DEV  = docker compose --env-file .env.development -p falcon-dev        -f docker-compose.dev.yml
STG  = docker compose --env-file .env.staging     -p falcon-staging    -f docker-compose.staging.yml
PROD = docker compose --env-file .env.production  -p falcon-production -f docker-compose.prod.yml

.PHONY: dev-up dev-down dev-logs staging-up staging-down staging-logs prod-up prod-down prod-logs config-check mirror-check

dev-up:       ; $(DEV) up --build -d
dev-down:     ; $(DEV) down
dev-logs:     ; $(DEV) logs -f

staging-up:   ; $(STG) up -d --build
staging-down: ; $(STG) down
staging-logs: ; $(STG) logs -f

prod-up:      ; $(PROD) up -d --build
prod-down:    ; $(PROD) down
prod-logs:    ; $(PROD) logs -f

# Renders all three configurations without starting anything; fails on a missing variable.
config-check: mirror-check
	@$(DEV) config --quiet && echo "development: ok"
	@$(STG) config --quiet && echo "staging: ok"
	@$(PROD) config --quiet && echo "production: ok"

# Staging must mirror production: after swapping the env-file name and header comments,
# the two compose files must be identical.
mirror-check:
	@diff <(grep -v '^#' docker-compose.staging.yml | sed 's/\.env\.staging/.env.ENV/') \
	      <(grep -v '^#' docker-compose.prod.yml    | sed 's/\.env\.production/.env.ENV/') \
	  && echo "staging mirrors production: ok"
