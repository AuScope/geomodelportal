
### Purpose

**NB: It is not fully developed, still a work in progress!**

This project is a website that is designed to display geological models and their associated information in 3d.

It is broadly based on these:

1. Start Angular's template for Bootstrap 4 and Angular 5, (https://github.com/start-angular/SB-Admin-BS4-Angular-5) but ported to Angular 7. This provides a basic Angular+Bootstrap website framework.

2. [ThreeJS](https://threejs.org/) provides 3d.

3. [itowns](http://www.itowns-project.org/) provides geospatial support.

4. <https://github.com/AuScope/geomodel-2-3dweb> converts GOCAD models into graphics files, and helps provide a borehole service.


### How to initiate
**Note** that this project requires npm >=6.4.1.

In order to start the project use:
```bash
$ git clone https://github.com/AuScope/geomodelportal
$ cd geomodelportal/ui
# To install the project's dependencies
$ npm install
```

### Adding Model files
The conversion process (See <https://github.com/AuScope/geomodel-2-3dweb>) produces graphics 
files and a model config file.
Each model has its graphics (*.gltf *.png *.gz) files in a subdirectory under ui/src/assets/geomodels
directory (e.g. for 'EastGawler' model it would be 'ui/src/assets/geomodels/EastGawler/*.gltf')
Each model also has a model config file (e.g. 'ui/src/assets/geomodels/EastGawler.json')

To add models to the website, for each model:
1. Copy the GLTF/PNG/GZ files to a directory under 'ui/src/assets/geomodels'. The directory should be
named after the model.
2. Copy the model config file (e.g. 'McArthurBasin_new.json') to 'ui/src/asset/geomodels', remove
the '_new' from the filename (e.g. becomes  'McArthurBasin.json')
3. Edit the 'ui/src/assets/geomodels/ProviderModelInfo.json' file, adding a new entry for each new model.

NB: For information on the JSON files, see [README.md](ui/src/assets/geomodels/README.md)

### Adding borehole service
The borehole service requires an Apache server with Python WSGI 'mod_wsgi' enabled. [mod_wsgi](https://modwsgi.readthedocs.io/en/develop/) Python should be setup as described in [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/README.md)

A borehole database file can be produced by running the "makeBoreholes.py" conversion script. See [README.md](https://github.com/AuScope/geomodel-2-3dweb/blob/master/lib/README.md)

The 'index.wsgi' script (found in 'srv' directory) should be copied to 'api' directory so that it is served as 'http://website/api'

There are some files to be copied into a 'wsgi' directory, and make sure that they can be accessed by Python WSGI:

 * the 'input' directory from https://github.com/AuScope/geomodel-2-3dweb/scripts/input, (you can exclude README.md)
 * 'query_db.dat' (this is the borehole database)
 * the 'lib' directory from https://github.com/AuScope/geomodel-2-3dweb/lib
 * also make a 'cache/wfs' directory in 'wsgi'

### Start dev server
```bash
# Run `npm start` to start the dev server.
# Navigate to `http://localhost:4200`. It should automatically reload if you change any 
# of the source files.
$ npm start
```

### Build
```bash
# As currently set up, the prod build will output the production website files to `dist` directory
$ ng build --prod
```
