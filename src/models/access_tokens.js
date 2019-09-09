'use strict';

const Crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const accessToken = sequelize.define('access_tokens', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
  });
  
  accessToken.generateAccessTokenString = () => {
    // eslint-disable-next-line no-undef
    return Crypto.createHmac('md5', Crypto.randomBytes(512).toString()).update([].slice.call(arguments).join(':')).digest('hex');
  };
  
  accessToken.createAccessToken = (user) => {
    const options = {
      user_id: user.get('id'),
      expires_at: (new Date(new Date().valueOf() + (30 * 24 * 60 * 60 * 1000))),
      token: accessToken.generateAccessTokenString(user.get('id'), user.get('email'), new Date().valueOf())
    };
    
    return accessToken.create(options);
  };
  
  accessToken.dummyData = [
    {
      id: 1,
      token: 'a47fa9fead309305dddf17bdde0d75b8',
      user_id: 1,
      expires_at: new Date() + 1000*60*60*24*7 // 1 week
    }
  ];
  
  return accessToken;
};
