#!/bin/bash -x

# This script builds a docker image of geomodels website
# IF first parameter is "everything" - it will build for all models using data pre-downloaded into a local dir
# else it downloads & builds using North Gawler model (courtesy Geological Survey of SA [https://energymining.sa.gov.au/minerals/geoscience/geological_survey])

# Clone a local copy of 'geomodel-2-3dweb'
[ ! -d geomodel-2-3dweb ] && git clone https://github.com/AuScope/geomodel-2-3dweb.git

# Go to 'web_build' dir
pushd geomodel-2-3dweb/web_build

# Creates all the files that are used to display the models
if [ "$1" = "everything" ]; then
  echo "Building everything"
  [ ! -d geomodels ] && ./batch_proc.py

else
  echo "Building demo"
  [ ! -d src_model ] && mkdir src_model
  pushd src_model
  if [ ! -d Quamby ]; then
    # Data courtesy QLD Geological Survey (https://www.business.qld.gov.au/industries/mining-energy-water/resources/geoscience-information/gsq)
    curl https://s3-ap-southeast-2.amazonaws.com/gsq-prod-ckan-horizon-public/resources/8fdb1dc4-dc39-4ab5-9c9a-898a05eba1d8/quamby-3d-model.zip > quamby-3d-model.zip
    unzip -o quamby-3d-model.zip -x 'Quamby/Quamby_Project.prj/*'
    \rm -f quamby-3d-model.zip
  fi
  popd
  if [ ! -d geomodels ]; then
    ./batch_proc.py --model src_model geomodels quamby Quamby input/QuambyConvParam.json Quamby/TSurf
    [ "$?" -ne 0 ] && echo "batch_proc failed" && exit 1
  fi
fi

# Create borehole database
if [ ! -d bh_out ]; then
  ./make_boreholes.py -b batch.txt bh_out
  [ "$?" -ne 0 ] && echo "make_boreholes failed" && exit 1
fi

# Build WSGI website directory
\rm -f 2*-api.tar && ./build_api_dir.sh bh_out/query_data.db
[ "$?" -ne 0 ] && echo "build_api_dir failed" && exit 1

# Get back to docker dir
popd

# Go to root dir
pushd ..
# Build docker image
sudo docker system prune -af && sudo docker build -t geomodels -f docker/Dockerfile .
#sudo docker build -t geomodels -f docker/Dockerfile .
popd

# To run locally at port 4000:
# sudo docker run -d -p 4000:80 geomodels

# To stop:
# sudo docker ps
# sudo docker stop <container_id>

# To run as shell:
# sudo docker run -it -p 4000:80 geomodels sh


