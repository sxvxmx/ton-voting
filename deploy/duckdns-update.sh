#!/usr/bin/env sh
set -eu

if [ -z "${DUCKDNS_DOMAIN:-}" ] || [ -z "${DUCKDNS_TOKEN:-}" ]; then
  echo "DUCKDNS_DOMAIN and DUCKDNS_TOKEN must be set"
  exit 1
fi

curl "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip="
