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
    deploymentId: 'caceres-fh-review', sourceSha: 'e1120ba85817a1807cea8c1e938867ad778921f4',
    lastFunctionalSha: 'e1120ba85817a1807cea8c1e938867ad778921f4', version: 'CÁCERES-REVIEW-0.6', profile: PROFILE
  });
})();
