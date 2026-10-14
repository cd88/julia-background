  const fractalModels = {
    julia: {
      index: 0,
      presets: {
        lace: { label: 'Soft filigree', center: [-0.7, 0.27015], radius: [0.019, 0.016] },
        spiral: { label: 'Spirals', center: [-0.79, 0.15], radius: [0.012, 0.015] },
        islands: { label: 'Little islands', center: [-0.12, 0.745], radius: [0.024, 0.02] }
      }
    },
    cubic: {
      index: 1,
      presets: {
        lace: { label: 'Soft petals', center: [0.36, 0.25], radius: [0.035, 0.027] },
        spiral: { label: 'Braided branches', center: [-0.25, 0.45], radius: [0.03, 0.025] },
        islands: { label: 'Petal islands', center: [0.4, 0.31], radius: [0.025, 0.025] }
      }
    },
    ship: {
      index: 2,
      presets: {
        lace: { label: 'Folded clouds', center: [-0.55, -0.42], radius: [0.035, 0.025] },
        spiral: { label: 'Ridges', center: [-0.7, -0.3], radius: [0.03, 0.035] },
        islands: { label: 'Broken sails', center: [-0.35, -0.6], radius: [0.03, 0.025] }
      }
    },
    tricorn: {
      index: 3,
      presets: {
        lace: { label: 'Threefold clouds', center: [-0.2, 0.3], radius: [0.04, 0.035] },
        spiral: { label: 'Mirrored lace', center: [-0.45, 0.2], radius: [0.025, 0.025] },
        islands: { label: 'Scattered tips', center: [0.1, 0.45], radius: [0.035, 0.03] }
      }
    }
  };
  
  export default fractalModels;