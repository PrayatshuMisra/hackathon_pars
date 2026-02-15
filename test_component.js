// Quick test to check if PatientIntake has any import or syntax errors
import PatientIntake from './src/pages/PatientIntake';

console.log('PatientIntake component:', PatientIntake);
console.log('Component type:', typeof PatientIntake);

if (typeof PatientIntake === 'function') {
    console.log('✓ PatientIntake is a valid React component');
} else {
    console.error('✗ PatientIntake is NOT a valid component!');
}
