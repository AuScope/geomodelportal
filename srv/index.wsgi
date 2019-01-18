import sys
import os
import ctypes
import time
import json
from json import JSONDecodeError
from types import SimpleNamespace
from owslib.feature.wfs110 import WebFeatureService_1_1_0
import hashlib
import pickle
import urllib
import glob

#
# A rough implementation of a subset of the 3DPS standard V1.0 (http://docs.opengeospatial.org/is/15-001r4/15-001r4.html)
# and WFS v2.0 standard (http://www.opengeospatial.org/standards/wfs)
#
# The intention is to demonstrate the website's compatibility with someone else's (possibly future) implementation of a 3DPS and WFS server,
# rather than implement a WFS or 3DPS server.
#
# Currently this is used to display boreholes in the geomodels website.
# In future, it will be expanded to other objects 
#
# To get information upon double click on object:
# http://localhost:4200/api/NorthGawler?service=3DPS&version=1.0&request=GetFeatureInfoByObjectId&objectId=EWHDDH01_185_0&layers=boreholes&format=application%2Fjson
# 
# To get list of borehole ids:
# http://localhost:4200/api/NorthGawler?service=WFS&version=2.0&request=GetPropertyValue&exceptions=application%2Fjson&outputFormat=application%2Fjson&typeName=boreholes&valueReference=borehole:id
#
# To get borehole object after scene is loaded:
# http://localhost:4200/api/NorthGawler?service=3DPS&version=1.0&request=GetResourceById&resourceId=228563&outputFormat=model%2Fgltf%2Bjson%3Bcharset%3DUTF-8

# Include local modules
# NB: Implementation dependent path - will need to edit for each installation.
sys.path.append(os.path.join('C', os.sep, 'Apache24','htdocs', 'lib'))

from makeBoreholes import get_blob_boreholes, get_boreholes_list, get_json_input_param
from db.db_tables import QueryDB


# Define global vars
g_BLOB_DICT = {}
g_WFS_DICT = {}
g_BOREHOLE_DICT = {}


# Maximum number of boreholes processed
MAX_BOREHOLES = 9999

# Timeout for querying WFS services (seconds)
WFS_TIMEOUT = 6000

# This holds borehole parameters, taken from config file
g_PARAM = {}
    
    
LAYER_NAME = 'boreholes'
GLTF_REQ_NAME = '$blobfile.bin'

'''
' Given a filename string returns a hash string
' @param input_str
' @returns hash string
'''
def get_file_hash(input_str):
    h = hashlib.new('md5')
    h.update(bytes(input_str, 'utf-8'))
    return h.hexdigest()
    

'''
' I have to override 'WebFeatureService' because a bug in owslib makes 'pickle' unusable 
' I have created a pull request https://github.com/geopython/OWSLib/pull/548 to fix bug
'''
class MyWebFeatureService(WebFeatureService_1_1_0):
    def __new__(self, url, version, xml, parse_remote_metadata=False, timeout=30, username=None, password=None):
        obj=object.__new__(self)
        return obj
        
    def __getnewargs__(self):
        return ('','',None)
        
        
'''
' INITIALISATION - Executed upon startup only.
' Loads all the WFS services and pickles them for future use
'''
INPUT_DIR = os.path.join('C', os.sep, 'Apache24', 'htdocs', 'input')
if not os.path.exists(INPUT_DIR):
    print("ERROR - input dir ", INPUT_DIR, " does not exist") 
    sys.exit(1)
    
