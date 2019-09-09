// ./src/routes/mesages/post.js

const Joi = require('joi');

async function response(request) {

  const messages = request.getModel(request.server.config.db.database, 'messages');
  let newMessage = await messages.create(request.payload);

  let count = await messages.count();

  return {
    meta: {
      total: count
    },
    data: [ newMessage.dataValues ]
  };
}

const messageSchema = Joi.object({
  id: Joi.number().integer().example(1),
  user_id: Joi.number().integer().example(2),
  message: Joi.string().example('Lorem ipsum'),
  updatedAt: Joi.date().example('2019-01-17T16:00:21.999Z'),
  createdAt: Joi.date().example('2019-01-17T16:00:21.999Z')
});

const responseScheme = Joi.object({
  meta: Joi.object({
    total: Joi.number().integer().example(3)
  }),
  data: Joi.array().items(messageSchema)
});

module.exports = {
  method: 'POST',
  path: '/messages',
  options: {
    handler: response,
    tags: ['api'], // Necessary tag for swagger
    auth: 'token', // >>>> Это необходимый тег для включения авторизации
    validate: {
      payload: {
        user_id: Joi.number().integer().required().example(1),
        message: Joi.string().min(1).max(100).required().example('Lorem ipsum')
      }
    },
    response: { schema: responseScheme } 
  }
};
