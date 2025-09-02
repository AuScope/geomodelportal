## Development Notes

### How to initiate
**Note** that this project requires npm >= 10.9.2 & nodejs >= 22.17.0

In order to get started:
```bash
$ git clone https://github.com/AuScope/geomodelportal
$ cd geomodelportal/ui
# To install the project's dependencies
$ npm install
```

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

NB: For information on the JSON files, see [README.md](ui/src/assets/geomodels/README.md)

### Adding NVCL borehole info, WMS proxy and file conversion web service

The web service requires an [Apache](https://httpd.apache.org/) server with Python WSGI [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) enabled, or similar WSGI compatible server. 
Python should be setup as described in [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/README.md)

For development, you can use 'uwsgi' [WSGI Quick Start](https://uwsgi-docs.readthedocs.io/en/latest/WSGIquickstart.html) for a quick command line start

An NVCL (Australia's National Virtual Core Library) borehole database file can be produced by running the "makeBoreholes.py" conversion script. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md) If you don't need the NVCL database, then you can skip this step.

The web service is served from the 'api' directory as _http://website/api_.

Use the [build_api_dir.sh](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/build_api_dir.sh) script to make the 'api' directory. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md)

Make sure that the files in 'api' can be accessed by Python.
 

### Start a local dev server
```bash
# To start the proxy/borehole server, run 'uwsgi' in the 'api' directory created using 'build_api_dir.sh'
# NB: Make sure you have set the port number in "proxy.conf.json" (geomodelportal/ui/proxy.conf.json)
# to match uwsgi's listening port
# e.g. change "target": "http://localhost", to "target": "http://localhost:4040",
#
$ tar xvf *-api.tar
$ cd api
$ uwsgi --http :4040 --wsgi-file index.py
```

```bash
# Run `npm start` to start the front-end dev server.
# Navigate to `http://localhost:4200`. It should automatically reload if you change any 
# of the source files.
$ npm start
```

### Build a production server in a docker container

* The [docker_image.yml](.github/workflows/docker-image.yml) script will create a self-contained docker image.
* It will use the latest release from [geomodel-2-3dweb](https://github.com/AuScope/geomodel-2-3dweb) repository to build the back end

### Linting

```
cd ui
npx eslint ./src
```
