---
# Leave the homepage title empty to use the site title
title: ''
summary: ''
date: 2022-10-24
type: landing

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: me
      text: ''
      # Show a call-to-action button under your biography? (optional)
      # TODO: drop a compiled cv.pdf into static/uploads/ then uncomment to enable.
      # button:
      #   text: Download CV
      #   url: uploads/cv.pdf
      headings:
        about: ''
        education: ''
        interests: ''
    design:
      background:
        gradient_mesh:
          enable: false

      # Name heading sizing to accommodate long or short names
      name:
        size: md # Options: xs, sm, md, lg (default), xl

      # Avatar customization
      avatar:
        size: medium # Options: small (150px), medium (200px, default), large (320px), xl (400px), xxl (500px)
        shape: circle # Options: circle (default), square, rounded
  - block: markdown
    content:
      title: '📚 Research'
      subtitle: ''
      text: |-
        I build **Gaussian-density force fields** and the high-performance machinery to run them. My work spans the polarizable Gaussian multipole (PGM) model, the DEGauss softcore potential combining double-exponential van der Waals with Gaussian electrostatics, and a self-consistent Gaussian van der Waals (GVDW) term — together with their GPU implementation in the [AMBER](https://ambermd.org/) molecular dynamics package.

        Along the way I work on long-range electrostatics (isotropic periodic sum vs. PME), energy conservation in polarizable models, free-energy calculations, and machine-learning interatomic potentials.

        Always happy to talk methods and simulations — feel free to reach out.
    design:
      columns: '1'
  - block: collection
    id: papers
    content:
      title: Featured Publications
      filters:
        folders:
          - publications
        featured_only: true
    design:
      view: article-grid
      columns: 2
  - block: collection
    content:
      title: Recent Publications
      text: ''
      filters:
        folders:
          - publications
        exclude_featured: false
    design:
      view: citation
  - block: collection
    id: talks
    content:
      title: Recent & Upcoming Talks
      filters:
        folders:
          - events
    design:
      view: card
---
