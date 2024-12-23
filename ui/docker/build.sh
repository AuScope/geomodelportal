#!/bin/bash -x

RELEASES_URL=https://api.github.com/repos/AuScope/geomodel-2-3dweb/releases/latest

[ ! -d build ] && mkdir build
pushd build


# Fetches all web assets from latest github release in 'geomodels-2-3dweb' repo
for url in `curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep web-assets.tar`; do
trimmed_url=$(echo $url | tr -d '"')
echo $url
echo $trimmed_url

[ ! -f `basename $trimmed_url` ] && wget $trimmed_url && tar xvfz `basename $trimmed_url`
done

# Fetch web assets from 'geomodels-2-3dweb' repo
#for model in Bendigo BurraMine CentralFlinders Cobar Curnamona CurnamonaSed EastLachlan McArthurBasin MtDore NewEngland NorthFlinders NorthGawler NorthQueensland Otway Quamby RockleaDome RoseberyLyell Sandstone SthNewEngland StuartShelf Tamworth Tas WesternGawler WestLachlan Windimurra Yilgarn
#for model in Tas
#do
#GZ_FILE="geomodels-$model-web-assets.tar.gz"
## wget "https://github.com/AuScope/geomodel-2-3dweb/releases/download/PORTAL_RELEASE_20210718/$GZ_FILE"
#done

# Fetch borehole db from 'geomodels-2-3dweb' repo
if [ ! -f boreholes.tar.gz ]; then
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep boreholes.tar | xargs wget
tar xvfz boreholes.tar.gz
fi

# Fetch API file from 'geomodels-2-3dweb' repo
if [ ! -f api.tar.gz ]; then
curl -s $RELEASES_URL | jq ".assets | .[] | .browser_download_url" | grep api.tar | xargs wget
tar xvfz api.tar.gz
fi

popd

# Go to root dir
pushd ..

# Build docker image, assumes shell user id is a member of 'docker' group
#docker system prune -af && docker build -t geomodels -f docker/Dockerfile .
docker build -t geomodels -f docker/Dockerfile .
popd

# To run locally at port 4000:
# docker run -d -p 4000:80 --name geomodels geomodels

# To stop:
# docker ps
# docker stop <container_id>

# To run as shell:
# docker run -it -p 4000:80 geomodels sh


