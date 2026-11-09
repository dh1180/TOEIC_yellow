module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    bundledAudio: process.env.TOEIC_BUNDLED_AUDIO === '1',
  },
});
