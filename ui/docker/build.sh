#!/bin/bash -x

# This script performs a docker build
#
# NB: Assumes it is run from the 'docker' folder

# Assemble all the website back-end parts
./assemble.sh

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


