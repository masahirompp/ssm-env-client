# ssm-env-client

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

> aws-ssm wrapper to manage parameters for each service and environment.

## Install

```bash
npm i ssm-env-client
```

## Usage

```ts
import { SsmEnvClient } from "ssm-env-client";

const client = new SsmEnvClient("YourServiceName");

await client.putEnv("Dev");
await client.putEnv("Prod");

const envList = await client.loadEnvList(); // ['Dev', 'Prod']
await client.putParameters("Dev", { A: "111", B: "222" });
await client.putParameters("Dev", { A: "333", B: "444" });

const devParameters = await client.loadParameters("Dev"); // { A: "111", B: "222" }
const prodParameters = await client.loadParameters("Prod"); // { A: "333", B: "444" }

await client.putParameters("Dev", { A: "555" }); // overwrite
const newDevParameters = await client.loadParameters("Dev"); // { A: "555" }
```

### Output

![OUTPUT](https://raw.githubusercontent.com/masahirompp/images/main/ssm-env-client_ssm.png)

[build-img]: https://github.com/masahirompp/ssm-env-client/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/masahirompp/ssm-env-client/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/ssm-env-client
[downloads-url]: https://www.npmtrends.com/ssm-env-client
[npm-img]: https://img.shields.io/npm/v/ssm-env-client
[npm-url]: https://www.npmjs.com/package/ssm-env-client
[issues-img]: https://img.shields.io/github/issues/masahirompp/ssm-env-client
[issues-url]: https://github.com/masahirompp/ssm-env-client/issues
[codecov-img]: https://codecov.io/gh/masahirompp/ssm-env-client/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/masahirompp/ssm-env-client
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
