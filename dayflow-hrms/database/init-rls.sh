#!/bin/sh
# Substitutes the __APP_DB_PASSWORD__ placeholder in a7_rls.sql with the real
# value from the APP_DB_PASSWORD environment variable, then runs the result
# through psql. Run by docker-entrypoint-initdb.d (which sources/executes
# every *.sh file it finds, inheriting the `db` service's container
# environment) instead of mounting a7_rls.sql directly — see
# docker-compose.yml. Uses plain `sed`, not envsubst, since the latter isn't
# installed in the postgres:16-alpine image by default.
set -e

: "${APP_DB_PASSWORD:=dayflow_app_password}"

sed "s/__APP_DB_PASSWORD__/${APP_DB_PASSWORD}/g" /docker-entrypoint-initdb.d/a7_rls.sql.template \
  | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
