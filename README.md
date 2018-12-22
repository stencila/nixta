# nixpkgs
📦 Stencila's Nix packages collection

## How to add R packages
Simply run [`r-modules/generate.sh`](pkgs/development/r-modules/generate.sh) and it will generate updated packages descriptions for CRAN and Bioconductor. If run regularly, this should be relatively fast as it will only add or update the difference since the last run.

## How to add Node.js packages
Add the packages name to the appropriate JSON file for each Node version (e.g. [`node-packages/node-packages-v10.json`](pkgs/development/node-packages/node-packages-v10.json). Then run [`node-packages/generate.sh`](pkgs/development/node-packages/generate.sh). Unlike R packages, this might take a while since it will query npm again for all the packages each time.

## How to add Python packages
Add the package name to [`python-packages/requirements.txt`](pkgs/development/node-packages/node-packages-v10.json) then run [`python-packages/generate.sh`](pkgs/development/python-packages/generate.sh). This might take a while since it might try to compile some things. If it fails due to a missing dependency, add it with the `-E` parameter in the `pypi2nix` command of `generate.sh`. If it complains about missing headers try to add the missing dependency with the `-s` parameter.

## How to change the pinned version of upstream [NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/releases)
Edit the version number in the [all-packages.nix](pkgs/top-level/all-packages.nix#L4) file.
