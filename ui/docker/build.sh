#!/bin/bash -x

# This script builds a docker image of geomodels website
# IF first parameter is "everything" - it will build for all models using data pre-downloaded into a local dir
# else it downloads & builds using two models downloaded from internet

# This function installs assimp
# Assumes 'cmake' is installed e.g. 'sudo apt install cmake'
function install_assimp() {
  [ ! -d assimp-4.1.0 ] && wget https://github.com/assimp/assimp/archive/v4.1.0.tar.gz && tar xvf v4.1.0.tar.gz
  pushd assimp-4.1.0
  cmake CMakeLists.txt && make -j4 || exit 1
  export LD_LIBRARY_PATH=`pwd`/lib
  echo "LD_LIBRARY_PATH=${LD_LIBRARY_PATH}"
  popd
}

# This function installs collada2gltf and sets env var
function install_collada2gltf() {
  [ ! -d COLLADA2GLTF ] && mkdir COLLADA2GLTF && cd COLLADA2GLTF && wget https://github.com/KhronosGroup/COLLADA2GLTF/releases/download/v2.1.5/COLLADA2GLTF-v2.1.5-linux.zip && unzip COLLADA2GLTF-v2.1.5-linux.zip && cd ..
  export COLLADA2GLTF_BIN=`pwd`/COLLADA2GLTF
  echo "COLLADA2GLTF_BIN=$COLLADA2GLTF_BIN"
}

# This function upgrades pip & installs python packages
function install_python_reqs() {
  pushd ..
  # back to 'geomodel-2-3dweb'
  pwd

  # Install python packages
  # Assumes 'python3-env' package is installed e.g. 'sudo apt install python3-venv'
  [ ! -d venv ] && mkdir venv && python3 -m venv ./venv
  . ./venv/bin/activate
  pwd
  # upgrade pip so it can install pyproj
  pip3 install -U pip
  pip3 install -r requirements.txt || exit 1
  popd
}


# Clone a local copy of 'geomodel-2-3dweb'
[ ! -d geomodel-2-3dweb ] && git clone https://github.com/AuScope/geomodel-2-3dweb.git

# Go to 'web_build' dir
pushd geomodel-2-3dweb/web_build

# Creates all the files that are used to display the models
if [ "$1" = "everything" ]; then
  install_assimp
  install_collada2gltf
  install_python_reqs
  echo "Building everything"
  \rm -rf geomodels
  [ ! -d geomodels ] && ./batch_proc.py

else
  echo "Building demo"
  [ ! -d src_model ] && mkdir src_model
  pushd src_model
  if [ ! -d Quamby ]; then
    # Data courtesy QLD Geological Survey (https://www.business.qld.gov.au/industries/mining-energy-water/resources/geoscience-information/gsq)
    curl https://s3-ap-southeast-2.amazonaws.com/gsq-prod-ckan-horizon-public/resources/8fdb1dc4-dc39-4ab5-9c9a-898a05eba1d8/quamby-3d-model.zip > quamby-3d-model.zip
    # Assumes 'zip' package is installed e.g. 'sudo apt install zip'
    unzip -o quamby-3d-model.zip -x 'Quamby/Quamby_Project.prj/*' || exit 1
    \rm -f quamby-3d-model.zip

    # Data courtesy Mineral Resources Tasmania (http://www.mrt.tas.gov.au/geoscience/3d_geological_and_geophysical_modelling/west_tasmania_3d_geological_and_geophysical_modelling)
    [ ! -e GoCAD_Objects.zip ] && curl http://www.mrt.tas.gov.au/mrtdoc/model_3d/GoCAD_Objects.zip > GoCAD_Objects.zip && unzip -o GoCAD_Objects.zip
    \rm GoCAD_Objects.zip
    \cp ../../../RL_Reclassification.csv GoCAD_Objects/Voxets
  fi
  popd

  install_assimp
  install_collada2gltf
  install_python_reqs

  # back in 'web_build'
  pwd
  # Build two downloaded models
  if [ ! -d geomodels ]; then
    ./batch_proc.py --model src_model geomodels rosebery RoseberyLyell input/RoseberyLyellConvParam.json GoCAD_Objects
    [ "$?" -ne 0 ] && echo "batch_proc failed to compile RoseberyLyell" && exit 1
    ./batch_proc.py --model src_model geomodels quamby Quamby input/QuambyConvParam.json Quamby/TSurf
    [ "$?" -ne 0 ] && echo "batch_proc failed to compile Quamby" && exit 1
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

# Build docker image, assumes shell user id is a member of 'docker' group
docker system prune -af && docker build -t geomodels -f docker/Dockerfile .
docker build -t geomodels -f docker/Dockerfile .
popd

# To run locally at port 4000:
# docker run -d -p 4000:80 --name geomodels geomodels

# To stop:
# docker ps
# docker stop <container_id>

# To run as shell:
# docker run -it -p 4000:80 geomodels sh


