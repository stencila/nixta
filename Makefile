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

serve:
	npm run serve:dev

docker:
	docker build . --tag stencila/nixster

docker-run:
	docker run --rm --interactive --tty --volume $$PWD/nixstore:/nixstore --publish 3000:3000 stencila/nixster 

docker-interact:
	docker run --rm --interactive --tty --volume $$PWD/nixstore:/nixstore stencila/nixster bash

docker-push:
	docker push stencila/nixster

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
