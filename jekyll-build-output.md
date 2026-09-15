# Jekyll Build Output — Codespace

Recorded from the Codespace terminal (docs folder).

## Command

```bash
bundle exec jekyll build
```

## Output

```
Configuration file: none
            Source: /workspaces/senior-project-2026-2027-Alexis-Brockway/docs
       Destination: /workspaces/senior-project-2026-2027-Alexis-Brockway/docs/_site
 Incremental build: disabled. Enable with --incremental
      Generating...
                    done in 0.006 seconds.
 Auto-regeneration: disabled. Use --watch to enable.
```

## Key takeaways

- **`Configuration file: none`** — there is no `_config.yml` in the `docs/` folder yet. This is why the build is essentially a no-op (0.006 seconds, no pages generated).
- **Source folder:** `/workspaces/senior-project-2026-2027-Alexis-Brockway/docs` — the site root is the `docs/` folder in the Codespace.
- **Destination:** `.../docs/_site` — the built output goes into `docs/_site`, which is expected (it's created next to the source).

## Next steps (still to do)

1. Create `_config.yml` in the `docs/` folder.
2. Set up the Gemfile: `bundle init` + `bundle add github-pages` (or `bundle add jekyll`).
3. Add `jekyll-relative-links` and `jekyll-remote-theme` plugins.
4. Add a `remote_theme:` line and pick a theme.
5. Re-run `bundle exec jekyll build` and confirm HTML pages are generated.
