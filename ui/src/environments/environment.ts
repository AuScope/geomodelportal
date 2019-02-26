// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  // 'usePrePath' is set to true when building a website that is installed in a sub directory of webserver's 'document root'
  usePrePath: false,
  // 'prePath' is the name of the sub directory that the website is installed in e.g. '/geomodels'
  prePath: ''
};
