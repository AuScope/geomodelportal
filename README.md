# AuScope Geoscience 3D Models Portal


## Purpose

**You can see what it looks like here: https://geomodels.auscope.org.au**

This project is a website that is designed to display geoscience models from various Australian sources and their associated information in 3d.

Sources include:
* CSIRO
* NCI/Adelaide University
* Geoscience Australia
* State Geological Surveys: Tasmania, Victoria, New South Wales, Queensland, Northern Territory, South Australia and West Australia

Features:
* 3D virtual sphere model view controller
* Import GOCAD TSURF files into the scene via drag and drop
* Export model parts to file
* Displays NVCL boreholes (https://www.auscope.org.au/nvcl) and their uTSAS_Grp1 mineralogy for some models
* 3D Volumes displayed as movable X,Y,Z slices

It is broadly based on these:

1. Start Angular's template (https://github.com/start-angular/SB-Admin-BS4-Angular-5) but ported to Angular 20. This provides a basic Angular+Bootstrap website framework.

2. [ThreeJS](https://threejs.org/) provides 3d.

3. [itowns](http://www.itowns-project.org/) provides geospatial support.

4. <https://github.com/AuScope/geomodel-2-3dweb> contains the website's back-end code. It contains code to convert GOCAD and geophysics models into graphics files, and a web service that provides:
     * Borehole graphics and information from Australia's NVCL (National Virtual Core Library)
     * An OGC WMS, WFS, 3DPS services
     * On the fly GOCAD TSURF conversion to GLTF.
     * Model part export service 

## Development

Development notes are [here](DEV_NOTES.md)

## Acknowledgements

Funding provided by [AuScope Pty Ltd](https://www.auscope.org.au/)

SKUA/GOCAD software from the [Paradigm Academic Software Program](http://www.pdgm.com/affiliations/academic-software-programs/) was used to view some types of GOCAD object files and produce sample GOCAD OBJECT files used for testing

## Citation

Please cite as:

Fazio, Vincent; Woodcock, Robert (2024): AuScope 3D Geological Models Portal. v1. CSIRO. Service Collection. http://hdl.handle.net/102.100.100/609085?index=1

