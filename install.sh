#!/usr/bin/env bash

# A script to download and install the latest version

OS=$(uname)
if [[ "$OS" == "Linux" || "$OS" == "Darwin" ]]; then
    case "$OS" in
        'Linux')
            PLATFORM="linux-x64"
            if [ -z "$1" ]; then
                VERSION=$(curl --silent "https://api.github.com/repos/stencila/nixta/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
            else
                VERSION=$1
            fi
            INSTALL_PATH="$HOME/.local/bin"
            ;;
        'Darwin')
            PLATFORM="macos-x64"
            if [ -z "$1" ]; then
                VERSION=$(curl --silent "https://api.github.com/repos/stencila/nixta/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
            else
                VERSION=$1
            fi
            INSTALL_PATH="/usr/local/bin"
            ;;
    esac

    echo "Downloading Nixta $VERSION"
    curl -Lo /tmp/nixta.tar.gz https://github.com/stencila/nixta/releases/download/$VERSION/nixta-$PLATFORM.tar.gz
    tar xvf /tmp/nixta.tar.gz
    rm -f /tmp/nixta.tar.gz
    
    echo "Installing nixta to $INSTALL_PATH/nixta-$VERSION/nixta"
    mkdir -p $INSTALL_PATH/nixta-$VERSION
    mv -f nixta $INSTALL_PATH/nixta-$VERSION
    # Unpack `node_modules` etc into the $INSTALL_PATH/nixta-$VERSION
    $INSTALL_PATH/nixta-$VERSION/nixta --version
    
    echo "Pointing nixta to $INSTALL_PATH/nixta-$VERSION/nixta"
    ln -sf nixta-$VERSION/nixta $INSTALL_PATH/nixta
else
    echo "Sorry, I don't know how to install on this OS, please see https://github.com/stencila/nixta#install"
fi
