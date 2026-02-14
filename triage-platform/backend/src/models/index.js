const Patient = require('./Patient');
const Vitals = require('./Vitals');
const RiskAssessment = require('./RiskAssessment');
const Escalation = require('./Escalation');

// Associations
Patient.hasMany(Vitals, { foreignKey: 'patientId', sourceKey: 'patientId' });
Vitals.belongsTo(Patient, { foreignKey: 'patientId', targetKey: 'patientId' });

Patient.hasMany(RiskAssessment, { foreignKey: 'patientId', sourceKey: 'patientId' });
RiskAssessment.belongsTo(Patient, { foreignKey: 'patientId', targetKey: 'patientId' });

Patient.hasMany(Escalation, { foreignKey: 'patientId', sourceKey: 'patientId' });
Escalation.belongsTo(Patient, { foreignKey: 'patientId', targetKey: 'patientId' });

module.exports = {
    Patient,
    Vitals,
    RiskAssessment,
    Escalation
};
