// ./src/libs/bearerValidation.js

const Boom = require('boom');
const Op = require('sequelize').Op;

async function unauthorized () { // Пока эта функция ничего не делает, только возвращает стандартный ответ
  throw Boom.unauthorized(); // Но сюда можно добавить много чего интересного
}

async function validate (request, token) { // а вот тут уже начинаем проверку запроса
  // в request лежит всё то же самое что и в обычном руте, включая модели
  // а в token - сам наш токен, который прислал клиент
  
  const accessToken = request.getModel(request.server.config.db.database, 'access_tokens');
  const users = request.getModel(request.server.config.db.database, 'users');
  
  // Херачим запрос в бд, и смотрим есть ли такой токен и валиден ли он
  let dbToken = await accessToken.findOne({ where: {
    token: token,
    expires_at: {
      [ Op.gte ]: new Date()
    }
  }
  });
  
  if ( !dbToken ) {
    // Нет такого токена, либо он просрочен
    return {
      isValid: false,
      credentials: {}
    };
  }
  
  // Ищем юзера
  let curUser = await users.findOne({ where: { id: dbToken.dataValues.user_id } });
  
  if ( !curUser ) {// Если юзера нет, то говорим, что неавторизованы
    // Нужно удалить невалидный токен
    accessToken.destroy({ where: { user_id: dbToken.dataValues.user_id } });
    return {
      isValid: false,
      credentials: {}
    };
  }
  
  // Если же юзер есть, то 
  return {
    isValid: true,
    credentials: {
      role: 'admin' // Сюда фигачим роль юзера
    },
    artifacts: { // а вот сюда фигачим любые данные которые нам могут пригодиться внутри рута
      token: token,
      user: curUser.dataValues
    }
  };
}

module.exports = {
  validate: validate,
  unauthorized: unauthorized
}; 
