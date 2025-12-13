// config.js
module.exports = {
  db: {
    host: process.env.MYSQL_HOST || 'mysql',
    user: process.env.MYSQL_USER || 'dadd',
    password: process.env.MYSQL_PASSWORD || 'daddpass',
    database: process.env.MYSQL_DATABASE || 'DADD'
  }
};
