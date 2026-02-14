const { Sequelize } = require('sequelize');
const path = require('path');

// Use SQLite for development/MVP (Zero config)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false
});

module.exports = sequelize;
