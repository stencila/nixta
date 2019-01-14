#! /usr/bin/env nix-shell
#! nix-shell -i bash -p wget parallel R rPackages.data_table
#! nix-shell -I nixpkgs=../../../..

# Generate new `*-packages.nix` files for each R package repository
# in the following list. 
# The renaming step is required because `generate-r-packages.R <repo>` reads `<repo>-packages.nix`
for repo in cran bioc bioc-annotation bioc-experiment; do
    Rscript generate-r-packages.R $repo > $repo-packages.nix.new
    [ -s $repo-packages.nix.new ] && mv $repo-packages.nix.new $repo-packages.nix
done
