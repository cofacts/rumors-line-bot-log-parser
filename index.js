const fs = require('fs');
const { Transform } = require('stream');
const readline = require('readline');
const crypto = require('crypto');
const csvStringify = require('csv-stringify');

const glob = require('glob');

const HEROKU_MODE = process.env.HEROKU || false;

if (!process.argv[3]) {
  console.info('Please provide input filename.');
  console.info('Usage: node index.js <input file glob> <output file>');
  process.exit(1);
}

const inputFiles = glob.sync(process.argv[2]);
const outputFilePath = process.argv[3];

const filePathTofileNameLines = new Transform({
  objectMode: true,
  transform(fileName, encoding, callback) {
    const rl = readline.createInterface({
      input: fs.createReadStream(fileName),
      crlfDelay: Infinity,
    });

    rl.on('line', line => {
      this.push({ fileName, line });
    });

    rl.on('close', () => callback());
  },
});

const filenameLineToLineTimestamp = new Transform({
  objectMode: true,
  transform({ line, fileName }, encoding, callback) {
    if (!HEROKU_MODE) {
      // line on S3:
      // Pure content, no prefix.
      // file directory structure: 201709/01/05/0308.70025261277880.log
      const [, year, month, day, hour, min, second] = fileName.match(
        /(\d{4})(\d{2})\/(\d{2})\/(\d{2})\/(\d{2})(\d{2})\.\d+\.log$/
      );

      this.push({
        timestamp: `${year}-${month}-${day}T${hour}:${min}:${second}Z`,
        line,
      });
      return callback();
    }

    // line on Heroku:
    // 112 <190>1 2018-07-16T17:32:16.082803+00:00 app web.1 - - ||LOG||<----------
    if (!line.includes('||LOG||')) return callback();

    const [, timestamp, content] = line.match(
      /.*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}\+\d{2}:\d{2}) .+ \|\|LOG\|\|(.*)/
    );

    this.push({ line: content, timestamp });
    callback();
  },
});

const lineTimestampToConversationObj = new Transform({
  objectMode: true,
  transform({ line, timestamp }, encoding, callback) {
    if (line === '<----------') {
      if (this._buffer !== '') {
        console.info(
          `[INFO] Incomplete message detected at ${timestamp}; ignoring`
        );
      }
      this._buffer = '';

      return callback();
    }

    if (line === '---------->') {
      let conversationObj;
      try {
        conversationObj = JSON.parse(this._buffer);
      } catch (e) {
        console.error(`[ERROR] Cannot parse message at ${timestamp}; skipping`);
        this._buffer = '';
        return callback();
      }

      const { CONTEXT, INPUT, OUTPUT } = conversationObj;
      const issuedAt = new Date(CONTEXT.issuedAt);

      this.push({
        timestamp: new Date(timestamp).toISOString(),
        userIdsha256: sha256(INPUT.userId),
        'input.message.text': collapseLines(
          INPUT.message && INPUT.message.text
        ),
        'context.issuedAt': isNaN(+issuedAt) ? '' : issuedAt.toISOString(),
        'context.data.searchedText': collapseLines(
          CONTEXT.data && CONTEXT.data.searchedText
        ),
        'context.state': CONTEXT.state,
        'output.context.state': OUTPUT.context.state,
        'output.replies': collapseLines(
          (OUTPUT.replies || [])
            .map(({ text, altText }) => text || altText)
            .join('↵')
        ),
      });

      this._buffer = '';
      return callback();
    }

    this._buffer += line;
    callback();
  },
});

filePathTofileNameLines
  .pipe(filenameLineToLineTimestamp)
  .pipe(lineTimestampToConversationObj)
  .pipe(
    csvStringify({
      header: true,
      columns: [
        'timestamp',
        'userIdsha256',
        'input.message.text',
        'context.issuedAt',
        'context.data.searchedText',
        'context.state',
        'output.context.state',
        'output.replies',
      ],
    })
  )
  .pipe(fs.createWriteStream(outputFilePath));

// eslint-disable-next-line no-console
console.log(`Processing ${inputFiles.length} files to ${outputFilePath}...`);

inputFiles.forEach(filePath => {
  filePathTofileNameLines.write(filePath);
});

/**
 * @param {string} input
 * @returns {string} - input's sha256 hash hex string. Empty string if input is falsy.
 */
function sha256(input) {
  return input
    ? crypto
        .createHash('sha256')
        .update(input, 'utf8')
        .digest('hex')
    : '';
}

/**
 * @param {string} str
 * @returns {string} input string with all line breaks being replaced by return symbol
 */
function collapseLines(str) {
  return (str || '').replace(/\r|\n/gm, '↵');
}
