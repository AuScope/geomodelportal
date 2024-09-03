#!/bin/bash

# Script to start up Apache and Python uvicorn server
#
# Apache serves the main website static files and uvicorn serves up the api interface

# Start up uvicorn
eval $(pdm venv activate)
pushd /var/www/html/api && bash -c "uvicorn webapi:app &" && popd

# Start up apache
/usr/sbin/apache2ctl -D FOREGROUND
