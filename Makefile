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

# Build the Docker image
docker:
	docker build . --tag stencila/nixster

# Push the Docker image to hub.docker.com
docker-push:
	docker push stencila/nixster

# Build the Nixster environments within the local `nixroot` directory
# Currently this builds the `multi-mega` environment but in the future it
# may build all environments.
# The --privileged flag is necessary to avoid `error: cloning builder process: Operation not permitted`
# (see https://github.com/NixOS/nix/issues/2636 and other issues)
# This mounts the local `./nixroot` directory and tells Nixster (and thus Nix :) to build into it.
# We need to build into `/nixroot/nix/store` because in the container, `/nix/store` has `nix-env` which is used for the build.
docker-build:
	docker run --rm --interactive --tty \
		--privileged \
		--volume $$PWD/nixroot:/nixroot \
		stencila/nixster nixster build multi-mega --store /nixroot

# Run the Nixster server
docker-serve:
	docker run --rm --interactive --tty \
		--volume /var/run/docker.sock:/var/run/docker.sock \
		--volume $$PWD/nixroot:/nixroot:ro \
		--publish 3000:3000 \
		stencila/nixster nixster serve --address 0.0.0.0

# Interact with the container in a Bash shell. Useful for debugging build errors
docker-interact:
	docker run --rm --interactive --tty \
		--privileged \
		--volume $$PWD/nixroot:/nixroot \
		stencila/nixster bash

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