for input_file in glob.glob(os.path.join(INPUT_DIR, '*ConvParam.json')):
    print("getting param file", input_file)
    model_name = os.path.basename(input_file[:-14])
    g_PARAM[model_name] = get_json_input_param(os.path.join(INPUT_DIR, input_file))
    print("opening WFS")
    print("os.getcwd()=", os.getcwd())
    CACHE_DIR = os.path.join('C', os.sep, 'Apache24', 'htdocs', 'cache', 'wfs')
    if not os.path.exists(CACHE_DIR):
        print("ERROR - cache dir ", CACHE_DIR, " does not exist") 
        sys.exit(1)
    cache_file = os.path.join(CACHE_DIR, get_file_hash(g_PARAM[model_name].WFS_URL+g_PARAM[model_name].WFS_VERSION))
    if os.path.exists(cache_file):
        print("Loading pickle file for", g_PARAM[model_name].WFS_URL)
        fp = open(cache_file, 'rb')
        g_WFS_DICT[model_name] = pickle.load(fp)
        fp.close()
    else:
        # Cache file does not exist, create WFS service and dump to file
        WFS = MyWebFeatureService(g_PARAM[model_name].WFS_URL, version=g_PARAM[model_name].WFS_VERSION, xml=None, timeout=WFS_TIMEOUT)
        print("Creating pickle file for", g_PARAM[model_name].WFS_URL)
        fp = open(cache_file, 'wb')
        pickle.dump(g_WFS_DICT[model_name], fp)
        fp.close()
    print("got WFS=", g_WFS_DICT[model_name])



'''
' Create and initialise an HTTP response with a string message
' @param start_response callback function for initialising HTTP response
' @param message  string message
' @returns byte array HTTP response
'''
def make_str_response(start_response, message):
    msg_bytes = bytes(message, 'utf-8')
    response_headers = [('Content-type', 'text/plain'), ('Content-Length', str(len(msg_bytes))), ('Connection', 'keep-alive')]
    start_response('200 OK', response_headers)
    return [msg_bytes]


'''
' Write out a json error response
' @param start_response callback function for initialising HTTP response
' @param version version string
' @param code error code string, can be 'OperationNotSupported', 'MissingParameterValue', 'OperationProcessingFailed'
' @param message text message explaining error in more detail
' @param locator  optional string indicating what part of input caused the problem. This must be checked for XSS or SQL injection exploits
' @returns byte array HTTP response
'''
def make_json_exception_response(start_response, version, code, message, locator='noLocator'):
    msg_json = { "version": version, "exceptions": [ { "code": code , "locator": locator, "text": message }]}
    msg_str = json.dumps(msg_json)
    msg_bytes = bytes(msg_str, 'utf-8')
    response_headers = [('Content-type', 'application/json'), ('Content-Length', str(len(msg_bytes))), ('Connection', 'keep-alive')]
    start_response('200 OK', response_headers)
    return [msg_bytes]
    
    
'''
' Try to find a value in a dict using a key
' @param key the key to look for
' @param arr_dict dictionary to search in, must have format { 'key' : [val] ... }
' @param none_val optional value used when key is not found, default is ''
' @returns string value from dict or none_val (if not found) 
'''
def get_val(key, arr_dict, none_val=''):
    return arr_dict.get(key, [none_val])[0]


