// Wrapper placed at dist-web root for Electron require fallback
module.exports.deployToNetlify = async function(opts) {
  const mod = await import('./src/js/auto-deploy.js');
  return mod.deployToNetlify(opts);
};
