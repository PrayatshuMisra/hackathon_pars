const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    age: DataTypes.INTEGER,
    gender: DataTypes.STRING,
    currentRiskLevel: DataTypes.STRING, // HIGH, MEDIUM, LOW
    currentRiskScore: DataTypes.FLOAT
});

module.exports = Patient;
