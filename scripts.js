var schema_src; // schema.org definitions source
var types = []; // schema.org parsed classes
var properties = []; // schema.org parsed properties
var selected_type = ''; // currently selected type
var selected_properties = []; // currently selected properties
//TODO: datatypes

// class for schema.org types
class Type {
    constructor(id, comment, label, subClassOf = [], isPartOf = []) {
        this.id = id;
        this.comment = comment;
        this.label = label;
        this.subClassOf = subClassOf;
        this.isPartOf = isPartOf;
    }
}

// class for schema.org properties
class Property {
    constructor(id, comment, label, domainIncludes = [], rangeIncludes = [], source = null) {
        this.id = id;
        this.comment = comment;
        this.label = label;
        this.domainIncludes = domainIncludes;
        this.rangeIncludes = rangeIncludes;
        this.source = source;
    }
}

// on page load
document.addEventListener('DOMContentLoaded', async function() {
    await get_database();
    await build_types_and_properties();
    await next_level_types(1,'schema:Thing');
    
    document.querySelector('#types0').style.display = 'inline';
    document.querySelector('#types0_next').style.display = 'inline'
    document.querySelector('#types0').selectedIndex = 0;
    document.querySelector('#types0').selectedOptions[0].dispatchEvent(new MouseEvent("click",{bubbles: true, cancellable: true}));

    return Promise.resolve(1);
});

// pull latest definition file from schema.org
async function get_database() {
    const url = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';
    let response = await fetch(url);
    let result = await response.json();
    
    schema_src = result;
    return Promise.resolve(result);
}

// populate types and properties arrays
function build_types_and_properties() {
    for(var i=0; i<Object.keys(schema_src['@graph']).length; i++) {
        // build classes
        if(schema_src['@graph'][i]['@type'] === 'rdfs:Class') {
            types.push(new Type(schema_src['@graph'][i]['@id'], schema_src['@graph'][i]['rdfs:comment'], schema_src['@graph'][i]['rdfs:label']));

            //sub types
            if(schema_src['@graph'][i].hasOwnProperty('rdfs:subClassOf')) {
                if(Object.keys(schema_src['@graph'][i]['rdfs:subClassOf']).length === 1) {
                    types[types.length-1].subClassOf.push(schema_src['@graph'][i]['rdfs:subClassOf']['@id']);
                } else {
                    for(var j=0; j<Object.keys(schema_src['@graph'][i]['rdfs:subClassOf']).length; j++) {
                        types[types.length-1].subClassOf.push(schema_src['@graph'][i]['rdfs:subClassOf'][j]['@id']);
                    }
                }
            }

            //parent types
            if(schema_src['@graph'][i].hasOwnProperty('schema:isPartOf')) {
                if(Object.keys(schema_src['@graph'][i]['schema:isPartOf']).length === 1) {
                    types[types.length-1].isPartOf.push(schema_src['@graph'][i]['schema:isPartOf']['@id']);
                } else {
                    for(var k=0; k<Object.keys(schema_src['@graph'][i]['schema:isPartOf']).length; k++) {
                        types[types.length-1].isPartOf.push(schema_src['@graph'][i]['schema:isPartOf'][k]['@id']);
                    }
                }
            }
        }

        // build properties
        if(schema_src['@graph'][i]['@type'] === 'rdf:Property') {
            properties.push(new Property(schema_src['@graph'][i]['@id'], schema_src['@graph'][i]['rdfs:comment'], schema_src['@graph'][i]['rdfs:label']));

            // add domainIncludes (types using this property)
            if(schema_src['@graph'][i].hasOwnProperty('schema:domainIncludes')) {
                if(Object.keys(schema_src['@graph'][i]['schema:domainIncludes']).length === 1) {
                    properties[properties.length-1].domainIncludes.push(schema_src['@graph'][i]['schema:domainIncludes']['@id']);
                } else {
                    for(var j=0; j<Object.keys(schema_src['@graph'][i]['schema:domainIncludes']).length; j++) {
                        properties[properties.length-1].domainIncludes.push(schema_src['@graph'][i]['schema:domainIncludes'][j]['@id']);
                    }
                }
            }

            // add rangeIncludes (data types)
            if(schema_src['@graph'][i].hasOwnProperty('schema:rangeIncludes')) {
                if(Object.keys(schema_src['@graph'][i]['schema:rangeIncludes']).length === 1) {
                    properties[properties.length-1].rangeIncludes.push(schema_src['@graph'][i]['schema:rangeIncludes']['@id']);
                } else {
                    for(var k=0; k<Object.keys(schema_src['@graph'][i]['schema:rangeIncludes']).length; k++) {
                        properties[properties.length-1].rangeIncludes.push(schema_src['@graph'][i]['schema:rangeIncludes'][k]['@id']);
                    }
                }
            }            
        }
    }
    // console.log(types);
    // console.log(properties);
}

