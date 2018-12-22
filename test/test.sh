#! /usr/bin/env nix-shell
#! nix-shell -i bash -p psmc
#! nix-shell -p R -p rPackages.textrecipes
#! nix-shell -p python -p pythonPackages.EZGmail
#! nix-shell -p nodejs -p nodePackages.bionode-ncbi -p nodePackages.async
#! nix-shell -I nixpkgs=../

echo PSMC $(psmc 2>&1 >/dev/null|grep Version)
Rscript -e 'version[["version.string"]]'
Rscript -e 'sprintf("textrecipes version: %s", packageVersion("textrecipes"))'
python --version
python -c 'import ezgmail ; print("EZGmail version: " + ezgmail.__version__)'
bionode-ncbi --version | awk '{print "Bionode-ncbi version: " $1}'
node -e 'typeof (require("async")).waterfall === "function" ? console.log("async available") : console.log("async missing")'