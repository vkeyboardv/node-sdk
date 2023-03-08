const { Corva, FilteringMode } = require('@corva/node-sdk');

const streamApp = async (event, { api }) => {
  // get some data from api
  const { body: drillstrings } = await api.request('api/v1/data/corva/data.drillstring/', {
    searchParams: {
      query: JSON.stringify({ asset_id: event.asset_id }),
      sort: JSON.stringify({ timestamp: 1 }),
      limit: 1,
    },
  });

  // do some calculations/modifications to the data
  const total = drillstrings.reduce((acc, drillstring) => acc + drillstring.data.bit_depth, 0);
  const average = total / drillstrings.length;

  // save the data to private collection
  await api.request('api/v1/data/my-provider/my-collection/', {
    method: 'POST',
    json: [
      {
        timestamp: Date.now() / 1000,
        company_id: 42,
        asset_id: 42,
        version: 1,
        data: { average },
      },
    ],
  });
};

exports.handler = new Corva().stream(streamApp, {
  filteringModes: FilteringMode.TIMESTAMP,
});
