#!/usr/bin/env node
'use strict';

const Hapi = require('hapi');
const filepaths = require('filepaths');
const Sequelize = require('sequelize');
const hapiBoomDecorators = require('hapi-boom-decorators');
const HapiSwagger = require('hapi-swagger');
const Vision = require('vision');
const Inert = require('inert');
const AuthBearer = require('hapi-auth-bearer-token');
const bearerValidation = require('./libs/bearerValidation');

const config = require('../config');
const Package = require('../package');

const swaggerOptions = {
  jsonPath: '/documentation.json',
  documentationPath: '/documentation',
  info: {
    title: Package.description,
    version: Package.version
  },
};

async function createServer() {
  // Инициализируем сервер
  const server = await new Hapi.Server(config.server);

  await server.register([
    AuthBearer,
    hapiBoomDecorators,
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    },
    {
      plugin: require('hapi-sequelizejs'),
      options: [
        {
          name: config.db.database, 
          models: [ __dirname + '/models/*.js '], // Путь к моделькам
          //ignoredModels: [__dirname + '/server/models/**/*.js'], // Можем некоторые модельки заигнорить
          sequelize: new Sequelize(config.db), // Инициализируем обычный секьюлайз и передаём его параметром
          sync: true, // Синхронизировать/нет модели с реальной бд
          forceSync: false, // Если тру, то таблицы будут дропнуты перед синхронизацией, остарожно
        },
      ],
    }
  ]);
  
  server.auth.strategy('token', 'bearer-access-token', {
    allowQueryToken: false,
    unauthorized: bearerValidation.unauthorized,
    validate: bearerValidation.validate
  });

  // Загружаем все руты из папки ./src/routes/
  let routes = filepaths.getSync(__dirname + '/routes/');
  for(let route of routes)
    server.route( require(route) );
  
  server.ext({
    type: 'onRequest',
    method: async function (request, h) {
      request.server.config = Object.assign({}, config);
      return h.continue;
    }
  });
  
  // Запускаем сервер
  try {
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
  } catch(err) { // если не смогли стартовать, выводим ошибку
    console.log(JSON.stringify(err));
  }

  return server;
}

module.exports = createServer;
