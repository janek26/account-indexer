import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Checkpoint, { LogLevel } from '@snapshot-labs/checkpoint';
import * as writers from './writers';

const isDev = process.env.NODE_ENV === 'development';
const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

if (!process.env.NETWORK_NODE_URL) {
  throw new Error('NETWORK_NODE_URL is not set');
}

// Initialize checkpoint
const checkpoint = new Checkpoint(
  {
    network_node_url: process.env.NETWORK_NODE_URL,
    tx_fn: 'txFn',
    start: 0,
    templates: {
      NormalAccount: {
        events: [
          { name: 'account_created', fn: 'accountCreated' }, // account_created(account: felt, key: felt, guardian: felt)
          { name: 'signer_changed', fn: 'accountUpdated' } // signer_changed(new_signer: felt)
        ]
      }
    }
  },
  writers,
  schema,
  {
    logLevel: isDev ? LogLevel.Info : LogLevel.Warn,
    prettifyLogs: isDev ? true : false
  }
);

async function startCheckpoint() {
  if (isDev) {
    // resets the entities already created in the database
    // ensures data is always fresh on each re-run
    await checkpoint.reset();
  }
  return checkpoint.start();
}
startCheckpoint();

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: false }));
app.use(cors({ maxAge: 86400 }));

// mount Checkpoint's GraphQL API on path /
app.use('/', checkpoint.graphql);

const PORT = process.env.PORT || 3110;
app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
