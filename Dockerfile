# Multi-stage Dockerfile for `stencila/nixtser`

# Build the Nixster binary
# Note that the `nixster` binary produced will include native modules
# e.g. better-sqlite3.node for the platform it is built on (so it needs
# to be a Linux builder to run on Linux-based Docker image)

FROM node:10 AS builder
WORKDIR /nixster
# Copy package.json and install packages, instead of doing it whenever the src changes
COPY package.json .
RUN npm install
# Prefetch required Node.js binaries, instead of doing it whenever the src changes
RUN touch dummy.js && npx pkg dummy.js --target=node10 --out-path=build && rm -rf build && rm dummy.js
# Copy everything and build!
COPY envs envs/
COPY src src/
COPY src static/
COPY tsconfig.json .
RUN npm run build

# Main image with Nix installed and NIxter copied into it

FROM ubuntu:18.04

# This is based on https://github.com/NixOS/docker/blob/master/Dockerfile

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y wget ca-certificates \
 && wget https://nixos.org/releases/nix/nix-2.2.1/nix-2.2.1-x86_64-linux.tar.bz2 \
 && echo "e229e28f250cad684c278c9007b07a24eb4ead239280c237ed2245871eca79e0 nix-2.2.1-x86_64-linux.tar.bz2" | sha256sum -c \
 && tar xjf nix-*-x86_64-linux.tar.bz2

# Create a non-root user
RUN groupadd --gid 30000 nixbld \
  && for i in $(seq 1 30); do useradd --uid $((30000 + i)) --groups nixbld nixbld$i ; done
RUN useradd --uid 1001 --create-home --groups nixbld nixster
RUN install --mode 755 --owner nixster --directory /nix

ENV USER root

RUN mkdir -m 0755 /etc/nix \
 && echo 'sandbox = false' > /etc/nix/nix.conf

#USER nixster

RUN USER=root sh nix-*-x86_64-linux/install
#RUN /nix/var/nix/profiles/default/bin/nix-collect-garbage --delete-old \
# && /nix/var/nix/profiles/default/bin/nix-store --optimise \
# && /nix/var/nix/profiles/default/bin/nix-store --verify --check-contents

WORKDIR /home/nixster

COPY --from=builder /nixster/build/nixster /home/nixster

# Prepend application directory and Nix profile to PATH
ENV PATH=/home/nixster:/root/.nix-profile/bin:/root/.nix-profile/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Check that Nixster is installed properly and do bootstapping of native Node modules 
RUN nixster --help

# Check that Nix is installed properly
RUN nix-env --version

RUN nix-channel --add https://nixos.org/channels/nixos-18.09 \
 && nix-channel --update \
 && nixster update nixos-18.09

CMD nixster serve
