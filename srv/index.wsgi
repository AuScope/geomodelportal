import sys
import os
import ctypes


def log_error(environ, msg):
    print(msg, file=environ['wsgi.errors'])

def application(environ, start_response):
    print('application()')
    status = '200 OK'
    lib_path = os.path.join(os.path.normcase(environ['DOCUMENT_ROOT']), 'lib')
    input_file_path = os.path.join(lib_path, 'input', 'NorthGawlerConvParam.json')
    sys.path.append(lib_path)
    from makeBoreholes import get_boreholes, get_boreholes_fast
    if environ['PATH_INFO']=='/api/getBoreholeData':
        # TODO: 'NorthGawler' will be a URL parameter
        borehole_config, blob = get_boreholes(input_file_path)
        borehole_str = repr(borehole_config)
        response_headers = [('Content-type', 'text/plain'), ('Content-Length', str(len(borehole_str)))]
        start_response(status, response_headers)
        return [bytes(borehole_str, 'utf-8')]
        
    if environ['PATH_INFO']=='/api/getBoreholeGLTF':
        # TODO: 'NorthGawler' will be a URL parameter
        borehole_config, blob = get_boreholes(input_file_path) # get_boreholes_fast()
        #import pickle
        #fp = open(os.path.join('C:', os.sep, 'users', 'vjf', 'Desktop', 'bh_config.pck'), 'wb')
        #pickle.dump(borehole_config, fp)
        #fp.close()
        print("blob => ", repr(blob))
        print("borehole_config => ", repr(borehole_config))
        for i in range(2):
                
            # GLTF file
            if len(blob.contents.name.data) == 0:
                # Convert to byte array 
                bcd = ctypes.cast(blob.contents.data, ctypes.POINTER(blob.contents.size * ctypes.c_char))
                bcd_bytes = b''
                for b in bcd.contents:
                    bcd_bytes += b
                response_headers = [('Content-type', 'model/gltf+json;charset=UTF-8'), ('Content-Length', str(blob.contents.size))]     
                print("Sending response headers: ",response_headers)
                start_response(status, response_headers)
                print('return(', bcd_bytes,')')
                return [bcd_bytes]
                
            blob = blob.contents.next
            
    elif environ['PATH_INFO']=='/api/$blobfile.bin':
        borehole_config, blob = get_boreholes(input_file_path)
        print("blob => ", repr(blob))
        print("borehole_config => ", repr(borehole_config))
        for i in range(2):
        
            # Binary file (.bin)
            if blob.contents.name.data == b'bin':
                # Convert to byte array 
                bcd = ctypes.cast(blob.contents.data, ctypes.POINTER(blob.contents.size * ctypes.c_char))
                bcd_bytes = b''
                for b in bcd.contents:
                    bcd_bytes += b
                response_headers = [('Content-type', 'application/octet-stream'), ('Content-Length', str(blob.contents.size))]
                print("Sending response headers: ",response_headers)
                start_response(status, response_headers)
                print('return(', bcd_bytes,')')
                return [bcd_bytes]
                
            blob = blob.contents.next

    start_response(status, [('Content-type', 'text/plain'), ('Content-Length', '1')])
    print('return()')
    return [b' ']