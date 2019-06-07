import { Renderer2 } from '@angular/core';


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
 * @param ngRenderer Angular renderer object, used to create HTML DOM elements
 * @return HTML Element
 */
export function getWebGLErrorMessage(ngRenderer: Renderer2) {
    const p1 = ngRenderer.createElement('p');
    if (!hasWebGL()) {
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



/**
 * Creates an error message box in a <div> element when Internet Explorer is used
 * @param ngRenderer Angular renderer object, used to create HTML DOM elements
 * @param popupBoxDiv HTML DOM element containing the popup
 */
export function createMissingIEMsgBox(ngRenderer: Renderer2, errorDiv: HTMLElement) {
    const p1 = ngRenderer.createElement('p');
    const p2 = ngRenderer.createElement('p');
    const hText1 = ngRenderer.createText('Sorry - your Internet Explorer browser is not supported.  ');
    const hText2 = ngRenderer.createText('Please install Firefox, Chrome or Microsoft Edge');
    ngRenderer.appendChild(p1, hText1);
    ngRenderer.appendChild(p2, hText2);
    ngRenderer.appendChild(errorDiv, p1);
    ngRenderer.appendChild(errorDiv, p2);
    ngRenderer.setStyle(errorDiv, 'display', 'inline');
}



/**
 * Creates an error message box in a <div> element
 * @param ngRenderer Angular renderer object, used to create HTML DOM elements
 * @param popupBoxDiv HTML DOM div element containing the popup
 */
export function createErrorBox(ngRenderer: Renderer2, errorDiv: HTMLElement, errStr: string) {
    const p1 = ngRenderer.createElement('p');
    const p2 = ngRenderer.createElement('p');
    const hText1 = ngRenderer.createText('Sorry - ' + errStr);
    const hText2 = ngRenderer.createText('Return to home page');
    const a1 = ngRenderer.createElement('a');
    ngRenderer.appendChild(a1, hText2);
    ngRenderer.setAttribute(a1, 'href', '/');
    ngRenderer.setStyle(a1, 'color', 'yellow');
    ngRenderer.appendChild(p1, hText1);
    ngRenderer.appendChild(p2, a1);
    ngRenderer.appendChild(errorDiv, p1);
    ngRenderer.appendChild(errorDiv, p2);
    ngRenderer.setStyle(errorDiv, 'display', 'inline');
}


/**
 * Adds a text line to the popup information window
 * @param ngRenderer Angular renderer object, used to create HTML DOM elements
 * @param popupBoxDiv HTML DOM element containing the popup
 * @param key key value
 * @param val value
 */
export function addTextLineToPopup(ngRenderer: Renderer2, popupBoxDiv: HTMLElement, key: string, val: string) {
    const liElem = ngRenderer.createElement('li');
    const spElem = ngRenderer.createElement('span');
    const keyText = ngRenderer.createText(key + ': ');
    const valText = ngRenderer.createText(val);
    ngRenderer.appendChild(spElem, keyText);
    ngRenderer.appendChild(liElem, spElem);
    ngRenderer.appendChild(liElem, valText);
    ngRenderer.addClass(liElem, 'popupClass');
    ngRenderer.appendChild(popupBoxDiv, liElem);
}



/**
 * Make a popup box appear on the screen near where the user has queried the model
 * @param ngRenderer Angular renderer object, used to create HTML DOM elements
 * @param popupBoxDiv HTML DOM element containing the popup
 * @param event click event
 * @param popupInfo JSON object of the information to be displayed in the popup box
 * @param point point clicked on in XYZ coordinates (format is [x, y, z]]
 */
export function makePopup(ngRenderer: Renderer2, popupBoxDiv: HTMLElement, event, popupInfo, point: [number, number, number]) {
    // Position it and let it be seen
    ngRenderer.setStyle(popupBoxDiv, 'top', event.clientY);
    ngRenderer.setStyle(popupBoxDiv, 'left', event.clientX);
    ngRenderer.setStyle(popupBoxDiv, 'display', 'inline');
    // Empty its contents using DOM operations (Renderer2 does not currently support proper element querying)
    while (popupBoxDiv.hasChildNodes()) {
        popupBoxDiv.removeChild(popupBoxDiv.lastChild);
    }

    // Make 'X' for exit button in corner of popup window
    const exitDiv = ngRenderer.createElement('div');
    ngRenderer.setAttribute(exitDiv, 'id', 'popupExitDiv');  // Attributes are HTML entities
    ngRenderer.addClass(exitDiv, 'popupClass');
    ngRenderer.setProperty(exitDiv, 'innerHTML', 'X'); // Properties are DOM entities
    ngRenderer.setProperty(exitDiv, 'onclick', function() { ngRenderer.setStyle(popupBoxDiv, 'display', 'none'); });
    ngRenderer.appendChild(popupBoxDiv, exitDiv);
    // Make popup title
    const hText = ngRenderer.createText(popupInfo['title']);
    ngRenderer.appendChild(popupBoxDiv, hText);
    // Add in XYZ coordinates
    addTextLineToPopup(ngRenderer, popupBoxDiv, 'X,Y,Z (m)', point[0].toFixed(0) + ', ' + point[1].toFixed(0) + ', ' + point[2].toFixed(0));
    // Add in sorted popup information
    for (const key of Object.keys(popupInfo).sort()) {
         if (key !== 'href' && key !== 'title') {
             addTextLineToPopup(ngRenderer, popupBoxDiv, key, popupInfo[key]);
        // Make URLs
        } else if (key === 'href') {
            for (let hIdx = 0; hIdx < popupInfo['href'].length; hIdx++) {
                const liElem = ngRenderer.createElement('li');
                const oLink = ngRenderer.createElement('a');
                ngRenderer.setAttribute(oLink, 'href', popupInfo['href'][hIdx]['URL']); // Attributes are HTML entities
                ngRenderer.setProperty(oLink, 'innerHTML', popupInfo['href'][hIdx]['label']); // Properties are DOM entities
                ngRenderer.setAttribute(oLink, 'target', '_blank');
                ngRenderer.appendChild(liElem, oLink);
                ngRenderer.appendChild(popupBoxDiv, liElem);
            }
        }
    }
}
