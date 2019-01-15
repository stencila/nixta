# 📦 Nixster: a package manager and distribution based on Nix

[![Build status](https://travis-ci.org/stencila/nixster.svg?branch=master)](https://travis-ci.org/stencila/nixster)
[![Code coverage](https://codecov.io/gh/stencila/nixster/branch/master/graph/badge.svg)](https://codecov.io/gh/stencila/nixster)
[![Greenkeeper badge](https://badges.greenkeeper.io/stencila/nixster.svg)](https://greenkeeper.io/)
[![NPM](http://img.shields.io/npm/v/@stencila/nixster.svg?style=flat)](https://www.npmjs.com/package/@stencila/nixster)
[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://stencila.github.io/nixster/)
[![Chat](https://badges.gitter.im/stencila/stencila.svg)](https://gitter.im/stencila/stencila)

> :warning: In early development! Contributions welcome! :heart:

<!-- Automatically generated TOC. Don't edit, `make docs` instead>

<!-- toc -->

- [Install](#install)
- [Demo](#demo)
- [Packages](#packages)
  * [How to add R packages](#how-to-add-r-packages)
  * [How to add Node.js packages](#how-to-add-nodejs-packages)
  * [How to add Python packages](#how-to-add-python-packages)
  * [How to change the pinned version of upstream [NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/releases)](#how-to-change-the-pinned-version-of-upstream-nixosnixpkgshttpsgithubcomnixosnixpkgsreleases)

<!-- tocstop -->

## Install

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

## Demo

<a href="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP?size=medium&cols=120&autoplay=1" target="_blank"><img src="https://asciinema.org/a/KD0z367VL5mBNknueUpqzVGMP.svg" /></a>

## Packages

### How to add R packages
Simply run [`r-modules/generate.sh`](nix/pkgs/development/r-modules/generate.sh) and it will generate updated packages descriptions for CRAN and Bioconductor. If run regularly, this should be relatively fast as it will only add or update the difference since the last run.

### How to add Node.js packages
Add the packages name to the appropriate JSON file for each Node version (e.g. [`node-packages/node-packages-v10.json`](nix/pkgs/development/node-packages/node-packages-v10.json). Then run [`node-packages/generate.sh`](nix/pkgs/development/node-packages/generate.sh). Unlike R packages, this might take a while since it will query npm again for all the packages each time.

### How to add Python packages
Add the package name to [`python-packages/requirements.txt`](nix/pkgs/development/node-packages/node-packages-v10.json) then run [`python-packages/generate.sh`](nix/pkgs/development/python-packages/generate.sh). This might take a while since it might try to compile some things. If it fails due to a missing dependency, add it with the `-E` parameter in the `pypi2nix` command of `generate.sh`. If it complains about missing headers try to add the missing dependency with the `-s` parameter.

### How to change the pinned version of upstream [NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/releases)
Edit the version number in the [all-packages.nix](nix/pkgs/top-level/all-packages.nix#L4) file.
