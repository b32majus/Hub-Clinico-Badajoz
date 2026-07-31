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
    deploymentId: 'caceres-fh-review', sourceSha: '815e16f9564c82f469a95745c5c6917593a8c3f0',
    version: 'CÁCERES-REVIEW-0.3', profile: PROFILE
  });
})();
