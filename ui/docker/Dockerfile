# First image, build angular app
FROM node:12.16-alpine as node

ENV appdir /usr/src/app

WORKDIR ${appdir}

# Copy in npm files
COPY package*.json ./

# Install required npm packages
RUN npm install

# Copy all the other files
COPY . .

# Build angular's static website files
RUN npm run build --prod
COPY docker/geomodel-2-3dweb/web_build/geomodels/ ./dist/assets/geomodels/
COPY docker/geomodel-2-3dweb/web_build/20*-api.tar .
RUN tar xvf 20*-api.tar -C ./dist
COPY docker/apache.htaccess ./dist/.htaccess
RUN chmod a+r ./dist/.htaccess

# Second image, install website
FROM debian:9

ENV appdir /usr/src/app

WORKDIR ${appdir}

# Copy in the static website files from first image
COPY --chown=www-data:www-data --from=node /usr/src/app/dist /var/www/html/

# Website set up
COPY docker/000-default.conf /etc/apache2/sites-enabled/

# Install things necessary for wsgi
RUN apt-get update && apt-get -y install python3 python3-pip wget cmake
RUN apt-get install -y apache2 apache2-dev libapache2-mod-wsgi-py3
COPY docker/wsgi.conf /etc/apache2/mods-enabled/
RUN a2enmod rewrite

# Install any needed python packages specified in requirements.txt
COPY docker/geomodel-2-3dweb/requirements.txt .
RUN pip3 install --trusted-host pypi.python.org -r requirements.txt

# Build assimp C++ lib
RUN wget https://github.com/assimp/assimp/archive/v4.1.0.tar.gz && tar xvf v4.1.0.tar.gz
RUN cd assimp-4.1.0 && cmake CMakeLists.txt -G 'Unix Makefiles' && make && cd ..
ENV LD_LIBRARY_PATH ${appdir}/assimp-4.1.0/lib


CMD ["/usr/sbin/apache2ctl","-D","FOREGROUND"]

EXPOSE 80

