
## Server testing and deployment

In addition to the command line interface, Nixster provides a web server interface (started using the CLI `serve` command) allowing remote users to start interactive sessions within environments. In this section we provides some tips on how to test and deploy the Nixster server, moving from the simplest, local development scenario through to the most complex, Kubernetes cluster deployment scenario. If you're debugging the server code and/or setup it can be useful to progressively move from the simple to complex scenarios.

### Local development

To run a local development server with live rebooting after changes to Typescript (via `ts-node-dev`) use:

```bash
npm run serve:dev # or make serve
```

The `serve` command has `--port` and `--address` options which you can pass to the `npm run serve:*` scripts using the `--` seperator. e.g.

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

The Nixster [`Dockerfile`](Dockerfile) defines a two-stage image build. In the first stage, the binary execuable is built on Linux. It's copied to the final image in the second stage. We do this here, rather than copy the locally build binary, because you might be on Mac or Windows and for deployment we need a Lnux build (plus it's more reproducible :) You can test the first stage build using:

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
