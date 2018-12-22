#! /usr/bin/env nix-shell
#! nix-shell -i bash -p glibcLocales python37 nix-prefetch-github pypi2nix
#! nix-shell -I nixpkgs=../../../
export LANG=en_US.UTF-8
pypi2nix -v -V 3.7 -s numpy -r requirements.txt \
  -E gfortran -E blas -E pkgconfig -E freetype.dev \
  -E libpng -E zlib.dev -E libjpeg -E gcc -E glibcLocales
