import {
  Finding,
  HandleTransaction,
  createTransactionEvent,
} from "forta-agent";
import { createAddress } from "nethermindeth-general-agents-module";
import provideUnkillAgent, { web3, unkill } from "../agents/unkill";

const ADDRESS = createAddress("11");
const ALERTID = "test";

describe("Unkill Agent Test Suite", () => {
  let handleTransaction: HandleTransaction;

  beforeAll(() => {
    handleTransaction = provideUnkillAgent(ALERTID, ADDRESS);
  });

  const createTxEvent = (signature: string) =>
    createTransactionEvent({
      transaction: { data: signature } as any,
      addresses: { ADDRESS: true },
      receipt: {} as any,
      block: {} as any,
    });

  it("create and send a tx with the tx event", async () => {
    const signature = web3.eth.abi.encodeFunctionCall(unkill as any, []);
    const tx = createTxEvent(signature);
    const findings = await handleTransaction(tx);
    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "UnKill Me funciton called",
        description: "UnKill Me funciton called on pool",
        alertId: ALERTID,
        protocol: "ethereum",
        severity: 2,
        type: 2,
        everestId: undefined,
        metadata: {},
      }),
    ]);
  });
});
