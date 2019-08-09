#!/usr/bin/env bash

# This script builds a docker image of geomodels

# Clone a local copy of 'geomodel-2-3dweb'
[ ! -d geomodel-2-3dweb ] && git clone https://github.com/AuScope/geomodel-2-3dweb.git

# Creates all the files that are used to display the models
[ ! -d geomodel-2-3dweb/scripts/geomodels ] && pushd geomodel-2-3dweb/scripts && ./batch_proc.py && popd

# Create borehole database
[ ! -d geomodel-2-3dweb/scripts/bh_out ] && pushd geomodel-2-3dweb/scripts && ./make_boreholes.py -b batch.txt bh_out && popd

# Build WSGI website directory
pushd geomodel-2-3dweb/scripts && \rm -f 2*-api.tar && ./build_api_dir.sh bh_out/query_data.db && popd

# Build docker image
cd .. && sudo docker system prune -af && sudo docker build -t geomodels -f docker/Dockerfile .


# To run locally at port 4000:
# sudo docker run -p 4000:80 geomodels

# To stop:
# sudo docker ps
# sudo docker stop <container_id>

# To run as shell:
# sudo docker run -it -p 4000:80 geomodels sh


