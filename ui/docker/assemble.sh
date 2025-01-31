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

[ ! -d geomodels/$dirn ] && wget $trim_url && tar xvfz $filn && rm $filn
done

# Fetch web assets from 'geomodels-2-3dweb' repo
#for model in Bendigo BurraMine CentralFlinders Cobar Curnamona CurnamonaSed EastLachlan McArthurBasin MtDore NewEngland NorthFlinders NorthGawler NorthQueensland Otway Quamby RockleaDome RoseberyLyell Sandstone SthNewEngland StuartShelf Tamworth Tas WesternGawler WestLachlan Windimurra Yilgarn
#for model in Tas
#do
#GZ_FILE="geomodels-$model-web-assets.tar.gz"
## wget "https://github.com/AuScope/geomodel-2-3dweb/releases/download/PORTAL_RELEASE_20210718/$GZ_FILE"
#done

## Fetch borehole db from 'geomodels-2-3dweb' repo
#if [ ! -f boreholes.tar.gz ]; then
#curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep boreholes.tar | xargs wget
#tar xvfz boreholes.tar.gz
#rm boreholes.tar.gz
#fi

# Fetch API files from 'geomodels-2-3dweb' repo
if [ ! -f api.tar.gz ]; then
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep api.tar | xargs wget
fi

# Fetch the Python package state files from 'geomodels-2-3dweb' repo
if [ ! -f py_build_state ]; then
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep py_pkg_state | xargs wget
fi
popd
