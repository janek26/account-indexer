import type { CheckpointWriter } from '@snapshot-labs/checkpoint';
import { hash } from 'starknet';

// handle txFn
export const txFn: CheckpointWriter = async ({ tx: _tx, instance, block }) => {
  if (_tx.type === 'DEPLOY_ACCOUNT' || _tx.type === 'DEPLOY') {
    const tx = _tx as {
      type: 'DEPLOY' | 'DEPLOY_ACCOUNT';
      class_hash: string;
      constructor_calldata: Array<string>;
      contract_address_salt: string;
      transaction_hash: string;
      version: string;
    };

    if (
      tx.type === 'DEPLOY' &&
      tx.class_hash !== '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918' // Argent Proxy
    ) {
      return;
    }

    // Run logic as at the time Account was deployed.
    const accountAddress = hash.calculateContractAddressFromHash(
      tx.contract_address_salt,
      tx.class_hash,
      tx.constructor_calldata,
      0
    );

    instance.executeTemplate('NormalAccount', {
      contract: accountAddress,
      start: block.block_number
    });
  }
};

// handle accountCreated // account_created(account: felt, key: felt, guardian: felt)
export const accountCreated: CheckpointWriter = async ({ event, tx, block, mysql }) => {
  if (event && event.data[1]) {
    const accountAddress = event.from_address;

    const account = {
      id: accountAddress,
      signer: event.data[1],
      transaction_hash: tx.transaction_hash,
      updated_at_block: block.block_number,
      created_at_block: block.block_number,
      updated_at: block.timestamp,
      created_at: block.timestamp
    };

    await mysql.queryAsync('INSERT IGNORE INTO accounts SET ?', [account]);
  }
};

// handle accountUpdated // signer_changed(new_signer: felt)
export const accountUpdated: CheckpointWriter = async ({ event, block, mysql }) => {
  if (event) {
    const accountAddress = event.from_address;
    const newSigner = event.data[0];

    const account = {
      id: accountAddress,
      signer: newSigner,
      updated_at_block: block.block_number,
      updated_at: block.timestamp
    };

    await mysql.queryAsync('UPDATE accounts SET ? WHERE id = ?', [account, accountAddress]);
  }
};