// returns number / position of TYPE object in types array
function get_type_number_from_id(id) {
    for(var i=0; i<types.length; i++) {
        if(types[i].id === id) {
            return i;
        }
    }
    return 0;
}

// returns number / position of PROPERTY object in properties array
function get_property_number_from_id(id) {
    for(var i=0; i<properties.length; i++) {
        if(properties[i].id === id) {
            return i;
        }
    }
    return 0;
}

// returns children of given type
function get_type_children(id) {
    let children = [];
    for(var i=0; i<types.length; i++) {
        for(var j=0; j<Object.keys(types[i].subClassOf).length; j++) {
            if(types[i].subClassOf[j] === id) {
                children.push(types[i])
            }
        }
    }
    return children;
}

// returns properties of given type
function get_type_properties(id) {
    let type_properties = [];
    for(var i=0; i<properties.length; i++) {
        for(var j=0; j<Object.keys(properties[i].domainIncludes).length; j++) {
            if(properties[i].domainIncludes[j] === id) {
                type_properties.push(properties[i]);
            }
        }
    }
    return type_properties;
}

// populate one of the type / sub-type selects based on parent
function next_level_types(level=0, id='schema:Thing') {
    let children = get_type_children(id).sort(dynamicSort("label"));
    let children_html = '';
    children.forEach(child => {
        children_html += '<option value="' + child.id + '" onclick="set_selected_type(\'' + child.id + '\');">' + child.label + ' (' + get_type_children(child.id).length + ')</option>';
    });

    const list = document.querySelector('#types' + level);
    list.innerHTML = children_html;

    document.querySelector('#types' + (level)).style.display = 'inline';
    const next_button = document.querySelector('#types' + (level) + '_next')
    if(next_button !== null) {
        next_button.style.display = 'inline';
    }
}

// populate property select with currently selected type's properties
function show_type_properties(id) {
    let type_properties = get_type_properties(id).sort(dynamicSort("label"));;
    let type_html = '';
    type_properties.forEach(child => {
        type_html += '<option value="' + child.id + '">' + child.label + ' (' + child.rangeIncludes[0] + ')</option>';
    });

    const list = document.querySelector('#properties0');
    list.innerHTML = type_html;
}

// set global var of currently selected type
function set_selected_type(id) {
    selected_type = id;
    show_type_properties(selected_type);
    refresh_markup();
}

// add a new property to the list of selected properties
function add_property_to_markup(id=null) {
    if(id !== null) {
        selected_properties.push(properties[get_property_number_from_id(id)]);
    } else {
        const properties_list = document.querySelector('#properties0');
        for(var i=0; i<properties_list.selectedOptions.length; i++) {
            selected_properties.push(properties[get_property_number_from_id(properties_list.selectedOptions[i].value)]);
        }
    }

    refresh_markup();
}

// put together markup text based on selected type and properties
function refresh_markup() {
    const markup_field = document.querySelector('#markup');
    let markup_html = '';

    markup_html += '<div itemscope itemtype="https://schema.org/' + selected_type + '">\n';
    for(var i=0; i<selected_properties.length; i++) {
        markup_html += '\t<span>' + selected_properties[i].label + ': <span itemprop="' + selected_properties[i].label + '">Lorem ipsum (' + selected_properties[i].rangeIncludes[0] + ')</span></span>\n';
    }
    markup_html += '</div>';

    markup_field.innerHTML = markup_html;
}

// reset all forms to initial state
async function reset() {
    await set_selected_type('schema:Thing');
    selected_properties = [];
    refresh_markup();

    document.querySelector('#types2').style.display = 'none';
    document.querySelector('#types3').style.display = 'none';
    document.querySelector('#types4').style.display = 'none';
    document.querySelector('#types5').style.display = 'none';

    document.querySelector('#types2_next').style.display = 'none';
    document.querySelector('#types3_next').style.display = 'none';
    document.querySelector('#types4_next').style.display = 'none';

    return Promise.resolve(1);
}

function reset2() {
    reset();
}

// copy markup to clipboard
function copy() {
    const markup = document.getElementById("markup");
    markup.select();
    markup.setSelectionRange(0, 99999);
    document.execCommand("copy");
}

// sort function
// thank you https://stackoverflow.com/a/4760279/4619569
function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}