'''
' Create and initialise the 'GetCapabilities' response
' @param start_response callback function for initialising HTTP response
' @returns byte array HTTP response
'''
def make_getcap_response(start_response, model_name):
    global g_PARAM
    response = """<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/3dps/1.0/core"
 xmlns:core="http://www.opengis.net/3dps/1.0/core"
 xmlns:ows="http://www.opengis.net/ows/2.0"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.opengis.net/3dps/1.0 ../../../schema/3dpResp.xsd" version="1.0">
  <ows:ServiceIdentification>
    <ows:Title>Auscope Geomodels</ows:Title>
    <ows:Abstract>Website displaying geological models</ows:Abstract>
    <ows:Keywords>
      <ows:Keyword>3D</ows:Keyword>
      <ows:Keyword>Portrayal</ows:Keyword>
    </ows:Keywords>
    <ows:ServiceType codeSpace="OGC">3DPS</ows:ServiceType>
    <ows:ServiceTypeVersion>1.0</ows:ServiceTypeVersion>
    <ows:Profile>http://www.opengis.net/spec/3DPS/1.0/extension/scene/1.0</ows:Profile>
    <ows:Fees>none</ows:Fees>
    <ows:AccessConstraints>none</ows:AccessConstraints>
  </ows:ServiceIdentification>
  <ows:ServiceProvider>
    <ows:ProviderName>AuScope</ows:ProviderName>
    <ows:ServiceContact>
      <ows:PositionName>AuScope Geomodels Support</ows:PositionName>
      <ows:ContactInfo>
        <ows:Address>
          <ows:ElectronicMailAddress>cg-admin@csiro.au</ows:ElectronicMailAddress>
        </ows:Address>
      </ows:ContactInfo>
    </ows:ServiceContact>
  </ows:ServiceProvider>
  <ows:OperationsMetadata>
    <ows:Operation name="GetCapabilities">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href="http://localhost:4200/api/{0}?"/>
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name="AcceptFormats">
          <ows:AllowedValues>
              <ows:Value>text/xml</ows:Value>
          </ows:AllowedValues>
          <ows:DefaultValue>text/xml</ows:DefaultValue>
      </ows:Parameter>
      <ows:Parameter name="AcceptVersions">
          <ows:AllowedValues>
              <ows:Value>1.0</ows:Value>
          </ows:AllowedValues>
          <ows:DefaultValue>1.0</ows:DefaultValue>
      </ows:Parameter>
    </ows:Operation>
    <ows:Operation name="GetFeatureInfoByObjectId">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href="http://localhost:4200/api/{0}?" />
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name="Exceptions">
        <ows:AllowedValues>
          <ows:Value>application/json</ows:Value>
        </ows:AllowedValues>
        <ows:DefaultValue>application/json</ows:DefaultValue>
      </ows:Parameter>
      <ows:Parameter name="Format">
        <ows:AllowedValues>
          <ows:Value>application/json</ows:Value>
        </ows:AllowedValues>
        <ows:DefaultValue>application/json</ows:DefaultValue>
      </ows:Parameter>
    </ows:Operation>
    <ows:Operation name="GetResourceById">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href="http://localhost:4200/api/{0}?" />
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name="OutputFormat">
        <ows:AllowedValues>
          <ows:Value>model/gltf+json;charset=UTF-8</ows:Value>
        </ows:AllowedValues>
        <ows:DefaultValue>application/json</ows:DefaultValue>
      </ows:Parameter>
      <ows:Parameter name="ExceptionFormat">
        <ows:AllowedValues>
          <ows:Value>application/json</ows:Value>
        </ows:AllowedValues>
        <ows:DefaultValue>application/json</ows:DefaultValue>
      </ows:Parameter>
    </ows:Operation>
  </ows:OperationsMetadata>
  <Contents>""".format(model_name)
    response += """       <Layer>
      <ows:Identifier>{0}</ows:Identifier>
      <AvailableCRS>{1}</AvailableCRS>
    </Layer>""".format(LAYER_NAME, g_PARAM[model_name].MODEL_CRS)
    
    response += "</Contents>\n</Capabilities>"
  
    msg_bytes = bytes(response, 'utf-8')
    response_headers = [('Content-type', 'text/xml'), ('Content-Length', str(len(msg_bytes))), ('Connection', 'keep-alive')]
    start_response('200 OK', response_headers)
    return [msg_bytes]


