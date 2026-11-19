# sodiq179.github.io

Personal academic website of Sodiq Babawale, built on the [Academic Pages](https://github.com/academicpages/academicpages.github.io) Jekyll template with a custom design layer.

## Where to edit things

| To change | Edit this file |
| --- | --- |
| Sidebar name, tagline, links, email | `_config.yml` (the `author:` block) |
| Home page bio, interests, education | `_pages/about.html` |
| News items (newest first) | `_data/news.yml` |
| Publications | `_data/publications.yml` |
| Awards, Huawei timeline, Zindi table | `_data/awards.yml` |
| Projects | `_data/projects.yml` |
| Research, Teaching, Experience pages | `_pages/research.html`, `_pages/teaching.html`, `_pages/experience.html` |
| CV PDF | replace `files/Sodiq_Babawale_CV.pdf` (keep the same name) |
| Photo | replace `images/sodiq-babawale.jpg` and `images/sodiq-babawale.webp` (square) |
| Colours, fonts, spacing | `_sass/layout/_custom.scss` (tokens at the top) |
| Menu order | `_data/navigation.yml` |

You can edit any of these directly on github.com (open the file, click the pencil icon, commit). The site rebuilds itself in about a minute.

## Publishing

1. The repository must be public and named `Sodiq179.github.io`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Every push to `master` runs `.github/workflows/jekyll.yml`, which builds and deploys the site to https://sodiq179.github.io.

## Previewing locally (optional)

```bash
bundle install
bundle exec jekyll serve --config _config.yml,_config.dev.yml
```
Then open http://localhost:4000.
