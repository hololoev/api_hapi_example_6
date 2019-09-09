const assert = require('assert');
const rp = require('request-promise');
const filepaths = require('filepaths');
const rsync = require('sync-request');

const config = require('./../config');
const createServer = require('../src/server');

const API_URL = 'http://0.0.0.0:3030';
const AUTH_USER = { login: 'pupkin@gmail.com', pass: '12345' };
const AUTH_GGROUP = { api_key: '00:dd:fa:de', name: 'autotest-gate', pub_key: '---fake---key' };

const customExamples = {
  'string': 'abc',
  'number': 2,
  'boolean': true,
  'any': null,
  'date': new Date()
};

const allowedStatusCodes = {
  200: true,
  404: true
};

function getExampleValue(joiObj) {
  if( joiObj == null ) // if joi is null
    return joiObj;

  if( typeof(joiObj) != 'object' ) //If it's not joi object
    return joiObj;

  if( typeof(joiObj._examples) == 'undefined' )
    return customExamples[ joiObj._type ];

  if( joiObj._examples.length <= 0 )
    return customExamples[ joiObj._type ];

  return joiObj._examples[ 0 ].value;
}

function generateJOIObject(schema) {

  if( schema._type == 'object' )
    return generateJOIObject(schema._inner.children);

  if( schema._type == 'string' )
    return getExampleValue(schema);

  let result = {};
  let _schema;

  if( Array.isArray(schema) ) {
    _schema = {};
    for(let item of schema) {
      _schema[ item.key ] = item.schema;
    }
  } else {
    _schema = schema;
  }

  for(let fieldName in _schema) {

    if( _schema[ fieldName ]._type == 'array' ) {
      result[ fieldName ] = [ generateJOIObject(_schema[ fieldName ]._inner.items[ 0 ]) ];
    } else {
      if( Array.isArray(_schema[ fieldName ]) ) {
        result[ fieldName ] = getExampleValue(_schema[ fieldName ][ 0 ]);
      } else if( _schema[ fieldName ]._type == 'object' ) {
        result[ fieldName ] = generateJOIObject(_schema[ fieldName ]._inner);
      } else {
        result[ fieldName ] = getExampleValue(_schema[ fieldName ]);
      }
    }
  }

  return result
}

function generateQuiryParams(queryObject) {
  let queryArray = [];
  for(let name in queryObject)
    queryArray.push(`${name}=${queryObject[name]}`);

  return queryArray.join('&');
}

function generatePath(basicPath, paramsScheme) {
  let result = basicPath;

  if( !paramsScheme )
    return result;

  let replaces = generateJOIObject(paramsScheme);

  for(let key in replaces)
    result = result.replace(`{${key}}`, replaces[ key ]);

  return result;
}

function genAuthHeaders() {
  let result = {};

  let respToken = rsync('GET', API_URL + `/auth?login=${AUTH_USER.login}&password=${AUTH_USER.pass}`);
  let respTokenBody = JSON.parse(respToken.getBody('utf8'));
  
  result[ 'token' ] = {
    Authorization: 'Bearer ' + respTokenBody.data[ 0 ].token
  };
  
  return result;
}

function generateRequest(route, authKeys) {

  if( !route.options.validate ) {
    return false;
  }

  let options = {
    method: route.method,
    url: API_URL + generatePath(route.path, route.options.validate.params) + '?' + generateQuiryParams( generateJOIObject(route.options.validate.query || {}) ),
    headers: authKeys[ route.options.auth ]  ? authKeys[ route.options.auth ] : {},
    body: generateJOIObject(route.options.validate.payload || {}),
    json: true,
    timeout: 15000
  }

  return options;
}

// Load routes
let authKeys = genAuthHeaders();
//let authKeys = {};
let testSec = [ 'POST', 'PUT', 'GET', 'DELETE' ];
let routeList = [];

//routeList.push( require('../src/routes/v1/gateway_group/get_one') )

for(let route of filepaths.getSync(__dirname + '/../src/routes/'))
  routeList.push(require(route));

describe('Autogenerate Hapi Routes TEST', async () => {

  for(let metod of testSec)
  for(let testRoute of routeList) {
    if( testRoute.method != metod ) {
      continue;
    }

    if( testRoute.path.indexOf('cron') > -1 ) { // skip cron
      continue;
    }

    if (testRoute.path === '/api/decipher') {
      continue;
    }

    it(`TESTING: ${testRoute.method} ${testRoute.path}`,  async function () {
      let options = generateRequest(testRoute, authKeys);

      if( !options )
        return false;

      let statusCode = 0;

      try {
        let result = await rp( options );
        statusCode = 200;
      } catch(err) {
        statusCode = err.statusCode;
      }

      if( !allowedStatusCodes[ statusCode ] ) {
        console.log('*** TEST STACK FOR:', `${testRoute.method} ${testRoute.path}`);
        console.log('options:', options);
        console.log('StatusCode:', statusCode);
      }

      return assert.ok(allowedStatusCodes[ statusCode ]);
    });

  }

});
