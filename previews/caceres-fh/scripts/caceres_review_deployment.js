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
    deploymentId: 'caceres-fh-review', sourceSha: '54f6bb2cc5cb9c46b4121e8148c00a065f1bca6c',
    version: 'CÁCERES-REVIEW-0.2', profile: PROFILE
  });
})();