'''
' Create and initialise the 3DPS 'GetFeatureInfoByObjectId' response
' @param start_response callback function for initialising HTTP response
' @param url_kvp key-value pair dictionary of URL parameters, format: 'key': ['val1', 'val2' ...]
' @returns byte array HTTP response in JSON format
'''
def make_getfeatinfobyid_response(start_response, url_kvp, model_name, environ):
    borehole_bytes = b' '
    print('url_kvp =', url_kvp)
    # Parse id from query string
    obj_id = get_val('objectid', url_kvp)
    if obj_id == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing objectId parameter')

    # Parse format from query string
    format = get_val('format', url_kvp)
    if format == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing format parameter')
    if format != 'application/json':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'InvalidParameterValue', 'incorrect format, try "application/json"')

    # Parse layers from query string
    layer_names = get_val('layers', url_kvp)
    if layer_names == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing format parameter')
    elif layer_names != LAYER_NAME:
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'InvalidParameterValue', 'incorrect layers, try "'+ LAYER_NAME + '"')

    print('obj_id=', obj_id)
    if obj_id != '':
        # Query database
        # Open up query database
        qdb = QueryDB()
        qdb.open_db(create=False, db_name="sqlite:///"+os.path.join(environ['DOCUMENT_ROOT'], "query_data.db"))
        label, out_model_name, segment_str, part_str, model_str, user_str = qdb.query(obj_id, model_name)
        resp_dict = { 'type': 'FeatureInfoList', 'totalFeatureInfo': 1, 'featureInfos': [ { 'type': 'FeatureInfo', 'objectId': obj_id, 'featureId': obj_id, 'featureAttributeList': [] } ] }
        query_dict = {}
        if segment_str != None:
            segment_info = json.loads(segment_str)
            query_dict.update(segment_info)
        if part_str != None:
            part_info = json.loads(part_str)
            query_dict.update(part_info)
        if model_str != None:    
            model_info = json.loads(model_str)
            query_dict.update(model_info)
        if user_str != None:
            user_info = json.loads(user_str) 
            query_dict.update(user_info)
        for key, val in query_dict.items():
            resp_dict['featureInfos'][0]['featureAttributeList'].append({ 'type': 'FeatureAttribute', 'name': key, 'value': val })
        resp_str = json.dumps(resp_dict)
        resp_bytes = bytes(resp_str, 'utf-8')
    response_headers = [('Content-type', 'application/json'), ('Content-Length', str(len(resp_bytes))), ('Connection', 'keep-alive')]
    start_response('200 OK', response_headers)
    return [resp_bytes]


    
'''
' Create and initialise the 'GetResourceById' response
' @param start_response callback function for initialising HTTP response
' @param url_kvp key-value pair dictionary of URL parameters, format: 'key': ['val1', 'val2' ...]
' @returns byte array HTTP response
'''
def make_getresourcebyid_response(start_response, url_kvp, model_name):
    global g_BOREHOLE_DICT, g_BLOB_DICT, g_PARAM
    # This sends back the first part of the GLTF object - the GLTF file for the resource id specified
    print('make_getresourcebyid_response(model_name = ', model_name, ')')
    
    # Parse outputFormat from query string
    output_format = get_val('outputformat', url_kvp)
    if output_format == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing outputFormat parameter')
    if output_format != 'model/gltf+json;charset=UTF-8':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'InvalidParameterValue', 'incorrect outputFormat, try "model/gltf+json;charset=UTF-8"')
        
    # Parse resourceId from query string
    res_id = get_val('resourceid', url_kvp)
    print('res_id = ', res_id)
    if res_id == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing resourceId parameter')
    print('g_BOREHOLE_DICT = ', g_BOREHOLE_DICT)
    borehole_dict = g_BOREHOLE_DICT.get(res_id, None)
    print('borehole_dict = ', borehole_dict)
    if borehole_dict != None:
        borehole_id = borehole_dict['nvcl_id']
        blob = get_blob_boreholes(borehole_dict, g_PARAM[model_name])
        # Some boreholes do not have the requested metric
        if blob != None:
            print('got blob', blob)
            g_BLOB_DICT.setdefault(model_name, {})
            g_BLOB_DICT[model_name][borehole_id] = blob
            # There are 2 files in the blob, a GLTF file and a .bin file
            for i in range(2):
                # Look for the GLTF file
                if len(blob.contents.name.data) == 0:
                    # Convert to byte array
                    bcd = ctypes.cast(blob.contents.data, ctypes.POINTER(blob.contents.size * ctypes.c_char))
                    bcd_bytes = b''
                    for b in bcd.contents:
                        bcd_bytes += b
                    # Convert to json
                    gltf_json = json.loads(bcd_bytes)
                    # This modifies the URL of the .bin file associated with the GLTF file. 
                    # Inserting model name and borehole id as a parameter so we can tell the .bin files apart
                    gltf_json["buffers"][0]["uri"] = model_name + '/' + gltf_json["buffers"][0]["uri"] + "?id=" + borehole_id
                    # Convert back to bytes and send
                    gltf_str = json.dumps(gltf_json)
                    gltf_bytes = bytes(gltf_str, 'utf=8')
                    response_headers = [('Content-type', 'model/gltf+json;charset=UTF-8'), ('Content-Length', str(len(gltf_bytes))), ('Connection', 'keep-alive')]
                    start_response('200 OK', response_headers)
                    return [gltf_bytes]
                
                blob = blob.contents.next

    return make_str_response(start_response, ' ')

    
