const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RiskAssessment = sequelize.define('RiskAssessment', {
    patientId: DataTypes.STRING,
    riskLevel: DataTypes.STRING,
    riskScore: DataTypes.FLOAT,
    factors: DataTypes.JSON, // Store what triggered the risk
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = RiskAssessment;
