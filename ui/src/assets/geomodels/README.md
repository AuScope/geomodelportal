Model Display
=============

JSON Model Config File
----------------------

The website downloads the JSON model config file from the 'ui/src/assets/geomodels' directory. From the model config file, it reads the filenames of the parts of the models, which are GLTF, GZ and PNG files, and loads them from there.

The model config file has four main divisions:  "groups", "properties", "version" and "type".

**NOTE: The model config file is an automatically generated file**


### 'groups' Section

"groups" describes all the parts of the model. Within the groups are the names of the parts.


```
    "groups": {
         "Ammyool Faults": [
             {
                "display_name": "Fault 1",
                "displayed": true,
                "include": true,
                "model_url": "Faults_Ammyool.gltf",
                "popups": {
                    "FAULTS_AMMYOOL_1": {
                        "name": "1_S_AMMY_1",
                        "title": "Ammyool Fault 1",
                        "href": [ {
                                "URL": "https://cdcd.dnrm.abc.nb/portal/site/cr_89698_1.pdf",
                                "label": "More Info"
                                } ]
                    }
                },
                "type": "GLTFObject"
            }
       ],
       "Gravity": [
            {
                "3dobject_label": "BougGrav_0",
                "display_name": "Bouguer Gravity",
                "displayed": true,
                "include": true,
                "model_url": "BougGrav.PNG",
                "position": [868000.0,6848000.0,1003.0],
                "reference": "https://erer.rtrt.tr/WebtopTR_00026.pdf#page=5",
                "type": "ImagePlane"
            }
        ],
        "3D Ology": [
            {
                "display_name": "ThreeDeeology",
                "displayed": false,
                "include": true,
                "model_url": "3D_ology@@.gz",
                "type": "3DVolume",
                "volumeData": {
                    "colourLookup": {
                        "1": [
                            0.968627,
                            0.505882,
                            0.705882,
                            1.0
                        ],
                        "2": [
                            0.968627,
                            0.85098,
                            0.52549,
                            1.0
                        ],
                        "3": [
                            0.807843,
                            0.92549,
                            0.921569,
                            1.0
                        ]
                    },
                    "dataDims": [
                        299,
                        400,
                        120
                    ],
                    "dataType": "INT_16",
                    "labelLookup": {
                        "1": "Zone1",
                        "2": "Zone2",
                        "3": "Zone3"
                    },
                    "maxVal": 11.0,
                    "minVal": 1.0,
                    "origin": [
                        555000.0,
                        6750000.0,
                        -50000.0
                    ],
                    "rotation": [
                        [
                            1.0,
                            0.0,
                            0.0
                        ],
                        [
                            0.0,
                            1.0,
                            0.0
                        ],
                        [
                            0.0,
                            0.0,
                            1.0
                        ]
                    ],
                    "size": [
                        148501.67224080267,
                        199001.25,
                        59004.166666666664
                    ]
                }

```


The "Ammyool Faults" is the name of a group of parts. It is a label that appears in the sidebar menu. It is followed by a list of parts, each with a filename to be loaded by the website.

