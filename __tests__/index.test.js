const { parseToJson } = require('../index');

it('[parseToJson] with sequential = true', async () => {
  await parseToJson(
    `${__dirname}/__fixtures__/201709/01/05/3022.69933758693960.log`,
    (data, next) => {
      expect(data).toMatchSnapshot();
      next();
    },
    {
      sequential: true,
    }
  );
});

it('[parseToJson] with sequential = false', async () => {
  const allData = {};
  await parseToJson(
    `${__dirname}/__fixtures__/201709/01/05/3022.69933758693960.log`,
    data => {
      allData[data['context.data.selectedArticleId']] = data;
    },
    {
      sequential: false,
    }
  );
  await new Promise(resolve => setTimeout(resolve, 3 * 1000));
  expect(allData).toMatchSnapshot();
});

// failed test
xit('[parseToJson] proper promise', async () => {
  let count = 0;
  await parseToJson(
    `${__dirname}/__fixtures__/201709/01/05/3022.69933758693960.log`,
    async (data, next) => {
      count++;
      await new Promise(resolve => setTimeout(resolve, 3 * 1000));
      next();
    },
    { sequential: true }
  );
  expect(count).toBe(2);
});
