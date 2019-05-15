## 📦 Nixster
### A package manager based on Nix

[![Build status](https://travis-ci.org/stencila/nixster.svg?branch=master)](https://travis-ci.org/stencila/nixster)
[![Code coverage](https://codecov.io/gh/stencila/nixster/branch/master/graph/badge.svg)](https://codecov.io/gh/stencila/nixster)
[![Greenkeeper badge](https://badges.greenkeeper.io/stencila/nixster.svg)](https://greenkeeper.io/)
[![NPM](http://img.shields.io/npm/v/@stencila/nixster.svg?style=flat)](https://www.npmjs.com/package/@stencila/nixster)
[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://stencila.github.io/nixster/)
[![Chat](https://badges.gitter.im/stencila/stencila.svg)](https://gitter.im/stencila/stencila)

[Nix](https://nixos.org/nix/) is a superbly well designed and powerful cross-platform package manager. But it's also got a very steep learning curve. Even for experienced programmers it can be daunting to use. 

Nixster is a thin, sugary wrapper around Nix to make it sweeter to use 🍭! It takes a JSON (or YAML) definition of a reproducible computing [`Environment`](https://stencila.github.io/schema/Environment) and builds a Nix environment for it.

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

:warning: Experimental and in early development. At this stage we are experimenting with what features Nixster will have and how it will add value to reproducible workflows. Feedback and contributions welcome! :heart:.

## Demo

<a href="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP?size=medium&cols=120&autoplay=1" target="_blank"><img src="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP.svg" /></a>


## Install

Nixster is available as a pre-built, standalone [command line tool](#command-line-tool), a [Node package](#node-package), or in [Docker image](#docker-image).

For the command line tool and the Node package you will also need to have [Nix installed](https://nixos.org/nix/download.html):

```bash
curl https://nixos.org/nix/install | sh
```

### Command line tool

#### Linux

To install the latest release of the `nixster` command line tool to `~/.local/bin/` just use,

```bash
curl -L https://raw.githubusercontent.com/stencila/nixster/master/install.sh | bash
```

To install a specific version, append `-s vX.X.X` e.g.

```bash
curl -L https://raw.githubusercontent.com/stencila/nixster/master/install.sh | bash -s v1.0.1
```

Or, if you'd prefer to do things manually, or place Nixster elewhere, download `nixster-linux-x64.tar.gz` for the [latest release](https://github.com/stencila/nixster/releases/) and then,

```bash
tar xvf nixster-linux-x64.tar.gz
mv -f nixster ~/.local/bin/ # or wherever you like
```

#### MacOS and Windows

Binaries are not yet available.

### Node package

Currently you will need to install the package via this repo (not yet published to NPM):

```bash
git clone git@github.com:stencila/nixster.git
cd nixster
npm install
```

To test the CLI more conveniently you can add an alias to your shell e.g.

```bash
alias nixster='npx ts-node src/cli.ts'
```

Or, if you want to use the CLI outside of this directory:

```bash
alias nixster='/path/to/nixster/node_modules/.bin/ts-node --project /path/to/nixster/tsconfig.json /path/to/nixster/src/cli.ts'
```

### Docker image

Instead of installing Nix and Nixster you can use the `stencila/nixster` Docker image:

```bash
make docker docker-interact
```
