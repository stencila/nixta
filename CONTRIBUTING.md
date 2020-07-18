# Contributing

🎉 Thanks for taking the time to contribute to Nixta! 🎉

<!-- Automatically generated TOC. Don't edit, `make docs` instead>

<!-- toc -->

- [Defining environments](#defining-environments)
  - [Changing the packages in an existing community environment](#changing-the-packages-in-an-existing-community-environment)
    - [Use `nixta`](#use-nixta)
    - [Use a text editor](#use-a-text-editor)
    - [Use Github editor](#use-github-editor)
  - [Creating a new community environment](#creating-a-new-community-environment)
- [Building environments](#building-environments)
- [Server testing and deployment](#server-testing-and-deployment)
  - [Local development](#local-development)
  - [Local `dist` testing](#local-dist-testing)
  - [Local `build` testing](#local-build-testing)
  - [Local Docker container testing](#local-docker-container-testing)
  - [Local container orchestration testing](#local-container-orchestration-testing)
  - [Local Kubernetes cluster testing](#local-kubernetes-cluster-testing)
    - [Getting started](#getting-started)
    - [Create a persistent volume](#create-a-persistent-volume)
    - [Build an environment](#build-an-environment)
    - [Serve the environment](#serve-the-environment)
    - [Shutting down](#shutting-down)
- [Updating the package distribution](#updating-the-package-distribution)
  - [How to add R packages](#how-to-add-r-packages)
  - [How to add Node.js packages](#how-to-add-nodejs-packages)
  - [How to add Python packages](#how-to-add-python-packages)
  - [How to change the pinned version of upstream `nixpkgs`](#how-to-change-the-pinned-version-of-upstream-nixpkgs)

<!-- tocstop -->

## Defining environments

Nixta comes with several predefined environments that are intended to be useful for the research community. We welcome proposed changes to these environments as well as proposals for new environments.

### Changing the packages in an existing community environment

One of the easiest (and most useful!) ways for you to contribute to Nixta is to propose the addition (or removal) of packages to community environments. There are several ways that you make such changes: using the `nixta` CLI tool, using a text editor, or using Github. If you don't have Nixta or this repo installed locally then [using Github](#use-github) is probably the easiest approach.

Please create a separate PR for each environment with a short description of why you are proposing the change.

#### Use `nixta`

You can use the `nixta` CLI to add or remove packages to the community environments in this repository. Using `nixta` has the advantage over manually editing YAML files that it will check added package names are valid. However, it does require you to have both Nixta and Nix installed.

First, check the name of the package you want to add. For example, let's say we want to add the R package to do with titration that we can't remember the exact name of:

```bash
$ nixta search "titration*" --type r-package
r   r-titrationcurves              0.1.0
```

OK! Now we have the name let's add it to the `r-mega` environment:

```bash
$ nixta add r-titrationcurves --to r-mega
```

This may take some time because it will actually build the `r-titrationcurves` package (or fetch the pre-built binaries) and add it to the Nix environment. When that is done though the [`envs/r-mega.yaml`](envs/r-mega.yaml) file will be changed with the new package added:

```bash
$ git diff envs/r-mega.yaml
diff --git a/envs/r-mega.yaml b/envs/r-mega.yaml
index 69b122d..ff38d2b 100644
--- a/envs/r-mega.yaml
+++ b/envs/r-mega.yaml
@@ -3,3 +3,5 @@ type: Environment
 name: r-mega
 extends:
   - r-mini
+adds:
+  - r-titrationcurves
```

When you have finished making changes to each environment, commit those changes and create a pull request.

#### Use a text editor

Since environments are defined in YAML, you can add or remove packages by editing the `.yaml` file for the environment using your favourite text editor. For example, to change the `r-mega` environment, edit the [`envs/r-mega.yaml`](envs/r-mega.yaml) file. To add a new package, create a new item for it under the `adds` property. To remove a package, either remove it from the `adds` list, or if it is inherited from one of the base environments listed under `extends`, then add it to the `removes` list. e.g.

```yaml
'@context': 'https://stenci.la/schema/v01-draft/'
type: Environment
name: r-mega
extends:
  - r-mini
adds:
  # Add new packages in alphabetical order...
  - r-tidyverse
  - r-titanic
  - r-titrationcurves
```

If you do not have Nixta installed it can be sometimes difficult to work out the right package name to use. Until we have a better solution, we currently dump a tab separated file of all packages to https://stencila.github.io/nixta/packages.tsv on each Travis build.

#### Use Github editor

Edit the `.yaml` file for the environment directly on Github using the `https://github.com/stencila/nixta/edit/master/envs/<ENIRONMENT-NAME>.yaml` URL. For example, for the `r-mega` environment, edit the `envs/r-mega.yaml` file with this [link](https://github.com/stencila/nixta/edit/master/envs/r-mega.yaml). Github should ask you if you want to fork the repository and create a new pull request for your edit. Follow the instructions above for adding/removing packages using a text editor.

### Creating a new community environment

We also welcome any proposed new domain, or application, specific environments. For example, you might want to create an environment that is useful for you and your collegues in a narrow, specific domain without the bloat of the general `mega` environments. Please see the examples of existing environments in the `envs` directory, create a new `.yaml` file there, and submit a PR!

## Building environments

During development, you'll usually want to have some Nixta environments already built so you can test against them. The CLI's `build` command is used to build environments. You can do that locally e.g.

```bash
nixta build multi-mega
```

Nixta will by default, tell Nix to put built packages in `/nix/store` and the environment 'profile' in `/nix/profiles`. Nixta allows you to build into a different directory by using the `--store` option. The `make docker-build` recipe uses this option to build into the local `./nixroot` directory which can be later mounted into the server container (see below).

## Server testing and deployment

In addition to the CLI, Nixta provides a web server interface (started using the CLI `serve` command) allowing remote users to start interactive sessions within environments. In this section we provides some tips on how to test and deploy the Nixta server, moving from the simplest, local development scenario through to the most complex, Kubernetes cluster deployment scenario. If you're debugging the server code and/or setup it can be useful to progressively move from the simple to complex scenarios.

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
./build/nixta serve
```

### Local Docker container testing

The Nixta [`Dockerfile`](Dockerfile) defines a two-stage image build. In the first stage, the binary executable is built on Linux. It's copied to the final image in the second stage. We do this here, rather than copy the locally build binary, because you might be on Mac or Windows and for deployment we need a Linux build (plus it's more reproducible :) You can test the first stage build using:

```bash
docker build . --target builder --tag stencila/nixta:builder
docker run --rm -it -p 3000:3000 stencila/nixta:builder ./build/nixta serve --port 3000
```

The final image includes Nixta, Nix and the Docker client. This image required access to a Docker daemon to launch new user sessions. You can test this locally by connecting it to your local Docker daemon and Nix store using:

```bash
make docker # builds the full image
make docker-serve # mounts volumes, publishes ports and serves from the image
```

### Local container orchestration testing

In production, Nixta requires two containers to be running, one using the `stencila/nixta` image and one using the `docker:dind` image to provide a Docker daemon. To test that these containers and volumes are configured to talk each other properly you can use [`docker-compose`](https://docs.docker.com/compose/):

```bash
docker-compose up --build
```

Use `Ctrl+C` to stop both containers. The `--build` flag ensures that you are using the latest version of the Nixta image defined in the `Dockerfile`.

### Local Kubernetes cluster testing

You can test deployment of Nixta to a Kubernetes cluster using Minikube. Install [`minikube`](https://kubernetes.io/docs/tasks/tools/install-minikube/) and [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/).

#### Getting started

Start Minikube:

```bash
minikube start
```

The Minikube dashboard can be useful, especially when you are just getting familiar with Kubernetes. So you might want to open that up:

```bash
# In a separate terminal...
minikube dashboard
```

Then set various `DOCKER_*` environment variables in the current terminal session so that the `docker` client uses the Docker daemon inside that cluster:

```bash
eval $(minikube docker-env)
```

Using the Docker daemon inside the Minikube cluster avoids having to push/pull to a remote Docker image registry each time you change the Nixta source code. Now you can rebuild the Docker image inside the Minikube cluster using:

```bash
docker build . --tag stencila/nixta
```

If you change the Nixta `src` code you have to repeat this step to get those changes into the Minikube cluster.

#### Create a persistent volume

Nixta uses a persistent volume, that is shared by nodes in the cluster, to store package binaries in `/nix/store`. In this step we create the Kubernetes `PersistentVolume` and `PersistentVolumeClaim`s needed in the following `build` and `serve` steps.

```bash
kubectl apply -f minikube-volumes.yml
```

#### Build an environment

There is a Kubernetes `Job` for building a small test environment into the `/nix/store` on the `PersistentVolume`. Run that job using:

```bash
kubectl create -f minikube-build.yml
```

And check it's progress using:

```bash
$ kubectl get jobs
NAME                COMPLETIONS   DURATION   AGE
nixta-build-job   0/1           7m31s      7m31s
```

When the job is completed, before you can run it again, you'll need to delete it:

```bash
kubectl delete -f minikube-build.yml
```

#### Serve the environment

Now that there is a built Nix environment available in the Minikube cluster, we can serve it by deploying the Nixta server,

```bash
kubectl apply -f minikube-serve.yml
```

Check the `Deployment` is ready with:

```bash
$ kubectl get deployments
NAME                 READY     UP-TO-DATE   AVAILABLE   AGE
nixta-serve-deployment   1/1       1            1           2m32s
```

You can then get the URL of the server (so that you can visit in your browser or using `curl`):

```bash
minikube service nixta-service --url
```

#### Shutting down

When you're done testing, stop Minikube with:

```bash
minikube stop
```

## Updating the package distribution

_Note_: these instructions are for developers to add new Nix package definitions to the distribution, not for users to add new packages to an environment (for which you simple use `nixta add --to <env> <pkg>`)

### How to add R packages

Simply run [`r-modules/generate.sh`](nix/pkgs/development/r-modules/generate.sh) and it will generate updated packages descriptions for CRAN and Bioconductor. If run regularly, this should be relatively fast as it will only add or update the difference since the last run.

### How to add Node.js packages

Add the packages name to the appropriate JSON file for each Node version (e.g. [`node-packages/node-packages-v10.json`](nix/pkgs/development/node-packages/node-packages-v10.json). Then run [`node-packages/generate.sh`](nix/pkgs/development/node-packages/generate.sh). Unlike R packages, this might take a while since it will query npm again for all the packages each time.

### How to add Python packages

Add the package name to [`python-modules/requirements.txt`](nix/pkgs/development/python-modules/requirements.txt) then run [`python-modules/generate.sh`](nix/pkgs/development/python-modules/generate.sh). This might take a while since it might try to compile some things. If it fails due to a missing dependency, add it with the `-E` parameter in the `pypi2nix` command of `generate.sh`. If it complains about missing headers try to add the missing dependency with the `-s` parameter.

### How to change the pinned version of upstream `nixpkgs`

To change the version of [NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/releases) used edit the version number in the [all-packages.nix](nix/pkgs/top-level/all-packages.nix#L4) file.
