{ system ? builtins.currentSystem, pkg ? null }:

let
  nixVersion = "18.09";
  nixUrl = "https://github.com/NixOS/nixpkgs/archive/${nixVersion}.tar.gz";
  pinPkgs = import (fetchTarball nixUrl) { inherit system; };
  callPackage = pkgs.lib.callPackageWith (pkgs // pkgs.xlibs // self);

  pkgs = pinPkgs // {
    stdenv = pinPkgs.stdenv.overrideDerivation (attrs: attrs // {
      lib = attrs.lib // {
        maintainers = import ../../lib/maintainers.nix {};
      };
    });
  };

  pythonGenerated = (import ../development/python-modules/requirements.nix { inherit pkgs; }).packages;
  python37Packages = pkgs.python37Packages // pythonGenerated;
  pythonPackages = python37Packages;
  python = pkgs.python3;

  languagesModules = {
    python = python;
    pythonPackages = pythonPackages;
    python37Packages = python37Packages;
  };

  customPkgs = {
    psmc = callPackage ../applications/science/biology/psmc {};
    pypi2nix = callPackage ../development/tools/pypi2nix {};
  };

  self = pkgs // languagesModules // customPkgs;

in self
