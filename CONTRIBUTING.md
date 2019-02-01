# Contributing

🎉 Thanks for taking the time to contribute to Nixster! 🎉

<!-- Automatically generated TOC. Don't edit, `make docs` instead>

<!-- toc -->

- [Environment building](#environment-building)
- [Server testing and deployment](#server-testing-and-deployment)
  * [Local development](#local-development)
  * [Local `dist` testing](#local-dist-testing)
  * [Local `build` testing](#local-build-testing)
  * [Local Docker container testing](#local-docker-container-testing)
  * [Local container orchestration testing](#local-container-orchestration-testing)
- [Updating the package distribution](#updating-the-package-distribution)
  * [How to add R packages](#how-to-add-r-packages)
  * [How to add Node.js packages](#how-to-add-nodejs-packages)
  * [How to add Python packages](#how-to-add-python-packages)
  * [How to change the pinned version of upstream `nixpkgs`](#how-to-change-the-pinned-version-of-upstream-nixpkgs)

<!-- tocstop -->

## Environment building

During development, you'll usually want to have some Nixster environments already built so you can test against them. The CLI's `build` command is used to build environments. You can do that locally e.g.

```bash
nixster build multi-mega
```

Nixster will by default, tell Nix to put built packages in `/nix/store` and the environment 'profile' in `/nix/profiles`.  Nixster allows you to build into a different directory by using the `--store` option. The `make docker-build` recipe uses this option to build into the local `./nixroot` directory which can be later mounted into the server container (see below). 


## Server testing and deployment

In addition to the CLI, Nixster provides a web server interface (started using the CLI `serve` command) allowing remote users to start interactive sessions within environments. In this section we provides some tips on how to test and deploy the Nixster server, moving from the simplest, local development scenario through to the most complex, Kubernetes cluster deployment scenario. If you're debugging the server code and/or setup it can be useful to progressively move from the simple to complex scenarios.

### Local development

To run a local development server with live rebooting after changes to Typescript (via `ts-node-dev`) use:

```bash
npm run serve:dev # or make serve
```

The `serve` command has `--port` and `--address` options which you can pass to the `npm run serve:*` scripts using the `--` separator. e.g.

```bash
npm run serve:dev -- --port 3001 --address 0.0.0.0
```

### Local `dist` testing

To compile Typescript in `src` to Javascript in `dist` and run the server on that do:

```bash
npm run build:dist
npm run serve:dist
```

This isn't all that useful for development but could be useful for debugging things like serving static files etc.

### Local `build` testing

In production, we serve using the binary executable built using [`pkg`](https://github.com/zeit/pkg), rather than `npm run serve:dist`. This allows for smaller and faster Docker images. To test that the binary is serving correctly run:

```bash
npm run build
./build/nixster serve
```

### Local Docker container testing

The Nixster [`Dockerfile`](Dockerfile) defines a two-stage image build. In the first stage, the binary executable is built on Linux. It's copied to the final image in the second stage. We do this here, rather than copy the locally build binary, because you might be on Mac or Windows and for deployment we need a Linux build (plus it's more reproducible :) You can test the first stage build using:

```bash
docker build . --target builder --tag stencila/nixster:builder
docker run --rm -it -p 3000:3000 stencila/nixster:builder ./build/nixster serve --port 3000
```

The final image includes Nixster, Nix and the Docker client. This image required access to a Docker daemon to launch new user sessions. You can test this locally by connecting it to your local Docker daemon and Nix store using:

```bash
make docker # builds the full image
make docker-serve # mounts volumes, publishes ports and serves from the image
```

### Local container orchestration testing

In production, Nixster requires two containers to be running, one using the `stencila/nixster` image and one using the `docker:dind` image to provide a Docker daemon. To test that these containers and volumes are configured to talk each other properly you can use [`docker-compose`](https://docs.docker.com/compose/):

```bash
docker-compose up --build
```

Use `Ctrl+C` to stop both containers. The `--build` flag ensures that you are using the latest version of the Nixster image defined in the `Dockerfile`.


## Updating the package distribution

*Note*: these instructions are for developers to add new Nix package definitions to the distribution, not for users to add new packages to an environment (for which you simple use `nixster add --to <env> <pkg>`)

### How to add R packages

Simply run [`r-modules/generate.sh`](nix/pkgs/development/r-modules/generate.sh) and it will generate updated packages descriptions for CRAN and Bioconductor. If run regularly, this should be relatively fast as it will only add or update the difference since the last run.

### How to add Node.js packages

Add the packages name to the appropriate JSON file for each Node version (e.g. [`node-packages/node-packages-v10.json`](nix/pkgs/development/node-packages/node-packages-v10.json). Then run [`node-packages/generate.sh`](nix/pkgs/development/node-packages/generate.sh). Unlike R packages, this might take a while since it will query npm again for all the packages each time.

### How to add Python packages

Add the package name to [`python-modules/requirements.txt`](nix/pkgs/development/python-modules/requirements.txt) then run [`python-modules/generate.sh`](nix/pkgs/development/python-modules/generate.sh). This might take a while since it might try to compile some things. If it fails due to a missing dependency, add it with the `-E` parameter in the `pypi2nix` command of `generate.sh`. If it complains about missing headers try to add the missing dependency with the `-s` parameter.

### How to change the pinned version of upstream `nixpkgs`

To change the version of [NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/releases) used edit the version number in the [all-packages.nix](nix/pkgs/top-level/all-packages.nix#L4) file.
