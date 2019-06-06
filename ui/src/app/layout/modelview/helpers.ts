

/**
 * Detects WebGL
 * Adapted from: Detector.js in ThreeJS examples
 * @return true if WebGL is supported
 */
export function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !! ( (<any>window).WebGLRenderingContext &&
                    ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
    } catch ( e ) {
        return false;
    }
}

/**
 * Creates a WebGL error message
 * Adapted from: Detector.js in ThreeJS examples
 * @return HTML Element
 */
export function getWebGLErrorMessage(ngRenderer) {
    const p1 = ngRenderer.createElement('p');
    if (!this.hasWebGL()) {
        const textStr = (<any>window).WebGLRenderingContext ? [
            'Your graphics card does not seem to support WebGL',
            'Find out how to get it '
        ].join( '\n' ) : [
            'Your browser does not seem to support WebGL',
            'Find out how to get it '
        ].join( '\n' );
        const hText = ngRenderer.createText(textStr);
        ngRenderer.appendChild(p1, hText);
        const oLink = ngRenderer.createElement('a');
        ngRenderer.setAttribute(oLink, 'href', 'http://get.webgl.org/'); // Attributes are HTML entities
        ngRenderer.setProperty(oLink, 'innerHTML', 'here.'); // Properties are DOM entities
        ngRenderer.setAttribute(oLink, 'target', '_blank');
        ngRenderer.setStyle(oLink, 'color', 'yellow');
        ngRenderer.appendChild(p1, oLink);
    }
    return p1;
}

/**
 * Detects IE
 * @return version of IE or false, if browser is not Internet Explorer
 */
export function detectIE() {
    const ua = window.navigator.userAgent;
    // Test values; Uncomment to check result …
    // IE 10
    // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
    // IE 11
    // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
    // IE 12 / Spartan
    // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) '
    // 'Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
    // Edge (IE 12+)
    // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    // 'Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';
    const msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }
    const trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        const rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }
    return false;
}
