# AuScope Geoscience Models Portal


## Purpose

**You can see what it looks like here: https://geomodels.auscope.org.au**

This project is a website that is designed to display geoscience models and their associated information in 3d.

It is broadly based on these:

1. Start Angular's template (https://github.com/start-angular/SB-Admin-BS4-Angular-5) but ported to Angular 17. This provides a basic Angular+Bootstrap website framework.

2. [ThreeJS](https://threejs.org/) provides 3d.

3. [itowns](http://www.itowns-project.org/) provides geospatial support.

4. <https://github.com/AuScope/geomodel-2-3dweb> contains the website's back-end code. It contains code to convert GOCAD and geophysics models into graphics files, and a web service that provides:
     * Borehole graphics and information from Australia's NVCL (National Virtual Core Library)
     * An OGC WMS, WFS, 3DPS services
     * On the fly GOCAD TSURF conversion to GLTF.
     * Model part export service 

## Development

### How to initiate
**Note** that this project requires npm >= 10.9.2 & nodejs >= 18.2.5

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

* The [docker_image.yml](.github/workflows/docker-image.yml)) script will create a self-contained docker image.
* It will use the latest release from [geomodel-2-3dweb](https://github.com/AuScope/geomodel-2-3dweb) repository to build the back end

## Acknowledgements

Funding provided by [AuScope Pty Ltd](https://www.auscope.org.au/)

SKUA/GOCAD software from the [Paradigm Academic Software Program](http://www.pdgm.com/affiliations/academic-software-programs/) was used to view some types of GOCAD object files and produce sample GOCAD OBJECT files used for testing

## Citation

Please cite as:

Fazio, Vincent; Woodcock, Robert (2024): AuScope 3D Geological Models Portal. v1. CSIRO. Service Collection. http://hdl.handle.net/102.100.100/609085?index=1

