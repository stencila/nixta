#!/usr/bin/env nix-shell
#! nix-shell -i bash -p git nodePackages.node2nix
#! nix-shell -I nixpkgs=https://github.com/NixOS/nixpkgs-channels/archive/nixos-18.09.tar.gz

set -eu -o pipefail

rm -f node-env.nix
node2nix -6 -i node-packages-v6.json -o node-packages-v6.nix -c composition-v6.nix
node2nix -8 -i node-packages-v8.json -o node-packages-v8.nix -c composition-v8.nix
node2nix --nodejs-10 -i node-packages-v10.json -o node-packages-v10.nix -c composition-v10.nix