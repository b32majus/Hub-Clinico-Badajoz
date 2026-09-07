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
    deploymentId: 'caceres-fh-review', sourceSha: '456454172b67a00ea5ba9583f14999a4be5ff0c2',
    lastFunctionalSha: '456454172b67a00ea5ba9583f14999a4be5ff0c2', version: 'CÁCERES-REVIEW-0.5', profile: PROFILE
  });
})();
