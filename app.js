
import * as dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import line from'@line/bot-sdk';
import express from 'express';
import pino from 'pino';
import pretty from 'pino-pretty';

// Load .env config
dotenv.config();

// Logger
const dt = new Date();
String(dt.getYear() + 1900).padStart(4, '0');
const dateString = `${String(dt.getYear() + 1900).padStart(4, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate() + 1).padStart(2, '0')}`;
const logStreams = [
  {
    stream: pretty({
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard',
    })
  },
  {
    stream: pino.destination({
      dest: `log/app-${dateString}.log`,
      mkdir: true,
      append: true,
      sync: true
    })
  }
];

const logger = pino({ level: 'debug' }, pino.multistream(logStreams));

// LINE Bot
// create LINE SDK config from env variables
const lineBOTConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(lineBOTConfig);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// pure get to call language model
app.get('/call', verifyKey, async (req, res) => {
  const completionData = await createLanguageModelCompletion(req.query.message);
  res.send('Response send to client::' + completionData.choices[0].message.content.trim());
});

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(lineBOTConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      logger.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create a echoing text message
  const completionData = await createLanguageModelCompletion(event.message.text);
  const echo = { type: 'text', text: completionData.choices[0].message.content.trim() };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// verfiy key
function verifyKey(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== undefined) {
    const bearer = bearerHeader.split(' ')[0];
    const bearerToken = bearer[1];
    // req.token = bearerToken;
    if (bearerToken !== process.env.HTTP_CALL_KEY) {
      res.sendStatus(403);
    }
    next();
  } else {
    res.sendStatus(403);
  }
}

// call language model and return data
async function createLanguageModelCompletion(userInputText) {
  // OpenAI
  const openAIConfig = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(openAIConfig);

  // For test...
  // let userInputText = '人類食用一氧化二氫會不會有不良影響?';

  logger.info(`User input: ${userInputText}`);

  /**
   * Messages must be an array of message objects, 
   * where each object has a role (either "system", "user", or "assistant") 
   * and content (the content of the message). 
   * Conversations can be as short as 1 message or fill many pages.
   */
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: userInputText }
    ]
  });

  logger.info(completion.data);

  return completion.data;
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`listening on port ${port}`);
});
