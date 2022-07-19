import { Finding, TransactionEvent, HandleTransaction } from "forta-agent";

import { TestTransactionEvent, createAddress } from "forta-agent-tools/lib/tests";

import { BigNumber } from "ethers";

import { COMPTROLLER_IFACE, QITOKEN_IFACE } from "./abi";

import { provideHandleTransaction } from "./agent";

import { createFinding } from "./finding";

// Address definitions to be used in testing
const QITOKEN_ADDR = createAddress("0xa1");
const NEW_QITOKEN_ADDR = createAddress("0xa2");
const COMPTROLLER_ADDR = createAddress("0xb1");
const EXTERNAL_ADDR = createAddress("0xc1");
const USER_ADDR = createAddress("0xd1");

describe("Benqi Finance Large Pool Withdrawal Agent Test Suite", () => {
  let handler: HandleTransaction;
  let mockGetTotalSupply: any;
  let initializeArray: string[];

  beforeAll(() => {
    // Create the array that would have been generated by the agents `initialize` function
    initializeArray = [QITOKEN_ADDR];
    // Setup the mock function to get total pool supply to be used by the agent
    mockGetTotalSupply = jest.fn();
    // Setup the handler
    handler = provideHandleTransaction(initializeArray, mockGetTotalSupply, 25, COMPTROLLER_ADDR);
  });

  it("ignores empty transactions", async () => {
    const tx: TransactionEvent = new TestTransactionEvent();
    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // Check if findings contain expected results
    expect(findings).toStrictEqual([]);
  });

  it("ignores redeem events from non qitoken addresses", async () => {
    // Generate a `Redeem` event with a withdrawal of 100 tokens
    const log = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 100, 100]);

    // Generate the transaction
    const tx: TransactionEvent = new TestTransactionEvent().addAnonymousEventLog(
      EXTERNAL_ADDR,
      log.data,
      ...log.topics
    );

    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // Check if findings contain expected results
    expect(findings).toStrictEqual([]);
  });

  it("ignores redeem events from qitoken addresses when redeem amount is under the threshold", async () => {
    // The mock getTotalSupply returns 1000
    mockGetTotalSupply.mockResolvedValue(BigNumber.from(1000));

    // Generate a `Redeem` event with a withdrawal of 100 tokens
    const log = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 100, 100]);

    // Generate the transaction
    const tx: TransactionEvent = new TestTransactionEvent().addAnonymousEventLog(QITOKEN_ADDR, log.data, ...log.topics);

    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // Check if findings contain expected results
    expect(findings).toStrictEqual([]);
  });

  it("detects redeem events from qitoken addresses when redeem amount is over the threshold", async () => {
    // The mock getTotalSupply returns 1000
    mockGetTotalSupply.mockResolvedValue(BigNumber.from(1000));

    // Generate a `Redeem` event with a withdrawal of 500 tokens
    const log = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 500, 500]);

    // Generate the transaction
    const tx: TransactionEvent = new TestTransactionEvent().addAnonymousEventLog(QITOKEN_ADDR, log.data, ...log.topics);

    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // Check if findings contain expected results
    expect(findings).toStrictEqual([createFinding(QITOKEN_ADDR, "1000", "500")]);
  });

  it("detects multiple redeem events from qitoken addresses when redeem amount is over the threshold", async () => {
    // The mock getTotalSupply returns 1000 on first call and 5000 on second call
    mockGetTotalSupply.mockResolvedValueOnce(BigNumber.from(1000));
    mockGetTotalSupply.mockResolvedValueOnce(BigNumber.from(5000));

    // Generate a `Redeem` event with a withdrawal of 700 tokens
    const log1 = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 700, 700]);

    // Generate a `Redeem` event with a withdrawal of 2501 tokens
    const log2 = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 2501, 2501]);

    // Construct the transaction
    const tx: TransactionEvent = new TestTransactionEvent()
      .addAnonymousEventLog(QITOKEN_ADDR, log1.data, ...log1.topics)
      .addAnonymousEventLog(QITOKEN_ADDR, log2.data, ...log2.topics);

    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // Check if findings contain expected results
    expect(findings).toStrictEqual([
      createFinding(QITOKEN_ADDR, "1000", "700"),
      createFinding(QITOKEN_ADDR, "5000", "2501"),
    ]);
  });

  it("updates the set of qitokens when a new market is listed", async () => {
    // The mock getTotalSupply returns 1000
    mockGetTotalSupply.mockResolvedValue(BigNumber.from(1000));

    // Generate a `MarketListed` stating that a new market has been listed
    const log1 = COMPTROLLER_IFACE.encodeEventLog(COMPTROLLER_IFACE.getEvent("MarketListed"), [NEW_QITOKEN_ADDR]);

    // Generate a `Redeem` event with a withdrawal of 500 tokens
    const log2 = QITOKEN_IFACE.encodeEventLog(QITOKEN_IFACE.getEvent("Redeem"), [USER_ADDR, 500, 500]);

    // Construct the transaction
    const tx: TransactionEvent = new TestTransactionEvent()
      .addAnonymousEventLog(COMPTROLLER_ADDR, log1.data, ...log1.topics)
      .addAnonymousEventLog(NEW_QITOKEN_ADDR, log2.data, ...log2.topics);

    // Run the handler on the test transaction
    const findings: Finding[] = await handler(tx);
    // A finding should be detected for the newly added QiToken address
    expect(findings).toStrictEqual([createFinding(NEW_QITOKEN_ADDR, "1000", "500")]);
  });
});