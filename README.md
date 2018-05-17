
This project is a website designed to display geological models in 3d.

It is broadly based on these:
```
1) https://github.com/start-angular/SB-Admin-BS4-Angular-5 provides a basic angular-bootstrap website framework.

2) ThreeJS https://threejs.org/ provides 3d.

3) itowns http://www.itowns-project.org/ provides geospatial.

4) https://github.com/AuScope/geomodel-2-3dweb converts models to displayable format.
```

### How to start
**Note** that this seed project requires  **node >=v6.9.0 and npm >=3**.

In order to start the project use:
```bash
$ git clone https://github.com/AuScope/geomodelportal
$ cd geomodelportal

# To install the project's dependencies
$ npm install

# To watch your files and use livereload by default run `npm start` for a dev server. Navigate to `http://localhost:4200/geomodels`. The app will automatically reload if you change any of the source files.
$ npm start

# As currently set up, the prod build will output the production application in `dist`
# and is designed to be deployed to a directory named 'geomodels'
$ ng build --prod --base-href ./geomodels
```
