
## Server testing and deployment

In addition to the command line interface, Nixster provides a web server interface (started using the CLI `serve` command) allowing remote users to start interactive sessions within environments. In this section we provides some tips on how to test and deploy the Nixster server, moving from the simplest, local development scenario through to a production, cluster deployment scenario. If you're debugging the server code and/or setup it can be useful to progressively move from the simple to complex scenarios.

### Local development

To run a local development server with live rebooting after changes to Typescript (via `ts-node-dev`) use:

```bash
npm run serve:dev # or make serve
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

## Local Docker testing

The Nixster [`Dockerfile`](Dockerfile) defines a two-stage image build. In the first stage, the binary execuable is built on Linux. It's copied to the final image in the second stage. We do this here, rather than copy the locally build binary, because you might be on Mac or Windows and for deployment we need a Lnux build (plus it's more reproducible :) You can test the first stage build using:

```bash
docker build . --target builder --tag stencila/nixster:builder
docker run --rm -it -p 3000:3000 stencila/nixster:builder ./build/nixster serve
```

The final image includes Nixster, Nix and the Docker client. This image required access to a Docker daemon to launch new user sessions. You can test this locally by connecting it to your local Docker daemon and Nix store using:

```bash
make docker # builds the full image
make docker-serve # mounts volumes, publishes ports and serves from the image
```

