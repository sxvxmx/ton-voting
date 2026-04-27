import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';
import { StudentDao } from '../build/StudentDao/tact_StudentDao';

export async function run(provider: NetworkProvider) {
  const minDeposit = toNano('0.2');
  const dao = provider.open(await StudentDao.fromInit(minDeposit));

  await dao.send(
    provider.sender(),
    {
      value: toNano('0.05'),
    },
    {
      $$type: 'Deploy',
      queryId: 0n,
    },
  );

  await provider.waitForDeploy(dao.address);

  console.log('StudentDao deployed on testnet');
  console.log('Address:', dao.address.toString());
  console.log('Min proposal deposit:', minDeposit.toString());
}