'''
' Returns a response to a WFS getPropertyValue request
' @param start_response callback function for initialising HTTP response
' @param url_kvp key-value pair dictionary of URL parameters, format: 'key': ['val1', 'val2' ...]
' @returns byte array HTTP response
' https://demo.geo-solutions.it/geoserver/wfs?version=2.0&request=GetPropertyValue&outputFormat=json&exceptions=application/json&typeName=test:Linea_costa&valueReference=id
'''
def make_getpropvalue_response(start_response, url_kvp, model_name, environ):
    global g_BOREHOLE_DICT, g_PARAM, g_WFS_DICT
    
    # Parse outputFormat from query string
    output_format = get_val('outputformat', url_kvp)
    if output_format == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing outputFormat parameter')
    elif output_format != 'application/json':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationProcessingFailed', 'incorrect outputFormat, try "application/json"')
        
    # Parse typeName from query string
    type_name = get_val('typename', url_kvp)
    if type_name == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing typeName parameter')
    elif type_name != 'boreholes':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationProcessingFailed', 'incorrect typeName, try "boreholes"')
        
    # Parse valueReference from query string
    value_ref = get_val('valuereference', url_kvp)
    if value_ref == '':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'missing valueReference parameter')
    elif value_ref != 'borehole:id':
        return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationProcessingFailed', 'incorrect valueReference, try "borehole:id"')

    # Concatenate response
    response_list = []
    g_BOREHOLE_DICT = {}
    print('g_WFS_DICT[model_name], g_PARAM[model_name] = ', g_WFS_DICT[model_name], g_PARAM[model_name])
    borehole_list = get_boreholes_list(g_WFS_DICT[model_name], MAX_BOREHOLES, g_PARAM[model_name])
    print('borehole_list = ', borehole_list)
    for borehole_dict in borehole_list:
        borehole_id = borehole_dict['nvcl_id']
        response_list.append({ 'borehole:id': borehole_id })
        g_BOREHOLE_DICT[borehole_id] = borehole_dict
    print('g_BOREHOLE_DICT = ', g_BOREHOLE_DICT)
    response_str = json.dumps({ 'type': 'ValueCollection', 'totalValues': len(response_list), 'values': response_list })
    response_bytes = bytes(response_str, 'utf-8')
    response_headers = [('Content-type', 'application/json'), ('Content-Length', str(len(response_bytes))), ('Connection', 'keep-alive')]
    start_response('200 OK', response_headers)
    print("sending: ", response_str)
    return [response_bytes]

