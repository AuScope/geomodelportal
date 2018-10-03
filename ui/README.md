
### Purpose

**NB: It is not fully developed, still a work in progress!**

This project is a website that is designed to display geological models in 3d.

It is broadly based on these:

1. <https://github.com/start-angular/SB-Admin-BS4-Angular-5> provides a basic angular-bootstrap website framework.

2. [ThreeJS](https://threejs.org/) provides 3d.

3. [itowns](http://www.itowns-project.org/) provides geospatial support.

4. <https://github.com/AuScope/geomodel-2-3dweb> converts GOCAD models into graphics files.


### How to initiate
**Note** that this project requires  **node >=v6.9.0 and npm >=3**.

In order to start the project use:
```bash
$ git clone https://github.com/AuScope/geomodelportal
$ cd geomodelportal

# Copy graphics (*.gltf *.png) files produced by <https://github.com/AuScope/geomodel-2-3dweb> into a
# subdirectory under src/assets/geomodels directory (e.g. 'src/assets/geomodels/NorthGawler/*.gltf')
# Each model must also have a JSON file (e.g. 'src/assets/geomodels/NorthGawler.json')
# e.g. if copying from <source dir>
$ cp <source dir>/* src/assets/geomodels

# To install the project's dependencies
$ npm install

# Run `npm start` to start the dev server.
# Navigate to `http://localhost:4200/geomodels`. It should automatically reload if you change any of the source files.
$ npm start

# As currently set up, the prod build will output the production website files to `dist` directory
# and is designed to be deployed to a directory named 'geomodels'
$ ng build --prod --base-href ./geomodels
```
