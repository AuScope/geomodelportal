#!/bin/bash -x

# Fetch web assets from 'geomodels-2-3dweb' repo
for model in Bendigo BurraMine CentralFlinders Cobar Curnamona CurnamonaSed EastLachlan McArthurBasin MtDore NewEngland NorthFlinders NorthGawler NorthQueensland Otway Quamby RockleaDome RoseberyLyell Sandstone SthNewEngland StuartShelf Tamworth Tas WesternGawler WestLachlan Windimurra Yilgarn
do
GZ_FILE="geomodels-$model-web-assets.tar.gz"
#wget "https://github.com/AuScope/geomodel-2-3dweb/releases/download/PORTAL_RELEASE_20210718/geomodels-$model-web-assets.tar.gz"
#tar xvfz $GZ_FILE
#\rm -f $GZ_FILE
done

# Fetch borehole db from 'geomodels-2-3dweb' repo
# wget ????

# Fetch API file from 'geomodels-2-3dweb' repo
# wget ????

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


