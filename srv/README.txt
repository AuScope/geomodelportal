Very rough notes on webserver setup

1) Install Apache, set to run under localhost at port 80
2) Install mod_wsgi module
2) Create a 'lib' dir under Apache's 'htdocs' and copy the contents of 'https://github.com/AuScope/geomodel-2-3dweb/lib' into it
3) Create an 'input' dir under Apache's 'htdocs' and copy the contents of 'https://github.com/AuScope/geomodel-2-3dweb/scripts/input' into it
4) Copy 'https://github.com/vjf/geomodelportal/blob/dev/srv/index.wsgi' into 'htdocs'
5) Edit httpd.conf, to ensure preloading of scripts, make sure "application-group" is set, e.g.
WSGIScriptAlias / "C:/Apache24/htdocs/index.wsgi" application-group="{%GLOBAL}"
(NB: Linux may require 'process-group' parameter also)