* "display_name" - name to be shown on the sidebar in the list of names under the group name, once the group is unfolded
* "displayed" - whether it is displayed or hidden upon startup ("include" must be "true" for this to work)
* "include" - whether to load it upon startup or not. It this is "false", then this part will not appear in the sidebar and will not be used by the website
* "model_url" - filename (PNG, GZ or GLTF file)
* "popups" - information that is shown when user double clicks on part, the key in the array (i.e. "FAULTS_AMMYOOL_1" in the example above) is the label contained in the object in the 3d scene, so that when the object is clicked on, this label can be used display the part's popup
* "reference_url" - The website will open a new window and show this URL when the object is double clicked on
* "3dobject_label" - This label is contained in the object in the 3d scene, so that when the object is clicked on, this label can be used open its URL via "reference_url"
* "position"  - (ImagePlane only) The xyz coordinates (in model's CRS) of the position of the centre of the image when loaded in the 3d scene. Images are always loaded in horizontal orientation (in the XY-plane)
* "volumeData" - used for displaying 3d volumes:

        * "colourLookup" - (optional) a colour [R,G,B,A] to associate with each value, key is volume data value
        * "dataDims" - size of each of the three dimensions of volume
        * "dataType" - type and size of volume data values in the GZ file e.g. "FLOAT_32", "INT_16"
        * "labelLookup" - (optional) lookup table of names for each of the colours in "colourLookup", key is volume data value 
        * "maxVal" - largest value of the volume data
        * "minVal" - smallest value of the volume data
        * "origin" - where the volume is placed in 3d space [X,Y,Z]
        * "rotation" - volume's orientation in 3d space, [X vector, Y vector, Z vector]
        * "size" - size of volume in 3d space coordinates
        
* "type" - "GLTFObject" (GLTF) or "ImagePlane" (PNG) or "3DVolume" (GZ)


### 'properties' Section

"properties" contains the following:

* "crs"- this is the coordinate reference system of x,y,z coordinates that are contained in all the GLTF files
* "extent" -  this is the extent (2D bounding box of the model: W, E, S, N) in model coordinates
* "name" - name of model for display purposes
* "init_cam_dist" - this is the initial camera distance to the model
* "proj4_defn" - OPTIONAL if the CRS is not common, a 'proj4' definition may sometimes be necessary (http://proj4js.org/)
* "background_colour" - OPTIONAL set the background colour to something other than default grey colour 



```
"properties": {
        "crs": "EPSG:25352",
        "extent": [868000.0,1036000.0,6848000.0,7016000.0],
        "name": "East Fort",
        "init_cam_dist": 900000.0,
        "proj4_defn": "+proj=utm +zone=52 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
        "background_colour": "rgb(159, 157, 230)"
}
```

### 'type' and 'version' Sections

"type" is always "GeologicalModel", "version" is always "1.0".

```
"type": "GeologicalModel",
"version": 1.0
```

Provider Model Information File
-------------------------------

This file (_ui/src/assets/geomodels/ProviderModelInfo.json_) is used by the website to distinguish between models.

* "name" - label used in website for provider
* "models" - list of models
* "icon" - provider's icon
* "colourClass" - bootstrap colour class of provider's card in website
* "infoUrl" - user can click on this to get more information about the provider


For each model:

* "name" - label used on website for this model
* "modelUrlPath" - used as part of URL for model e.g. /model/nqueensland
* "icon" - model's icon
* "colourClass" - bootstrap colour class of model's card in website
* "configFile" - name of model config file
* "modelDir" - name of directory where model's GLTF and PNG files are found, this is a subdirectory of the 'assets/geomodels' directory.
* "srcUrl" - user can click on this link for more information about the model

```
           "provname": {
                "name": "Provider Name",
                "models": [
                    {
                        "name": "North Beensland",
                        "modelUrlPath": "nbeensland",
                        "icon": "aux-white-icon.png",
                        "colourClass": "primary",
                        "configFile": "NorthBeensland.json",
                        "modelDir": "NorthBeensland",
                        "srcUrl" : "https://web.web.nb/geonetwork/srv/eng/catalog.search?node=srv#/metadata/7892-eeeb"
                    },
                    {
                        "name": "Rastermania",
                        "modelUrlPath": "ras",
                        "icon": "ras-white-icon.png",
                        "colourClass": "primary",
                        "configFile": "Ras.json",
                        "modelDir": "Ras",
                        "srcUrl" : "https://web.web.nb/geonetwork/srv/eng/catalog.search?node=srv#/metadata/7892-c08a"
                    },
                    {
                        "name": "Milgar",
                        "modelUrlPath": "milgar",
                        "icon": "mil-white-icon.png",
                        "colourClass": "primary",
                        "configFile": "Milgar.json",
                        "modelDir": "Milgar",
                        "srcUrl" : ""
                    }

                ],
                "icon": "gggg-white-icon.png",
                "colourClass": "primary",
                "infoUrl": "http://www.gggg.gg/"
            }
```
