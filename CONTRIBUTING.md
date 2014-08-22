For developers
--------------
Notes for developers.

### Documentation

Docs live in the `/docs` dir and are `.md` files that are built by jekyll on the Mapbox Studio website. Rules!

- Keep docs consolidated and sustainable. Let's add docs sparingly and focus on improving what we have.
- Do not commit doc images (screenshots, diagrams, etc.) to the mapbox-studio repo. Host them externally, either on github's issue image hosting or elsewhere.

### Tagging + releasing

Tagging flow is like this:

    # Update version number in package.json using vim or your favorite editor

    # Commit package.json change and tag it.
    git commit package.json -m "v0.0.1"
    git tag v0.0.1

    # Confirm the tag.
    git tag -n

    # Push all the things to github
    git push origin master
    git push --tags

Then package using the tag name in the steps below.

### Packaging

Travis bundles Mapbox Studio with the [atom-shell](https://github.com/atom/atom-shell) wrapper and uploads packages to S3 for hosting. There are two OSs in the travis matrix:

- linux: builds linux, win32 platforms
- osx: builds darwin (because of osx-only code signing tools)

To package:

1. **Push a commit with `[publish GITSHA]` as the message.** `GITSHA` should be a commit hash, branch name, or tag that can be used with `git checkout`. *Note: the packaging process itself will use the code in the repo as of GITSHA -- in other words, your GITSHA must be able to package itself.*
2. **Check travis logs for success.** When complete downloads will be available at:

        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-linux-x64-{GITSHA}.zip
        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-darwin-x64-{GITSHA}.zip
        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-win32-ia32-{GITSHA}.exe
3. **If a tagged release, update _config.yml, _config.mb-pages.yml.** Update the `release` key in `_config.yml, _config.mb-pages.yml` to be the name of the tag.
