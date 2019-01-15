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

demo: demo-magic.sh
	asciinema rec -c "./demo.sh -n" --overwrite demo.cast

demo-play:
	asciinema play demo.cast

demo-upload:
	asciinema upload demo.cast

demo-magic.sh:
	curl https://raw.githubusercontent.com/nokome/demo-magic/master/demo-magic.sh > demo-magic.sh
	chmod +x demo.sh
