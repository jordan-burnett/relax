(function (window) {
    "use strict";

// -------------------------- Optimisation -------------------------- //

    function hasOwnProp(obj, property) {
        return obj.hasOwnProperty(property);
    }

// -------------------------- Initialisation -------------------------- //

    var cssProps =  getProps(),
        vendorPrefix = getVendorPrefix();

// -------------------------- Add Methods -------------------------- //

    var intTest = /-?(\d+[.]?\d*)/g;

    /**
     * Returns a sorted array of each position within a series of steps
     * @param  {Array} steps
     * @return {Array}
     */
    function getPositions (steps) {
        var positions = [];
        for (var step in steps) {
            if(hasOwnProp(steps, step)){
                positions.push(parseInt(step));
            }
        }
        positions.sort(function (a, b) {
            return a - b;
        });
        return positions;
    }

    /**
     * Loop over the user defined steps for the animation and extract the
     * information needed to animate.  Pushes each item into the queue
     * @param  {Element} el
     * @param  {Object} steps
     * @param  {Number} positions [description]
     */
    function parseSteps (steps, positions) {
        var output = [];
        for (var i = 0, limit = positions.length - 1; i < limit; i++) {
            var startPos = positions[i],
                endPos = positions[i + 1],
                startProps = steps[startPos],
                endProps = steps[endPos];
            output.push({
                startPos: startPos,
                endPos: endPos,
                distance: endPos - startPos,
                startProps: startProps,
                endProps: endProps,
                animatableProps: unifyProperties(startProps, endProps)
            });
        }
        return output;
    }

    /**
     * Subtract all values in array b from the equivalent value in array a
     * @param  {Array} a
     * @param  {Array} b
     * @return {Array}
     */
    function arrayDifference (a, b) {
        var output = [];
        for (var i = 0, len = a.length; i < len; i++) {
            output[i] = a[i] - b[i];
        }
        return output;
    }

    /**
     * Unify start and end properties of a step into one object with
     * the necessary information for animation
     */
    function unifyProperties (startProperties, endProperties) {

        var output = {};

        var startValues, endValues;
        for (var prop in startProperties) {
            if(hasOwnProp(startProperties, prop)){
                if (!endProperties[prop]) continue;
                startValues = getValues(startProperties[prop]);
                endValues = getValues(endProperties[prop]);
                output[prop] = {
                    startValues: startValues,
                    distance: arrayDifference(endValues, startValues),
                    template: makeTemplate(startProperties[prop], endProperties[prop])
                };
            }
        }

        return output;
    }

    /**
     * Convert a string of CSS into an array of numeric values
     * @param  {String} property (eg. 20px 10px)
     * @return {Array} (eg [20, 10])
     */
    function getValues (property) {
        var output = [];
        property.replace(intTest, function (val) {
            output.push(parseFloat(val));
        });
        return output;
    }

    /**
     * Strip numeric values from a string of css and convert them
     * into a template string for later parsing
     * @param  {String} property (eg. 20px 10px)
     * @return {String} (eg. {0}px {1}px)
     */
    function makeTemplate (startProps, endProps) {
        var i = -1;

        return startProps.replace(intTest, function (integer) {
            i++;
            return '{' + i + '}';
        });
    }

    /**
     * Reformat CSS style property names into javascript friendly ones
     * (eg. margin-left to marginLeft) and parse colours to RGB
     * @param  {Object} steps
     */
    function formatPropertyNames (steps) {
        var newName, newValue, currentStep;
        for (var step in steps) {
            if(hasOwnProp(steps, step)){
                currentStep = steps[step];
                for (var propertyName in currentStep) {
                    if(hasOwnProp(currentStep, propertyName)){
                        newName = parseName(propertyName);
                        currentStep[propertyName] = parseValue(currentStep[propertyName]);
                        if (newName != propertyName) {
                            currentStep[newName] = currentStep[propertyName];
                            delete currentStep[propertyName];
                        }
                    }
                }
            }
        }
    }

    function parseValue (value) {
        if(isHex(value)){
            value = hexToRGB(value);
        }
        return value;
    }

    function hexToRGB( colour ) {
        var r,g,b;
        r = colour.charAt(1) + '' + colour.charAt(2);
        g = colour.charAt(3) + '' + colour.charAt(4);
        b = colour.charAt(5) + '' + colour.charAt(6);
        r = parseInt(r, 16);
        g = parseInt(g, 16);
        b = parseInt(b, 16);
        return "rgb(" + r + "," + g + "," + b + ")";
}


// -------------------------- Render Methods -------------------------- //

    function renderStep (position, step, el, options) {
        var progress = (position - step.startPos) / step.distance,
            style;
        for (var propertyName in step.animatableProps) {
            if(hasOwnProp(step.animatableProps, propertyName)){
                style = renderPropertyTemplate(step.animatableProps[propertyName], progress, options.easing);
                applyProp(el, propertyName, style);
            }
        }
    }

    /**
     * Loop through each value, calculating the current value and inserting it
     * into the template string
     * @param  {Object} property
     * @param  {Float} progress
     * @return {String}
     */
    function renderPropertyTemplate (property, progress, easing) {
        var template = property.template,
            value;
        for (var i = 0, len = property.startValues.length; i < len; i++) {
            value = easing(progress, property.startValues[i], property.distance[i], 1);
            template = template.replace('{' + i + '}', value);
        }
        return template;
    }
    
// -------------------------- CSS Methods -------------------------- //

    
    function getProps () {
        // IE8 Doesn't support getComputedStyle, but it also doesn't support
        // CSS3 so we can skip this
        if (!window.getComputedStyle) return;
        var props = [];
        var styles = getComputedStyle(document.documentElement, null);
        for (var style in styles) {
            if (hasOwnProp(styles, style) && isNaN(style)) {
                props.push(style);
            }
        }
        return props;
    }

    function getVendorPrefix () {
        var string = cssProps.join(',');
        var matches = string.match(/,(Moz|webkit|ms)/);
        if (matches) return matches[1];
    }

    function parseName (propertyName) {
        propertyName = toCamelCase(propertyName);
        if (vendorPrefix) propertyName = addVendorPrefix(propertyName);
        return propertyName;
    }

    function toCamelCase (string) {
        string = string.replace(/[-_](\w)(\w*)/, function (a, b, c) {
            return b.toUpperCase() + c;
        });
        return string;
    }

    function addVendorPrefix (propertyName) {
        var capitalised = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        var index = cssProps.indexOf(vendorPrefix + capitalised);
        if (index == -1) return propertyName;
        else return cssProps[index];
    }

    function applyMultiple (el, properties) {
        for (var propertyName in properties) {
            if(hasOwnProp(properties, propertyName)){
                applyProp(el, propertyName, properties[propertyName]);
            }
        }
    }

    function applyProp (el, propertyName, value) {
        if (el instanceof jQuery) {
            for (var i = 0, len = el.length; i < len; i++) {
                el[i].style[propertyName] = value;
            }
            return;
        }
        el.style[propertyName] = value;
    }

    function resetStyle (el) {
        if (el instanceof jQuery) {
            for (var i = 0, len = el.length; i < len; i++) {
                el[i].removeAttribute('style');
            }
            return;
        }
        el.removeAttribute('style');
    }

    function isHex (val) {
        return /#(\w|\d){6}/.test(val);
    }

// -------------------------- Utils ---------------------------- //

    /**
     * Extends an object (object 1) with all the properties of another (object 2)
     * @param  {Object} object1
     * @param  {Object} object2 
     * @return {Object}    
     */
    function extend(object1, object2){
        var output = {}
        for(var key in object1){
            output[key] = object2[key] || object1[key]
        }
        return output;
    }

// -------------------------- Easing ---------------------------- //

    var ease = {
        linear: function(t, b, c, d) {
            return c * t / d + b;
        },
        easeIn: function (t, b, c, d) {
            return c*(t/=d)*t + b;
        },
        easeOut: function (t, b, c, d) {
            return -c *(t/=d)*(t-2) + b;
        }
    }

// -------------------------- Constructor -------------------------- //

    var defaultOptions = {
        easing: ease.linear
    }

    var _Relax = function () {
        this.queue = [];
    };

    _Relax.prototype.add = function (el, steps, options) {
        options = options || {};
        var positions = getPositions(steps);
        formatPropertyNames(steps);
        this.queue.push({
            el: el,
            steps: parseSteps(steps, positions),
            options: extend(defaultOptions, options)
        });
    };

    _Relax.prototype.render = function (position) {
        var item, step;
        for (var i = 0, len = this.queue.length; i < len; i++) {
            item = this.queue[i];
            // Reset the style so nothing conflicts
            resetStyle(item.el);
            for (var s = 0, slen = item.steps.length; s < slen; s++) {
                step = item.steps[s];
                // Properties may vary between steps, so apply end properties if needed
                if (step.endPos <= position) {
                    applyMultiple(item.el, step.endProps);
                }
                // Current position falls within the bounds of this step, so render it
                else if (step.endPos >= position && step.startPos < position) {
                    renderStep(position, step, item.el, item.options);
                }
            }
        }
    };

    _Relax.prototype.reset = function(){
         for (var i = 0, len = this.queue.length; i < len; i++) {
            // Reset the style
            resetStyle(this.queue[i].el);
        }
    }

    _Relax.prototype.create = function(){
        return new _Relax();
    }

// -------------------------- Scroller -------------------------- //

    var Relax = _Relax.prototype.create();

    var scrollTopMethods = {
        pageOffset: function () {
            return pageYOffset;
        },
        docBody: function () {
            return document.body.scrollTop;
        },
        docElement: function () {
            return document.documentElement.scrollTop;
        }
    };

    Relax.enable = function () {
        this.getScrollTop = this.getScrollTopMethod();
        this.enableScrollEvent();
        this.render();
    };

    Relax.disable = function(){
        this.disableScrollEvent();
        this.reset();
    }

    Relax.enableScrollEvent = function(){
        window.addEventListener("scroll", Relax.onScroll);
    }

    Relax.disableScrollEvent = function(){
        window.removeEventListener("scroll", Relax.onScroll);
    }

    Relax.getScrollTopMethod = function () {
        if (typeof pageYOffset != 'undefined') return scrollTopMethods.pageOffset;
        else if (document.documentElement.clientHeight) return scrollTopMethods.docElement;
        else if (document.body.clientHeight) return scrollTopMethods.docBody;
    };

    Relax.onScroll = function () {
        var position = Relax.getScrollTop();
        Relax.render(position);
    };  

    Relax.ease = ease;

// -------------------------- Transport -------------------------- //

    if (typeof define === "function" && define.amd) {
        // AMD Module
        define("Relax", [], function () {
            return Relax;
        });
    } else {
        // Global definition
        window.Relax = Relax;
    }

})(window);