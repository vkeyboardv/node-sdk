# @corva/node-sdk

[Corva node-sdk](https://www.npmjs.com/package/@corva/node-sdk) is a framework for building [Corva DevCenter](https://app.corva.ai/dev-center/docs) apps.

## Contents

- [Requirements](#requirements);
- [Quick start](#quick-start);
    - [Install](#install);
    - [Create an app](#create-an-app);
- [App types](#app-types);
    - [Followable apps](#followable-apps)
- [Writing a handler](#writing-a-handler);
    - [Example](#handler-example);
    - [Event](#event);
    - [Context](#context).

## Requirements

- [NodeJs 14](https://nodejs.org/en/) or later.

## Quick start

### Install

With `npm` (bundled with NodeJs, see [docs](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)):

```sh
$ npm i @corva/node-sdk
```

With `yarn` ([docs](https://yarnpkg.com/getting-started)):

```sh
$ yarn add @corva/node-sdk
```

With `pnpm` ([docs](https://pnpm.io/installation)):

```sh
$ pnpm add @corva/node-sdk
```

### Create an app

A minimal app should export a [`handler`](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) that matches one defined in your `manifest.json`:

```js
const { Corva } = require('@corva/node-sdk');

exports.handler = new Corva().task((event) => console.log(event));
```

For details on the app types, see [App types](#app-types).

## App types

There are the following app types that you can build:

- [Stream](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/Corva.html#stream) - works with real-time data;
- [Scheduled](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/Corva.html#scheduled) - works with data at defined schedules/intervals (e.g., once a minute, once every three ft.);
- [Task](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/Corva.html#task) - works with data on-demand.

### Followable apps

Stream & scheduled apps can be followed. Followable apps must produce data to trigger the chain reaction of apps' runs.

There are the following possible ways to make the app produce the data:

- Make a separate call to API specifying only indexes. See [`CorvaDataSource.produceMessages`](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/library.CorvaDataSource.html#produceMessages) for details.
- Produce the data while saving. See [`Dataset.createEntriesAndProduceMessages`](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/Dataset.html#createEntriesAndProduceMessages) for details

## Writing a handler

To implement an app with node-sdk, you have to write a handler function that accepts two arguments:
- `event` - an event itself, see [Events](#events);
- `context` - helpers that are bound to app execution's context, see [Context](#context).

### Handler example

```js
const handler = (event, context) => {
    console.log(event, context);
}
```

### Event

There are following types of events that match the related [app types](#app-types):

- [Scheduled event](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/library.BaseScheduledLambdaEvent.html) - contains info about current invocation interval;
- [Stream event](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/StreamLambdaEvent) - contains [records](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/StreamLambdaEvent#records) that have been published since the last app invoke;
- [Task](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/Task) - a task with which the app was invoked, which contains passed [parameters](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/Task#properties).

### Context
Context provides the next functionality:
- `cache` - convenient methods to work with the state; see [State class](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/library.State). Not available for task apps;
- `api` - helper to interact with Corva API (and make any other generic request as well); see [Api](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/library.CorvaDataSource);
- `logger` - [Logger](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/classes/CorvaLogger) instance;
`secrets` - the application's sensitive data (see [DevCenter docs](https://app.qa.corva.ai/dev-center/docs/backend/secrets), [usage example](https://corva-ai.github.io/node-sdk/docs/v8.1.0-rc.15/interfaces/HandlerContext.html#secrets), [testing](https://www.npmjs.com/package/@corva/local-testing-framework#app-secrets));
- `config` - some basic info about app invoke.
