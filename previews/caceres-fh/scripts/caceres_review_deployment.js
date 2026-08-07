(() => {
  'use strict';
  const PROFILE = 'Profesional FH — Entorno de evaluación';
  const applyProfile = () => {
    ['currentProfessional', 'fhValFarmaceutico'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = PROFILE;
    });
  };
  applyProfile();
  document.addEventListener('DOMContentLoaded', applyProfile);
  window.CACERES_FH_REVIEW = Object.freeze({
    deploymentId: 'caceres-fh-review', sourceSha: '8bfceaaa956199610be9c0e6df40740a04b73699',
    lastFunctionalSha: 'fb7b70c50c991baf6a375b42112048d190fe0178', version: 'CÁCERES-REVIEW-0.4', profile: PROFILE
  });
})();
