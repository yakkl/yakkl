CREATE USER yakkl;
ALTER ROLE yakkl SET search_path TO yakkl,public;
CREATE DATABASE yakkl OWNER=yakkl;
\connect yakkl
CREATE SCHEMA yakkl AUTHORIZATION yakkl;
CREATE EXTENSION tsearch_extras SCHEMA yakkl;