'''
' MAIN - This is called whenever an HTTP request arrives
'''
def application(environ, start_response):
    global g_BLOB_DICT
    print("ENVIRON=", repr(environ))
    doc_root = os.path.normcase(environ['DOCUMENT_ROOT'])
    sys.path.append(os.path.join(doc_root, 'lib'))
    path_bits = environ['PATH_INFO'].split('/')
    print('path_bits = ', path_bits)
    # Expecting a path '/api/<model_name>?service=<service_name>&param1=val1'
    if len(path_bits) == 3 and path_bits[:2] == ['','api']:
        model_name = path_bits[2]
        print('model_name = ', model_name)
        url_params = urllib.parse.parse_qs(environ['QUERY_STRING'])
        # Convert all the URL parameter names to lower case with merging
        url_kvp = {}
        for key, val in url_params.items():
            url_kvp.setdefault(key.lower(), [])
            url_kvp[key.lower()] += val
        print('url_kvp = ', repr(url_kvp))
        service_name = get_val('service', url_kvp)
        request = get_val('request', url_kvp)
        print('service = ', service_name, 'request = ', request)
        
        # Roughly trying to conform to 3DPS standard
        if service_name.lower() == '3dps':
            if request.lower() == 'getcapabilities':
                return make_getcap_response(start_response)
            else:
                # Check for version
                version = get_val('version', url_kvp)
                if version == '':
                    return make_json_exception_response(start_response, 'Unknown', 'MissingParameterValue', 'missing version parameter')
                elif version != '1.0':
                    return make_json_exception_response(start_response, 'Unknown', 'OperationProcessingFailed', 'Incorrect version, try "1.0"')
                
                # Check request type
                if request.lower() in ['getscene', 'getview', 'getfeatureinfobyray', 'getfeatureinfobyposition']:
                    return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationNotSupported', 'Request type is not implemented', request.lower())
  
                elif request.lower() == 'getfeatureinfobyobjectid':
                    return make_getfeatinfobyid_response(start_response, url_kvp, model_name, environ)
                    
                elif request.lower() == 'getresourcebyid':
                    return make_getresourcebyid_response(start_response, url_kvp, model_name)
                
                # Unknown request
                elif request != '':
                    return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationNotSupported', 'Unknown request type')
                    
                # Missing request
                else:
                    return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'Missing request parameter')
        
        # WFS request        
        elif service_name.lower() == 'wfs':
            # Check for version 2.0
            version = get_val('version', url_kvp)
            if version == '':
                return make_json_exception_response(start_response, 'Unknown', 'MissingParameterValue', 'Missing version parameter')
            elif version != '2.0':
                return make_json_exception_response(start_response, 'Unknown', 'OperationProcessingFailed', 'Incorrect version, try "2.0"')
            
            # GetFeature
            if request.lower() == 'getpropertyvalue':
                return make_getpropvalue_response(start_response, url_kvp, model_name, environ)
            
        elif service_name != '':
            return make_json_exception_response(start_response, get_val('version', url_kvp), 'OperationNotSupported', 'Unknown service name')
            
        else:
            return make_json_exception_response(start_response, get_val('version', url_kvp), 'MissingParameterValue', 'Missing service parameter')

                
    # This sends back the second part of the GLTF object - the .bin file
    # Format /api/<model_name>/$blobfile.bin?id=12345
    elif len(path_bits) == 4 and path_bits[:2] == ['','api'] and path_bits[3] == GLTF_REQ_NAME:
        model_name = path_bits[2]
        if model_name in g_BLOB_DICT:
            # Get the GLTF binary file associated with each GLTF file
            bh_id_arr = urllib.parse.parse_qs(environ['QUERY_STRING']).get('id', [])
            if len(bh_id_arr)>0:
                blob = g_BLOB_DICT[model_name].get(bh_id_arr[0])
                if blob != None:
                    for i in range(2):
                        # Binary file (.bin)
                        if blob.contents.name.data == b'bin':
                            response_headers = [('Content-type', 'application/octet-stream'), ('Content-Length', str(blob.contents.size)), ('Connection', 'keep-alive')]
                            start_response('200 OK', response_headers)
                            # Convert to byte array 
                            bcd = ctypes.cast(blob.contents.data, ctypes.POINTER(blob.contents.size * ctypes.c_char))
                            bcd_bytes = b''
                            for b in bcd.contents:
                                bcd_bytes += b
                            return [bcd_bytes]
                            
                        blob = blob.contents.next
                else:
                    print("Cannot locate blob in dict")
            else:
                print("Cannot locate id in blobfile.bin url")
            
    else:
        print('bad URL')

    # Catch-all sends empty response
    print('return()')
    return make_str_response(start_response, ' ')