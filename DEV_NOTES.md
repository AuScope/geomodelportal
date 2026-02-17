# Development Notes

## How to initialise

**Note** that this project requires npm >= 11.5 & nodejs >= 22.17.0

In order to get started:
```bash
git clone https://github.com/AuScope/geomodelportal
cd geomodelportal/ui
npm install
```
## Docker builds

### From github actions

* The [docker_image.yml](.github/workflows/docker-image.yml) script creates self-contained docker images and push them to github's docker repository
* You can pull an image down and run it:
 
```bash
docker pull ghcr.io/auscope/geomodelportal:20250910
docker run -p 4000:80 ghcr.io/auscope/geomodelportal:20250910
```
* Then direct your browser to `http://my-hostname:4000`

### From command line

* Useful for development

* The docker build script will use the latest release from [geomodel-2-3dweb](https://github.com/AuScope/geomodel-2-3dweb)

**NB:** Insert 'sudo' if your user is not a member of docker group

Build
```bash
cd ui/docker
./build.sh
```
Run, then set browser to http://localhost:4000 or whatever applicable hostname 
```bash
docker run -p 4000:80 --name geomodels geomodels
```


## Other Notes

### Adding Model files
The conversion process (See <https://github.com/AuScope/geomodel-2-3dweb>) produces graphics 
files and a model config file.
Each model has its graphics (\*.gltf \*.png \*.gz) files in a subdirectory under ui/src/assets/geomodels
directory (e.g. for 'EastGawler' model it would be 'ui/src/assets/geomodels/EastGawler/\*.gltf')
Each model also has a model config file (e.g. 'ui/src/assets/geomodels/EastGawler.json')

To add models to the website, for each model:
1. Copy the GLTF/PNG/GZ files to a directory under 'ui/src/assets/geomodels'. The directory should be
named after the model.
2. Copy the model config file (e.g. 'McArthurBasin_new.json') to 'ui/src/asset/geomodels', remove
the '_new' from the filename (e.g. becomes  'McArthurBasin.json')
3. Edit the 'ui/src/assets/geomodels/ProviderModelInfo.json' file, adding a new entry for each new model.

**NB:** For information on the JSON files, see [README.md](ui/src/assets/geomodels/README.md)

### Adding NVCL borehole info, WMS proxy and file conversion web service

The web service requires an [Apache](https://httpd.apache.org/) server with Python WSGI [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) enabled, or similar WSGI compatible server. 
Python should be setup as described in [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/README.md)

For development, you can use 'uwsgi' [WSGI Quick Start](https://uwsgi-docs.readthedocs.io/en/latest/WSGIquickstart.html) for a quick command line start

An NVCL (Australia's National Virtual Core Library) borehole database file can be produced by running the "makeBoreholes.py" conversion script. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md) If you don't need the NVCL database, then you can skip this step.

The web service is served from the 'api' directory as _http://website/api_.

Use the [build_api_dir.sh](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/build_api_dir.sh) script to make the 'api' directory. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md)

Make sure that the files in 'api' can be accessed by Python.
 

### Start a local dev server

**Not recommended.  The docker build option is preferable**

```bash
# To start the proxy/borehole server, run 'uwsgi' in the 'api' directory created using 'build_api_dir.sh'
# NB: Make sure you have set the port number in "proxy.conf.json" (geomodelportal/ui/proxy.conf.json)
# to match uwsgi's listening port
# e.g. change "target": "http://localhost", to "target": "http://localhost:4040",
#
tar xvf *-api.tar
cd api
pdm run uwsgi --http :4040 --wsgi-file webapi.py
```

```bash
# Run `npm start` to start the front-end dev server.
# Navigate to `http://localhost:4200`. It should automatically reload if you change any 
# of the source files.
npm start
```

## Linting

```
cd ui
npx eslint ./src
```

## Making a release

The "Build docker image and push to github repo" github action will build a docker image using the current tip of the 'main' branch and the latest release from 'https://github.com/AuScope/geomodel-2-3dweb' repository then push it to github's docker repository.
The github action is manually triggered and requires a docker image tag as input.
The image tag is usually set to the current date in YYYYMMDD format e.g. "20260218"
This docker image will appear in github's public docker registry where it can be deployed in the cloud.


