# Despia Example

One application, four surfaces, one codebase. This repository is the full worked example
for [Despia](https://github.com/despia-native/despia): the same DSX documents shipped as a
native iOS app, a native Android app, an installable PWA, and a server-rendered landing
page that advertises the app and links the web version.

It consumes only the published `@despia/*` packages, exactly the way your project would.
Nothing in here reaches into the framework's source, which is what makes it proof rather
than demo: when the documentation says a thing works, this is the repository it points at,
and CI builds it from the registry like a stranger would.

## The app

Field Notes: a routed three-screen app whose documents live in `Components/`.

| Path | Screen |
|---|---|
| `/` | the note list (`fieldnotes.App`) |
| `/notes/:id` | a dynamic detail route; the router pushes `id` as the component's attribute |
| `/about` | the four-surfaces story (`fieldnotes.About`) |

```sh
npm install        # @despia/* from the registry, nothing local
npm run dev        # build, serve, watch, reload
npm run build      # the deployable web build (PWA and SSR ride this)
npm run lint       # dsx lint --strict, the same gate CI runs
npm run ota        # Components/ as a sha-pinned OTA folder any static host can serve
npm run export     # a real Xcode + Android Studio project into export/ (needs a kernel checkout)
```

The same documents render on the native iOS and Android kernels. Two ways to an installable
app, same sources: the Despia build lanes, where signing identities live, or `dsx export`,
which writes a complete native project you open in Xcode or Android Studio and own outright
(set `DSX_KERNEL` to a clone of
[despia-kernel](https://github.com/despia-native/despia-kernel); see the
[native export guide](https://github.com/despia-native/despia/blob/main/Documentation/guides/native-export.md)).
The canonical layout
and every other way of combining Despia with an existing stack are documented in the
[combination matrix](https://github.com/despia-native/despia/blob/main/Documentation/guides/combinations/README.md);
what the toolchain reserves inside a project is the
[reserved-directory contract](https://github.com/despia-native/despia/blob/main/Documentation/guides/reserved-directories.md).

This example keeps its data in component state on purpose; the full-stack variant (C4)
moves it into a `<server>` document with a data entity and, from there, one deploy
command. The body markup does not change shape when that happens.

## Status

The framework's first public release is 0.0.1; CI here goes green with the registry wave
that publishes it. Until then, the quickest way to the same result is the scaffolder:

```sh
npm create dsx@latest my-app
```

## Issues and contributions

Issues and pull requests for the framework live on
[`despia-native/despia`](https://github.com/despia-native/despia/issues), the single
tracker. See
[CONTRIBUTING.md](https://github.com/despia-native/despia/blob/main/CONTRIBUTING.md) for
the workflow. Maintained by the Despia team.

## License

[Apache License 2.0](LICENSE).

---

Proudly built in the United Arab Emirates 🇦🇪

Despia LLC-FZ · Dubai, United Arab Emirates · [despia.com](https://despia.com) · support@despia.com
