# rumors-line-bot-log-parser
Parses the STDOUT logs emitted by rumors-line-bot

## Usage

```bash
$ node index.js <Input file / glob> <output csv>
```

```javascript
const { parseToJson } = require('@cofacts/line-bot-log-parser');

const path = 'path/to/201709/01/05/3022.69933758693960.log'
// or 'path/to/201709/**/*.log'
parseToJson(path, (data, next) => {
    console.log(data)
    next();
  }, { sequential: true }
);
```

## Input file

It supports 2 formats:

### Logentries format (Heroku mode)

Should be a text file including something like:

```
112 <190>1 2018-07-16T17:37:36.459659+00:00 app web.1 - - ||LOG||<----------
(some content...)
112 <190>1 2018-07-16T17:37:36.465389+00:00 app web.1 - - ||LOG||---------->
```

To parse this format, please use `HEROKU=1 node index.js .....`

### [Heroku Log S3](https://github.com/choonkeat/heroku-log-s3)

The log drain has the following configuration:
- `FILTER_PREFIX`: `||LOG||`

The logs are stored in the following nested directory structure:

```
# YearMonth / Day / Hour / MinSecond.Subseconds.log
201709/01/05/0308.70025261277880.log
```
