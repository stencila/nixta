#!/usr/bin/env bash

# Script for creating CLI demo
# To record a demo, install the current CLI in this repo using:
#   make build
#   sudo npm link
# Make sure you have asciinema installed and then:
#   make demo

# Include the demoing code
. demo-magic.sh
clear

# Set some options
DEMO_PROMPT=$BLUE"$ "
DEMO_CMD_COLOR=$GREEN

# Run the demo!

p "# Nixster is a package manager and distribution based on Nix."
p "# The nixster command line tool is for managing Nix environments and the packages with them."
pe "nixster --help"
sleep 3

p "# Nixster also comes with some predefined environments."
pe "nixster envs"
sleep 3

p "# Environments can extend from one another."
p "# For example, the 'r' environment contains only R."
pe "nixster show r"
sleep 3

p "# But the 'r-mini' environment extends it by adding some commonly used R packages."
pe "nixster show r-mini"
sleep 3

p "# The 'multi-mega' environment has *everything* in it and is what we use by default"
p "# for user sessions on the Stencila Hub."
pe "nixster show multi-mega"
sleep 3

p "# Actually, there's not that much in there right now because we haven't had time"
p "# yet to specify those environments :)"
p

p "# You can create your own environments using the 'create' command."
pe "nixster create myenv --extends r --adds r-ggplot2"
sleep 1

p "# That created a new project that we can inspect with the 'show' command."
pe "nixster show myenv"
sleep 3

p "# You can execute a command within an environment."
p "# Let's check that we can load the ggplot2 package into R."
pe "nixster within myenv \"Rscript -e 'library(ggplot2); sessionInfo()'\""
sleep 1

p "# Now, let's add another package to the environment."
p "# How about something to do with fish 🐟 🐟 🐟 !"
pe "nixster search 'fish*'"
sleep 3

p "# Some of the R packages sound interesting, let's install one into our environment!"
pe "nixster add --to myenv r-fishmove"
sleep 3

p "# Let's check that' they got installed..."
pe "nixster within myenv \"Rscript -e 'library(fishmove); sessionInfo()'\""
sleep 3

p "# Each environment is defined in a YAML file."
pe "cat envs/myenv.yaml"
sleep 2

p "# You can also create or modifying environments by editing those YAML files by hand."
p "# Just remember to run the 'build' command after changing the file."
pe "nixster build myenv"
sleep 1

p "# Let's keep things tidy by deleting the environment."
pe "nixster delete myenv"
sleep 1

p "# Check out the docs (https://github.com/stencila/nixster#readme) for more things you can do with Nixster."
p "# Thanks for watching!"
sleep 2

p "# This demo was created using"
pe "nixster --version"
sleep 2

exit
