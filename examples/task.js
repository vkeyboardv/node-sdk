/* eslint-disable camelcase */
const { Corva } = require('@corva/node-sdk');

const timezonesShift = {
  'America/Chicago': 6,
};

const taskApp = async (event, { api }) => {
  // get some data from api
  const settings = await api.getAppSettings();
  // now - 7 days + timezone shift
  const timestampToLoadDataFrom = Date.now() / 1000 - 7 * 24 * 60 * 60 + timezonesShift[settings.timezone] || 0;

  const results = await api.getDataset({
    dataset: 'some-dataset',
    query: {
      timestamp: { $gte: timestampToLoadDataFrom },
    },
    sort: { timestamp: 1 },
    limit: 1000,
    fields: ['data.some_valuable_prop'],
  });

  // do some calculations
  const sum = results.reduce((acc, item) => acc + item.data.some_valuable_prop, 0);

  return {
    opts: event.properties.some.input,
    some: { output: sum },
  };
};

exports.handler = new Corva().task(taskApp);
