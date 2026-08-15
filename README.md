# Despia Example

One application, four surfaces, one codebase. This repository is the full worked example
for [Despia](https://github.com/despia-native/despia): the same DSX documents shipped as a
native iOS app, a native Android app, an installable PWA, and a server-rendered landing
page that advertises the app and links the web version.

It consumes only the published `@despia/*` packages, exactly the way your project would.
Nothing in here reaches into the framework's source, which is what makes it proof rather
than demo: when the documentation says a thing works, this is the repository it points at,
and CI builds it from the registry like a stranger would.

## Status

The framework's first public release is 0.0.1, and this example lands with the registry
wave that follows it. Until then, the quickest way to the same result is the scaffolder:

```sh
npm create dsx@latest my-app
```

The [quickstart](https://github.com/despia-native/despia/blob/main/Documentation/guides/quickstart.md)
walks the whole path from empty directory to running app.

## Issues and contributions

Issues and pull requests for the framework live on
[`despia-native/despia`](https://github.com/despia-native/despia/issues), the single
tracker. See
[CONTRIBUTING.md](https://github.com/despia-native/despia/blob/main/CONTRIBUTING.md) for
the workflow. Maintained by the Despia team.

## License

[Apache License 2.0](LICENSE).

---

Despia LLC-FZ
Meydan Grandstand, 6th Floor, Meydan Road, Nad Al Sheba, Dubai, United Arab Emirates
[despia.com](https://despia.com) · support@despia.com
