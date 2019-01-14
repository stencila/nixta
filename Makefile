all: setup lint test build docs

setup:
	npm install

lint:
	npm run lint

test:
	npm test

cover:
	npm run cover

build:
	npm run build
.PHONY: build

docs:
	npm run docs
.PHONY: docs
