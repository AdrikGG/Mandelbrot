module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          worker_threads: false,
          os: false,
          child_process: false
        }
      }
    }
  }
};
