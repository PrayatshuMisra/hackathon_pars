const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Escalation = sequelize.define('Escalation', {
    patientId: DataTypes.STRING,
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING' // PENDING, ACKNOWLEDGED, RESOLVED
    },
    slaDeadline: DataTypes.DATE,
    acknowledgedBy: DataTypes.STRING
});

module.exports = Escalation;
