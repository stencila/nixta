#! /usr/bin/env nix-shell
#! nix-shell -i bash -p wget parallel R rPackages.data_table
#! nix-shell -I nixpkgs=../../..

Rscript generate-r-packages.R cran > cran-packages.nix.new
Rscript generate-r-packages.R bioc > bioc-packages.nix.new
Rscript generate-r-packages.R bioc-annotation > bioc-annotation-packages.nix.new
Rscript generate-r-packages.R bioc-experiment > bioc-experiment-packages.nix.new
[ -s cran-packages.nix.new ] && mv cran-packages.nix.new cran-packages.nix
[ -s bioc-packages.nix.new ] && mv bioc-packages.nix.new bioc-packages.nix
[ -s bioc-annotation-packages.nix.new ] && mv bioc-annotation-packages.nix.new bioc-annotation-packages.nix
[ -s bioc-experiment-packages.nix.new ] && mv bioc-experiment-packages.nix.new bioc-experiment-packages.nix
