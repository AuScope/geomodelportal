module.exports = {
  module: {
    rules: [
      {
        test: /\.glsl$/i,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        loader: 'shader-loader',
      },
      {
        test: /\.js$/,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        loader: 'babel-loader?presets[]=@babel/preset-env',
      },
      {
        test: /\.worker\.js$/,
        include: /node_modules(\/|\\)vtk\.js(\/|\\)/,
        use: [
          {
            loader: 'worker-loader',
            options: { inline: true, fallback: false },
          },
        ],
      },
    ],
  },
};
