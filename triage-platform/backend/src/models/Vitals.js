const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vitals = sequelize.define('Vitals', {
    patientId: DataTypes.STRING,
    heartRate: DataTypes.INTEGER,
    systolicBp: DataTypes.INTEGER,
    diastolicBp: DataTypes.INTEGER,
    spo2: DataTypes.FLOAT,
    temperature: DataTypes.FLOAT,
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Vitals;
