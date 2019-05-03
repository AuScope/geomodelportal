Model Display
=============

JSON Model Config File
----------------------

The website downloads the JSON model config file from the 'assets/geomodels' directory. From the model config file, it reads the filenames of the parts of the models, which are GLTF and PNG files, and loads them from there.

The structure of the sidebar on the left hand side

The model config file has four main divisions:  "groups", "properties", "version" and "type".


### 'groups' Section

"groups" describes all the parts of the model. Within the groups are the names of the groups of parts.


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
                                "URL": "https://cdcd.dnrm.abc.nb/portal/site/cr_89698_1.pdf?javax.portlet.tpst=c544a51ca46a5e5410866d10a0_ws_BI&javax.portlet.prp_c59371e644a51ca46a5e5410866d10a0=action%3DdoComponentDisplay%26appName%3Dcompnt%26docId%3D580%252F4-1075753",
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
```


The "Ammyool Faults" is the name of a group of parts. It is a label that appears in the sidebar menu. It is followed by a list of parts, each with a filename to be loaded by the website.

    "display_name" - name to be shown on the sidebar in the list of names under the group name, once the group is unfolded
    "displayed" - whether it is displayed or hidden upon startup ("include" must be "true" for this to work)
    "include" - whether to load it upon startup or not. It this is "false", then this part will not appear in the sidebar and will not be used by the website
    "model_url" - filename (PNG or GLTF file)
    "popups" - information that is shown when user double clicks on part, the key in the array (i.e. "FAULTS_AMMAROODINNA_YOOLPERLUNNA-1_S_AMMA_1" in the example above) is the label contained in the object in the 3d scene, so that when the object is clicked on, this label can be used display the part's popup or open its URL
    "reference" - (ImagePlane only) The website will open a new window and show this URL when the image is double clicked on
    "popup_info" - popup information that appears when user clicks on this object, using the '3dobject_label' as a key (see below)
    "position"  - (ImagePlane only) The xyz coordinates (in model's CRS) of the position of the centre of the image when loaded in the 3d scene. Images are always loaded in horizontal orientation (in the XY-plane)
    "3dobject_label" - This label is contained in the object in the 3d scene, so that when the object is clicked on, this label can be used display the part's popup or open its URL
    "type" - "GLTFObject" (GLTF) or "ImagePlane" (PNG)


### 'properties' Section

"properties" contains the following:

    "crs"- this is the coordinate reference system of x,y,z coordinates that are contained in all the GLTF files
    "extent" -  this is the extent (2D bounding box of the model: W, E, S, N) in model coordinates
    "name" - name of model for display purposes
    "proj4_defn" - if the CRS is not common, a 'proj4' definition may sometimes be necessary (http://proj4js.org/)
    "init_cam_dist" - this is the initial camera distance to the model


```
"properties": {
        "crs": "EPSG:25352",
        "extent": [868000.0,1036000.0,6848000.0,7016000.0],
        "name": "East Fort",
        "init_cam_dist": 900000.0,
        "proj4_defn": "+proj=utm +zone=52 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
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

This file is used by the website to distinguish between models and lives in the 'assets/geomodels' directory.

    "key" - used as part of the URL for the provider e.g. /provider/ga
    "name" - label used in website for provider
    "models" - list of models
    "icon" - provider's icon
    "colourClass" - bootstrap colour class of provider's card in website
    "infoUrl" - user can click on this to get more information about the provider


For each model:

    "name" - label used on website for this model
    "modelUrlPath" - used as part of URL for model e.g. /model/nqueensland
    "icon" - model's icon
    "colourClass" - bootstrap colour class of model's card in website
    "configFile" - name of model config file
    "modelDir" - name of directory where model's GLTF and PNG files are found, this is a subdirectory of the 'assets/geomodels' directory.
    "srcUrl" - user can click on this link for more information about the model

```
           "gggg": {
                "name": "Geogeogeogeo",
                "models": [
                    {
                        "name": "North Beensland",
                        "modelUrlPath": "nbeensland",
                        "icon": "aux-white-icon.png",
                        "colourClass": "primary",
                        "configFile": "NorthBeensland.json",
                        "modelDir": "NorthBeensland",
                        "srcUrl" : "https://web.web.nb/geonetwork/srv/eng/catalog.search?node=srv#/metadata/7892-eeeb-7506-e044-00144fdd4fa6"
                    },
                    {
                        "name": "Rastermania",
                        "modelUrlPath": "ras",
                        "icon": "ras-white-icon.png",
                        "colourClass": "primary",
                        "configFile": "Ras.json",
                        "modelDir": "Ras",
                        "srcUrl" : "https://web.web.nb/geonetwork/srv/eng/catalog.search?node=srv#/metadata/7892-c08a-7506-e044-00144fdd4fa6"
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
