# This builds the AuScope Geoscience Models portal
# Both the web service and the backend are included in the docker container
#
# NB: Run this from the 'ui' directory
#
# First image, build Angular app
FROM node:22-bookworm-slim AS node

ENV appdir=/usr/src/app

WORKDIR ${appdir}

# Copy in npm files
COPY package*.json ./

# Install required npm packages
RUN npm install

# Copy all the other files
COPY . .

# Build angular's static website files
RUN npm run build --production

# Build back-end
COPY docker/build/geomodels/ ./dist/assets/geomodels/
COPY docker/build/api.tar.gz .
RUN tar xvf api.tar.gz -C ./dist
COPY src/assets/geomodels/ProviderModelInfo.json ./dist/api/input
COPY docker/apache.htaccess ./dist/.htaccess
RUN chmod a+r ./dist/.htaccess

# Second image, install website
FROM debian:bookworm-slim

ENV appdir=/usr/src/app

WORKDIR ${appdir}

# Copy in the static website files from first image
COPY --chown=www-data:www-data --from=node /usr/src/app/dist /var/www/html/

# Website set up
COPY docker/000-default.conf /etc/apache2/sites-enabled/

# Install things necessary for apache & python
RUN apt-get update && apt-get upgrade -y && apt-get -y install apt-utils python3 python3-pip python3-pdm wget cmake
RUN export PIP_BREAK_SYSTEM_PACKAGES=1 && python3 -m pip install --upgrade pip && pdm self update 
RUN apt-get install -y apache2 apache2-dev libxml2-dev libhdf5-dev libnetcdf-dev
RUN ln -s /usr/include/hdf5/serial /usr/include/hdf5/include
RUN a2enmod rewrite && a2enmod proxy && a2enmod proxy_http && a2enmod proxy_html 

# Install any needed python packages specified in pdm.lock
COPY docker/build/pdm.lock .
COPY docker/build/pyproject.toml .

RUN eval $(pdm venv activate) && pdm --version && pdm install -L pdm.lock && pdm add --frozen-lockfile uvicorn
ENV HDF5_DIR=/usr/include/hdf5

# Start services
COPY docker/startup.sh startup.sh
CMD ["./startup.sh"]

EXPOSE 80
