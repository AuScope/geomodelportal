# Geological Models Portal  

[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=vjf_geomodelportal&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=vjf_geomodelportal)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=vjf_geomodelportal&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=vjf_geomodelportal)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vjf_geomodelportal&metric=security_rating)](https://sonarcloud.io/dashboard?id=vjf_geomodelportal)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=vjf_geomodelportal&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=vjf_geomodelportal)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=vjf_geomodelportal&metric=ncloc)](https://sonarcloud.io/dashboard?id=vjf_geomodelportal)

### Purpose

**NB: It is not fully developed, still a work in progress!**

**But you can see what it looks like here: http://geomodels.auscope.org/**

This project is a website that is designed to display geological models and their associated information in 3d.

It is broadly based on these:

1. Start Angular's template for Bootstrap 4 and Angular 5, (https://github.com/start-angular/SB-Admin-BS4-Angular-5) but ported to Angular 7. This provides a basic Angular+Bootstrap website framework.

2. [ThreeJS](https://threejs.org/) provides 3d.

3. [itowns](http://www.itowns-project.org/) provides geospatial support.

4. <https://github.com/AuScope/geomodel-2-3dweb> contains code to convert GOCAD models into graphics files from the command line, and a web service that provides borehole information and performs on the fly GOCAD TSURF conversion to GLTF.


### How to initiate
**Note** that this project requires npm >=6.9

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

### Adding borehole info and file conversion web service
The web service requires an [Apache](https://httpd.apache.org/) server with Python WSGI [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) enabled.  Python should be setup as described in [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/README.md)

A borehole database file can be produced by running the "makeBoreholes.py" conversion script. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md)

The web service is served from the 'api' directory as _http://website/api_.

Use the [build_api_dir.sh](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/build_api_dir.sh) script to make the 'api' directory. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/scripts/README.md)

Make sure that the files in 'api' can be accessed by Python.
 

### Start a local dev server
```bash
# Run `npm start` to start the dev server.
# Navigate to `http://localhost:4200`. It should automatically reload if you change any 
# of the source files.
$ npm start
```

### Build for production server
```bash
# As currently set up, the prod build will output the production website files to `dist` directory
$ ng build --prod
```


