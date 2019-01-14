{ system ? builtins.currentSystem, pkg ? null }:

let
  nixVersion = "18.09";

  pinPkgs = import (builtins.fetchTarball {
    name = "nixos-${nixVersion}";
    url = "https://github.com/NixOS/nixpkgs/archive/${nixVersion}.tar.gz";
    sha256 = "1ib96has10v5nr6bzf7v8kw7yzww8zanxgw2qi1ll1sbv6kj6zpd";
  }) { inherit system; };

  pkgs = pinPkgs // {
    stdenv = pinPkgs.stdenv.overrideDerivation (attrs: attrs // {
      lib = attrs.lib // {
        maintainers = import ../../lib/maintainers.nix {};
      };
    });
  };

  callPackage = pkgs.lib.callPackageWith (pkgs // pkgs.xlibs // self);

  rPackages = callPackage ../development/r-modules {
    overrides = (p: {}) pkgs;
  };

  pythonGenerated = (import ../development/python-modules/requirements.nix { inherit pkgs; }).packages;
  python37Packages = pkgs.python37Packages // pythonGenerated;
  pythonPackages = python37Packages;
  python = pkgs.python3;

  nodePackages_10_x = callPackage ../development/node-packages/default-v10.nix {
    nodejs = pkgs.nodejs-10_x;
  };
  nodePackages = nodePackages_10_x;
  nodejs = pkgs.nodejs-10_x;

  languagesModules = {
    rPackages = rPackages;
    python = python;
    pythonPackages = pythonPackages;
    python37Packages = python37Packages;
    nodejs = nodejs;
    nodePackages = nodePackages;
  };

  customPkgs = {
    psmc = callPackage ../applications/science/biology/psmc {};
    pypi2nix = callPackage ../development/tools/pypi2nix {};
  };

  self = pkgs // languagesModules // customPkgs;

in self
