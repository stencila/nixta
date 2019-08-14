## 📦 Nixta
### A package manager based on Nix

[![Build status](https://travis-ci.org/stencila/nixta.svg?branch=master)](https://travis-ci.org/stencila/nixta)
[![Code coverage](https://codecov.io/gh/stencila/nixta/branch/master/graph/badge.svg)](https://codecov.io/gh/stencila/nixta)
[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://stencila.github.io/nixta/)
[![Chat](https://badges.gitter.im/stencila/stencila.svg)](https://gitter.im/stencila/stencila)

[Nix](https://nixos.org/nix/) is a superbly well designed and powerful cross-platform package manager. But it's also got a very steep learning curve. Even for experienced programmers it can be daunting to use. 

Nixta is a thin, sugary wrapper around Nix to make it sweeter to use 🍭! It takes a JSON (or YAML) definition of a reproducible computing [`Environment`](https://stencila.github.io/schema/Environment) and builds a Nix environment for it.

<!-- Automatically generated TOC. Don't edit, `make docs` instead>

<!-- toc -->

- [Status](#status)
- [Demo](#demo)
- [Install](#install)
  * [Command line tool](#command-line-tool)
    + [Linux](#linux)
    + [MacOS and Windows](#macos-and-windows)
  * [Node package](#node-package)
  * [Docker image](#docker-image)

<!-- tocstop -->

## Status

:warning: Experimental and in early development. At this stage we are experimenting with what features Nixta will have and how it will add value to reproducible workflows. Feedback and contributions welcome! :heart:.

## Demo

<a href="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP?size=medium&cols=120&autoplay=1" target="_blank"><img src="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP.svg" /></a>

> Note: This demo uses the previous name for this tool, "Nixster".


## Install

Nixta is available as a pre-built, standalone [command line tool](#command-line-tool), a [Node package](#node-package), or in [Docker image](#docker-image).

For the command line tool and the Node package you will also need to have [Nix installed](https://nixos.org/nix/download.html):

```bash
curl https://nixos.org/nix/install | sh
```

### Command line tool

#### Linux

To install the latest release of the `nixta` command line tool to `~/.local/bin/` just use,

```bash
curl -L https://raw.githubusercontent.com/stencila/nixta/master/install.sh | bash
```

To install a specific version, append `-s vX.X.X` e.g.

```bash
curl -L https://raw.githubusercontent.com/stencila/nixta/master/install.sh | bash -s v0.1.1
```

Or, if you'd prefer to do things manually, or place Nixta elewhere, download `nixta-linux-x64.tar.gz` for the [latest release](https://github.com/stencila/nixta/releases/), and then

```bash
tar xvf nixta-linux-x64.tar.gz # unzip the download
sudo mkdir -p /user/local/bin/nixta-v0.1.1 # create a directory for it
sudo mv -f nixta /user/local/bin/nixta-v0.1.1 # move it there
sudo ln -sf nixta-v0.1.1/nixta /user/local/bin/nixta # create a link to the executable
sudo nixta --version # run once to setup necessary files and folders
```

#### MacOS and Windows

Binaries are not yet available.

### Node package

Currently you will need to install the package via this repo (not yet published to NPM):

```bash
git clone git@github.com:stencila/nixta.git
cd nixta
npm install
```

To test the CLI more conveniently you can add an alias to your shell e.g.

```bash
alias nixta='npx ts-node src/cli.ts'
```

Or, if you want to use the CLI outside of this directory:

```bash
alias nixta='/path/to/nixta/node_modules/.bin/ts-node --project /path/to/nixta/tsconfig.json /path/to/nixta/src/cli.ts'
```

### Docker image

Instead of installing Nix and Nixta you can use the `stencila/nixta` Docker image:

```bash
make docker docker-interact
```
