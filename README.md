# 📦 Nixster: a package manager and distribution based on Nix

[![Build status](https://travis-ci.org/stencila/nixster.svg?branch=master)](https://travis-ci.org/stencila/nixster)
[![Code coverage](https://codecov.io/gh/stencila/nixster/branch/master/graph/badge.svg)](https://codecov.io/gh/stencila/nixster)
[![Greenkeeper badge](https://badges.greenkeeper.io/stencila/nixster.svg)](https://greenkeeper.io/)
[![NPM](http://img.shields.io/npm/v/@stencila/nixster.svg?style=flat)](https://www.npmjs.com/package/@stencila/nixster)
[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://stencila.github.io/nixster/)
[![Chat](https://badges.gitter.im/stencila/stencila.svg)](https://gitter.im/stencila/stencila)

> :warning:
> In early development! Contributions welcome!
> :heart:

<!-- Automatically generated TOC. Don't edit, `make docs` instead>

<!-- toc -->

- [Install](#install)
  * [Node package](#node-package)
  * [Docker image](#docker-image)
- [Demo](#demo)

<!-- tocstop -->

## Install

### Node package

Currently you will need to install via this repo (not yet published to NPM and no binary yet available):

```bash
git clone git@github.com:stencila/nixster.git
cd nixster
npm install
```

You will also need to have [Nix installed](https://nixos.org/nix/download.html):

```bash
curl https://nixos.org/nix/install | sh
```

### Docker image

Instead of installing Nix and Nixster you can use the `stencila/nixster` Docker image:

```bash
make docker docker-interact
```

## Demo

<a href="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP?size=medium&cols=120&autoplay=1" target="_blank"><img src="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP.svg" /></a>
