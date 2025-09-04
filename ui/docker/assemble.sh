#!/bin/bash -x

# This script assembles all the parts of the website prior to doing a docker build

# NB: Must be run from the 'docker' directory

# This the URL of the API to query 'geomodel-2-3dweb' to fetch the latest 3d model web assets and backend API builds
RELEASES_URL=https://api.github.com/repos/AuScope/geomodel-2-3dweb/releases/latest

[ ! -d build ] && mkdir build
pushd build

# Fetches all 3d model web assets from latest release in 'geomodels-2-3dweb' repo
# NB: 'jq' is used to parse the JSON output 
for url in `curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep web-assets.tar`; do
trim_url=$(echo $url | tr -d '"')
filn=`basename $trim_url`
p1=${filn%*-web-assets.tar.gz}
dirn=${p1#geomodels-*}

[ -d geomodels/$dirn ] && echo "Found geomodels/$dirn"

# Only fetch model files if folder does not exist
[ ! -d geomodels/$dirn ] && wget $trim_url && tar xvfz $filn && rm $filn
done

# Fetch API files from 'geomodels-2-3dweb' repo
[ -f api.tar.gz ] && rm -f api.tar.gz
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep api.tar | xargs wget

# Fetch the Python package state files from 'geomodels-2-3dweb' repo
[ -f pyproject.toml ] && rm -f pyproject.toml
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep pyproject.toml | xargs wget

[ -f pdm.lock ] && rm -f pdm.lock
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep pdm.lock | xargs wget
popd
