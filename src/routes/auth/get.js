//./src/routes/auth/get.js

const Joi = require('joi');
const Boom = require('boom');

async function response(request) {
  
  // Подключаем модельки
  const accessTokens = request.getModel(request.server.config.db.database, 'access_tokens');
  const users = request.getModel(request.server.config.db.database, 'users');
  
  // Ищем пользователя по мылу
  let userRecord = await users.findOne({ where: { email: request.query.login } });

  // если не нашли, говорим что не авторизованы
  if( !userRecord ) {
    throw Boom.unauthorized();
  }
  
  // Проверяем совподают ли пароли
  if( !userRecord.verifyPassword(request.query.password) ) {
    throw Boom.unauthorized();// если нет, то опять ж говорим, что не авторизованы
  }
  
  // Иначе, создаём новый токен
  let token = await accessTokens.createAccessToken(userRecord);
  
  // и возвращаем его
  return {
    meta: {
      total: 1
    },
    data: [token.dataValues]
  };
}

// А тут описываем схему ответа
const tokenScheme = Joi.object({
  id: Joi.number().integer().example(1),
  user_id: Joi.number().integer().example(2),
  expires_at: Joi.date().example('2019-02-16T15:38:48.243Z'),
  token: Joi.string().example('4443655c28b42a4349809accb3f5bc71'),
  updatedAt: Joi.date().example('2019-02-16T15:38:48.243Z'),
  createdAt: Joi.date().example('2019-02-16T15:38:48.243Z')
});

const responseScheme = Joi.object({
  meta: Joi.object({
    total: Joi.number().integer().example(3)
  }),
  data: Joi.array().items(tokenScheme)
});

module.exports = {
  method: 'GET',
  path: '/auth',
  options: {
    handler: response,
    tags: [ 'api' ], // Necessary tag for swagger
    validate: {
      query: {
        login: Joi.string().required().example('pupkin@gmail.com'),
        password: Joi.string().required().example('12345')
      }
    },
    response: { schema: responseScheme } // если схема ответа не будет совподать с тем что реально отдаётся
  }
};
